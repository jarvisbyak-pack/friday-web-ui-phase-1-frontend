import type { Task } from "../types/task.js";
import { PostgresTaskRepository } from "./task-repository.js";

export class TaskWorker {
  private running = false;

  constructor(
    private readonly repository: PostgresTaskRepository,
    private readonly pollMs = 1000,
    private readonly staleTaskMs = 300000
  ) {}

  start(): void {
    if (this.running) return;
    this.running = true;
    void this.loop();
  }

  stop(): void {
    this.running = false;
  }

  private async loop(): Promise<void> {
    while (this.running) {
      try {
        await this.repository.recoverStaleRunningTasks(this.staleTaskMs);

        const task = await this.repository.claimNext();
        if (task) {
          await this.execute(task);
        } else {
          await this.sleep(this.pollMs);
        }
      } catch (error) {
        console.error("Task worker error:", error);
        await this.sleep(this.pollMs);
      }
    }
  }

  private async execute(task: Task): Promise<void> {
    try {
      const result = {
        status: "accepted",
        taskId: task.id,
        type: task.type
      };
      await this.repository.complete(task.id, result);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await this.repository.fail(task.id, message);
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
