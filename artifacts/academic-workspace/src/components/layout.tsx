import { useState } from "react";
import { useLocation, Link } from "wouter";
import {
  LayoutDashboard,
  ClipboardList,
  FileText,
  FileCheck2,
  History,
  PlusCircle,
  LogOut,
  User,
  Settings,
  Copy,
  Check,
  Share2,
  TrendingUp,
  Coins,
  Gift,
  Activity,
  Shield,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TeoraLogo } from "@/components/brand/teora-logo";

interface NavItemProps {
  href: string;
  icon: React.ElementType;
  label: string;
  active?: boolean;
}

function NavItem({ href, icon: Icon, label, active }: NavItemProps) {
  return (
    <Link href={href}>
      <div
        className={cn(
          "flex items-center gap-3 px-3 py-2.5 text-sm rounded-lg transition-all cursor-pointer group",
          active
            ? "bg-gradient-to-r from-[#2D79FF] to-[#8E54E9] text-white font-medium shadow-sm"
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
        {label}
      </div>
    </Link>
  );
}

export default function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { user, logout } = useAuth();
  const [copied, setCopied] = useState(false);

  const initials = user?.displayName
    ? user.displayName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : user?.email?.[0]?.toUpperCase() ?? "U";

  const referralLink = user?.referralCode
    ? `${typeof window !== "undefined" ? window.location.origin : ""}/register?ref=${user.referralCode}`
    : null;

  async function copyReferralCode() {
    if (!user?.referralCode) return;
    try {
      await navigator.clipboard.writeText(user.referralCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback: select the text
    }
  }

  async function copyReferralLink() {
    if (!referralLink) return;
    try {
      await navigator.clipboard.writeText(referralLink);
    } catch {
      // ignore
    }
  }

  // Placeholder token balance - would come from API in real implementation
  const tokenBalance = 850;
  const tokenLimit = 1000;
  const tokenPercent = Math.round((tokenBalance / tokenLimit) * 100);

  return (
    <div className="flex min-h-[100dvh] w-full bg-background text-foreground">
      {/* Sidebar */}
      <aside className="w-64 border-r border-border bg-sidebar flex-shrink-0 hidden md:flex flex-col">
        {/* Logo Header */}
        <div className="h-16 flex items-center px-4 border-b border-border">
          <TeoraLogo size="sm" />
        </div>

        {/* User Profile Section */}
        <div className="p-4 border-b border-border/50">
          <div className="flex items-center gap-3">
            <Avatar className="w-10 h-10 border-2 border-primary/20">
              <AvatarFallback className="text-sm bg-gradient-to-br from-[#2D79FF]/20 to-[#8E54E9]/20 text-primary font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate text-sidebar-foreground">
                {user?.displayName ?? user?.email ?? "User"}
              </p>
              <Badge
                variant="secondary"
                className="text-[10px] px-1.5 py-0 h-4 bg-gradient-to-r from-[#2D79FF]/10 to-[#8E54E9]/10 text-[#2D79FF] border-0 font-medium"
              >
                Premium Plan
              </Badge>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex-1 p-3 space-y-1 overflow-y-auto">
          <nav className="space-y-1">
            <NavItem
              href="/"
              icon={LayoutDashboard}
              label="Dashboard"
              active={location === "/"}
            />
            <NavItem
              href="/projects/new"
              icon={ClipboardList}
              label="Task Helper"
              active={location === "/projects/new"}
            />
            <NavItem
              href="/projects/new"
              icon={FileText}
              label="Paper Writer"
            />
            <NavItem
              href="/projects/new"
              icon={FileCheck2}
              label="Proposal Creator"
            />
            <NavItem
              href="/projects/1"
              icon={History}
              label="History"
            />
            <NavItem
              href="/finops"
              icon={TrendingUp}
              label="AI Usage"
              active={location === "/finops"}
            />
            <NavItem
              href="/referral"
              icon={Gift}
              label="Referral & Pricing"
              active={location === "/referral"}
            />
            <NavItem
              href="/status"
              icon={Activity}
              label="System Status"
              active={location === "/status"}
            />
            <NavItem
              href="/admin"
              icon={Shield}
              label="Admin Dashboard"
              active={location === "/admin"}
            />
          </nav>
        </div>

        {/* Credits & Settings Section */}
        <div className="p-3 border-t border-border space-y-3">
          {/* Upgrade Credits Button */}
          <Link href="/referral">
            <Button
              className="w-full bg-gradient-to-r from-[#2D79FF] to-[#8E54E9] hover:opacity-90 text-white shadow-sm"
            >
              <PlusCircle className="w-4 h-4 mr-2" />
              Upgrade Credits
            </Button>
          </Link>

          {/* Token Balance */}
          <Link href="/finops">
            <div className="bg-sidebar-accent/50 rounded-lg p-3 space-y-2 hover:bg-sidebar-accent transition-colors cursor-pointer">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Coins className="w-4 h-4 text-[#2D79FF]" />
                  <span className="text-xs font-medium text-sidebar-foreground">
                    Token Balance
                  </span>
                </div>
                <span className="text-xs font-mono font-semibold text-sidebar-foreground">
                  {tokenBalance.toLocaleString()}
                </span>
              </div>
              <div className="h-1.5 bg-sidebar-accent rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#2D79FF] to-[#8E54E9] rounded-full transition-all"
                  style={{ width: `${tokenPercent}%` }}
                />
              </div>
              <p className="text-[10px] text-sidebar-foreground/60">
                {tokenPercent}% used · resets in 14 days
              </p>
            </div>
          </Link>

          {/* Settings Link */}
          <div className="flex items-center gap-2">
            <Link
              href="/settings"
              className="flex-1 flex items-center gap-2 px-3 py-2 text-xs text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent rounded-md transition-colors"
            >
              <Settings className="w-3.5 h-3.5" />
              Settings
            </Link>
            <button
              onClick={() => logout()}
              className="p-2 text-sidebar-foreground/60 hover:text-destructive hover:bg-destructive/10 rounded-md transition-colors"
              title="Sign out"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Legal Links */}
          <div className="flex items-center justify-center gap-3 px-3 pt-2 border-t border-border/50">
            <Link
              href="/terms"
              className="text-[10px] text-sidebar-foreground/40 hover:text-sidebar-foreground/70 transition-colors"
            >
              ToS
            </Link>
            <span className="text-[10px] text-sidebar-foreground/30">•</span>
            <Link
              href="/privacy"
              className="text-[10px] text-sidebar-foreground/40 hover:text-sidebar-foreground/70 transition-colors"
            >
              Privacy
            </Link>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Mobile Header */}
        <div className="h-16 border-b border-border bg-sidebar px-4 flex items-center md:hidden shrink-0">
          <TeoraLogo size="sm" />
        </div>
        <div className="flex-1 overflow-auto p-4 md:p-8">
          <div className="mx-auto max-w-6xl">{children}</div>
        </div>
      </main>
    </div>
  );
}
