"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

export function AnalyticsBeacon() {
  const pathname = usePathname();

  useEffect(() => {
    fetch("/api/analytics/pageview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: pathname }),
      keepalive: true,
    }).catch(() => {});
  }, [pathname]);

  return null;
}
