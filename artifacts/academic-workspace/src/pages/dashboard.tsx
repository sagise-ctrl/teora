import { useState } from "react"
import { Link } from "wouter"
import { motion } from "framer-motion"
import { useListProjects } from "../lib/api-client-react"
import { useAuth } from "@/hooks/use-auth"
import {
  Search,
  Plus,
  Clock,
  Sparkles,
  MessageSquare,
  ArrowRight,
} from "lucide-react"

import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription, EmptyIllustrationPapers } from "@/components/ui/empty"
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

function ProjectCard({ project }: { project: any }) {
  return (
    <Link href={`/projects/${project.id}`}>
      <motion.div
        whileHover={{ y: -3, transition: { type: "spring", stiffness: 400, damping: 25 } }}
        className="group"
      >
        <Card className="cursor-pointer h-full flex flex-col relative overflow-hidden transition-all duration-200 hover:shadow-md hover:border-[#2D79FF]/30">
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
      </motion.div>
    </Link>
  )
}

export default function Dashboard() {
  const [search, setSearch] = useState("")
  const { user } = useAuth()

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
          What academic challenge are we solving today?
        </p>
      </div>

      {/* AI Assistant Shortcut */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
      >
        <Link href="/projects/new">
          <div className="group relative overflow-hidden rounded-xl border border-border bg-gradient-to-br from-[#2D79FF]/5 via-[#8E54E9]/5 to-transparent p-6 cursor-pointer hover:border-[#2D79FF]/30 transition-all duration-200">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-[#2D79FF]/10 to-[#8E54E9]/10 rounded-full blur-3xl" />
            <div className="relative flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#2D79FF] to-[#8E54E9] flex items-center justify-center shadow-lg shadow-[#2D79FF]/20 shrink-0">
                <MessageSquare className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Sparkles className="w-5 h-5 text-[#2D79FF]" />
                  <h2 className="text-xl font-serif font-bold tracking-tight">AI Assistant</h2>
                </div>
                <p className="text-sm text-muted-foreground">
                  Tanya apa saja tentang tugas, referensi, atau penulisan akademik
                </p>
              </div>
              <Button className="shrink-0 bg-gradient-to-r from-[#2D79FF] to-[#8E54E9] hover:opacity-90 shadow-md shadow-[#2D79FF]/20">
                Mulai Chat
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        </Link>
      </motion.div>

      {/* Your Tasks */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-center">
          <h2 className="text-xl font-serif font-semibold self-start sm:self-auto">Your Tasks</h2>
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
                New Task
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
          <Empty>
            <EmptyMedia illustration="papers">
              <EmptyIllustrationPapers />
            </EmptyMedia>
            <EmptyHeader>
              <EmptyTitle>No tasks found</EmptyTitle>
              <EmptyDescription>
                {search
                  ? "We couldn't find any tasks matching your search."
                  : "Get started by creating your first task."}
              </EmptyDescription>
            </EmptyHeader>
            {!search && (
              <Link href="/projects/new">
                <Button variant="outline">Create Task</Button>
              </Link>
            )}
          </Empty>
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
