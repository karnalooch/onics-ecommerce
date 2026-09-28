#!/bin/sh
set -eu

umask 077

DB_PATH="${CELTRONICS_DB_PATH:-/app/var/celtronics/db.json}"
UPLOAD_ROOT="${CELTRONICS_UPLOAD_ROOT:-/app/var/celtronics/uploads}"
BACKUP_ROOT="${CELTRONICS_DB_BACKUP_DIR:-/app/var/celtronics/backups}"

mkdir -p "$(dirname "$DB_PATH")" "$UPLOAD_ROOT" "$BACKUP_ROOT"

if [ ! -e "$DB_PATH" ]; then
  cp /app/seed/db.json "$DB_PATH"
  chmod 600 "$DB_PATH"
  echo "[docker] initialized persistent database from packaged development seed"
fi

node -e '
  const fs = require("fs");
  const dbPath = process.env.CELTRONICS_DB_PATH || "/app/var/celtronics/db.json";
  const raw = fs.readFileSync(dbPath, "utf8");
  const parsed = JSON.parse(raw);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("CELTRONICS_DB_PATH must contain a JSON object");
  }
'

exec node server.js
