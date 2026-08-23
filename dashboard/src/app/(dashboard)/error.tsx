'use client'

import { Button } from '@/components/ui/button'
import { AlertTriangle, ArrowLeft } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const router = useRouter()

  return (
    <div className="flex items-center justify-center min-h-[400px] p-8">
      <div className="text-center space-y-4 max-w-md">
        <div className="mx-auto w-12 h-12 rounded-xl bg-destructive/10 flex items-center justify-center">
          <AlertTriangle className="w-6 h-6 text-destructive" />
        </div>
        <h2 className="text-lg font-semibold">Failed to load content</h2>
        <p className="text-muted-foreground text-sm">
          {error.message || 'An error occurred while loading this section.'}
        </p>
        <div className="flex gap-2 justify-center">
          <Button onClick={() => router.back()} variant="outline" size="sm">
            <ArrowLeft className="w-4 h-4 mr-1" />
            Go back
          </Button>
          <Button onClick={reset} size="sm">
            Try again
          </Button>
        </div>
      </div>
    </div>
  )
}
