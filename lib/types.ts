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
  is_entered: boolean;
  created_at: string;
};
