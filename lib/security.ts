import { timingSafeEqual } from "node:crypto";

export function isAdminSecretValid(secret: unknown) {
  const expected = process.env.ADMIN_SECRET;
  if (typeof secret !== "string" || !expected) return false;
  const actualBuffer = Buffer.from(secret);
  const expectedBuffer = Buffer.from(expected);
  return actualBuffer.length === expectedBuffer.length && timingSafeEqual(actualBuffer, expectedBuffer);
}

export function normalizeCode(value: unknown) {
  return typeof value === "string" ? value.trim().toUpperCase() : "";
}
