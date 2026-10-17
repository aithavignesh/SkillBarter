"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

const trackedPaths = new Set([
  "/dashboard",
  "/onboarding",
  "/matches",
  "/exchanges",
  "/notifications",
  "/community",
  "/reviews",
  "/admin"
]);

export default function AnalyticsTracker() {
  const pathname = usePathname();
  const lastTrackedPath = useRef<string | null>(null);

  useEffect(() => {
    // The event API requires authentication. Track only known app routes so public
    // landing/auth pages and unknown paths do not generate guaranteed 401s or noise.
    if (!pathname || !trackedPaths.has(pathname) || lastTrackedPath.current === pathname) return;
    lastTrackedPath.current = pathname;
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
