import bcrypt from "bcrypt"
import { runPasswordWork } from "@/lib/passwordWorkBudget"

const DUMMY_LOGIN_PASSWORD_HASH =
  "$2b$12$dUSFKqT1FCMYZ6hcQfsxuONizEqcX8IGK8snfVSowP5Uu.TDJoPUq"

export async function consumeRejectedLoginPasswordWork(password: string) {
  await runPasswordWork(() =>
    bcrypt.compare(password, DUMMY_LOGIN_PASSWORD_HASH).then(() => undefined)
  )
}
