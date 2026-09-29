import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { pool } from "./pool.js";

const here = dirname(fileURLToPath(import.meta.url));
const migrationFiles = [
  "001_initial.sql",
  "002_conversations_memory_events.sql"
];

export async function migrate(): Promise<void> {
  for (const file of migrationFiles) {
    const sql = await readFile(join(here, "../../migrations", file), "utf8");
    await pool.query(sql);
  }
}
