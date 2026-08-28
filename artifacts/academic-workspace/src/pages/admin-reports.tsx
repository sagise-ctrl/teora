import { useState, useEffect } from "react";
import { Download, FileText, TrendingUp, Users, Zap, Calendar } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import AdminLayout from "@/components/admin-layout";

interface Report {
  id: string;
  title: string;
  description: string;
  period: string;
  generatedAt: string;
  sizeKb: number;
  type: "financial" | "usage" | "user" | "combined";
}

const MOCK_REPORTS: Report[] = [
  {
    id: "rpt-2026-08",
    title: "Monthly Report — August 2026",
    description: "Full financial, usage, dan user report untuk bulan Agustus 2026",
    period: "2026-08",
    generatedAt: new Date().toISOString(),
    sizeKb: 128,
    type: "combined",
  },
  {
    id: "rpt-2026-08-financial",
    title: "Financial Report — August 2026",
    description: "Revenue, costs, dan profit breakdown",
    period: "2026-08",
    generatedAt: new Date().toISOString(),
    sizeKb: 48,
    type: "financial",
  },
  {
    id: "rpt-2026-08-usage",
    title: "AI Usage Report — August 2026",
    description: "Token consumption, model breakdown, dan cost analysis",
    period: "2026-08",
    generatedAt: new Date().toISOString(),
    sizeKb: 64,
    type: "usage",
  },
  {
    id: "rpt-2026-08-user",
    title: "User Activity Report — August 2026",
    description: "User growth, retention, dan engagement metrics",
    period: "2026-08",
    generatedAt: new Date().toISOString(),
    sizeKb: 32,
    type: "user",
  },
];

const REPORT_TYPE_CONFIG: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  financial: { icon: TrendingUp, color: "text-emerald-600", label: "Financial" },
  usage: { icon: Zap, color: "text-purple-600", label: "AI Usage" },
  user: { icon: Users, color: "text-blue-600", label: "User" },
  combined: { icon: FileText, color: "text-[#2D79FF]", label: "Combined" },
};

export default function AdminReports() {
  const [reports] = useState<Report[]>(MOCK_REPORTS);
  const [downloading, setDownloading] = useState<string | null>(null);

  const handleDownload = async (report: Report) => {
    setDownloading(report.id);
    // Simulate download — in production, this would call /api/admin/reports/:id/export
    await new Promise((r) => setTimeout(r, 1500));
    setDownloading(null);
    // Would trigger browser download of the report
  };

  return (
    <AdminLayout activeTab="/admin/reports">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-serif font-bold tracking-tight">Reports Archive</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Download laporan periodik untuk analisis dan dokumentasi
          </p>
        </div>

        {/* Report List */}
        <div className="space-y-3">
          {reports.map((report) => {
            const cfg = REPORT_TYPE_CONFIG[report.type];
            const Icon = cfg.icon;
            return (
              <Card key={report.id} className="hover:border-[#2D79FF]/30 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className={`w-10 h-10 rounded-xl bg-muted flex items-center justify-center mt-0.5`}>
                        <Icon className={`w-5 h-5 ${cfg.color}`} />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{report.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{report.description}</p>
                        <div className="flex items-center gap-3 mt-2">
                          <span className="text-xs text-muted-foreground">
                            <Calendar className="w-3 h-3 inline mr-1" />
                            {new Date(report.generatedAt).toLocaleDateString("id-ID")}
                          </span>
                          <span className="text-xs text-muted-foreground">{report.sizeKb} KB</span>
                          <span className={`text-xs px-1.5 py-0.5 rounded ${cfg.color} bg-muted`}>
                            {cfg.label}
                          </span>
                        </div>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDownload(report)}
                      disabled={downloading === report.id}
                    >
                      <Download className="w-4 h-4 mr-1" />
                      {downloading === report.id ? "Generating..." : "Download"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Generate New Report */}
        <Card className="bg-muted/30 border-dashed">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Need a custom report?</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Custom reports based on date range dan report type akan segera hadir
                </p>
              </div>
              <Button variant="secondary" size="sm" disabled>
                Coming Soon
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
