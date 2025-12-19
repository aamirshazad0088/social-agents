import { cn } from "@/lib/utils"

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'card' | 'text' | 'circle' | 'button'
}

export function Skeleton({ className, variant = 'default', ...props }: SkeletonProps) {
  const variants = {
    default: "h-4 w-full",
    card: "h-48 w-full rounded-lg",
    text: "h-4 w-3/4",
    circle: "h-12 w-12 rounded-full",
    button: "h-10 w-24 rounded-md"
  }

  return (
    <div
      className={cn(
        "animate-shimmer bg-gradient-to-r from-muted via-muted-foreground/10 to-muted rounded-md",
        variants[variant],
        className
      )}
      {...props}
    />
  )
}

// Preset skeleton layouts for common use cases
export function AnalyticsSkeleton() {
  return (
    <div className="space-y-6 page-transition">
      <Skeleton className="h-10 w-64" />
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-card rounded-lg border border-border p-6 space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-32" />
          </div>
        ))}
      </div>
      <Skeleton variant="card" className="h-96" />
    </div>
  )
}
