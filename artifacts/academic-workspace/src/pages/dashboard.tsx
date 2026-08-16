import { useState } from "react"
import { Link } from "wouter"
import { useListProjects, useGetProjectStats } from "@workspace/api-client-react"
import {
  FileText,
  Search,
  Plus,
  CheckCircle2,
  Clock,
  TrendingUp,
  Layers,
} from "lucide-react"

import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import { format } from "date-fns"

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case "completed":
      return <Badge variant="success">Completed</Badge>
    case "draft":
      return <Badge variant="default">Draft</Badge>
    case "analyzing":
      return <Badge variant="academic-purple" className="animate-pulse">Analyzing</Badge>
    case "writing":
      return <Badge variant="academic-amber" className="animate-pulse">Writing</Badge>
    case "waiting_revision":
      return <Badge variant="warning">Revision</Badge>
    case "archived":
      return <Badge variant="outline">Archived</Badge>
    default:
      return <Badge variant="secondary">{status}</Badge>
  }
}

function InfoStrip({ stats, loading }: { stats: any; loading: boolean }) {
  const total = stats?.total ?? 0
  const inProgress =
    (stats?.byStatus?.writing ?? 0) +
    (stats?.byStatus?.analyzing ?? 0) +
    (stats?.byStatus?.waiting_revision ?? 0)
  const completed = stats?.byStatus?.completed ?? 0

  return (
    <div className="relative overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      <div className="absolute inset-0 bg-gradient-to-r from-primary/[0.04] via-transparent to-accent/[0.04] pointer-events-none" />
      <div className="relative flex flex-col sm:flex-row">
        {[
          {
            label: "Total Projects",
            value: total,
            icon: Layers,
            accent: "text-primary",
            bg: "bg-primary/8",
          },
          {
            label: "In Progress",
            value: inProgress,
            icon: TrendingUp,
            accent: "text-accent",
            bg: "bg-accent/8",
          },
          {
            label: "Completed",
            value: completed,
            icon: CheckCircle2,
            accent: "text-emerald-600",
            bg: "bg-emerald-50",
          },
        ].map(({ label, value, icon: Icon, accent, bg }, i) => (
          <div
            key={label}
            className={`flex-1 px-5 py-4 flex items-center gap-3 ${i < 2 ? "sm:border-r" : ""} sm:border-b-0 border-b border-border last:border-b-0`}
          >
            <div className={`flex items-center justify-center w-9 h-9 rounded-lg ${bg} border border-border shadow-sm shrink-0`}>
              <Icon className={`w-4 h-4 ${accent}`} />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-widest font-mono">
                {label}
              </span>
              {loading ? (
                <Skeleton className="h-7 w-10 mt-0.5" />
              ) : (
                <span className={`text-2xl font-serif font-bold ${accent}`}>{value}</span>
              )}
            </div>
          </div>
        ))}
      </div>
      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-primary via-accent to-emerald-600 opacity-50" />
    </div>
  )
}

function ProjectCard({ project }: { project: any }) {
  return (
    <Link href={`/projects/${project.id}`}>
      <Card className="group cursor-pointer h-full flex flex-col relative overflow-hidden transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:border-primary/30">
        {/* Paper stack effect - subtle offset shadow layer */}
        <div className="absolute inset-0 rounded-lg border border-border bg-card translate-y-0.5 translate-x-0.5 opacity-40 pointer-events-none group-hover:opacity-60 transition-opacity duration-200" aria-hidden="true" />
        <div className="absolute inset-0 rounded-lg border border-border bg-card translate-y-1 translate-x-1 opacity-20 pointer-events-none group-hover:opacity-40 transition-opacity duration-200" aria-hidden="true" />

        <CardHeader className="pb-3 relative z-10">
          <div className="flex justify-between items-start gap-4 mb-2">
            <StatusBadge status={project.status} />
            <div className="flex items-center text-xs text-muted-foreground">
              <Clock className="w-3 h-3 mr-1" />
              {format(new Date(project.updatedAt), "MMM d, yyyy")}
            </div>
          </div>
          <CardTitle className="line-clamp-2 leading-tight group-hover:text-primary transition-colors duration-200">
            {project.title}
          </CardTitle>
          {project.subject && <CardDescription>{project.subject}</CardDescription>}
        </CardHeader>
        <CardContent className="flex-1 relative z-10">
          <p className="text-sm text-muted-foreground line-clamp-3">
            {project.instructionText || "No instructions provided."}
          </p>
        </CardContent>
        <CardFooter className="pt-0 pb-5 relative z-10">
          <div className="w-full space-y-1.5">
            <div className="flex justify-between text-xs font-medium text-muted-foreground">
              <span>Progress</span>
              <span>{project.progress}%</span>
            </div>
            <Progress value={project.progress} className="h-1" />
          </div>
        </CardFooter>
      </Card>
    </Link>
  )
}

export default function Dashboard() {
  const [search, setSearch] = useState("")

  const { data: stats, isLoading: statsLoading } = useGetProjectStats()
  const { data: projects, isLoading: projectsLoading } = useListProjects({
    search: search || undefined,
  })

  const projectList = Array.isArray(projects) ? projects : []

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h1 className="text-3xl font-serif font-bold text-primary tracking-tight">
            Your Workspace
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage and track your academic writing projects.
          </p>
        </div>
        <Link href="/projects/new">
          <Button className="font-medium shadow-sm bg-primary hover:bg-primary/90">
            <Plus className="w-4 h-4 mr-2" />
            New Project
          </Button>
        </Link>
      </div>

      <InfoStrip stats={stats} loading={statsLoading} />

      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-center">
          <h2 className="text-xl font-serif font-semibold">Recent Projects</h2>
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search projects..."
              className="pl-9 bg-background"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {projectsLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader>
                  <Skeleton className="h-6 w-3/4" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-2/3 mt-2" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : projectList.length === 0 ? (
          <div className="text-center py-16 border-2 border-dashed border-border rounded-xl bg-card/50">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-primary/10 text-primary mb-4 shadow-sm">
              <FileText className="w-7 h-7" />
            </div>
            <h3 className="text-lg font-medium text-foreground mb-1">
              No projects found
            </h3>
            <p className="text-muted-foreground text-sm max-w-sm mx-auto mb-4">
              {search
                ? "We couldn't find any projects matching your search."
                : "Get started by creating your first academic writing project."}
            </p>
            {!search && (
              <Link href="/projects/new">
                <Button variant="outline">Create Project</Button>
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projectList.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
