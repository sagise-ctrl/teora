import { useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import { motion } from "framer-motion";
import {
  useListProjects,
  useGetProjectStats,
  type ListProjectsParams,
} from "@/lib/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
  EmptyIllustrationPapers,
} from "@/components/ui/empty";
import { Search, Plus, ArrowRight, FileText } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { id as localeId } from "date-fns/locale";
import {
  backendStatusToStage,
  stageMeta,
  displayStagesFor,
  TASK_TYPE_LABEL,
  type TaskType,
  type UserStage,
} from "@/lib/status-mapping";

const STAGE_FILTER_KEY = "all" as const;
type StageFilter = UserStage | typeof STAGE_FILTER_KEY;

function getActiveType(search: string): TaskType {
  const params = new URLSearchParams(search);
  const t = params.get("type");
  if (t === "academic" || t === "general") return t;
  return "general";
}

function setQueryType(currentSearch: string, next: TaskType): string {
  const params = new URLSearchParams(currentSearch);
  params.set("type", next);
  return params.toString();
}

export default function TaskListPage() {
  const [location, setLocation] = useLocation();
  const searchString = location.includes("?") ? location.slice(location.indexOf("?")) : "";
  const activeType: TaskType = getActiveType(searchString);

  const [stageFilter, setStageFilter] = useState<StageFilter>(STAGE_FILTER_KEY);
  const [searchInput, setSearchInput] = useState("");

  const listParams = useMemo<ListProjectsParams>(
    () => ({ type: activeType } as ListProjectsParams),
    [activeType]
  );
  const { data: projects, isLoading: projectsLoading } = useListProjects(listParams);
  const { data: stats } = useGetProjectStats();

  const allProjects = Array.isArray(projects) ? projects : [];
  const stages = displayStagesFor(activeType);

  // Filter by stage (client-side) + search (client-side)
  const filtered = useMemo(() => {
    return allProjects.filter((p: any) => {
      const stage = backendStatusToStage(p.status);
      if (stageFilter !== STAGE_FILTER_KEY && stage !== stageFilter) return false;
      if (searchInput.trim()) {
        const q = searchInput.trim().toLowerCase();
        if (!(p.title || "").toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [allProjects, stageFilter, searchInput]);

  // Counter per stage (computed from full list, not filtered)
  const stageCounts = useMemo(() => {
    const counts: Record<string, number> = { all: allProjects.length };
    for (const s of stages) counts[s.key] = 0;
    for (const p of allProjects) {
      const stage = backendStatusToStage(p.status);
      if (counts[stage] !== undefined) counts[stage] += 1;
    }
    return counts;
  }, [allProjects, stages]);

  function switchTab(next: TaskType) {
    setStageFilter(STAGE_FILTER_KEY);
    setSearchInput("");
    const newQuery = setQueryType(searchString, next);
    setLocation(`/projects${newQuery ? `?${newQuery}` : ""}`);
  }

  const emptyTitle = activeType === "academic" ? "Belum ada Academic Work" : "Belum ada Task Umum";
  const emptyDesc = activeType === "academic"
    ? "Mulai tulis makalah, proposal, atau skripsi pertama Anda."
    : "Mulai buat tugas singkat pertama Anda.";
  const ctaLabel = activeType === "academic" ? "+ Academic Work Baru" : "+ Task Umum Baru";

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-serif font-bold tracking-tight">Task Mentor</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Kelola semua tugas dan karya ilmiah Anda di satu tempat.
          </p>
        </div>
        <Link href={`/projects/new?type=${activeType}`}>
          <Button className="bg-gradient-to-r from-[#2D79FF] to-[#8E54E9] hover:opacity-90 shadow-md shadow-[#2D79FF]/20">
            <Plus className="w-4 h-4 mr-2" />
            {ctaLabel}
          </Button>
        </Link>
      </div>

      {/* Tabs */}
      <div className="inline-flex rounded-lg border border-border bg-card p-1 gap-1">
        {(["general", "academic"] as TaskType[]).map((t) => {
          const active = t === activeType;
          return (
            <button
              key={t}
              type="button"
              onClick={() => switchTab(t)}
              className={
                "px-4 py-2 rounded-md text-sm font-medium transition-colors " +
                (active
                  ? "bg-gradient-to-r from-[#2D79FF] to-[#8E54E9] text-white shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/40")
              }
            >
              {TASK_TYPE_LABEL[t]}
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-6">
        {/* Filter sidebar */}
        <aside className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide px-3 mb-2">
            Filter Stage
          </p>
          <FilterChip
            label="Semua"
            count={stageCounts.all ?? 0}
            active={stageFilter === STAGE_FILTER_KEY}
            onClick={() => setStageFilter(STAGE_FILTER_KEY)}
          />
          {stages.map((s) => (
            <FilterChip
              key={s.key}
              label={s.label}
              count={stageCounts[s.key] ?? 0}
              active={stageFilter === s.key}
              dotColor={s.textColor}
              onClick={() => setStageFilter(s.key as StageFilter)}
            />
          ))}
        </aside>

        {/* Main list */}
        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder={`Cari ${TASK_TYPE_LABEL[activeType].toLowerCase()}…`}
              className="pl-9 bg-background"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
          </div>

          {/* List */}
          {projectsLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-5 space-y-3">
                    <Skeleton className="h-4 w-1/3" />
                    <Skeleton className="h-5 w-3/4" />
                    <Skeleton className="h-4 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <Empty>
              <EmptyMedia illustration="papers">
                <EmptyIllustrationPapers />
              </EmptyMedia>
              <EmptyHeader>
                <EmptyTitle>{emptyTitle}</EmptyTitle>
                <EmptyDescription>{emptyDesc}</EmptyDescription>
              </EmptyHeader>
              {!searchInput && stageFilter === STAGE_FILTER_KEY && (
                <Link href={`/projects/new?type=${activeType}`}>
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    {ctaLabel}
                  </Button>
                </Link>
              )}
            </Empty>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filtered.map((p: any) => (
                <TaskCard key={p.id} project={p} type={activeType} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function FilterChip({
  label,
  count,
  active,
  dotColor,
  onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  dotColor?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        "w-full flex items-center justify-between gap-2 px-3 py-2 rounded-md text-sm transition-colors " +
        (active
          ? "bg-primary/10 text-primary font-medium"
          : "text-muted-foreground hover:bg-muted/40 hover:text-foreground")
      }
    >
      <span className="flex items-center gap-2">
        {dotColor && <span className={"w-1.5 h-1.5 rounded-full " + dotColor.replace("text-", "bg-")} />}
        {label}
      </span>
      <span className={"text-xs " + (active ? "text-primary" : "text-muted-foreground")}>
        {count}
      </span>
    </button>
  );
}

function TaskCard({ project, type }: { project: any; type: TaskType }) {
  const stage = backendStatusToStage(project.status);
  const meta = stageMeta(stage);
  const isDraft = project.status === "draft";
  const ctaLabel = isDraft ? "Mulai Kerjakan" : "Lanjutkan";
  const updatedRelative = formatDistanceToNow(new Date(project.updatedAt), {
    addSuffix: true,
    locale: localeId,
  });

  return (
    <motion.div whileHover={{ y: -2, transition: { type: "spring", stiffness: 400, damping: 25 } }}>
      <Link href={`/projects/${project.id}`}>
        <Card className="cursor-pointer h-full relative overflow-hidden transition-all duration-200 hover:shadow-md hover:border-primary/30 group">
          <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-gradient-to-b from-[#2D79FF] to-[#8E54E9] opacity-0 group-hover:opacity-100 transition-opacity" />
          <CardContent className="p-5 space-y-3">
            {/* Stage badge + relative time */}
            <div className="flex items-center justify-between gap-3">
              <span
                className={
                  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium " +
                  meta.color +
                  " " +
                  meta.textColor
                }
              >
                {meta.label}
              </span>
              <span className="text-xs text-muted-foreground">{updatedRelative}</span>
            </div>

            {/* Title */}
            <h3 className="font-serif font-semibold text-base leading-snug line-clamp-2 group-hover:text-primary transition-colors">
              {project.title}
            </h3>

            {/* Meta row: type label */}
            <p className="text-xs text-muted-foreground">
              {TASK_TYPE_LABEL[type]}
            </p>

            {/* CTA */}
            <div className="flex items-center gap-2 pt-1">
              <Button size="sm" variant="default" className="flex-1">
                {ctaLabel}
                <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
              </Button>
              <Button size="sm" variant="outline" title="Preview" type="button" onClick={(e) => { e.preventDefault(); /* TODO preview modal */ }}>
                <FileText className="w-3.5 h-3.5" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </Link>
    </motion.div>
  );
}
