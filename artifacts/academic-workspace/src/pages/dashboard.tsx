import { useState } from "react"
import { Link } from "wouter"
import { useListProjects, useGetProjectStats } from "../lib/api-client-react"
import { useAuth } from "@/hooks/use-auth"
import {
  FileText,
  Search,
  Plus,
  CheckCircle2,
  Clock,
  Layers,
  Sparkles,
  BookOpen,
  FilePen,
  FileSpreadsheet,
  ArrowRight,
  Coins,
  Zap,
} from "lucide-react"

import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
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

function TokenBalanceCard() {
  const MOCK_BALANCE = 850
  const MOCK_LIMIT = 1000
  const percentage = Math.round((MOCK_BALANCE / MOCK_LIMIT) * 100)

  return (
    <div className="relative overflow-hidden rounded-xl border border-border/50 bg-gradient-to-br from-[#2D79FF]/5 via-[#8E54E9]/5 to-transparent p-6">
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-[#2D79FF]/10 to-[#8E54E9]/10 rounded-full blur-3xl" />
      <div className="relative flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#2D79FF] to-[#8E54E9] flex items-center justify-center shadow-lg shadow-[#2D79FF]/20">
            <Coins className="w-6 h-6 text-white" />
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Token Balance</p>
            <p className="text-2xl font-serif font-bold tracking-tight">
              {MOCK_BALANCE.toLocaleString()} <span className="text-muted-foreground text-lg">/ {MOCK_LIMIT.toLocaleString()}</span>
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">Resets in 14 days</p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-3">
          <Button variant="outline" size="sm" className="text-xs">
            Get more
          </Button>
          <div className="w-32 space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Usage</span>
              <span className="font-medium">{percentage}%</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#2D79FF] to-[#8E54E9] rounded-full transition-all duration-500"
                style={{ width: `${percentage}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

const FEATURE_CARDS = [
  {
    id: "outline",
    icon: Sparkles,
    title: "Draft a comprehensive thesis outline",
    description: "Generate structured thesis outlines with proper academic sections and logical flow in seconds.",
    badge: "New",
    badgeColor: "from-[#2D79FF] to-[#8E54E9]",
    tokens: "Est. 10-20 tokens",
    href: "/projects/new?type=outline",
  },
  {
    id: "task",
    icon: BookOpen,
    title: "Task Helper",
    description: "Break down assignments, generate summaries, and clarify complex academic concepts.",
    tokens: "Est. 5-10 tokens",
    href: "/projects/new?type=task",
  },
  {
    id: "paper",
    icon: FilePen,
    title: "Scientific Paper Writer",
    description: "Draft structured sections of scientific papers with proper academic formatting and citations.",
    tokens: "Est. 20-50 tokens",
    href: "/projects/new?type=paper",
  },
  {
    id: "proposal",
    icon: FileSpreadsheet,
    title: "Proposal Creator",
    description: "Construct persuasive research or project proposals with clear objectives and timelines.",
    tokens: "Est. 15-30 tokens",
    href: "/projects/new?type=proposal",
  },
]

function FeatureCard({ card, index }: { card: typeof FEATURE_CARDS[0]; index: number }) {
  const Icon = card.icon

  return (
    <div className="group relative">
      {/* Gradient border effect on hover */}
      <div className="absolute -inset-[1px] bg-gradient-to-r from-[#2D79FF] via-[#8E54E9] to-[#2D79FF] rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-sm" />
      <div className="relative bg-card border border-border rounded-xl p-5 hover:border-[#2D79FF]/30 transition-all duration-200">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#2D79FF]/10 to-[#8E54E9]/10 flex items-center justify-center shrink-0 group-hover:from-[#2D79FF]/20 group-hover:to-[#8E54E9]/20 transition-all duration-200">
              <Icon className="w-5 h-5 text-[#2D79FF] group-hover:text-[#8E54E9] transition-colors duration-200" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-serif font-semibold text-base">{card.title}</h3>
                {card.badge && (
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold text-white bg-gradient-to-r ${card.badgeColor} shadow-sm`}>
                    {card.badge}
                  </span>
                )}
              </div>
              <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{card.description}</p>
              <p className="text-xs text-muted-foreground/70 mt-2 font-mono">{card.tokens}</p>
            </div>
          </div>
          <Link href={card.href}>
            <Button variant="ghost" size="icon" className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
        {/* Bottom gradient line */}
        <div className="absolute bottom-0 left-4 right-4 h-[2px] bg-gradient-to-r from-transparent via-[#2D79FF]/0 group-hover:via-[#2D79FF]/50 to-transparent transition-all duration-300" />
      </div>
    </div>
  )
}

function ProjectCard({ project }: { project: any }) {
  return (
    <Link href={`/projects/${project.id}`}>
      <Card className="group cursor-pointer h-full flex flex-col relative overflow-hidden transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:border-[#2D79FF]/30">
        {/* Left accent border on hover */}
        <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-gradient-to-b from-[#2D79FF] to-[#8E54E9] opacity-0 group-hover:opacity-100 transition-opacity duration-200" />

        <CardHeader className="pb-3">
          <div className="flex justify-between items-start gap-4 mb-2">
            <StatusBadge status={project.status} />
            <div className="flex items-center text-xs text-muted-foreground">
              <Clock className="w-3 h-3 mr-1" />
              {format(new Date(project.updatedAt), "MMM d, yyyy")}
            </div>
          </div>
          <CardTitle className="line-clamp-2 leading-tight group-hover:text-[#2D79FF] transition-colors duration-200">
            {project.title}
          </CardTitle>
          {project.subject && <CardDescription>{project.subject}</CardDescription>}
        </CardHeader>
        <CardContent className="flex-1">
          <p className="text-sm text-muted-foreground line-clamp-3">
            {project.instructionText || "No instructions provided."}
          </p>
        </CardContent>
        <div className="px-6 pb-5">
          <div className="w-full space-y-1.5">
            <div className="flex justify-between text-xs font-medium text-muted-foreground">
              <span>Progress</span>
              <span>{project.progress}%</span>
            </div>
            <Progress value={project.progress} className="h-1" />
          </div>
        </div>
      </Card>
    </Link>
  )
}

export default function Dashboard() {
  const [search, setSearch] = useState("")
  const { user } = useAuth()

  const { data: stats, isLoading: statsLoading } = useGetProjectStats()
  const { data: projects, isLoading: projectsLoading } = useListProjects({
    search: search || undefined,
  })

  const projectList = Array.isArray(projects) ? projects : []
  const displayName = user?.displayName || "User"
  const firstName = displayName.split(" ")[0]

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Welcome Header */}
      <div className="space-y-1">
        <h1 className="text-3xl font-serif font-bold tracking-tight">
          Welcome back, {firstName}
        </h1>
        <p className="text-muted-foreground">
          What academic challenge are we solving today? Access your specialized AI tools below.
        </p>
      </div>

      {/* Token Balance */}
      <TokenBalanceCard />

      {/* Feature Cards */}
      <div className="space-y-4">
        <h2 className="text-lg font-serif font-semibold">AI Writing Tools</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {FEATURE_CARDS.map((card, index) => (
            <FeatureCard key={card.id} card={card} index={index} />
          ))}
        </div>
      </div>

      {/* Your Projects */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-center">
          <h2 className="text-xl font-serif font-semibold self-start sm:self-auto">Your Projects</h2>
          <div className="flex items-center gap-3 self-start sm:self-auto w-full sm:w-auto">
            <div className="relative flex-1 sm:flex-initial sm:w-72">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search projects..."
                className="pl-9 bg-background"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Link href="/projects/new">
              <Button size="sm" className="shrink-0 bg-gradient-to-r from-[#2D79FF] to-[#8E54E9] hover:opacity-90 shadow-md shadow-[#2D79FF]/20">
                <Plus className="w-4 h-4 mr-1.5" />
                New Project
              </Button>
            </Link>
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
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-gradient-to-br from-[#2D79FF]/10 to-[#8E54E9]/10 mb-4">
              <FileText className="w-7 h-7 text-[#2D79FF]" />
            </div>
            <h3 className="text-lg font-medium mb-1">No projects found</h3>
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
