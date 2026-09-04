import { useState } from "react";
import { Link } from "wouter";
import {
  Copy,
  Check,
  Share2,
  Gift,
  TrendingUp,
  Zap,
  FileText,
  FileCheck2,
  Shield,
  Clock,
  Star,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";

function CopyButton({
  text,
  className,
  onError,
}: {
  text: string;
  className?: string;
  onError?: (msg: string) => void;
}) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      onError?.("Tidak dapat menyalin ke clipboard. Coba salin manual.");
    }
  }

  return (
    <button
      onClick={handleCopy}
      className={cn(
        "p-2 rounded-md transition-colors",
        copied
          ? "bg-green-500/20 text-green-600"
          : "bg-muted hover:bg-muted/80 text-muted-foreground",
        className
      )}
      title="Copy to clipboard"
    >
      {copied ? (
        <Check className="w-4 h-4" />
      ) : (
        <Copy className="w-4 h-4" />
      )}
    </button>
  );
}

const TOKEN_PACKAGES = [
  {
    name: "LITE",
    price: 5,
    tokens: "10,000",
    tagline: "~10 Short Essays",
    features: [
      { text: "~10 Short Essays", included: true },
      { text: "Basic Grammar Checks", included: true },
      { text: "No Plagiarism Scans", included: false },
    ],
    popular: false,
  },
  {
    name: "PRO",
    price: 15,
    tokens: "40,000",
    tagline: "~5 Full Research Papers",
    features: [
      { text: "~5 Full Research Papers", included: true },
      { text: "Advanced Citations (APA/MLA)", included: true },
      { text: "5 Plagiarism Scans", included: true },
    ],
    popular: true,
  },
  {
    name: "ELITE",
    price: 35,
    tokens: "100,000",
    tagline: "Thesis-Level Generation",
    features: [
      { text: "Thesis-Level Generation", included: true },
      { text: "Priority Processing Speed", included: true },
      { text: "Unlimited Plagiarism Scans", included: true },
    ],
    popular: false,
  },
];

export default function ReferralPage() {
  const { user } = useAuth();
  const [sharing, setSharing] = useState(false);
  const { toast } = useToast();

  const referralCode = user?.referralCode ?? "demo-user-xyz";
  const referralUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/register?ref=${referralCode}`;

  // Mock referral stats
  const referralStats = {
    current: 3,
    target: 5,
    badge: "Elite Researcher",
  };

  const progressPercent = Math.round((referralStats.current / referralStats.target) * 100);

  async function handleShare() {
    setSharing(true);
    try {
      if (navigator.share) {
        await navigator.share({
          title: "Join Teora — AI Academic Workspace",
          text: "Get 500 free tokens when you sign up via my referral link!",
          url: referralUrl,
        });
      } else {
        await navigator.clipboard.writeText(referralUrl);
        toast({ title: "Tersalin!", description: "Link referral berhasil disalin ke clipboard." });
      }
    } catch {
      // User cancelled or error
    } finally {
      setSharing(false);
    }
  }

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Referral & Pricing</h1>
        <p className="text-muted-foreground mt-1">
          Empower your academic journey. Earn tokens by referring peers, or top up your
          balance to unlock advanced Teora capabilities.
        </p>
      </div>

      {/* Referral Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Referral Link */}
        <Card className="border-border/50">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-gradient-to-r from-[#2D79FF]/20 to-[#8E54E9]/20 flex items-center justify-center">
                <Gift className="w-5 h-5 text-[#2D79FF]" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-foreground">Refer a Friend</h2>
                <Badge
                  variant="secondary"
                  className="mt-0.5 bg-gradient-to-r from-[#2D79FF]/10 to-[#8E54E9]/10 text-[#2D79FF] border-0 text-xs"
                >
                  Give 500, Get 500 Tokens
                </Badge>
              </div>
            </div>

            <p className="text-sm text-muted-foreground mb-5">
              Share your unique link. When a friend signs up and completes their first
              task, you both receive 500 Teora tokens to fuel your research.
            </p>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                  Your Unique Link
                </label>
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-muted/50 rounded-lg px-3 py-2 text-sm font-mono text-muted-foreground truncate border border-border/50">
                    {referralUrl}
                  </div>
                  <CopyButton text={referralUrl} onError={(msg) => toast({ title: "Gagal", description: msg, variant: "destructive" })} />
                </div>
              </div>

              <Button
                onClick={handleShare}
                disabled={sharing}
                className="w-full bg-gradient-to-r from-[#2D79FF] to-[#8E54E9] hover:opacity-90 text-white"
              >
                <Share2 className="w-4 h-4 mr-2" />
                {sharing ? "Sharing..." : "Share Now"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Referral Progress */}
        <Card className="border-border/50">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-full bg-gradient-to-r from-green-500/20 to-emerald-500/20 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-green-600" />
              </div>
              <h2 className="text-lg font-semibold text-foreground">
                Referral Progress
              </h2>
            </div>

            <div className="flex items-center gap-8">
              {/* Circular Progress */}
              <div className="relative w-28 h-28 flex-shrink-0">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                  {/* Background circle */}
                  <circle
                    cx="50"
                    cy="50"
                    r="42"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="8"
                    className="text-muted"
                  />
                  {/* Progress circle */}
                  <circle
                    cx="50"
                    cy="50"
                    r="42"
                    fill="none"
                    stroke="url(#progressGradient)"
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray={`${progressPercent * 2.64} 264`}
                    className="transition-all duration-700"
                  />
                  <defs>
                    <linearGradient
                      id="progressGradient"
                      x1="0%"
                      y1="0%"
                      x2="100%"
                      y2="0%"
                    >
                      <stop offset="0%" stopColor="#2D79FF" />
                      <stop offset="100%" stopColor="#8E54E9" />
                    </linearGradient>
                  </defs>
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-3xl font-bold text-foreground">
                    {referralStats.current}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    / {referralStats.target} Referrals
                  </span>
                </div>
              </div>

              {/* Progress Info */}
              <div className="flex-1 space-y-4">
                <div>
                  <div className="text-sm font-medium text-foreground mb-2">
                    {referralStats.target - referralStats.current} more to unlock
                  </div>
                  <div className="flex items-center gap-2">
                    <Star className="w-5 h-5 text-amber-500" />
                    <span className="font-semibold text-foreground">
                      {referralStats.badge}
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Progress</span>
                    <span>{progressPercent}%</span>
                  </div>
                  <Progress value={progressPercent} className="h-2" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Token Packages */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <Zap className="w-5 h-5 text-[#2D79FF]" />
          <h2 className="text-lg font-semibold text-foreground">Token Packages</h2>
        </div>
        <p className="text-sm text-muted-foreground mb-6">
          Top up your balance. 1 Token ≈ 1 Word generated. Complex tasks require more
          tokens.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {TOKEN_PACKAGES.map((pkg) => (
            <Card
              key={pkg.name}
              className={cn(
                "relative overflow-hidden transition-all hover:shadow-md",
                pkg.popular
                  ? "border-[#2D79FF] shadow-md shadow-[#2D79FF]/10"
                  : "border-border/50"
              )}
            >
              {pkg.popular && (
                <div className="absolute top-0 right-0">
                  <div className="bg-gradient-to-r from-[#2D79FF] to-[#8E54E9] text-white text-[10px] font-semibold px-3 py-1 rounded-bl-lg">
                    MOST POPULAR
                  </div>
                </div>
              )}

              <CardContent className="p-6">
                <div className="space-y-4">
                  {/* Header */}
                  <div>
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-xs font-bold tracking-wider mb-2",
                        pkg.name === "PRO"
                          ? "border-[#2D79FF] text-[#2D79FF]"
                          : pkg.name === "ELITE"
                            ? "border-amber-500 text-amber-600"
                            : "border-muted-foreground text-muted-foreground"
                      )}
                    >
                      {pkg.name}
                    </Badge>
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-bold text-foreground">
                        ${pkg.price}
                      </span>
                      <span className="text-sm text-muted-foreground">/ one-time</span>
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <Gift className="w-4 h-4 text-[#2D79FF]" />
                      <span className="text-sm font-medium text-foreground">
                        {pkg.tokens} Tokens
                      </span>
                    </div>
                  </div>

                  {/* Features */}
                  <ul className="space-y-2">
                    {pkg.features.map((feature, idx) => (
                      <li
                        key={idx}
                        className="flex items-center gap-2 text-sm"
                      >
                        {feature.included ? (
                          <div className="w-4 h-4 rounded-full bg-green-500/20 flex items-center justify-center">
                            <Check className="w-3 h-3 text-green-600" />
                          </div>
                        ) : (
                          <div className="w-4 h-4 rounded-full bg-muted flex items-center justify-center">
                            <span className="text-[10px] text-muted-foreground">✕</span>
                          </div>
                        )}
                        <span
                          className={
                            feature.included
                              ? "text-foreground"
                              : "text-muted-foreground"
                          }
                        >
                          {feature.text}
                        </span>
                      </li>
                    ))}
                  </ul>

                  {/* CTA */}
                  <Button
                    variant={pkg.popular ? "default" : "outline"}
                    className={cn(
                      "w-full",
                      pkg.popular
                        ? "bg-gradient-to-r from-[#2D79FF] to-[#8E54E9] hover:opacity-90 text-white border-0"
                        : "border-border hover:bg-muted/50"
                    )}
                  >
                    Purchase {pkg.name}
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="flex items-start gap-3 p-4 bg-muted/30 rounded-lg border border-border/50">
          <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center flex-shrink-0">
            <FileText className="w-4 h-4 text-blue-600" />
          </div>
          <div>
            <h3 className="text-sm font-medium text-foreground">Token Value</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              1 token menghasilkan sekitar 1 kata dengan bantuan Teora.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3 p-4 bg-muted/30 rounded-lg border border-border/50">
          <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center flex-shrink-0">
            <Clock className="w-4 h-4 text-purple-600" />
          </div>
          <div>
            <h3 className="text-sm font-medium text-foreground">No Expiration</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Purchased tokens never expire. Use them at your own pace.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3 p-4 bg-muted/30 rounded-lg border border-border/50">
          <div className="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center flex-shrink-0">
            <Shield className="w-4 h-4 text-green-600" />
          </div>
          <div>
            <h3 className="text-sm font-medium text-foreground">Secure Payment</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              All transactions are processed securely via Stripe.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
