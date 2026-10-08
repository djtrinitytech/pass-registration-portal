import "server-only";
import nodemailer from "nodemailer";
import { savedGmailSettings, senderKey } from "@/lib/mail-settings";

function environmentConfiguration() {
  const custom = Boolean(process.env.SMTP_HOST);
  return {
    provider: custom ? "SMTP" : "Gmail",
    sender: process.env.MAIL_FROM ?? (custom ? process.env.SMTP_USER : process.env.GMAIL_USER) ?? "Not configured",
    configured: custom ? Boolean(process.env.SMTP_USER && process.env.SMTP_PASSWORD && process.env.MAIL_FROM) : Boolean(process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD),
  };
}
export async function getMailer() {
  const saved = await savedGmailSettings();
  const config = saved ? { provider: "Gmail", sender: saved.user, configured: true } : environmentConfiguration();
  if (!config.configured) throw Object.assign(new Error("Email configuration is missing."), { code: "ECONFIG" });
  const custom = !saved && Boolean(process.env.SMTP_HOST);
  const port = Number(process.env.SMTP_PORT ?? "465");
  if (!Number.isInteger(port) || ![465, 587].includes(port)) throw Object.assign(new Error("Use SMTP port 465 or 587."), { code: "ECONFIG" });
  const options = custom ? {
    host: process.env.SMTP_HOST, port, secure: port === 465, requireTLS: port === 587,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD },
  } : { service: "gmail", auth: { user: saved?.user ?? process.env.GMAIL_USER, pass: saved?.password ?? process.env.GMAIL_APP_PASSWORD } };
  return { transporter: nodemailer.createTransport({ ...options, connectionTimeout: 10000, greetingTimeout: 10000, socketTimeout: 20000 }), from: config.sender, senderKey: senderKey(saved?.user ?? (custom ? process.env.SMTP_USER ?? config.sender : process.env.GMAIL_USER ?? config.sender)) };
}
export async function mailConfiguration() {
  const saved = await savedGmailSettings();
  const config = saved ? { provider: "Gmail", sender: saved.user, configured: true } : environmentConfiguration();
  return { ...config, senderKey: senderKey(saved?.user ?? (process.env.SMTP_HOST ? process.env.SMTP_USER ?? config.sender : process.env.GMAIL_USER ?? config.sender)), canChangeSender: /^[a-f0-9]{64}$/i.test(process.env.MAIL_SETTINGS_KEY ?? "") };
}
