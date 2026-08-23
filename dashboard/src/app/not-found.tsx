import { Button } from '@/components/ui/button'
import { Home } from 'lucide-react'
import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="text-center space-y-4 max-w-md">
        <div className="text-6xl font-bold text-muted-foreground/30">404</div>
        <h2 className="text-xl font-semibold">Page not found</h2>
        <p className="text-muted-foreground text-sm">
          The page you are looking for does not exist or has been moved.
        </p>
        <Button asChild>
          <Link href="/">
            <Home className="w-4 h-4 mr-2" />
            Return home
          </Link>
        </Button>
      </div>
    </div>
  )
}
