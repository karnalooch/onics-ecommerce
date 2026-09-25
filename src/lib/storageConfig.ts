import path from "path"

type PersistentPathOptions = {
  envName: string
  configuredPath?: string | null
  developmentFallback: string
  nodeEnv?: string
}

export function resolvePersistentPath({
  envName,
  configuredPath,
  developmentFallback,
  nodeEnv = process.env.NODE_ENV,
}: PersistentPathOptions) {
  const configured = configuredPath?.trim()
  if (configured) return path.resolve(configured)

  if (nodeEnv === "production") {
    throw new Error(
      `${envName} jest wymagane w produkcji i musi wskazywać trwały, zapisywalny wolumen.`
    )
  }

  return path.resolve(developmentFallback)
}
