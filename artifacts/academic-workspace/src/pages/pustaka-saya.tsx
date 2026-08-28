import { BookOpen, Plus, Search, Library, FileText, FolderOpen } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Layout from "@/components/layout";

export default function PustakaSaya() {
  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-serif font-bold tracking-tight">Pustaka Saya</h1>
            <p className="text-muted-foreground text-sm mt-0.5">
              Koleksi referensi, template, dan dokumen global Anda
            </p>
          </div>
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Tambah Referensi
          </Button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Cari referensi..." className="pl-9" />
        </div>

        {/* Categories */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { icon: FileText, label: "Template", count: 0 },
            { icon: FolderOpen, label: "Folder", count: 0 },
            { icon: Library, label: "Referensi", count: 0 },
            { icon: BookOpen, label: "Semua", count: 0 },
          ].map((cat) => (
            <Card key={cat.label} className="cursor-pointer hover:border-[#2D79FF]/30 transition-colors">
              <CardContent className="p-4 text-center">
                <cat.icon className="w-6 h-6 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm font-medium">{cat.label}</p>
                <p className="text-xs text-muted-foreground">{cat.count} items</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Empty State */}
        <Card>
          <CardContent className="p-12 text-center">
            <Library className="w-12 h-12 mx-auto mb-4 text-muted-foreground/40" />
            <h3 className="text-lg font-semibold mb-2">Pustaka kosong</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Mulai tambahkan referensi dan template ke pustaka Anda.
            </p>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Tambah Referensi Pertama
            </Button>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
