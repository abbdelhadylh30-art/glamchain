'use client'

import { Button } from '@/components/ui/button'
import { ArrowLeft, Home } from 'lucide-react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function DashboardNotFound() {
  const router = useRouter()

  return (
    <div className="flex items-center justify-center min-h-[400px] p-8">
      <div className="text-center space-y-4 max-w-md">
        <div className="text-5xl font-bold text-muted-foreground/20">404</div>
        <h2 className="text-lg font-semibold">Page not found</h2>
        <p className="text-muted-foreground text-sm">
          The page you are looking for does not exist within the dashboard.
        </p>
        <div className="flex gap-2 justify-center">
          <Button onClick={() => router.back()} variant="outline" size="sm">
            <ArrowLeft className="w-4 h-4 mr-1" />
            Go back
          </Button>
          <Button asChild size="sm">
            <Link href="/dashboard">
              <Home className="w-4 h-4 mr-1" />
              Dashboard
            </Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
