// src/lib/jsonDb.ts
import fs from "fs";
import path from "path";

const DB_PATH = path.join(process.cwd(), "src", "data", "db.json");

export function readDb() {
  try {
    const data = fs.readFileSync(DB_PATH, "utf-8");
    return JSON.parse(data);
  } catch (error) {
    console.error("Błąd odczytu bazy danych:", error);
    return null;
  }
}

export function writeDb(data: any) {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), "utf-8");
    return true;
  } catch (error) {
    console.error("Błąd zapisu bazy danych:", error);
    return false;
  }
}
