"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { instructorEmailAddress } from "@/app/_lib/constants";
import { CalendarDays, Home } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 md:px-6 py-12">
      <div className="max-w-2xl w-full text-center">
        {/* 404 Display */}
        <div className="mb-8">
          <h1 className="text-8xl md:text-9xl font-bold text-muted-foreground/30 select-none">
            404
          </h1>
          <div className="relative -mt-8 md:-mt-12">
            <h2 className="text-2xl md:text-3xl font-semibold text-foreground">
              Page Not Found
            </h2>
          </div>
        </div>

        {/* Description */}
        <p className="text-muted-foreground text-lg mb-8 leading-relaxed max-w-md mx-auto">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
          Let&apos;s get you back on track.
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Button size="lg" className="font-medium min-w-[140px]" asChild>
            <Link href="/">
              <Home className="w-4 h-4" /> Home
            </Link>
          </Button>

          <Button
            variant="outline"
            size="lg"
            className="font-medium min-w-[140px] border-2"
            asChild
          >
            <Link href="/#classes">
              <CalendarDays className="w-4 h-4" /> Upcoming classes
            </Link>
          </Button>
        </div>

        {/* Additional Help */}
        <div className="mt-12 pt-8 border-t border-border">
          <p className="text-sm text-muted-foreground">
            Need help?{" "}
            <Link
              href={`mailto:${instructorEmailAddress}`}
              className="text-primary hover:underline font-medium"
            >
              Contact us
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
