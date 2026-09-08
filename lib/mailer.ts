import nodemailer from "nodemailer";

const user = process.env.GMAIL_USER;
const pass = process.env.GMAIL_APP_PASSWORD;

if (!user || !pass) {
  throw new Error("Missing Gmail environment variables");
}

export const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: { user, pass },
});

export const mailFrom = process.env.MAIL_FROM ?? user;
