import "server-only";
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import nodemailer from "nodemailer";
import { supabase } from "@/lib/supabase";

type GmailSettings = { user: string; password: string };
function encryptionKey() {
  const raw = process.env.MAIL_SETTINGS_KEY;
  if (!raw || !/^[a-f0-9]{64}$/i.test(raw)) throw new Error("Set MAIL_SETTINGS_KEY to a random 64-character hexadecimal key in Vercel.");
  return Buffer.from(raw, "hex");
}
export function senderKey(user: string) {
  let normalized = user.trim().toLowerCase();
  const [local, domain] = normalized.split("@");
  if (domain === "gmail.com" || domain === "googlemail.com") normalized = local.split("+")[0].replace(/\./g, "") + "@gmail.com";
  return createHash("sha256").update(normalized).digest("hex");
}
export function encryptSettings(settings: GmailSettings) {
  const iv = randomBytes(12), cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  cipher.setAAD(Buffer.from("trinity-gmail-settings-v1"));
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(settings), "utf8"), cipher.final()]);
  return [iv.toString("hex"), cipher.getAuthTag().toString("hex"), encrypted.toString("hex")].join(".");
}
export function decryptSettings(payload: string): GmailSettings {
  const [iv, tag, encrypted] = payload.split(".");
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(iv, "hex"));
  decipher.setAAD(Buffer.from("trinity-gmail-settings-v1")); decipher.setAuthTag(Buffer.from(tag, "hex"));
  return JSON.parse(Buffer.concat([decipher.update(Buffer.from(encrypted, "hex")), decipher.final()]).toString("utf8"));
}
export async function savedGmailSettings() {
  const { data, error } = await supabase.from("mail_sender_settings").select("encrypted_credentials").eq("singleton", true).maybeSingle();
  if (error) throw new Error("Sender settings are unavailable. Apply the email-delivery migration.");
  return data ? decryptSettings(data.encrypted_credentials) : null;
}
export async function saveGmailSettings(user: unknown, password: unknown) {
  if (typeof user !== "string" || !/^[a-z0-9][a-z0-9._+%-]*@(gmail\.com|googlemail\.com)$/i.test(user.trim()) || user.length > 254) throw new Error("Enter a personal Gmail address.");
  const normalized = typeof password === "string" ? password.replace(/\s/g, "") : "";
  if (!/^[a-z]{16}$/i.test(normalized)) throw new Error("Enter the 16-character Gmail app password, not your Google account password.");
  const settings = { user: user.trim().toLowerCase(), password: normalized };
  // Validate the encryption key before contacting Gmail; verify logs in, but sends no email.
  const encrypted = encryptSettings(settings);
  const transport = nodemailer.createTransport({ service: "gmail", auth: { user: settings.user, pass: settings.password }, connectionTimeout: 10000, greetingTimeout: 10000, socketTimeout: 15000 });
  try { await transport.verify(); } catch { throw new Error("Gmail sign-in failed. Check the address, app password and 2-Step Verification."); } finally { transport.close(); }
  const { error } = await supabase.from("mail_sender_settings").upsert({ singleton: true, encrypted_credentials: encrypted, updated_at: new Date().toISOString() });
  if (error) throw new Error("Unable to save the sender. The previous sender remains active.");
}
