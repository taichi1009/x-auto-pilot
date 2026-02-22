"use client";

import { useState, useEffect } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { settingsApi } from "@/lib/api-client";

export function ClientLayout({ children }: { children: React.ReactNode }) {
  const [tier, setTier] = useState("free");

  useEffect(() => {
    settingsApi
      .apiUsage()
      .then((data) => setTier(data.tier))
      .catch(() => setTier("free"));
  }, []);

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 lg:ml-64">
        <Header tier={tier} />
        <main className="p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
