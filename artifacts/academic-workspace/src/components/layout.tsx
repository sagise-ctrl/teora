import { useState } from "react";
import { useLocation, Link } from "wouter";
import {
  BookOpen,
  Library,
  PlusCircle,
  LogOut,
  User,
  Settings,
  Copy,
  Check,
  Share2,
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

  return (
    <div className="flex min-h-[100dvh] w-full bg-background text-foreground">
      {/* Sidebar */}
      <aside className="w-64 border-r border-border bg-sidebar flex-shrink-0 hidden md:flex flex-col">
        <div className="h-16 flex items-center px-6 border-b border-border">
          <BookOpen className="w-6 h-6 text-primary mr-3" />
          <span className="font-serif font-bold text-lg text-primary tracking-tight">
            Teora
          </span>
        </div>

        <div className="p-4 flex-1">
          <nav className="space-y-1">
            <Link href="/">
              <div
                className={cn(
                  "flex items-center px-3 py-2 text-sm rounded-md transition-colors cursor-pointer group",
                  location === "/"
                    ? "bg-primary text-primary-foreground font-medium"
                    : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                )}
              >
                <Library
                  className={cn(
                    "w-4 h-4 mr-3",
                    location === "/"
                      ? "text-primary-foreground"
                      : "text-muted-foreground group-hover:text-sidebar-accent-foreground",
                  )}
                />
                Projects
              </div>
            </Link>
            <Link href="/projects/new">
              <div
                className={cn(
                  "flex items-center px-3 py-2 text-sm rounded-md transition-colors cursor-pointer group",
                  location === "/projects/new"
                    ? "bg-primary text-primary-foreground font-medium"
                    : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                )}
              >
                <PlusCircle
                  className={cn(
                    "w-4 h-4 mr-3",
                    location === "/projects/new"
                      ? "text-primary-foreground"
                      : "text-muted-foreground group-hover:text-sidebar-accent-foreground",
                  )}
                />
                New Project
              </div>
            </Link>
          </nav>
        </div>

        {/* Referral Section */}
        {user?.referralCode && (
          <div className="px-4 pb-4">
            <div className="bg-sidebar-accent rounded-lg p-3 space-y-2">
              <p className="text-xs font-medium text-sidebar-accent-foreground opacity-70">
                Share & Earn
              </p>
              <div className="flex items-center gap-1.5">
                <code className="flex-1 text-sm font-mono font-semibold text-sidebar-accent-foreground bg-sidebar-accent/50 px-1.5 py-0.5 rounded">
                  {user.referralCode}
                </code>
                <button
                  onClick={copyReferralCode}
                  className="p-1 text-sidebar-accent-foreground opacity-50 hover:opacity-100 transition-opacity"
                  title="Copy code"
                >
                  {copied ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
              <button
                onClick={copyReferralLink}
                className="flex items-center gap-1.5 text-xs text-sidebar-accent-foreground opacity-60 hover:opacity-100 transition-opacity"
              >
                <Share2 className="w-3 h-3" />
                Copy referral link
              </button>
            </div>
          </div>
        )}

        <div className="p-4 border-t border-border">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="w-full flex items-center gap-3 px-3 py-2 text-sm text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground rounded-md cursor-pointer transition-colors">
                <Avatar className="w-7 h-7">
                  <AvatarFallback className="text-xs bg-primary/20 text-primary">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <span className="flex-1 text-left truncate">
                  {user?.displayName ?? user?.email}
                </span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <div className="px-2 py-1.5">
                <p className="text-sm font-medium truncate">{user?.displayName ?? user?.email}</p>
                <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/settings">
                  <User className="w-4 h-4 mr-2" />
                  Profile
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/settings">
                  <Settings className="w-4 h-4 mr-2" />
                  Settings
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => logout()}
                className="text-destructive focus:text-destructive cursor-pointer"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Mobile Header */}
        <div className="h-16 border-b border-border bg-sidebar px-4 flex items-center md:hidden shrink-0">
          <BookOpen className="w-6 h-6 text-primary mr-3" />
          <span className="font-serif font-bold text-lg text-primary tracking-tight">
            Teora
          </span>
        </div>
        <div className="flex-1 overflow-auto p-4 md:p-8">
          <div className="mx-auto max-w-6xl">{children}</div>
        </div>
      </main>
    </div>
  );
}
