import { Link } from "wouter"
import { Button } from "@/components/ui/button"

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background p-4">
      <div className="text-center max-w-md animate-in fade-in zoom-in-95 duration-500">
        <h1 className="text-8xl font-serif font-bold text-primary mb-4">404</h1>
        <h2 className="text-2xl font-bold text-foreground mb-4">Page not found</h2>
        <p className="text-muted-foreground mb-8">
          The page you are looking for doesn't exist or has been moved.
        </p>
        <Link href="/">
          <Button size="lg" className="w-full sm:w-auto">Return to Dashboard</Button>
        </Link>
      </div>
    </div>
  )
}
