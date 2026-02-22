"use client";

import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { useAuth } from "@/contexts/auth-context";

const authPages = ["/login", "/register"];

export function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, loading } = useAuth();

  // Auth pages: no sidebar/header
  if (authPages.includes(pathname)) {
    return <>{children}</>;
  }

  // While loading auth, show minimal layout
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-foreground" />
      </div>
    );
  }

  const tier = user?.subscription_tier || "free";

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
