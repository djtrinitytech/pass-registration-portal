export type Registration = {
  id: string;
  name: string;
  sapid: string;
  email: string;
  phno: string;
  department: string | null;
  year: number | null;
  code: string;
  is_approved: boolean;
  email_status: "pending" | "sending" | "sent" | "failed" | "unknown";
  email_last_note: string | null;
  email_attempt_started_at: string | null;
  is_entered: boolean;
  created_at: string;
};
