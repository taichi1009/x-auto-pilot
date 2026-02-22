"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard,
  MessageSquare,
  FileText,
  Calendar,
  UserPlus,
  BarChart3,
  Settings,
  Menu,
  X,
  Zap,
  User,
  Target,
  Shield,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/auth-context";

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  adminOnly?: boolean;
}

const navItems: NavItem[] = [
  { label: "ダッシュボード", href: "/", icon: LayoutDashboard },
  { label: "投稿", href: "/posts", icon: MessageSquare },
  { label: "テンプレート", href: "/templates", icon: FileText },
  { label: "スケジュール", href: "/schedule", icon: Calendar },
  { label: "ペルソナ", href: "/persona", icon: User },
  { label: "戦略", href: "/strategy", icon: Target },
  { label: "フォロー管理", href: "/following", icon: UserPlus, badge: "Basic+" },
  { label: "分析", href: "/analytics", icon: BarChart3, badge: "Basic+" },
  { label: "設定", href: "/settings", icon: Settings },
  { label: "管理パネル", href: "/admin", icon: Shield, adminOnly: true },
];

export function Sidebar() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const { user } = useAuth();

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  const filteredItems = navItems.filter(
    (item) => !item.adminOnly || user?.role === "admin"
  );

  return (
    <>
      {/* Mobile menu button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed top-4 left-4 z-50 p-2 rounded-lg bg-muted text-foreground lg:hidden"
        aria-label="Toggle menu"
      >
        {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {/* Overlay for mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-0 z-40 h-full w-64 bg-card border-r border-border flex flex-col transition-transform duration-200 lg:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-6 py-5 border-b border-border">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-600">
            <Zap className="h-4 w-4 text-white" />
          </div>
          <span className="text-lg font-bold text-foreground">X Auto-Pilot</span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {filteredItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                  active
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                )}
              >
                <Icon className="h-5 w-5 shrink-0" />
                <span className="flex-1">{item.label}</span>
                {item.badge && (
                  <Badge
                    variant="outline"
                    className="text-[10px] px-1.5 py-0 border-blue-500/30 text-blue-400"
                  >
                    {item.badge}
                  </Badge>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border">
          {user && (
            <div className="mb-2">
              <p className="text-sm font-medium text-foreground truncate">{user.name}</p>
              <p className="text-xs text-muted-foreground truncate">{user.email}</p>
            </div>
          )}
          <p className="text-xs text-muted-foreground">X Auto-Pilot v1.0</p>
        </div>
      </aside>
    </>
  );
}
