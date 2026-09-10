import { useState } from "react";
import { Brain, Lightbulb, Clock, Target, BookOpen, ChevronRight, RefreshCw, Loader2, AlertCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useGetPracticeRecommendations,
  useListLearningActivities,
} from "@/lib/api-client-react";
import type { PracticeRecommendation, LearningActivity } from "@/lib/api-client-react/generated/api.schemas";

type RecommendationType = "recent_task" | "frequent_topic" | "weak_topic";

const TYPE_META: Record<RecommendationType, { icon: typeof Clock; color: string; label: string }> = {
  recent_task: { icon: Clock, color: "text-blue-600", label: "Proyek Terbaru" },
  frequent_topic: { icon: Target, color: "text-purple-600", label: "Topik Sering Muncul" },
  weak_topic: { icon: AlertCircle, color: "text-amber-600", label: "Perlu Diperkuat" },
};

function RecommendationCard({ rec }: { rec: PracticeRecommendation }) {
  const meta = TYPE_META[rec.type as RecommendationType] ?? TYPE_META.recent_task;
  const Icon = meta.icon;

  return (
    <Card className="hover:border-[#2D79FF]/40 transition-all cursor-pointer group">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <div className={`p-2 rounded-lg bg-muted ${meta.color}`}>
              <Icon className="w-4 h-4" />
            </div>
            <Badge variant="secondary" className="text-xs font-medium">
              {meta.label}
            </Badge>
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground leading-relaxed">{rec.reason}</p>
        <div className="flex flex-wrap gap-1.5">
          {rec.learningActivity.topics.slice(0, 5).map((topic: string) => (
            <Badge key={topic} variant="outline" className="text-xs font-normal">
              {topic}
            </Badge>
          ))}
        </div>
        {rec.learningActivity.sourceProjectTitle && (
          <p className="text-xs text-muted-foreground/60">
            Dari: {rec.learningActivity.sourceProjectTitle}
          </p>
        )}
        <Button className="w-full mt-2" size="sm">
          Mulai Kuis
        </Button>
      </CardContent>
    </Card>
  );
}

function SkeletonCard() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-8 rounded-lg" />
          <Skeleton className="h-4 w-24" />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <div className="flex gap-1.5">
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-5 w-20 rounded-full" />
        </div>
        <Skeleton className="h-8 w-full rounded-md" />
      </CardContent>
    </Card>
  );
}

export default function Practice() {
  const recommendationsQuery = useGetPracticeRecommendations();
  const activitiesQuery = useListLearningActivities();
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await recommendationsQuery.refetch();
    await activitiesQuery.refetch();
    setRefreshing(false);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-serif font-bold tracking-tight flex items-center gap-2">
            <Brain className="w-6 h-6 text-[#2D79FF]" />
            Practice
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Rekomendasi kuis berdasarkan aktivitas belajar Anda
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={refreshing}
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Recommendations */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <Lightbulb className="w-4 h-4 text-amber-500" />
          <h2 className="text-lg font-semibold">Rekomendasi untuk Anda</h2>
        </div>

        {recommendationsQuery.isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[0, 1, 2].map((i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : recommendationsQuery.isError ? (
          <Card>
            <CardContent className="p-8 text-center">
              <AlertCircle className="w-8 h-8 mx-auto mb-3 text-destructive" />
              <p className="text-sm text-muted-foreground">
                Gagal memuat rekomendasi. Coba lagi nanti.
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={() => recommendationsQuery.refetch()}
              >
                Coba Lagi
              </Button>
            </CardContent>
          </Card>
        ) : recommendationsQuery.data && recommendationsQuery.data.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {recommendationsQuery.data.map((rec, i) => (
              <RecommendationCard key={`${rec.type}-${rec.learningActivity.id}-${i}`} rec={rec} />
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="p-8 text-center">
              <Brain className="w-10 h-10 mx-auto mb-3 text-muted-foreground/40" />
              <h3 className="font-semibold mb-1">Belum ada aktivitas belajar</h3>
              <p className="text-sm text-muted-foreground">
                Aktivitas belajar otomatis tercatat saat Anda bekerja di Task Mentor.
                <br />
                Mulai proyek baru untuk membangun rekomendasi kuis.
              </p>
              <Button className="mt-4" asChild>
                <a href="/projects/new?type=general">Mulai Proyek Baru</a>
              </Button>
            </CardContent>
          </Card>
        )}
      </section>

      {/* Recent Activity */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <BookOpen className="w-4 h-4 text-[#2D79FF]" />
          <h2 className="text-lg font-semibold">Aktivitas Belajar Terakhir</h2>
        </div>

        {activitiesQuery.isLoading ? (
          <div className="space-y-3">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3 p-3 border rounded-lg">
                <Skeleton className="h-10 w-10 rounded-lg" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-3 w-full" />
                </div>
              </div>
            ))}
          </div>
        ) : activitiesQuery.data && activitiesQuery.data.length > 0 ? (
          <div className="space-y-2">
            {activitiesQuery.data.slice(0, 10).map((activity: LearningActivity) => (
              <div
                key={activity.id}
                className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/40 transition-colors"
              >
                <div className="p-2 rounded-lg bg-muted">
                  <BookOpen className="w-4 h-4 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline" className="text-xs">
                      {activity.extractedFrom}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {new Date(activity.createdAt).toLocaleDateString("id-ID", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {activity.topics.slice(0, 4).map((topic) => (
                      <span
                        key={topic}
                        className="text-xs px-2 py-0.5 bg-muted rounded-full text-muted-foreground"
                      >
                        {topic}
                      </span>
                    ))}
                    {activity.topics.length > 4 && (
                      <span className="text-xs px-2 py-0.5 text-muted-foreground">
                        +{activity.topics.length - 4}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="p-6 text-center">
              <p className="text-sm text-muted-foreground">
                Belum ada aktivitas belajar tercatat.
              </p>
            </CardContent>
          </Card>
        )}
      </section>
    </div>
  );
}
