import "server-only";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
type Pass = { name: string; sapid: string; code: string };
function escapeHtml(value: string) { return value.replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]!)); }
export function passEmailContent(student: Pass) {
  const name = escapeHtml(student.name), code = escapeHtml(student.code), sapid = escapeHtml(student.sapid);
  return {
    subject: "Your Trinity Garba Night pass is ready ✨",
    text: `Hello ${student.name},\n\nYour Garba Night entry pass is approved!\n\nDJSCE Trinity · Garba Night\nFriday, 9 October 2026\nMukesh Patel Hall (Underground)\n\nRegistration code: ${student.code}\nSAP ID: ${student.sapid}\n\nShow the attached QR code at the gate. Save it on your phone before arriving. This pass admits one attendee and can be scanned for entry once. Keep your code and QR private.\n\nEvent page: https://pass.djstrinity.in\n\nSee you on the dance floor!\nDJSCE Trinity`,
    html: `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width,initial-scale=1" /><title>Your Garba Night pass</title><style>@media only screen and (max-width:480px){.email-pad{padding-left:22px!important;padding-right:22px!important}.email-title{font-size:38px!important}}</style></head>
<body style="margin:0;padding:0;background-color:#f5eee5;font-family:Arial,Helvetica,sans-serif;color:#351225;">
<div style="display:none;font-size:1px;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;mso-hide:all;">Your entry pass for Trinity Garba Night is ready. Save your QR and join us on 9 October.</div>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#f5eee5;"><tr><td align="center" style="padding:24px 0;">
<!--[if mso]><table role="presentation" width="600"><tr><td><![endif]-->
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;max-width:600px;background-color:#fffaf2;border:1px solid #e0caa5;border-radius:12px;overflow:hidden;">
<tr><td align="center" class="email-pad" style="padding:24px 36px 32px;background-color:#351225;">
<img src="cid:trinity-logo" width="200" alt="DJSCE Trinity" style="display:block;width:200px;max-width:100%;height:auto;border:0;margin:0 auto 8px;" />
<p style="margin:0 0 16px;color:#efc675;font-size:11px;line-height:18px;letter-spacing:3px;">DJSCE TRINITY PRESENTS</p>
<h1 class="email-title" style="margin:0;color:#fff5df;font-family:Georgia,'Times New Roman',serif;font-size:46px;line-height:1.12;font-weight:normal;">Your pass is ready.</h1>
<p style="margin:14px 0 0;color:#efc675;font-family:Georgia,'Times New Roman',serif;font-size:27px;line-height:36px;font-style:italic;">Let’s make it a Garba Night.</p></td></tr>
<tr><td class="email-pad" style="padding:28px 36px 24px;"><p style="margin:0 0 10px;font-size:18px;line-height:28px;font-weight:bold;">Hey ${name},</p><p style="margin:0;font-size:15px;line-height:25px;color:#68514e;">Your entry pass is approved. Bring your whole crew, your best festive fit, and this QR code. We’ll meet you on the dance floor.</p></td></tr>
<tr><td class="email-pad" style="padding:26px 36px;background-color:#efc675;"><p style="margin:0 0 14px;font-size:11px;letter-spacing:2px;line-height:18px;font-weight:bold;">YOUR NIGHT, AT A GLANCE</p><h2 style="margin:0 0 18px;font-family:Georgia,'Times New Roman',serif;font-size:30px;line-height:36px;font-weight:normal;">Trinity Garba Night</h2><p style="margin:0 0 6px;font-size:15px;line-height:24px;"><strong>When:</strong> Friday, 9 October 2026</p><p style="margin:0;font-size:15px;line-height:24px;"><strong>Where:</strong> Mukesh Patel Hall (Underground)</p></td></tr>
<tr><td align="center" class="email-pad" style="padding:30px 36px 26px;"><h2 style="margin:0 0 8px;font-size:20px;line-height:28px;">Your way into the celebration</h2><p style="margin:0 0 22px;font-size:14px;line-height:23px;color:#68514e;">Show this QR code at the gate.<br />Save it on your phone before you arrive.</p>
<table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" style="background-color:#ffffff;border:1px dashed #c99845;border-radius:10px;"><tr><td style="padding:16px;"><img src="cid:event-pass-qr" alt="Your single-use entry QR code" width="220" height="220" style="display:block;width:220px;height:220px;border:0;" /></td></tr></table>
<p style="margin:20px 0 5px;font-size:11px;line-height:18px;letter-spacing:2px;color:#80614c;">REGISTRATION CODE</p><p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:27px;line-height:36px;font-weight:bold;letter-spacing:5px;">${code}</p><p style="margin:9px 0 0;font-size:13px;line-height:22px;color:#68514e;">SAP ID: ${sapid}</p><p style="margin:18px 0 24px;font-size:12px;line-height:20px;color:#80614c;">Admits one · Single-use entry<br />Keep your QR and registration code private.</p>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"><tr><td align="center" bgcolor="#351225" style="border-radius:5px;"><a href="https://pass.djstrinity.in" style="display:block;padding:16px 12px;color:#fff5df;font-size:12px;line-height:20px;letter-spacing:2px;font-weight:bold;text-decoration:none;">VIEW EVENT PAGE</a></td></tr></table></td></tr>
<tr><td align="center" class="email-pad" style="padding:8px 36px 24px;"><img src="cid:garba-dancers" alt="Garba dancers celebrating" width="150" style="display:block;width:150px;max-width:100%;height:auto;border:0;" /><p style="margin:12px 0 0;font-family:Georgia,'Times New Roman',serif;font-size:25px;line-height:34px;color:#71303e;font-style:italic;">See you on the dance floor.</p></td></tr>
<tr><td align="center" style="padding:22px;background-color:#351225;"><p style="margin:0;color:#efc675;font-size:12px;line-height:20px;letter-spacing:2px;font-weight:bold;">DJSCE TRINITY</p><p style="margin:6px 0 0;color:#d5bbc2;font-size:11px;line-height:18px;">This is your event entry pass. The QR is also attached to this email.</p></td></tr>
</table><!--[if mso]></td></tr></table><![endif]--></td></tr></table></body></html>`,
  };
}
export async function passEmailAssets() {
  const [logo, dancers] = await Promise.all([readFile(join(process.cwd(), "public/images/trinity-logo-email.png")), readFile(join(process.cwd(), "public/images/garba-dancers-email.png"))]);
  return [{ filename: "trinity-logo.png", content: logo, contentType: "image/png", cid: "trinity-logo" }, { filename: "garba-dancers.png", content: dancers, contentType: "image/png", cid: "garba-dancers" }];
}
