import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const notificationInput = z.object({
  type: z.enum([
    "welcome",
    "payment_approved",
    "course_unlocked",
    "mentorship_approved",
    "mentorship_rejected",
    "certificate_earned",
  ]),
  resourceId: z.string().uuid(),
});

/**
 * The only browser-callable notification entry point. It authenticates the caller
 * before dynamically loading the server-only Resend service, so provider secrets
 * and templates never enter the client bundle.
 */
export const sendNotification = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(notificationInput)
  .handler(async ({ data, context }) => {
    console.info("[email] Notification function entered", {
      type: data.type,
      resourceId: data.resourceId,
      actorId: context.userId,
    });
    const { sendNotification: deliverNotification } = await import("./email.service.server");
    console.info("[email] Notification service module loaded", { type: data.type });
    const result = await deliverNotification({ ...data, actorId: context.userId });
    console.info("[email] Notification server function completed", {
      type: data.type,
      resourceId: data.resourceId,
      delivered: result.delivered,
    });
    return result;
  });
