#!/bin/sh
set -eu

umask 077

RUNTIME_PROFILE="${CELTRONICS_RUNTIME_PROFILE:-local}"
case "$RUNTIME_PROFILE" in
  local|production)
    ;;
  *)
    echo "[docker] unsupported CELTRONICS_RUNTIME_PROFILE: $RUNTIME_PROFILE" >&2
    exit 1
    ;;
esac

DB_PATH="${CELTRONICS_DB_PATH:-/app/var/celtronics/db.json}"
UPLOAD_ROOT="${CELTRONICS_UPLOAD_ROOT:-/app/var/celtronics/uploads}"
BACKUP_ROOT="${CELTRONICS_DB_BACKUP_DIR:-/app/var/celtronics/backups}"
RUNTIME_ROOT="$(dirname "$DB_PATH")"

mkdir -p "$RUNTIME_ROOT" "$UPLOAD_ROOT" "$BACKUP_ROOT"

if [ ! -e "$DB_PATH" ]; then
  cp /app/seed/db.json "$DB_PATH"
  chmod 600 "$DB_PATH"

  CELTRONICS_DOCKER_SEED_PATH="$DB_PATH" node -e '
    const fs = require("fs");
    const dbPath = process.env.CELTRONICS_DOCKER_SEED_PATH;
    const db = JSON.parse(fs.readFileSync(dbPath, "utf8"));
    db.paymentControl = {
      enabled: false,
      maintenanceMessage: null,
      updatedAt: null,
    };
    fs.writeFileSync(dbPath, JSON.stringify(db, null, 2), { mode: 0o600 });
  '

  echo "[docker] initialized persistent database from packaged development seed"
  echo "[docker] local payment control starts disabled until real providers are configured"
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

ensure_secret() {
  env_name="$1"
  file_name="$2"
  secret_file="$RUNTIME_ROOT/$file_name"

  eval "current=\${$env_name:-}"
  if [ -n "$current" ]; then
    return
  fi

  if [ ! -f "$secret_file" ]; then
    node -e 'process.stdout.write(require("crypto").randomBytes(48).toString("base64url"))' > "$secret_file"
    chmod 600 "$secret_file"
  fi

  value="$(cat "$secret_file")"
  export "$env_name=$value"
}

if [ "$RUNTIME_PROFILE" = "production" ]; then
  if [ -z "${AUTH_SECRET:-}" ] || [ -z "${NEXTAUTH_SECRET:-}" ]; then
    echo "[docker] AUTH_SECRET and NEXTAUTH_SECRET are required in production runtime profile" >&2
    exit 1
  fi
else
  ensure_secret AUTH_SECRET .auth-secret
  ensure_secret NEXTAUTH_SECRET .nextauth-secret
fi

BOOTSTRAP_FILE="$RUNTIME_ROOT/.admin-bootstrap-password"

needs_bootstrap="$(node /app/bootstrap-state.cjs)"

if [ "$needs_bootstrap" = "yes" ] && [ -z "${ADMIN_BOOTSTRAP_PASSWORD:-}" ]; then
  if [ "$RUNTIME_PROFILE" = "production" ]; then
    echo "[docker] ADMIN_BOOTSTRAP_PASSWORD is required until the active admin is sealed" >&2
    exit 1
  fi

  if [ ! -f "$BOOTSTRAP_FILE" ]; then
    {
      printf 'Local-'
      node -e 'process.stdout.write(require("crypto").randomBytes(18).toString("base64url"))'
    } > "$BOOTSTRAP_FILE"
    chmod 600 "$BOOTSTRAP_FILE"
  fi

  ADMIN_BOOTSTRAP_PASSWORD="$(cat "$BOOTSTRAP_FILE")"
  export ADMIN_BOOTSTRAP_PASSWORD
  echo "[docker] local admin: admin@celtronics.pl"
  echo "[docker] local bootstrap password: $ADMIN_BOOTSTRAP_PASSWORD"
elif [ "$needs_bootstrap" = "no" ]; then
  rm -f "$BOOTSTRAP_FILE"
fi

exec node server.js
