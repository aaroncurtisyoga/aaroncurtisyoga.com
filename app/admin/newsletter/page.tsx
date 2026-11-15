"use client";

import { FC, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Newsletter } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { Mail, Plus } from "lucide-react";
import NewsletterTable from "@/app/admin/newsletter/_components/NewsletterTable";
import NewsletterNav from "@/app/admin/newsletter/_components/NewsletterNav";
import AdminPage from "@/app/admin/_components/AdminPage";
import { getNewsletters } from "@/app/_lib/actions/newsletter.actions";

const AdminNewsletterPage: FC = () => {
  const [newsletters, setNewsletters] = useState<Newsletter[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchNewsletters = useCallback(async () => {
    const data = await getNewsletters();
    setNewsletters(data);
  }, []);

  useEffect(() => {
    const load = async () => {
      await fetchNewsletters();
      setIsLoading(false);
    };
    load();
  }, [fetchNewsletters]);

  return (
    <AdminPage
      title="Newsletter"
      actions={
        <Button className="font-medium" asChild>
          <Link href="/admin/newsletter/create">
            <Plus className="w-4 h-4" /> New Newsletter
          </Link>
        </Button>
      }
    >
      <NewsletterNav />
      <Card className="shadow-lg">
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Spinner size="lg" />
            </div>
          ) : newsletters.length > 0 ? (
            <NewsletterTable
              newsletters={newsletters}
              onChanged={fetchNewsletters}
            />
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Mail className="w-12 h-12 mx-auto mb-3 text-muted-foreground/60" />
              <p>No newsletters yet. Write your first one to get started.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </AdminPage>
  );
};

export default AdminNewsletterPage;
