import { useState } from "react"
import { Link } from "wouter"
import { useListProjects, useGetProjectStats } from "@workspace/api-client-react"
import { 
  FileText, 
  Search, 
  Plus, 
  ActivitySquare, 
  CheckCircle2, 
  Clock 
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
      return <Badge variant="secondary">Draft</Badge>
    case "analyzing":
      return <Badge variant="info" className="animate-pulse">Analyzing</Badge>
    case "writing":
      return <Badge variant="primary" className="bg-primary">Writing</Badge>
    case "waiting_revision":
      return <Badge variant="warning">Revision</Badge>
    case "archived":
      return <Badge variant="outline">Archived</Badge>
    default:
      return <Badge variant="secondary">{status}</Badge>
  }
}

export default function Dashboard() {
  const [search, setSearch] = useState("")
  
  const { data: stats, isLoading: statsLoading } = useGetProjectStats()
  const { data: projects, isLoading: projectsLoading } = useListProjects({ search: search || undefined })

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h1 className="text-3xl font-serif font-bold text-primary tracking-tight">Your Workspace</h1>
          <p className="text-muted-foreground mt-1">Manage and track your academic writing projects.</p>
        </div>
        <Link href="/projects/new">
          <Button className="font-medium shadow-sm">
            <Plus className="w-4 h-4 mr-2" />
            New Project
          </Button>
        </Link>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-sans font-medium text-muted-foreground flex items-center">
              <FileText className="w-4 h-4 mr-2" />
              Total Projects
            </CardTitle>
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-3xl font-bold text-foreground">{stats?.total || 0}</div>
            )}
          </CardContent>
        </Card>
        
        <Card className="bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-sans font-medium text-muted-foreground flex items-center">
              <ActivitySquare className="w-4 h-4 mr-2" />
              In Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-3xl font-bold text-primary">
                {(stats?.byStatus?.writing || 0) + (stats?.byStatus?.analyzing || 0) + (stats?.byStatus?.waiting_revision || 0)}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-sans font-medium text-muted-foreground flex items-center">
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Completed
            </CardTitle>
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-3xl font-bold text-emerald-600">
                {stats?.byStatus?.completed || 0}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

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
            {[1, 2, 3].map(i => (
              <Card key={i} className="animate-pulse">
                <CardHeader><Skeleton className="h-6 w-3/4" /></CardHeader>
                <CardContent><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-2/3 mt-2" /></CardContent>
              </Card>
            ))}
          </div>
        ) : projects?.length === 0 ? (
          <div className="text-center py-16 border-2 border-dashed border-border rounded-lg bg-card/50">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 text-primary mb-4">
              <FileText className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-medium text-foreground mb-1">No projects found</h3>
            <p className="text-muted-foreground text-sm max-w-sm mx-auto mb-4">
              {search ? "We couldn't find any projects matching your search." : "Get started by creating your first academic writing project."}
            </p>
            {!search && (
              <Link href="/projects/new">
                <Button variant="outline">Create Project</Button>
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects?.map((project) => (
              <Link key={project.id} href={`/projects/${project.id}`}>
                <Card className="hover:border-primary/50 transition-colors cursor-pointer h-full flex flex-col group">
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start gap-4 mb-2">
                      <StatusBadge status={project.status} />
                      <div className="flex items-center text-xs text-muted-foreground">
                        <Clock className="w-3 h-3 mr-1" />
                        {format(new Date(project.updatedAt), "MMM d, yyyy")}
                      </div>
                    </div>
                    <CardTitle className="line-clamp-2 leading-tight group-hover:text-primary transition-colors">
                      {project.title}
                    </CardTitle>
                    {project.subject && (
                      <CardDescription>{project.subject}</CardDescription>
                    )}
                  </CardHeader>
                  <CardContent className="flex-1">
                    <p className="text-sm text-muted-foreground line-clamp-3">
                      {project.instructionText || "No instructions provided."}
                    </p>
                  </CardContent>
                  <CardFooter className="pt-0 pb-5">
                    <div className="w-full space-y-1.5">
                      <div className="flex justify-between text-xs font-medium text-muted-foreground">
                        <span>Progress</span>
                        <span>{project.progress}%</span>
                      </div>
                      <Progress value={project.progress} className="h-1.5" />
                    </div>
                  </CardFooter>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
