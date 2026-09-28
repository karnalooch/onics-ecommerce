"use strict"

const fs = require("fs")

function hasPasswordHash(user) {
  return (
    typeof user?.passwordHash === "string" &&
    user.passwordHash.length > 0
  )
}

function needsAdminBootstrap(users) {
  return (
    Array.isArray(users) &&
    users.some(
      (user) =>
        user &&
        user.roleType === "ADMIN" &&
        user.isBlocked !== true &&
        !hasPasswordHash(user)
    )
  )
}

if (require.main === module) {
  const dbPath =
    process.env.CELTRONICS_DB_PATH || "/app/var/celtronics/db.json"
  const db = JSON.parse(fs.readFileSync(dbPath, "utf8"))

  process.stdout.write(needsAdminBootstrap(db.users) ? "yes" : "no")
}

module.exports = {
  hasPasswordHash,
  needsAdminBootstrap,
}
