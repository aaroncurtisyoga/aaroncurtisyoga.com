"use client";

import { FC, FormEvent, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Event, OrderType } from "@prisma/client";
import { checkoutOrder } from "@/app/_lib/actions/order.actions";

// No Stripe.js here on purpose. checkoutOrder redirects to Stripe's hosted
// checkout, so the browser SDK is never used. A module-scope loadStripe() used
// to sit here and pulled js.stripe.com onto every public event page.

type CheckoutProps = { event: Event; userId: string };

const CheckoutButton: FC<CheckoutProps> = ({ event, userId }) => {
  useEffect(() => {
    // Check to see if this is a redirect back from Checkout
    const query = new URLSearchParams(window.location.search);
    if (query.get("success")) {
      console.log("Order placed! You will receive an email confirmation.");
    }

    if (query.get("canceled")) {
      console.log(
        "Order canceled -- continue to shop around and checkout when you’re ready.",
      );
    }
  }, []);

  const onCheckout = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const order = {
      buyerId: userId,
      eventId: event.id,
      isFree: event.isFree,
      name: event.title,
      price: event.price ?? "0",
      type: OrderType.EVENT,
    };

    await checkoutOrder(order);
  };

  return (
    <form onSubmit={(e) => onCheckout(e)} method="post">
      <Button variant="accent" type="submit" className="w-full">
        {event.isFree ? "Get Ticket" : "Buy Ticket"}
      </Button>
    </form>
  );
};

export default CheckoutButton;
