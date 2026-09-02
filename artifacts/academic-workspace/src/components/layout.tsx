import { useState } from "react";
import { useLocation, Link } from "wouter";
import {
  LayoutDashboard,
  BookOpen,
  FolderKanban,
  ClipboardList,
  CreditCard,
  Coins,
  Settings,
  LogOut,
  ChevronDown,
  ChevronRight,
  Bell,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { useGetMyBalance } from "@/lib/api-client-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { TeoraLogo } from "@/components/brand/teora-logo";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

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

function NavSubItem({ href, label, active }: { href: string; label: string; active?: boolean }) {
  return (
    <Link href={href}>
      <div
        className={cn(
          "flex items-center gap-3 pl-9 pr-3 py-2 text-sm rounded-lg transition-all cursor-pointer group",
          active
            ? "bg-[#2D79FF]/10 text-[#2D79FF] font-medium"
            : "text-sidebar-foreground/50 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground/70"
        )}
      >
        <span className="text-xs">{label}</span>
      </div>
    </Link>
  );
}

interface NavGroupProps {
  icon: React.ElementType;
  label: string;
  active?: boolean;
  children?: React.ReactNode;
}

function NavGroup({ icon: Icon, label, active, children }: NavGroupProps) {
  const [open, setOpen] = useState(false);
  const hasChildren = !!children;

  const handleClick = (e: React.MouseEvent) => {
    if (hasChildren) {
      e.preventDefault();
      setOpen(!open);
    }
  };

  return (
    <div>
      {hasChildren ? (
        <div
          className={cn(
            "flex items-center gap-3 px-3 py-2.5 text-sm rounded-lg transition-all cursor-pointer group",
            active || open
              ? "bg-gradient-to-r from-[#2D79FF] to-[#8E54E9] text-white font-medium shadow-sm"
              : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          )}
          onClick={handleClick}
        >
          <Icon
            className={cn(
              "w-4 h-4",
              active || open
                ? "text-white"
                : "text-muted-foreground group-hover:text-sidebar-accent-foreground"
            )}
          />
          <span className="flex-1">{label}</span>
          {open ? (
            <ChevronDown className="w-3.5 h-3.5 text-white/70" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-sidebar-accent-foreground" />
          )}
        </div>
      ) : (
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
      )}
      {hasChildren && open && (
        <div className="mt-1 space-y-0.5">{children}</div>
      )}
    </div>
  );
}

export default function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { user, logout } = useAuth();

  const { data: balanceData, isLoading: balanceLoading } = useGetMyBalance();

  const initials = user?.displayName
    ? user.displayName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : user?.email?.[0]?.toUpperCase() ?? "U";

  const isProjectActive = location.startsWith("/projects");
  const isAkunActive = location === "/akun" || location === "/topup" || location === "/ai-pricing" || location === "/profile";

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
          <Link href="/profile">
            <div className="flex items-center gap-3 hover:bg-sidebar-accent -m-2 p-2 rounded-md cursor-pointer transition-colors">
              <Avatar className="w-10 h-10 border-2 border-primary/20">
                <AvatarImage src={user?.avatarUrl ?? undefined} alt={user?.displayName ?? user?.email ?? "Anda"} />
                <AvatarFallback className="text-sm bg-gradient-to-br from-[#2D79FF]/20 to-[#8E54E9]/20 text-primary font-semibold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate text-sidebar-foreground">
                  {user?.displayName ?? user?.email ?? "Anda"}
                </p>
                <Badge
                  variant="secondary"
                  className="text-[10px] px-1.5 py-0 h-4 bg-gradient-to-r from-[#2D79FF]/10 to-[#8E54E9]/10 text-[#2D79FF] border-0 font-medium"
                >
                  Premium Plan
                </Badge>
              </div>
            </div>
          </Link>
        </div>

        {/* Navigation */}
        <div className="flex-1 p-3 space-y-1 overflow-y-auto">
          <nav className="space-y-1">
            {/* Dashboard */}
            <NavItem href="/" icon={LayoutDashboard} label="Dashboard" active={location === "/"} />

            {/* Task Mentor (collapsible) */}
            <NavGroup icon={FolderKanban} label="Task Mentor" active={isProjectActive}>
              <NavSubItem href="/projects?type=general" label="General Task" />
              <NavSubItem href="/projects?type=academic" label="Academic Work" />
            </NavGroup>

            {/* Assessment */}
            <NavItem href="/assessment" icon={ClipboardList} label="Assessment" active={location === "/assessment"} />

            {/* Pustaka Saya */}
            <NavItem href="/pustaka-saya" icon={BookOpen} label="Pustaka Saya" active={location === "/pustaka-saya"} />

            {/* Separator */}
            <div className="h-px bg-border/50 my-2" />

            {/* Akun (collapsible) */}
            <NavGroup icon={CreditCard} label="Akun" active={isAkunActive}>
              <NavSubItem href="/akun" label="Profil & Pengaturan" />
              <NavSubItem href="/topup" label="Topup Saldo" />
              <NavSubItem href="/ai-pricing" label="Teora Pricing" />
            </NavGroup>
          </nav>
        </div>

        {/* Bottom Section: Balance + Settings */}
        <div className="p-3 border-t border-border space-y-3">
          {/* Balance Display */}
          <Link href="/topup">
            <div className="bg-sidebar-accent/50 rounded-lg p-3 space-y-2 hover:bg-sidebar-accent transition-colors cursor-pointer">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Coins className="w-4 h-4 text-[#2D79FF]" />
                  <span className="text-xs font-medium text-sidebar-foreground">Saldo</span>
                </div>
                {balanceLoading ? (
                  <Skeleton className="h-3 w-16" />
                ) : (
                  <span className="text-xs font-mono font-semibold text-sidebar-foreground">
                    {balanceData?.balanceDisplay ?? "Rp 0"}
                  </span>
                )}
              </div>
              <p className="text-[10px] text-sidebar-foreground/60">Klik untuk topup saldo</p>
            </div>
          </Link>

          {/* Settings + Logout */}
          <div className="flex items-center gap-2">
            <Link
              href="/profile"
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
            <Link href="/terms" className="text-[10px] text-sidebar-foreground/40 hover:text-sidebar-foreground/70 transition-colors">ToS</Link>
            <span className="text-[10px] text-sidebar-foreground/30">•</span>
            <Link href="/privacy" className="text-[10px] text-sidebar-foreground/40 hover:text-sidebar-foreground/70 transition-colors">Privacy</Link>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Mobile Header */}
        <div className="h-16 border-b border-border bg-sidebar px-4 flex items-center justify-between md:hidden shrink-0">
          <TeoraLogo size="sm" />
          {/* Notification Bell */}
          <button className="p-2 text-sidebar-foreground/70 hover:bg-sidebar-accent rounded-md transition-colors">
            <Bell className="w-5 h-5" />
          </button>
        </div>
        <div className="flex-1 overflow-auto p-4 md:p-8">
          <div className="mx-auto max-w-6xl">{children}</div>
        </div>
      </main>
    </div>
  );
}
