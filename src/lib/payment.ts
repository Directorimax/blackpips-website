import { supabase } from "@/integrations/supabase/client";

export interface PaymentAccount {
  id: string;
  provider: string;
  account_name: string;
  account_number: string;
  instructions: string | null;
  active: boolean;
}

export async function getPaymentAccounts() {
  const { data, error } = await (supabase as any)
    .from("payment_accounts")
    .select("*")
    .eq("active", true)
    .order("provider");

  if (error) throw error;

  return (data ?? []) as PaymentAccount[];
}