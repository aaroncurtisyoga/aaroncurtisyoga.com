import { z } from "zod";

// The public signup is an unauthenticated server action, so this schema is the
// only thing between a forged payload and the Resend contact list.
export const NewsletterFormSchema = z.object({
  // Trimmed and lowercased first so a pasted " Me@Example.com " is one clean
  // contact. 254 is the longest address a mail server will accept.
  email: z
    .string({ message: "Email address is required" })
    .trim()
    .toLowerCase()
    .max(254, "Please enter a valid email address")
    .email({ message: "Please enter a valid email address" }),
  // Optional on purpose: a name makes the "Hey {{{contact.first_name}}}"
  // greeting personal, but must never be a signup hurdle.
  //
  // Letters, spaces, apostrophes and hyphens only. The name is printed in the
  // welcome email, which goes to whatever address was typed, so free text
  // here ("Claim your prize at spam.example") would turn that email into a
  // way to send someone else's message from this domain. It also lands in
  // every later issue through a merge tag and in the admin's CSV export.
  firstName: z
    .string()
    .trim()
    .max(50, "First name must be 50 characters or fewer")
    .regex(/^(?:\p{L}[\p{L}\p{M}'’ -]*)?$/u, "Please use letters only")
    .optional(),
});

export const NewsletterSubscriberSchema = z.object({
  email: z
    .string({ message: "Email address is required" })
    .email({ message: "Please enter a valid email address" }),
  firstName: z
    .string()
    .max(100, "First name must be 100 characters or fewer")
    .optional(),
  lastName: z
    .string()
    .max(100, "Last name must be 100 characters or fewer")
    .optional(),
});

export const NewsletterSubscriberUpdateSchema = z.object({
  id: z.string().min(1, "Missing subscriber id"),
  firstName: z
    .string()
    .max(100, "First name must be 100 characters or fewer")
    .optional(),
  lastName: z
    .string()
    .max(100, "Last name must be 100 characters or fewer")
    .optional(),
  unsubscribed: z.boolean().optional(),
});

// Resend rejects broadcast scheduled_at values more than 30 days out; the
// composer's picker and sendNewsletter both enforce this so the failure is a
// clear message instead of a generic send error.
export const NEWSLETTER_SCHEDULE_MAX_DAYS = 30;

export const NewsletterComposeSchema = z.object({
  subject: z
    .string()
    .min(1, "Subject is required")
    .max(150, "Subject must be 150 characters or fewer"),
  previewText: z
    .string()
    .max(150, "Preview text must be 150 characters or fewer")
    .optional(),
  content: z.string().min(20, "Newsletter body is required"),
  // Auto-sections appended below the message; persisted so a send always uses
  // what the draft last showed, and so drafts reopen with the same toggles.
  // Plain booleans (no .default()) keep the schema's input and output types
  // identical, which react-hook-form's resolver typing requires.
  includeUpcoming: z.boolean(),
  includeClasses: z.boolean(),
  includeDescriptions: z.boolean(),
  // Events hidden from the auto-sections for this send. Ids of events that
  // have since passed just stop matching anything.
  excludedEventIds: z.array(z.string().max(64)).max(100),
});

export const CategoryFormSchema = z.object({
  category: z.string().min(2, "Category required"),
});
