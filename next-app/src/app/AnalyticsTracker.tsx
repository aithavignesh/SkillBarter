"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

export default function AnalyticsTracker() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname || ["/login", "/signup", "/forgot-password", "/reset-password"].includes(pathname)) return;
    void fetch("/api/analytics/event", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "page_view", path: pathname }),
      keepalive: true
    }).catch(() => {
      // Analytics must never interrupt navigation or user workflows.
    });
  }, [pathname]);

  return null;
}
