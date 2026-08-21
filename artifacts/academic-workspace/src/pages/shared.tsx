import { useState, useEffect } from "react";
import { useParams } from "wouter";
import { FileText, Lock, Clock, User } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";

interface SharedProject {
  id: number;
  title: string;
  status: string;
  subject: string | null;
  taskType: string | null;
  latestDocument: string | null;
  accessMode: string;
  ownerEmail: string;
  createdAt: string;
}

export default function SharedProject() {
  const { token } = useParams<{ token: string }>();
  const [project, setProject] = useState<SharedProject | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;

    const baseUrl = import.meta.env.VITE_API_URL || "/api";
    fetch(`${baseUrl}/shared/${token}`)
      .then((res) => {
        if (!res.ok) {
          if (res.status === 404) throw new Error("Link tidak valid atau sudah kedaluwarsa.");
          throw new Error(`Error: ${res.status}`);
        }
        return res.json();
      })
      .then((data: SharedProject) => {
        setProject(data);
        setLoading(false);
      })
      .catch((err: Error) => {
        setError(err.message);
        setLoading(false);
      });
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-full max-w-3xl px-4 space-y-6">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
          <Skeleton className="h-[400px] w-full" />
        </div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md w-full mx-4 bg-card border-none shadow-sm rounded-xl">
          <CardContent className="pt-8 pb-8 flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
              <Lock className="w-8 h-8 text-destructive" />
            </div>
            <h1 className="text-xl font-serif font-bold mb-2">Link Tidak Valid</h1>
            <p className="text-sm text-muted-foreground mb-4">
              {error || "Project ini tidak tersedia."}
            </p>
            <Button variant="outline" onClick={() => window.close()}>
              Tutup
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const accessBadge = {
    view: { label: "View Only", color: "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300" },
    comment: { label: "View + Comment", color: "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400" },
    edit: { label: "View + Edit", color: "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400" },
  }[project.accessMode] ?? { label: project.accessMode, color: "bg-muted" };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <Badge className={accessBadge.color + " mb-3"}>
                {accessBadge.label}
              </Badge>
              <h1 className="text-2xl font-serif font-bold text-foreground tracking-tight">
                {project.title}
              </h1>
              <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <User className="w-4 h-4" />
                  {project.ownerEmail}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  {format(new Date(project.createdAt), "MMM d, yyyy")}
                </span>
              </div>
              {project.subject && (
                <p className="text-muted-foreground mt-1 text-sm">
                  {project.subject} {project.taskType ? `• ${project.taskType}` : ""}
                </p>
              )}
            </div>
            <Badge variant="outline" className="shrink-0">
              {project.status.replace(/_/g, " ")}
            </Badge>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Card className="bg-card border-none shadow-sm rounded-xl overflow-hidden">
          <CardHeader className="border-b border-border/50">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              <CardTitle className="font-serif text-lg">Document</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-8">
            {project.latestDocument ? (
              <div className="prose prose-slate dark:prose-invert max-w-none">
                <div dangerouslySetInnerHTML={{ __html: project.latestDocument.replace(/\n/g, "<br/>") }} />
              </div>
            ) : (
              <div className="py-16 text-center">
                <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-4">
                  <FileText className="w-8 h-8 text-muted-foreground/40" />
                </div>
                <p className="text-sm font-medium text-foreground mb-1">Document not available</p>
                <p className="text-xs text-muted-foreground">
                  The owner hasn't shared a document yet.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Disclaimer */}
        <p className="text-xs text-muted-foreground text-center mt-6">
          Dokumen ini dibagikan melalui Teora. Untuk akses penuh, silakan minta pemilik untuk menambahkan Anda ke project.
        </p>
      </div>
    </div>
  );
}
