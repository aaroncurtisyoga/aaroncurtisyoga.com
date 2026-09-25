"use client";

import { FC } from "react";
import { SignedIn, SignedOut, SignInButton, useUser } from "@clerk/nextjs";
import { Event } from "@prisma/client";
import CheckoutButton from "@/app/(home)/events/[id]/_components/CheckoutButton";
import CheckoutSkeleton from "@/app/(home)/events/[id]/_components/CheckoutSkeleton";
import { PAYMENTS_PARKED } from "@/app/_lib/dormant";
import { richTextToPlainText } from "@/app/_lib/utils";
import { PILL } from "./styles";

const CARD = "rounded-[20px] bg-sand-deep p-7";

interface ICheckoutButtonProps {
  event: Event;
}

const Checkout: FC<ICheckoutButtonProps> = ({ event }) => {
  const { user, isLoaded: isUserLoaded } = useUser();
  const userId = user?.publicMetadata.userId as string;
  const hasEventFinished = new Date(event.endDateTime) < new Date();
  // Taught somewhere else with no booking link to send people to, so the
  // price and sign-up details live in the description instead.
  const studioSignUp =
    event.isHostedExternally &&
    !event.isExternal &&
    !event.externalRegistrationUrl;
  // The description's first paragraph, same as the homepage card's lead, so
  // the "how do I get in" line is the first thing a phone shows.
  const studioLead = studioSignUp
    ? richTextToPlainText((event.description ?? "").split(/<\/p>/i)[0])
    : "";

  if (hasEventFinished) {
    return (
      <div className={CARD}>
        <p className="text-ink-muted">This one has already happened.</p>
      </div>
    );
  }

  if (!isUserLoaded) {
    return <CheckoutSkeleton />;
  }

  return (
    <div id="event-checkout" className={CARD}>
      {!studioSignUp && (
        <p className="mb-5 font-cormorant text-[40px] leading-none">
          {event.isFree ? "Free" : `$${event.price}`}
        </p>
      )}
      {event.isExternal && event.externalUrl ? (
        <a
          href={event.externalUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={PILL}
        >
          Register at Bright Bear
        </a>
      ) : event.isHostedExternally && event.externalRegistrationUrl ? (
        <a
          href={event.externalRegistrationUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={PILL}
        >
          Register
        </a>
      ) : studioSignUp ? (
        <>
          <p className="mb-2 text-[13px] uppercase tracking-[0.12em] text-ink-label">
            How to join
          </p>
          <p className="font-cormorant text-[24px] leading-[1.25] text-ink">
            {studioLead || "Sign up at the studio, not on this site."}
          </p>
        </>
      ) : PAYMENTS_PARKED ? (
        <p className="text-[17px] leading-[1.5] text-ink-muted">
          Booking for this one isn&apos;t open here yet. Get in touch and
          I&apos;ll save you a spot.
        </p>
      ) : (
        <>
          <SignedOut>
            <SignInButton>
              <button type="button" className={PILL}>
                Sign in to purchase
              </button>
            </SignInButton>
          </SignedOut>
          <SignedIn>
            <CheckoutButton event={event} userId={userId} />
          </SignedIn>
        </>
      )}
    </div>
  );
};

export default Checkout;
