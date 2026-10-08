import "server-only";
import QRCode from "qrcode";
import { supabase } from "@/lib/supabase";
import { getMailer } from "@/lib/mailer";
import { passEmailAssets, passEmailContent } from "@/lib/pass-email-template";

export type EmailStatus = "pending" | "sending" | "sent" | "failed" | "unknown";
type ClaimedStudent = { id: string; name: string; email: string; sapid: string; code: string; email_attempt_id: string };
export async function issuePassEmail(code: string, allowUncertain = false) {
  const { transporter, from, senderKey } = await getMailer();
  const { data, error } = await supabase.rpc("claim_pass_email", { registration_code: code, allow_uncertain: allowUncertain, sender_key: senderKey });
  if (error) { transporter.close(); throw new Error("Email tracking is unavailable. Apply the email-delivery migration first."); }
  if (data?.state !== "claimed") { transporter.close(); return { status: 409, error: data?.message ?? "Unable to claim this email." }; }
  const student = data.student as ClaimedStudent;
  let status: EmailStatus = "failed", note = "Email could not be prepared. It can be retried.", smtpAccepted = false, smtpStarted = false;
  try {
    const qrDataUrl = await QRCode.toDataURL(student.id, { errorCorrectionLevel: "M", margin: 1, width: 520 });
    const assets = await passEmailAssets();
    smtpStarted = true;
    const result = await transporter.sendMail({
      from, to: student.email, ...passEmailContent(student),
      attachments: [{ filename: "event-pass-qr.png", content: qrDataUrl.split(",")[1], encoding: "base64", cid: "event-pass-qr" }, ...assets],
    });
    smtpAccepted = result.accepted.some(address => String(address).toLowerCase() === student.email.toLowerCase());
    status = smtpAccepted ? "sent" : "failed";
    note = smtpAccepted ? "Email accepted by the mail provider." : "Mail provider rejected the recipient. Check the email address before retrying.";
  } catch (error) {
    const smtp = error as { code?: string; responseCode?: number; response?: string };
    const explicitlyRejected = !smtpStarted || Boolean(smtp.responseCode && smtp.responseCode >= 400) || ["EAUTH", "EENVELOPE", "ECONFIG"].includes(smtp.code ?? "");
    status = explicitlyRejected ? "failed" : "unknown";
    note = explicitlyRejected ? "Mail provider rejected the email. Check sender configuration or sending quota, then retry." : "Delivery outcome is uncertain. Check the sender's Sent folder and recipient before retrying; another send may duplicate the pass email.";
    console.error("Pass email not completed", { code: smtp.code, responseCode: smtp.responseCode });
  } finally { transporter.close(); }
  const { error: finishError } = await supabase.rpc("finish_pass_email", { attempt_id: student.email_attempt_id, outcome: status, outcome_note: note });
  if (finishError) return { status: 503, error: smtpAccepted ? "Email was accepted, but its status could not be saved. Ask the super admin to review it before retrying." : "Email status could not be saved. Ask the super admin to review it before retrying." };
  return status === "sent" ? { status: 200, message: note, email_status: status } : { status: 502, error: note, email_status: status };
}
