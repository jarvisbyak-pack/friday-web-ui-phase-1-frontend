import type { Task } from "../types/task.js";
import { InMemoryTaskStore } from "./task-store.js";

export class TaskService {
  constructor(private readonly store: InMemoryTaskStore) {}

  create(type: string, input: unknown): Task {
    return this.store.create(type, input);
  }

  get(id: string): Task | undefined {
    return this.store.get(id);
  }
}
