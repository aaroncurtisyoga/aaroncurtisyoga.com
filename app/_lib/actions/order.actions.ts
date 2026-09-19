"use server";

import { redirect } from "next/navigation";
import Stripe from "stripe";
import prisma from "@/app/_lib/prisma";
import {
  CheckoutOrderParams,
  GetOrdersByEventParams,
  GetOrdersByUserParams,
} from "@/app/_lib/types";
import { auth } from "@clerk/nextjs/server";
import { requireAdmin } from "@/app/_lib/auth";
import { PAYMENTS_PARKED } from "@/app/_lib/dormant";
import { handleError } from "@/app/_lib/utils";
import {
  calculateSkipAmount,
  calculateTotalPages,
} from "@/app/_lib/utils/pagination";
import { buildOrderSearchConditions } from "@/app/_lib/utils/query-builders";
import { serialize } from "@/app/_lib/utils/serialize";

export const checkoutOrder = async (order: CheckoutOrderParams) => {
  // An unauthenticated POST endpoint that takes the price and the product name
  // from its caller, so it must not reach Stripe while nothing is being sold.
  // The path-based switch can't cover a server action, hence the guard here.
  // Before clearing PAYMENTS_PARKED: require a session, take buyerId from
  // sessionClaims, and read the price from the Event row, not the argument.
  if (PAYMENTS_PARKED) {
    throw new Error("Checkout is disabled while payments are parked.");
  }
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
  const price = order.isFree ? 0 : Number(order.price) * 100;

  let checkoutSession: Stripe.Checkout.Session;

  // Metadata for order tracking
  const metadata: { [key: string]: string } = {
    buyerId: order.buyerId,
    type: order.type,
    // Events include eventId, private sessions don't
    ...(order.eventId && { eventId: order.eventId }),
  };

  try {
    checkoutSession = await stripe.checkout.sessions.create({
      line_items: [
        {
          price_data: {
            currency: "usd",
            unit_amount: price,
            product_data: {
              name: order.name,
            },
          },
          quantity: 1,
        },
      ],
      metadata,
      mode: "payment",
      success_url: `${process.env.NEXT_PUBLIC_SERVER_URL}/account`,
      cancel_url: `${process.env.NEXT_PUBLIC_SERVER_URL}/`,
    });
  } catch (error) {
    handleError(error);
    throw error;
  }
  redirect(checkoutSession.url as string);
};

export async function getOrdersByEvent({
  searchString,
  eventId,
}: GetOrdersByEventParams) {
  try {
    // Exported from a "use server" module, so this is a public POST endpoint.
    // It returns buyer names for an event and must check the caller itself.
    await requireAdmin();

    const whereConditions = buildOrderSearchConditions(searchString, eventId);

    const orders = await prisma.order.findMany({
      where: whereConditions,
      include: {
        event: {
          select: { title: true },
        },
        buyer: {
          select: { firstName: true, lastName: true },
        },
      },
    });
    return serialize(orders) as unknown as typeof orders;
  } catch (error) {
    handleError(error);
    return [];
  }
}

/**
 * The signed-in buyer's own order history. `userId` is deliberately ignored:
 * this is a public POST endpoint, so trusting a caller-supplied id would let
 * anyone read anyone else's purchases. The id comes from the session instead.
 */
export async function getOrdersByUser({
  limit = 10,
  page,
}: Omit<GetOrdersByUserParams, "userId">) {
  try {
    const { sessionClaims } = await auth();
    const userId = sessionClaims?.metadata?.userId as string | undefined;

    // No session → no orders. Coercing the null away would drop the filter and
    // return everyone's orders.
    if (!userId) return { data: [], totalPages: 0 };

    const skipAmount = calculateSkipAmount(Number(page), limit);
    const whereConditions = { buyer: { id: userId } };

    const [orders, totalOrders] = await Promise.all([
      prisma.order.findMany({
        where: whereConditions,
        orderBy: { createdAt: "desc" },
        skip: skipAmount,
        take: limit,
        include: { event: { select: { title: true, id: true } } },
      }),
      prisma.order.count({
        where: whereConditions,
      }),
    ]);

    return {
      data: serialize(orders) as unknown as typeof orders,
      totalPages: calculateTotalPages(totalOrders, limit),
    };
  } catch (error) {
    handleError(error);
    return {
      data: [],
      totalPages: 0,
    };
  }
}
