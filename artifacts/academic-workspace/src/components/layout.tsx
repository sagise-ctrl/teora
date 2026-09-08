import { useState } from "react";
import { useLocation, Link } from "wouter";
import {
  LayoutDashboard,
  BookOpen,
  Brain,
  FolderKanban,
  ClipboardList,
  CreditCard,
  Coins,
  Settings,
  LogOut,
  ChevronDown,
  ChevronRight,
  Menu,
  X,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { useGetMyBalance } from "@/lib/api-client-react";import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { TeoraLogo } from "@/components/brand/teora-logo";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";

interface NavItemProps {
  href: string;
  icon: React.ElementType;
  label: string;
  active?: boolean;
  onNavigate?: () => void;
}

function NavItem({ href, icon: Icon, label, active, onNavigate }: NavItemProps) {
  return (
    <Link href={href} onClick={onNavigate}>
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

function NavSubItem({
  href,
  label,
  active,
  onNavigate,
}: {
  href: string;
  label: string;
  active?: boolean;
  onNavigate?: () => void;
}) {
  return (
    <Link href={href} onClick={onNavigate}>
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
        <Link href={"#"}>
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

interface SidebarNavProps {
  onNavigate?: () => void;
}

function SidebarNav({ onNavigate }: SidebarNavProps) {
  const [location] = useLocation();

  const isProjectActive = location.startsWith("/projects");
  const isAkunActive =
    location === "/akun" ||
    location === "/topup" ||
    location === "/ai-pricing" ||
    location === "/profile" ||
    location === "/usage" ||
    location === "/langganan";

  return (
    <div className="flex-1 p-3 space-y-1 overflow-y-auto">
      <nav className="space-y-1">
        <NavItem href="/dashboard" icon={LayoutDashboard} label="Dashboard" active={location === "/dashboard"} onNavigate={onNavigate} />

        <NavGroup icon={FolderKanban} label="Task Mentor" active={isProjectActive}>
          <NavSubItem href="/projects?type=general" label="General Task" onNavigate={onNavigate} />
          <NavSubItem href="/projects?type=academic" label="Academic Work" onNavigate={onNavigate} />
        </NavGroup>

        <NavItem href="/assessment" icon={ClipboardList} label="Assessment" active={location === "/assessment"} onNavigate={onNavigate} />

        <NavItem href="/practice" icon={Brain} label="Practice" active={location === "/practice"} onNavigate={onNavigate} />

        <NavItem href="/pustaka-saya" icon={BookOpen} label="Pustaka Saya" active={location === "/pustaka-saya"} onNavigate={onNavigate} />

        <div className="h-px bg-border/50 my-2" />

        <NavGroup icon={CreditCard} label="Akun" active={isAkunActive}>
          <NavSubItem href="/akun" label="Profil & Pengaturan" onNavigate={onNavigate} />
          <NavSubItem href="/langganan" label="Paket Berlangganan" onNavigate={onNavigate} />
          <NavSubItem href="/usage" label="Penggunaan" onNavigate={onNavigate} />
          <NavSubItem href="/topup" label="Topup Saldo" onNavigate={onNavigate} />
          <NavSubItem href="/ai-pricing" label="Teora Pricing" onNavigate={onNavigate} />
          <NavSubItem href="/bantuan" label="Pusat Bantuan" onNavigate={onNavigate} />
        </NavGroup>
      </nav>
    </div>
  );
}

function SidebarFooter({ onNavigate }: SidebarNavProps) {
  const { user, logout } = useAuth();
  const { data: balanceData, isLoading: balanceLoading } = useGetMyBalance();

  return (
    <div className="p-3 border-t border-border space-y-3">
      {/* Balance Display */}
      <Link href="/topup" onClick={onNavigate}>
        <div
          className={cn(
            "relative rounded-lg p-3 space-y-2 transition-colors cursor-pointer border bg-sidebar-accent/50 border-transparent hover:bg-sidebar-accent"
          )}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Coins className="w-4 h-4 text-[#2D79FF]" />
              <span className="text-xs font-medium text-sidebar-foreground">
                Saldo
              </span>
            </div>
            {balanceLoading ? (
              <Skeleton className="h-3 w-16" />
            ) : (
              <span className="text-xs font-mono font-semibold text-sidebar-foreground">
                {balanceData?.balanceDisplay ?? "Rp 0"}
              </span>
            )}
          </div>
          <p className="text-[10px] text-sidebar-foreground/60">
            Klik untuk topup saldo
          </p>
        </div>
      </Link>

      {/* Settings + Logout */}
      <div className="flex items-center gap-2">
        <Link
          href="/profile"
          onClick={onNavigate}
          className="flex-1 flex items-center gap-2 px-3 py-2 text-xs text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent rounded-md transition-colors"
        >
          <Settings className="w-3.5 h-3.5" />
          Settings
        </Link>
        <button
          onClick={() => {
            logout();
            onNavigate?.();
          }}
          className="p-2 text-sidebar-foreground/60 hover:text-destructive hover:bg-destructive/10 rounded-md transition-colors"
          title="Sign out"
        >
          <LogOut className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Legal Links */}
      <div className="flex items-center justify-center gap-3 px-3 pt-2 border-t border-border/50">
        <Link href="/terms" onClick={onNavigate} className="text-[10px] text-sidebar-foreground/40 hover:text-sidebar-foreground/70 transition-colors">ToS</Link>
        <span className="text-[10px] text-sidebar-foreground/30">•</span>
        <Link href="/privacy" onClick={onNavigate} className="text-[10px] text-sidebar-foreground/40 hover:text-sidebar-foreground/70 transition-colors">Privacy</Link>
      </div>

      {/* Hidden: keep user in scope to silence unused warnings */}
      <span className="hidden">{user?.id}</span>
    </div>
  );
}

function SidebarHeader({ onNavigate }: SidebarNavProps) {
  const { user } = useAuth();
  const initials = user?.displayName
    ? user.displayName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : user?.email?.[0]?.toUpperCase() ?? "U";

  return (
    <>
      {/* Logo Header */}
      <div className="h-16 flex items-center px-4 border-b border-border">
        <TeoraLogo size="sm" />
      </div>

      {/* User Profile Section */}
      <div className="p-4 border-b border-border/50">
        <Link href="/profile" onClick={onNavigate}>
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
    </>
  );
}

export default function Layout({ children }: { children: React.ReactNode }) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div className="flex min-h-[100dvh] w-full bg-background text-foreground">
      {/* Desktop Sidebar */}
      <aside className="w-64 border-r border-border bg-sidebar flex-shrink-0 hidden md:flex flex-col">
        <SidebarHeader />
        <SidebarNav />
        <SidebarFooter />
      </aside>

      {/* Mobile Drawer */}
      <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
        <SheetContent
          side="left"
          className="w-72 max-w-[85vw] p-0 bg-sidebar flex flex-col gap-0"
        >
          {/* Screen-reader title for accessibility */}
          <SheetTitle className="sr-only">Menu navigasi</SheetTitle>

          {/* Drawer header with logo + close button */}
          <div className="h-16 flex items-center justify-between px-4 border-b border-border shrink-0">
            <TeoraLogo size="sm" />
            <button
              type="button"
              onClick={() => setMobileNavOpen(false)}
              className="p-2 text-sidebar-foreground/70 hover:bg-sidebar-accent rounded-md transition-colors"
              aria-label="Tutup menu"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <SidebarHeader onNavigate={() => setMobileNavOpen(false)} />
          <SidebarNav onNavigate={() => setMobileNavOpen(false)} />
          <SidebarFooter onNavigate={() => setMobileNavOpen(false)} />
        </SheetContent>
      </Sheet>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Mobile Header */}
        <div className="h-16 border-b border-border bg-sidebar px-4 flex items-center justify-between md:hidden shrink-0">
          <button
            type="button"
            onClick={() => setMobileNavOpen(true)}
            className="p-2 -ml-2 text-sidebar-foreground/70 hover:bg-sidebar-accent rounded-md transition-colors"
            aria-label="Buka menu navigasi"
          >
            <Menu className="w-5 h-5" />
          </button>
          <TeoraLogo size="sm" />
          {/* Spacer to keep logo centered */}
          <div className="w-9" />
        </div>
        <div className="flex-1 overflow-auto p-4 md:p-8">
          <div className="mx-auto max-w-6xl">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
