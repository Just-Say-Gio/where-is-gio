import bcrypt from "bcryptjs";
import crypto from "crypto";

// Characters excluding ambiguous ones (O/0/I/1)
const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generateInviteCode(): string {
  let code = "GIO-";
  for (let i = 0; i < 4; i++) {
    code += CODE_CHARS[crypto.randomInt(CODE_CHARS.length)];
  }
  return code;
}

export async function hashPin(pin: string): Promise<string> {
  return bcrypt.hash(pin, 10);
}

export async function verifyPin(pin: string, hash: string): Promise<boolean> {
  return bcrypt.compare(pin, hash);
}

export function generateSessionToken(): string {
  return crypto.randomBytes(32).toString("hex");
}
