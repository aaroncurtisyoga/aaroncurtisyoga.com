"use client";

import { FC } from "react";
import AdminPage from "@/app/admin/_components/AdminPage";
import NewsletterNav from "@/app/admin/newsletter/_components/NewsletterNav";
import SubscribersManager from "@/app/admin/newsletter/_components/SubscribersManager";

const SubscribersPage: FC = () => {
  return (
    <AdminPage title="Newsletter">
      <NewsletterNav />
      <SubscribersManager />
    </AdminPage>
  );
};

export default SubscribersPage;
