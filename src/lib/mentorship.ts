export const MENTOR_WHATSAPP_NUMBER = "255693413655";

export function mentorshipWhatsAppUrl(packageName: string) {
  const message = `Hello Emmanuel,\n\nMy mentorship application has been approved.\n\nPackage: ${packageName}\n\nI would like to schedule my mentorship sessions.\n\nThank you.`;
  return `https://wa.me/${MENTOR_WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}
