import { useLocation, Link } from "wouter";
import {
  LayoutDashboard,
  Users,
  TrendingUp,
  Coins,
  Settings,
  Activity,
  ScrollText,
  Shield,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { TeoraLogo } from "@/components/brand/teora-logo";
import { Badge } from "@/components/ui/badge";

interface NavItemProps {
  href: string;
  icon: React.ElementType;
  label: string;
  badge?: string;
  active?: boolean;
}

function NavItem({ href, icon: Icon, label, badge, active }: NavItemProps) {
  return (
    <Link href={href}>
      <div
        className={cn(
          "flex items-center gap-3 px-3 py-2.5 text-sm rounded-lg transition-all cursor-pointer group",
          active
            ? "bg-gradient-to-r from-red-500 to-red-600 text-white font-medium shadow-sm"
            : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        )}
      >
        <Icon
          className={cn(
            "w-4 h-4",
            active
              ? "text-white"
              : "text-muted-foreground group-hover:text-sidebar-accent-foreground"
          )}
        />
        <span className="flex-1">{label}</span>
        {badge && (
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/20 text-white">
            {badge}
          </span>
        )}
        {!active && (
          <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/0 group-hover:text-muted-foreground/50 transition-all" />
        )}
      </div>
    </Link>
  );
}

const ADMIN_NAV = [
  { href: "/admin", icon: LayoutDashboard, label: "Overview" },
  { href: "/admin/users", icon: Users, label: "Manajemen Pengguna" },
  { href: "/admin/finops", icon: TrendingUp, label: "Financial Overview" },
  { href: "/admin/usage", icon: Coins, label: "Usage Teora" },
  { href: "/admin/ai-tiers", icon: Settings, label: "Konfigurasi Tier Teora" },
  { href: "/admin/health", icon: Activity, label: "System Health" },
  { href: "/admin/audit-log", icon: ScrollText, label: "Audit Log" },
  { href: "/admin/reports", icon: ScrollText, label: "Reports Archive" },
];

export default function AdminLayout({ children, activeTab }: { children: React.ReactNode; activeTab?: string }) {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  return (
    <div className="flex min-h-[100dvh] w-full bg-background text-foreground">
      {/* Admin Sidebar */}
      <aside className="w-64 border-r border-border bg-sidebar flex-shrink-0 hidden md:flex flex-col">
        {/* Header */}
        <div className="h-16 flex items-center px-4 border-b border-border justify-between">
          <TeoraLogo size="sm" />
          <Badge variant="destructive" className="text-[10px] font-bold">
            <Shield className="w-3 h-3 mr-1" />
            Admin
          </Badge>
        </div>

        {/* User Info */}
        <div className="p-4 border-b border-border/50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-red-500/20 to-red-600/20 flex items-center justify-center text-xs font-bold text-red-600">
              {user?.email?.[0]?.toUpperCase() ?? "A"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium truncate text-sidebar-foreground">
                {user?.email}
              </p>
              <p className="text-[10px] text-muted-foreground">Owner</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex-1 p-3 space-y-1 overflow-y-auto">
          <nav className="space-y-1">
            {ADMIN_NAV.map((item) => (
              <NavItem
                key={item.href}
                href={item.href}
                icon={item.icon}
                label={item.label}
                active={activeTab === item.href}
              />
            ))}
          </nav>
        </div>

        {/* Back to User Dashboard */}
        <div className="p-3 border-t border-border space-y-2">
          <Button
            variant="outline"
            size="sm"
            className="w-full text-xs"
            onClick={() => setLocation("/")}
          >
            ← Dashboard Pengguna (Mode Test)
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Mobile Header */}
        <div className="h-16 border-b border-border bg-sidebar px-4 flex items-center justify-between md:hidden shrink-0">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-red-600" />
            <span className="font-semibold text-sm">Admin Dashboard</span>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setLocation("/")}>
            Mode Pengguna
          </Button>
        </div>
        <div className="flex-1 overflow-auto p-4 md:p-8">
          <div className="mx-auto max-w-6xl">{children}</div>
        </div>
      </main>
    </div>
  );
}
