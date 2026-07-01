import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// Reads/writes the same db.json file on every call — simplest possible
// persistence for a mock server. Not safe for concurrent writes, fine here.

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, "..", "socialmedia-db.json");

export const readDB = () => JSON.parse(fs.readFileSync(DB_PATH, "utf-8"));
export const writeDB = (db) =>
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));

/** Simple unique-enough string ID generator for new records. */
export const genId = () =>
  Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
