import { randomInt } from "node:crypto";
import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { departments, years } from "@/lib/event";

export const runtime = "nodejs";

const codeAlphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function createCode() {
  return Array.from({ length: 6 }, () => codeAlphabet[randomInt(codeAlphabet.length)]).join("");
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const sapid = typeof body.sapid === "string" ? body.sapid.trim() : "";
    const phno = typeof body.phno === "string" ? body.phno.trim() : "";
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const department = typeof body.department === "string" ? body.department : "";
    const year = typeof body.year === "string" ? body.year : "";
    if (!departments.some((value) => value === department) || !years.some((value) => value === year)) {
      return NextResponse.json({ error: "Select a valid department and year of study." }, { status: 400 });
    }

    if (!name || !sapid || !phno || !email || !/^\S+@\S+\.\S+$/.test(email)) {
      return NextResponse.json({ error: "Enter a valid name, SAP ID, phone number, and email." }, { status: 400 });
    }

    const { data: existing, error: lookupError } = await supabase
      .from("registrations")
      .select("id")
      .or(`sapid.eq.${sapid},email.eq.${email}`)
      .maybeSingle();

    if (lookupError) throw lookupError;
    if (existing) return NextResponse.json({ error: "SAP ID or Email already registered" }, { status: 409 });

    for (let attempt = 0; attempt < 3; attempt += 1) {
      const code = createCode();
      const { data, error } = await supabase
        .from("registrations")
        .insert({ name, sapid, phno, email, department, year: Number(year), code })
        .select("id, code")
        .single();

      if (!error && data) return NextResponse.json({ code: data.code }, { status: 201 });
      if (error?.code === "23505" && error.message.includes("code")) continue;
      if (error?.code === "23505") return NextResponse.json({ error: "SAP ID or Email already registered" }, { status: 409 });
      throw error;
    }

    return NextResponse.json({ error: "Could not generate a unique registration code. Try again." }, { status: 503 });
  } catch (error) {
    console.error("Registration failed", error);
    const databaseCode = typeof error === "object" && error !== null && "code" in error ? error.code : null;
    if (databaseCode === "42703" || databaseCode === "PGRST204") {
      return NextResponse.json({ error: "Registration setup is incomplete. Please contact the event desk." }, { status: 503 });
    }
    return NextResponse.json({ error: "Registration is temporarily unavailable." }, { status: 500 });
  }
}
