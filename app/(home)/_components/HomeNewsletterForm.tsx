"use client";

import { useNewsletterSignup } from "@/app/_hooks/useNewsletterSignup";

export default function HomeNewsletterForm() {
  const {
    register,
    onSubmit,
    formState: { errors, isSubmitting, isSubmitSuccessful },
  } = useNewsletterSignup();

  return (
    <form onSubmit={onSubmit} noValidate className="w-full">
      <div className="flex flex-wrap gap-3">
        <label htmlFor="home-newsletter-email" className="sr-only">
          Email address
        </label>
        <input
          {...register("email")}
          id="home-newsletter-email"
          type="email"
          autoComplete="email"
          placeholder="Email address"
          disabled={isSubmitting}
          aria-invalid={errors.email ? true : undefined}
          className="min-w-0 flex-[1_1_200px] rounded-full bg-sand px-[22px] py-4 text-base leading-[normal] text-ink placeholder:text-ink-label focus:outline-none focus-visible:ring-2 focus-visible:ring-moss disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-full bg-ink px-[26px] py-4 font-medium text-sand transition-opacity hover:opacity-70 disabled:opacity-60"
        >
          {isSubmitting ? "Signing up…" : "Sign up"}
        </button>
      </div>
      {errors.email?.message ? (
        <p role="alert" className="mt-3 text-sm text-destructive">
          {errors.email.message}
        </p>
      ) : isSubmitSuccessful ? (
        <p role="status" className="mt-3 text-sm text-ink-muted">
          You’re on the list. Thank you!
        </p>
      ) : null}
    </form>
  );
}
