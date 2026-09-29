import type { Task } from "../types/task.js";
import { PostgresTaskRepository } from "./task-repository.js";

export class TaskService {
  constructor(private readonly repository: PostgresTaskRepository) {}

  create(type: string, input: unknown): Promise<Task> {
    return this.repository.create(type, input);
  }

  get(id: string): Promise<Task | undefined> {
    return this.repository.get(id);
  }
}
