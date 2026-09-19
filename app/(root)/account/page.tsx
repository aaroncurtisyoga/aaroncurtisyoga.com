import { FC } from "react";
import { Event, Order } from "@prisma/client";
import PurchaseHistoryTable from "@/app/(root)/account/_components/PurchaseHistoryTable";
import { getOrdersByUser } from "@/app/_lib/actions/order.actions";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Account",
};

type OrderWithEventFields = Order & {
  // Private-session orders have no event, so this relation can be null.
  event: Pick<Event, "title" | "id"> | null;
};

export type OrderResponse = {
  data: OrderWithEventFields[];
  totalPages: number;
};

interface AccountPageProps {
  searchParams: Promise<{
    ordersPage?: string;
  }>;
}

const AccountPage: FC<AccountPageProps> = async ({ searchParams }) => {
  const resolvedParams = await searchParams;
  const ordersPage = Number(resolvedParams?.ordersPage) || 1;

  // getOrdersByUser reads the buyer from the session itself.
  const orders: OrderResponse = await getOrdersByUser({ page: ordersPage });

  return (
    <section className={"wrapper py-5 md:py-10"}>
      <h3 className={"text-xl mb-5"}>Purchase History</h3>
      <PurchaseHistoryTable orders={orders} />
    </section>
  );
};

export default AccountPage;
