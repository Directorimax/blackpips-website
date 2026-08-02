import { createServerFn } from "@tanstack/react-start";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getPaymentProofKind } from "@/lib/payment-proof";

const inputSchema = z.object({ paymentId: z.string().uuid() }).strict();
const table = (client: unknown) => client as SupabaseClient;

export const getAdminPaymentProof = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(inputSchema)
  .handler(async ({ data, context }) => {
    const { data: isAdmin, error: adminError } = await table(context.supabase).rpc("is_admin");
    if (adminError || isAdmin !== true) {
      const error = new Error("Administrator access required.") as Error & { statusCode: number };
      error.statusCode = 403;
      throw error;
    }

    const { assertRateLimit } = await import("@/lib/security.server");
    assertRateLimit("admin-payment-proof", 60, 60_000, context.userId);

    const { data: payment, error: paymentError } = await table(context.supabase)
      .from("payments")
      .select("id, proof_url")
      .eq("id", data.paymentId)
      .single();
    if (paymentError || !payment?.proof_url) throw new Error("Payment proof was not found.");

    const expiresIn = 120;
    const { data: signed, error: signedError } = await table(context.supabase)
      .storage.from("payment-proofs")
      .createSignedUrl(payment.proof_url, expiresIn);
    if (signedError || !signed?.signedUrl) throw new Error("Could not load the payment proof.");

    return {
      signedUrl: signed.signedUrl,
      kind: getPaymentProofKind(payment.proof_url),
      expiresAt: new Date(Date.now() + expiresIn * 1000).toISOString(),
    };
  });
