import { useLocation } from "wouter"
import { Link } from "wouter"
import { 
  BookOpen, 
  Library, 
  Settings, 
  PlusCircle, 
  Briefcase 
} from "lucide-react"
import { cn } from "@/lib/utils"

export default function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation()

  return (
    <div className="flex min-h-[100dvh] w-full bg-background text-foreground">
      {/* Sidebar */}
      <aside className="w-64 border-r border-border bg-sidebar flex-shrink-0 hidden md:flex flex-col">
        <div className="h-16 flex items-center px-6 border-b border-border">
          <BookOpen className="w-6 h-6 text-primary mr-3" />
          <span className="font-serif font-bold text-lg text-primary tracking-tight">Academia</span>
        </div>
        
        <div className="p-4 flex-1">
          <nav className="space-y-1">
            <Link href="/">
              <div className={cn(
                "flex items-center px-3 py-2 text-sm rounded-md transition-colors cursor-pointer group",
                location === "/" 
                  ? "bg-primary text-primary-foreground font-medium" 
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )}>
                <Library className={cn(
                  "w-4 h-4 mr-3", 
                  location === "/" ? "text-primary-foreground" : "text-muted-foreground group-hover:text-sidebar-accent-foreground"
                )} />
                Projects
              </div>
            </Link>
            <Link href="/projects/new">
              <div className={cn(
                "flex items-center px-3 py-2 text-sm rounded-md transition-colors cursor-pointer group",
                location === "/projects/new" 
                  ? "bg-primary text-primary-foreground font-medium" 
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )}>
                <PlusCircle className={cn(
                  "w-4 h-4 mr-3", 
                  location === "/projects/new" ? "text-primary-foreground" : "text-muted-foreground group-hover:text-sidebar-accent-foreground"
                )} />
                New Project
              </div>
            </Link>
          </nav>
        </div>

        <div className="p-4 border-t border-border">
          <div className="flex items-center px-3 py-2 text-sm text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground rounded-md cursor-pointer transition-colors">
            <Settings className="w-4 h-4 mr-3 text-muted-foreground" />
            Settings
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Mobile Header */}
        <div className="h-16 border-b border-border bg-sidebar px-4 flex items-center md:hidden shrink-0">
          <BookOpen className="w-6 h-6 text-primary mr-3" />
          <span className="font-serif font-bold text-lg text-primary tracking-tight">Academia</span>
        </div>
        <div className="flex-1 overflow-auto p-4 md:p-8">
          <div className="mx-auto max-w-6xl">
            {children}
          </div>
        </div>
      </main>
    </div>
  )
}
