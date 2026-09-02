import { CreditCard, User, Shield, Bell, Key, ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const AKUN_SECTIONS = [
  {
    icon: User,
    label: "Profil",
    desc: "Nama, email, foto, dan informasi akun Anda",
    href: "/profile",
  },
  {
    icon: CreditCard,
    label: "Topup Saldo",
    desc: "Isi ulang saldo untuk penggunaan Teora",
    href: "/topup",
  },
  {
    icon: Bell,
    label: "Notifikasi",
    desc: "Pengaturan notifikasi email dan push",
    href: "#",
  },
  {
    icon: Key,
    label: "Keamanan",
    desc: "Ubah password dan pengaturan keamanan",
    href: "#",
  },
  {
    icon: Shield,
    label: "Privasi",
    desc: "Pengaturan data dan privasi akun",
    href: "/privacy",
  },
];

export default function Akun() {
  return (
    <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-serif font-bold tracking-tight">Akun</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Kelola profil dan pengaturan akun Anda
          </p>
        </div>

        <div className="space-y-3">
          {AKUN_SECTIONS.map((section) => (
            <Card key={section.label} className="hover:border-[#2D79FF]/30 transition-colors">
              <CardContent className="p-4">
                <a
                  href={section.href === "#" ? undefined : section.href}
                  className="flex items-center gap-4 cursor-pointer"
                >
                  <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
                    <section.icon className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-sm">{section.label}</p>
                    <p className="text-xs text-muted-foreground">{section.desc}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </a>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
  );
}
