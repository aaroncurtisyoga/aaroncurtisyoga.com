"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { addNewsletterEntry } from "@/app/_lib/actions/newsletter.actions";
import { NewsletterFormSchema } from "@/app/_lib/schema";

export type NewsletterSignupData = z.infer<typeof NewsletterFormSchema>;

/**
 * Submit logic shared by the newsletter signup forms (homepage and the
 * /newsletter band). Owns validation, the server call, and the inline
 * error/success state; each form only decides how to render its fields.
 */
export function useNewsletterSignup() {
  const form = useForm<NewsletterSignupData>({
    resolver: zodResolver(NewsletterFormSchema),
  });
  const { handleSubmit, reset, setError, clearErrors } = form;

  const onSubmit = handleSubmit(async (data) => {
    clearErrors();
    const result = await addNewsletterEntry(data);

    if (result.formErrors || result.apiError) {
      setError("email", {
        type: "manual",
        message: result.message || "Something went wrong",
      });
      return;
    }

    // reset() runs before react-hook-form flips isSubmitSuccessful, so the
    // success message still shows on the now-empty form.
    reset();
    setTimeout(() => {
      clearErrors();
    }, 3000);
  });

  return { ...form, onSubmit };
}
