import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { paths } from "../paths.js";

export function createDatabase(): Database.Database {
  mkdirSync(paths.dataDir, { recursive: true });
  const db = new Database(paths.databaseFile);
  db.pragma("foreign_keys = ON");
  return db;
}

