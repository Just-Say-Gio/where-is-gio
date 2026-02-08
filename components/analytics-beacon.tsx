"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

export function AnalyticsBeacon() {
  const pathname = usePathname();

  useEffect(() => {
    const friendId = localStorage.getItem("gio_friend_id");
    fetch("/api/analytics/pageview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: pathname, friendId: friendId ? Number(friendId) : undefined }),
      keepalive: true,
    }).catch(() => {});
  }, [pathname]);

  return null;
}
