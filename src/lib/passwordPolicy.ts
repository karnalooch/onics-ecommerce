export const BCRYPT_MAX_PASSWORD_BYTES = 72

export function passwordUtf8ByteLength(password: string) {
  return new TextEncoder().encode(password).byteLength
}

export function isPasswordWithinBcryptLimit(password: string) {
  return passwordUtf8ByteLength(password) <= BCRYPT_MAX_PASSWORD_BYTES
}
