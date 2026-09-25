import { FC } from "react";
import { Skeleton } from "@/components/ui/skeleton";

const CheckoutSkeleton: FC = () => {
  return (
    <div className="rounded-[20px] bg-sand-deep p-7">
      <Skeleton className="mb-5 h-10 w-24 bg-line/60" />
      <Skeleton className="h-12 w-full rounded-full bg-line/60" />
    </div>
  );
};

export default CheckoutSkeleton;
