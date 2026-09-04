import { Link } from "wouter";

export default function Landing() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <h1 className="text-3xl font-serif font-bold text-foreground">Teora</h1>
        <p className="text-muted-foreground">AI Academic Workspace</p>
        <div className="space-y-2">
          <Link href="/login">
            <span className="text-primary font-medium hover:underline cursor-pointer">Sign in</span>
          </Link>
          <span className="text-muted-foreground"> or </span>
          <Link href="/register">
            <span className="text-primary font-medium hover:underline cursor-pointer">Create account</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
