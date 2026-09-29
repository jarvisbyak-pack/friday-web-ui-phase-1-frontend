import express, { type Request, type Response } from "express";
import { z } from "zod";
import { AuthService } from "./auth/service.js";
import { requireAuth, type AuthenticatedRequest } from "./auth/middleware.js";
import { AiService } from "./ai/service.js";
import { AgentService } from "./agent/service.js";
import { ConversationRepository } from "./conversations/repository.js";
import { TaskEventRepository } from "./tasks/task-events.js";
import { PostgresTaskRepository } from "./tasks/task-repository.js";
import { TaskService } from "./tasks/task-service.js";

const taskRequestSchema = z.object({
  type: z.string().trim().min(1).max(200),
  input: z.unknown().optional()
});

const chatRequestSchema = z.object({
  messages: z.array(
    z.object({
      role: z.enum(["system", "user", "assistant"]),
      content: z.string().min(1)
    })
  ).min(1),
  model: z.string().trim().min(1).optional(),
  temperature: z.number().min(0).max(2).optional()
});

const conversationCreateSchema = z.object({
  title: z.string().trim().min(1).max(200).optional()
});

const storedMessageSchema = z.object({
  role: z.enum(["system", "user", "assistant", "tool"]),
  content: z.string().min(1).max(100000),
  metadata: z.unknown().optional()
});

const memorySchema = z.object({
  content: z.string().trim().min(1).max(10000),
  kind: z.string().trim().min(1).max(100).optional(),
  conversationId: z.string().uuid().optional(),
  metadata: z.unknown().optional()
});

const authRegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(200)
});

const authLoginSchema = authRegisterSchema;

function bearerToken(req: Request): string {
  const header = req.header("authorization");
  return header?.startsWith("Bearer ") ? header.slice(7).trim() : "";
}

export function createApi() {
  const app = express();
  const auth = new AuthService();
  const requireAuthentication = requireAuth(auth);
  const taskService = new TaskService(new PostgresTaskRepository());
  const aiService = new AiService();
  const agentService = new AgentService();
  const conversations = new ConversationRepository();
  const events = new TaskEventRepository();

  app.disable("x-powered-by");
  app.use(express.json({ limit: "2mb" }));

  app.get("/api/health", (_req, res) => {
    res.json({ ok: true, service: "friday-backend", timestamp: new Date().toISOString() });
  });

  app.get("/api/ready", async (_req, res) => {
    try {
      await taskService.get("__readiness_probe__");
      res.json({ ok: true, ready: true, database: "ok" });
    } catch {
      res.status(503).json({ ok: false, ready: false, database: "unavailable" });
    }
  });

  app.post("/api/auth/register", async (req, res) => {
    const parsed = authRegisterSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: { code: "INVALID_REQUEST", message: "Invalid registration request.", details: parsed.error.flatten() } });
      return;
    }
    try {
      const user = await auth.register(parsed.data.email, parsed.data.password);
      res.status(201).json({ user });
    } catch (error) {
      const code = error && typeof error === "object" && "code" in error ? String(error.code) : "";
      if (code === "23505") {
        res.status(409).json({ error: { code: "EMAIL_EXISTS", message: "An account with that email already exists." } });
        return;
      }
      console.error("Registration failed:", error);
      res.status(503).json({ error: { code: "AUTH_UNAVAILABLE", message: "Authentication service unavailable." } });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    const parsed = authLoginSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: { code: "INVALID_REQUEST", message: "Invalid login request.", details: parsed.error.flatten() } });
      return;
    }
    try {
      const result = await auth.login(parsed.data.email, parsed.data.password);
      res.json(result);
    } catch (error) {
      if (error instanceof Error && error.message === "Invalid email or password.") {
        res.status(401).json({ error: { code: "INVALID_CREDENTIALS", message: error.message } });
        return;
      }
      console.error("Login failed:", error);
      res.status(503).json({ error: { code: "AUTH_UNAVAILABLE", message: "Authentication service unavailable." } });
    }
  });

  app.get("/api/auth/me", requireAuthentication, async (req, res) => {
    try {
      const user = await auth.authenticate(bearerToken(req));
      if (!user) {
        res.status(401).json({ error: { code: "INVALID_SESSION", message: "Invalid or expired session." } });
        return;
      }
      res.json({ user });
    } catch {
      res.status(503).json({ error: { code: "AUTH_UNAVAILABLE", message: "Authentication service unavailable." } });
    }
  });

  app.post("/api/auth/logout", requireAuthentication, async (req, res) => {
    try {
      await auth.revoke(bearerToken(req));
      res.status(204).send();
    } catch {
      res.status(503).json({ error: { code: "AUTH_UNAVAILABLE", message: "Authentication service unavailable." } });
    }
  });

  app.use("/api/conversations", requireAuthentication);
  app.use("/api/memories", requireAuthentication);
  app.use("/api/chat", requireAuthentication);
  app.use("/api/agent", requireAuthentication);
  app.use("/api/tasks", requireAuthentication);

  app.post("/api/conversations", async (req: Request, res: Response) => {
    const parsed = conversationCreateSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: { code: "INVALID_REQUEST", message: "Invalid conversation request.", details: parsed.error.flatten() } });
      return;
    }
    try {
      const userId = (req as AuthenticatedRequest).userId;
      const conversation = await conversations.create(parsed.data.title, userId);
      res.status(201).json({ conversation });
    } catch (error) {
      console.error("Conversation creation failed:", error);
      res.status(503).json({ error: { code: "DATABASE_UNAVAILABLE", message: "Conversation service unavailable." } });
    }
  });

  app.get("/api/conversations", async (req, res) => {
    try {
      res.json({ conversations: await conversations.list((req as AuthenticatedRequest).userId) });
    } catch (error) {
      console.error("Conversation listing failed:", error);
      res.status(503).json({ error: { code: "DATABASE_UNAVAILABLE", message: "Conversation service unavailable." } });
    }
  });

  app.get("/api/conversations/:id/messages", async (req, res) => {
    try {
      const userId = (req as AuthenticatedRequest).userId;
      const conversation = await conversations.get(req.params.id);
      if (!conversation || conversation.userId !== userId) {
        res.status(404).json({ error: { code: "CONVERSATION_NOT_FOUND", message: "Conversation not found." } });
        return;
      }
      res.json({ messages: await conversations.listMessages(req.params.id) });
    } catch (error) {
      console.error("Message listing failed:", error);
      res.status(503).json({ error: { code: "DATABASE_UNAVAILABLE", message: "Conversation service unavailable." } });
    }
  });

  app.post("/api/conversations/:id/messages", async (req, res) => {
    const parsed = storedMessageSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: { code: "INVALID_REQUEST", message: "Invalid message request.", details: parsed.error.flatten() } });
      return;
    }
    try {
      const userId = (req as AuthenticatedRequest).userId;
      const conversation = await conversations.get(req.params.id);
      if (!conversation || conversation.userId !== userId) {
        res.status(404).json({ error: { code: "CONVERSATION_NOT_FOUND", message: "Conversation not found." } });
        return;
      }
      const message = await conversations.addMessage(req.params.id, parsed.data.role, parsed.data.content, parsed.data.metadata);
      res.status(201).json({ message });
    } catch (error) {
      console.error("Message creation failed:", error);
      res.status(503).json({ error: { code: "DATABASE_UNAVAILABLE", message: "Conversation service unavailable." } });
    }
  });

  app.post("/api/memories", async (req, res) => {
    const parsed = memorySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: { code: "INVALID_REQUEST", message: "Invalid memory request.", details: parsed.error.flatten() } });
      return;
    }
    try {
      const userId = (req as AuthenticatedRequest).userId;
      if (parsed.data.conversationId) {
        const conversation = await conversations.get(parsed.data.conversationId);
        if (!conversation || conversation.userId !== userId) {
          res.status(404).json({ error: { code: "CONVERSATION_NOT_FOUND", message: "Conversation not found." } });
          return;
        }
      }
      const memory = await conversations.addMemory({ ...parsed.data, userId });
      res.status(201).json({ memory });
    } catch (error) {
      console.error("Memory creation failed:", error);
      res.status(503).json({ error: { code: "DATABASE_UNAVAILABLE", message: "Memory service unavailable." } });
    }
  });

  app.get("/api/memories", async (req, res) => {
    const query = typeof req.query.q === "string" ? req.query.q.trim() : "";
    if (!query) {
      res.status(400).json({ error: { code: "INVALID_REQUEST", message: "Query parameter q is required." } });
      return;
    }
    try {
      res.json({ memories: await conversations.searchMemories(query, (req as AuthenticatedRequest).userId) });
    } catch (error) {
      console.error("Memory search failed:", error);
      res.status(503).json({ error: { code: "DATABASE_UNAVAILABLE", message: "Memory service unavailable." } });
    }
  });

  app.post("/api/chat", async (req: Request, res: Response) => {
    const parsed = chatRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: { code: "INVALID_REQUEST", message: "Invalid chat request.", details: parsed.error.flatten() } });
      return;
    }
    try {
      const result = await aiService.generate(parsed.data);
      res.json({ result });
    } catch (error) {
      console.error("AI generation failed:", error);
      res.status(502).json({ error: { code: "AI_PROVIDER_ERROR", message: "AI provider request failed." } });
    }
  });

  app.post("/api/agent", async (req: Request, res: Response) => {
    const parsed = chatRequestSchema.extend({ maxSteps: z.number().int().min(1).max(20).optional() }).safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: { code: "INVALID_REQUEST", message: "Invalid agent request.", details: parsed.error.flatten() } });
      return;
    }
    try {
      const result = await agentService.run(parsed.data);
      res.json({ result });
    } catch (error) {
      console.error("Agent execution failed:", error);
      res.status(502).json({ error: { code: "AGENT_EXECUTION_ERROR", message: error instanceof Error ? error.message : "Agent execution failed." } });
    }
  });

  app.post("/api/tasks", async (req: Request, res: Response) => {
    const parsed = taskRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: { code: "INVALID_REQUEST", message: "Invalid task request.", details: parsed.error.flatten() } });
      return;
    }
    try {
      const userId = (req as AuthenticatedRequest).userId;
      const task = await taskService.create(parsed.data.type, parsed.data.input, userId);
      await events.append(task.id, "task.queued", { type: task.type });
      res.status(202).json({ task });
    } catch (error) {
      console.error("Task creation failed:", error);
      res.status(503).json({ error: { code: "TASK_STORE_UNAVAILABLE", message: "Task service unavailable." } });
    }
  });

  app.get("/api/tasks/:id/events", async (req, res) => {
    const userId = (req as AuthenticatedRequest).userId;
    const task = await taskService.get(req.params.id, userId);
    if (!task) {
      res.status(404).json({ error: { code: "TASK_NOT_FOUND", message: "Task not found." } });
      return;
    }

    res.status(200);
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    let sequence = Number(req.query.after ?? 0);
    let closed = false;

    const writeEvents = async (): Promise<void> => {
      if (closed) return;
      try {
        const next = await events.listAfter(req.params.id, sequence);
        for (const event of next) {
          sequence = event.sequence;
          res.write(`id: ${event.sequence}\ndata: ${JSON.stringify(event)}\n\n`);
        }
      } catch (error) {
        console.error("Task event stream failed:", error);
        res.write(`event: error\ndata: ${JSON.stringify({ message: "Event stream failed." })}\n\n`);
      }
      if (!closed) setTimeout(() => void writeEvents(), 500);
    };

    req.on("close", () => {
      closed = true;
    });

    void writeEvents();
  });

  app.get("/api/tasks/:id", async (req, res) => {
    try {
      const task = await taskService.get(req.params.id, (req as AuthenticatedRequest).userId);
      if (!task) {
        res.status(404).json({ error: { code: "TASK_NOT_FOUND", message: "Task not found." } });
        return;
      }
      res.json({ task });
    } catch (error) {
      console.error("Task lookup failed:", error);
      res.status(503).json({ error: { code: "TASK_STORE_UNAVAILABLE", message: "Task service unavailable." } });
    }
  });

  app.use((_req, res) => {
    res.status(404).json({ error: { code: "NOT_FOUND", message: "Route not found." } });
  });

  return app;
}
