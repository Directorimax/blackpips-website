import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabase } from "@/integrations/supabase/client";

const notificationInput = z.object({
  type: z.enum([
    "welcome",
    "payment_approved",
    "course_unlocked",
    "mentorship_approved",
    "mentorship_rejected",
    "certificate_earned",
    "payment_submitted",
    "payment_rejected",
    "mentorship_submitted",
    "alc_access_approved",
    "alc_access_rejected",
  ]),
  resourceId: z.string().uuid(),
});

/**
 * The only browser-callable notification entry point. It authenticates the caller
 * before dynamically loading the server-only Resend service, so provider secrets
 * and templates never enter the client bundle.
 */
const sendNotificationServer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(notificationInput)
  .handler(async ({ data, context }) => {
    const { assertRateLimit } = await import("@/lib/security.server");
    assertRateLimit("notification", 10, 60_000, context.userId);
    const { sendNotification: deliverNotification } = await import("./email.service.server");
    return deliverNotification({ ...data, actorId: context.userId });
  });

/**
 * Browser-safe notification entry point that forwards the current session to the
 * server-only authorization middleware.
 */
export async function sendNotification({ data }: { data: z.infer<typeof notificationInput> }) {
  const { data: sessionData, error } = await supabase.auth.getSession();
  if (error || !sessionData.session?.access_token) {
    console.warn("[email] Notification skipped because no authenticated session is available.");
    return { delivered: false };
  }

  return sendNotificationServer({
    data,
    headers: { Authorization: `Bearer ${sessionData.session.access_token}` },
  });
}
