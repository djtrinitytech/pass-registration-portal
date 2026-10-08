import { NextResponse } from "next/server";
import { staffApiError } from "@/lib/staff-auth";
import { normalizeCode } from "@/lib/security";
import { issuePassEmail } from "@/lib/pass-email";
export const runtime = "nodejs";
export const maxDuration = 60;
export async function POST(request:Request) {
  const authError=await staffApiError(request,"super");if(authError)return authError;
  try {const body=await request.json(),code=normalizeCode(body.code);
    if(!/^[A-Z2-9]{6}$/.test(code))return NextResponse.json({error:"Enter a valid registration code."},{status:400});
    const result=await issuePassEmail(code,body.confirmUncertain===true);return NextResponse.json(result,{status:result.status});
  }catch{return NextResponse.json({error:"Email service unavailable."},{status:503});}
}
