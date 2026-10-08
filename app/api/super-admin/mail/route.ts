import { NextResponse } from "next/server";
import { staffApiError } from "@/lib/staff-auth";
import { mailConfiguration } from "@/lib/mailer";
import { supabase } from "@/lib/supabase";
export const runtime = "nodejs";
export async function GET(request: Request) {
  const error = await staffApiError(request,"super"); if(error) return error;
  let configuration;
  try { configuration = await mailConfiguration(); } catch { return NextResponse.json({error:"Sender configuration unavailable. Check the migration and MAIL_SETTINGS_KEY."},{status:503}); }
  const [control,attempts,registrations,usage] = await Promise.all([
    supabase.from("mail_control").select("paused,note,daily_budget").eq("singleton",true).single(),
    supabase.from("mail_attempts").select("id,status,started_at,completed_at,note,registrations(code,name,email)").order("started_at",{ascending:false}).limit(50),
    supabase.from("registrations").select("code,name,email,email_status,email_last_note,email_attempt_started_at").eq("is_approved",true).in("email_status",["failed","unknown","sending"]).order("created_at",{ascending:false}).limit(100),
    supabase.from("mail_attempts").select("id",{head:true,count:"exact"}).eq("sender_key",configuration.senderKey).gt("started_at",new Date(Date.now()-86400000).toISOString()).in("status",["sending","sent","unknown"]),
  ]);
  if([control,attempts,registrations,usage].some(r=>r.error)) return NextResponse.json({error:"Email tracking is not configured. Apply the email-delivery migration."},{status:503});
  return NextResponse.json({configuration,control:control.data,attempts:attempts.data,registrations:registrations.data,used:usage.count},{headers:{"Cache-Control":"no-store"}});
}
export async function POST(request: Request) {
  const authError = await staffApiError(request,"super");if(authError)return authError;
  try { const {paused} = await request.json();if(typeof paused!=="boolean")return NextResponse.json({error:"Choose whether to pause sending."},{status:400});
    const {error}=await supabase.from("mail_control").update({paused,note:paused?"Paused by super admin.":""}).eq("singleton",true);
    if(error)throw error;return NextResponse.json({ok:true});
  } catch {return NextResponse.json({error:"Unable to update sending status."},{status:503});}
}
