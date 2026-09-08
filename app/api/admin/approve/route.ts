import QRCode from "qrcode";
import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { isAdminSecretValid, normalizeCode } from "@/lib/security";
import { mailFrom, transporter } from "@/lib/mailer";

export async function POST(request: Request) {
  try {
    const { secret, code: rawCode } = await request.json();
    if (!isAdminSecretValid(secret)) return NextResponse.json({ error: "Invalid admin PIN" }, { status: 401 });
    const code = normalizeCode(rawCode);

    const { data: student, error: updateError } = await supabase
      .from("registrations")
      .update({ is_approved: true })
      .eq("code", code)
      .eq("is_approved", false)
      .select("id, name, sapid, email, code")
      .maybeSingle();

    if (updateError) throw updateError;
    if (!student) return NextResponse.json({ error: "Pass already approved or registration not found." }, { status: 409 });

    const qrDataUrl = await QRCode.toDataURL(student.id, { errorCorrectionLevel: "M", margin: 1, width: 520 });
    const qrBase64 = qrDataUrl.split(",")[1];
    await transporter.sendMail({
      from: mailFrom,
      to: student.email,
      subject: "Your event entry pass",
      text: `Your pass is approved. Show the attached QR code at the gate. Registration code: ${student.code}`,
      html: `<div style="font-family:Arial,sans-serif"><h2>Entry pass approved</h2><p>Hello ${student.name}, your event pass is ready. Show the QR code at the gate.</p><img src="cid:event-pass-qr" alt="Event entry QR code" width="320" /><p>Registration code: <strong>${student.code}</strong></p></div>`,
      attachments: [{ filename: "event-pass-qr.png", content: qrBase64, encoding: "base64", cid: "event-pass-qr" }],
    });

    return NextResponse.json({ message: "Pass approved and emailed.", student: { name: student.name, sapid: student.sapid } });
  } catch (error) {
    console.error("Pass approval failed", error);
    return NextResponse.json({ error: "Pass was not issued. Check mail configuration and try again." }, { status: 500 });
  }
}
