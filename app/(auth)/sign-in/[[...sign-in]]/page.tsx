import { FC } from "react";
import { SignIn } from "@clerk/nextjs";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign In",
};

// Sign-up is parked (see app/_lib/dormant.ts), so the "create an account"
// link loops back here rather than pointing at a 404.
const Page: FC = () => <SignIn signUpUrl="/sign-in" />;

export default Page;
