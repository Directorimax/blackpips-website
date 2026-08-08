import { z } from "zod";

// eslint-disable-next-line no-control-regex -- removes unsafe control characters from submitted text.
const clean = (value: string) => value.replace(/[\u0000-\u001F\u007F]/g, "").trim();

export const ALC_PROGRAMS = [
  "Regular Class",
  "Advanced Class",
  "Master Class",
  "Live Classes",
  "Online Classes",
  "Other",
] as const;

export const alcAccessSchema = z
  .object({
    fullName: z.string().min(2).max(120).transform(clean),
    studyYear: z.coerce.number().int().min(2010).max(new Date().getFullYear()),
    email: z.string().email().max(255).transform(clean),
    phone: z
      .string()
      .regex(/^[0-9+() -]{7,32}$/)
      .transform(clean),
    program: z.enum(ALC_PROGRAMS),
    otherProgram: z.string().max(80).transform(clean).optional(),
    additionalDetails: z.string().max(1000).transform(clean).optional(),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (value.program === "Other" && !value.otherProgram)
      ctx.addIssue({
        code: "custom",
        path: ["otherProgram"],
        message: "Please specify the program.",
      });
  });

export type AlcAccessForm = {
  fullName: string;
  studyYear: number;
  email: string;
  phone: string;
  program: (typeof ALC_PROGRAMS)[number];
  otherProgram?: string;
  additionalDetails?: string;
};

export function alcWhatsAppUrl(input: AlcAccessForm, requestId: string) {
  const ref = requestId.slice(0, 8);
  const message = `Hello BlackPips,\n\nI have submitted an ALC Access request.\n\nFull name: ${input.fullName}\nStudy year: ${input.studyYear}\nProgram: ${input.program}${input.otherProgram ? ` (${input.otherProgram})` : ""}\nEmail: ${input.email}\nPhone: ${input.phone}\nRequest reference: ${ref}\n\nI am requesting access to the ALC student video library.`;
  // Imewekwa namba yako sahihi 255693413655
  return `https://wa.me/255693413655?text=${encodeURIComponent(message)}`;
}
