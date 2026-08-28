import { ClipboardList, Plus, Search, FileQuestion, CheckSquare, Clock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import Layout from "@/components/layout";

export default function Assessment() {
  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-serif font-bold tracking-tight">Assessment</h1>
            <p className="text-muted-foreground text-sm mt-0.5">
              Quiz, soal, dan evaluasi akademik
            </p>
          </div>
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Buat Assessment
          </Button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Cari assessment..." className="pl-9" />
        </div>

        {/* Category Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { icon: FileQuestion, label: "Quiz", desc: "Soal pilihan ganda & essay", color: "text-blue-600" },
            { icon: CheckSquare, label: "Evaluasi", desc: "Formulir evaluasi terstruktur", color: "text-emerald-600" },
            { icon: Clock, label: "Riwayat", desc: "Hasil assessment sebelumnya", color: "text-purple-600" },
          ].map((cat) => (
            <Card key={cat.label} className="cursor-pointer hover:border-[#2D79FF]/30 transition-colors">
              <CardContent className="p-6">
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-xl bg-muted flex items-center justify-center`}>
                    <cat.icon className={`w-5 h-5 ${cat.color}`} />
                  </div>
                  <div>
                    <p className="font-semibold">{cat.label}</p>
                    <p className="text-sm text-muted-foreground mt-0.5">{cat.desc}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Recent Assessments */}
        <div>
          <h2 className="text-lg font-semibold mb-3">Assessment Saya</h2>
          <Card>
            <CardContent className="p-8 text-center">
              <ClipboardList className="w-12 h-12 mx-auto mb-4 text-muted-foreground/40" />
              <h3 className="text-lg font-semibold mb-2">Belum ada assessment</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Mulai buat quiz atau soal evaluasi akademik Anda.
              </p>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Buat Assessment Pertama
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
