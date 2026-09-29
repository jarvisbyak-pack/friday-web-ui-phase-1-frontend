import express, { type Request, type Response } from "express";
import { z } from "zod";
import { PostgresTaskRepository } from "./tasks/task-repository.js";
import { TaskService } from "./tasks/task-service.js";

const taskRequestSchema = z.object({
  type: z.string().trim().min(1).max(200),
  input: z.unknown().optional()
});

export function createApi() {
  const app = express();
  const taskService = new TaskService(new PostgresTaskRepository());

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

  app.post("/api/tasks", async (req: Request, res: Response) => {
    const parsed = taskRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: { code: "INVALID_REQUEST", message: "Invalid task request.", details: parsed.error.flatten() }
      });
      return;
    }

    try {
      const task = await taskService.create(parsed.data.type, parsed.data.input);
      res.status(202).json({ task });
    } catch (error) {
      console.error("Task creation failed:", error);
      res.status(503).json({ error: { code: "TASK_STORE_UNAVAILABLE", message: "Task service unavailable." } });
    }
  });

  app.get("/api/tasks/:id", async (req, res) => {
    try {
      const task = await taskService.get(req.params.id);
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
