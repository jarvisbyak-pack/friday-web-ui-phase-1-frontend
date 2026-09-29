import express, { type Request, type Response } from "express";
import { z } from "zod";
import { TaskService } from "./tasks/task-service.js";
import { InMemoryTaskStore } from "./tasks/task-store.js";

const taskRequestSchema = z.object({
  type: z.string().trim().min(1).max(200),
  input: z.unknown().optional()
});

export function createApi() {
  const app = express();
  const taskService = new TaskService(new InMemoryTaskStore());

  app.disable("x-powered-by");
  app.use(express.json({ limit: "2mb" }));

  app.get("/api/health", (_req, res) => {
    res.json({
      ok: true,
      service: "friday-backend",
      timestamp: new Date().toISOString()
    });
  });

  app.get("/api/ready", (_req, res) => {
    res.json({ ok: true, ready: true });
  });

  app.post("/api/tasks", (req: Request, res: Response) => {
    const parsed = taskRequestSchema.safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({
        error: {
          code: "INVALID_REQUEST",
          message: "Invalid task request.",
          details: parsed.error.flatten()
        }
      });
      return;
    }

    const task = taskService.create(parsed.data.type, parsed.data.input);
    res.status(202).json({ task });
  });

  app.get("/api/tasks/:id", (req, res) => {
    const task = taskService.get(req.params.id);

    if (!task) {
      res.status(404).json({
        error: {
          code: "TASK_NOT_FOUND",
          message: "Task not found."
        }
      });
      return;
    }

    res.json({ task });
  });

  app.use((_req, res) => {
    res.status(404).json({
      error: {
        code: "NOT_FOUND",
        message: "Route not found."
      }
    });
  });

  return app;
}
