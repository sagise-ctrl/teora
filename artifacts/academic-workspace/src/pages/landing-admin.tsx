import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Shield, User, ArrowRight, AlertTriangle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent } from "@/components/ui/card";
import { customFetch } from "@/lib/api-client-react";

export default function LandingAdmin() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (!user) {
      setLocation("/login");
      return;
    }

    // Check if user is owner by calling /api/admin/me
    customFetch("/api/admin/me")
      .then(() => {
        // Owner — show choice page
        setChecking(false);
      })
      .catch((err: { status?: number }) => {
        if (err?.status === 403) {
          // Not owner — redirect to user dashboard
          setLocation("/");
        } else {
          // Other error — still redirect to dashboard
          setLocation("/");
        }
      });
  }, [user, setLocation]);

  if (!user || checking) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/20 p-4">
      <div className="w-full max-w-lg space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#2D79FF] to-[#8E54E9] flex items-center justify-center mx-auto shadow-lg shadow-[#2D79FF]/20">
            <Shield className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-serif font-bold tracking-tight">
            Welcome, {user.displayName?.split(" ")[0] ?? "Owner"}
          </h1>
          <p className="text-muted-foreground text-sm">
            Pilih mode dashboard yang ingin Anda akses
          </p>
        </div>

        {/* Mode Cards */}
        <div className="space-y-3">
          {/* Admin Dashboard */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card
              className="cursor-pointer group hover:border-[#2D79FF]/50 hover:shadow-md transition-all border-2"
              onClick={() => setLocation("/admin")}
            >
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-500/10 to-red-500/5 flex items-center justify-center shrink-0 group-hover:from-red-500/20 group-hover:to-red-500/10 transition-all">
                    <Shield className="w-6 h-6 text-red-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h2 className="font-semibold text-base">Admin Dashboard</h2>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold text-white bg-gradient-to-r from-red-500 to-red-600">
                        Owner Only
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      Financial overview, user management, AI tier config, system health, audit log, dan reports.
                    </p>
                    <div className="mt-3 flex items-center gap-1 text-sm font-medium text-[#2D79FF]">
                      Buka Admin Dashboard
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* User Dashboard */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card
              className="cursor-pointer group hover:border-[#2D79FF]/50 hover:shadow-md transition-all border-2"
              onClick={() => setLocation("/")}
            >
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#2D79FF]/10 to-[#8E54E9]/5 flex items-center justify-center shrink-0 group-hover:from-[#2D79FF]/20 group-hover:to-[#8E54E9]/10 transition-all">
                    <User className="w-6 h-6 text-[#2D79FF]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h2 className="font-semibold text-base">User Dashboard (Test Mode)</h2>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold text-white bg-gradient-to-r from-amber-500 to-orange-500">
                        Free Testing
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      Test fitur dari perspektif user. Token unlimited, tidak ada charge. Usage tetap tercatat untuk laporan cost.
                    </p>
                    <div className="mt-3 flex items-center gap-1 text-sm font-medium text-[#2D79FF]">
                      Buka User Dashboard
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Test Mode Warning */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200"
        >
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-xs text-amber-800 space-y-1">
            <p className="font-medium">Test Mode untuk User Dashboard:</p>
            <ul className="list-disc list-inside space-y-0.5">
              <li>Token unlimited — test bebas tanpa batas</li>
              <li>Payment flow disabled — tidak ada charge nyata</li>
              <li>Subscription tier forced ke Ultra</li>
              <li>Usage TETAP tercatat di sistem untuk laporan cost</li>
            </ul>
          </div>
        </motion.div>

        {/* Back Link */}
        <div className="text-center">
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground"
            onClick={() => setLocation("/")}
          >
            Kembali ke Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
}
