'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { getBusinessConfig } from '@/lib/config'
import { Scissors, Mail, Lock, Loader2, AlertCircle, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export function LoginView() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const businessConfig = getBusinessConfig()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      })

      if (result?.error) {
        setError('Invalid email or password')
      }
    } catch {
      setError('An error occurred. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-[#f6f1e7]">
      {/* ————— brand panel ————— */}
      <div className="relative hidden overflow-hidden bg-gradient-to-br from-[#241c14] via-[#33291a] to-[#1c150e] lg:block">
        <div className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-[#c8a24b1c] blur-3xl" />
        <div className="pointer-events-none absolute -left-16 bottom-0 h-80 w-80 rounded-full bg-[#b3715814] blur-3xl" />

        <div className="relative flex h-full flex-col justify-between p-12">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-full border border-[#c8a24b55]">
              <Scissors className="h-4.5 w-4.5 text-[#e9ce8c]" />
            </span>
            <div className="leading-none">
              <span className="block font-serif text-xl font-semibold tracking-[0.06em] text-[#f3ead9]">{businessConfig.name}</span>
              <span className="mt-1 block text-[8.5px] font-medium uppercase tracking-[0.38em] text-[#8d7f66]">Salon Studio</span>
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2 text-[#c8a24b]">
              <Sparkles className="h-3.5 w-3.5" />
              <span className="text-[10.5px] font-semibold uppercase tracking-[0.3em]">Welcome back</span>
            </div>
            <p className="mt-5 max-w-md font-serif text-4xl font-medium leading-snug text-[#f3ead9]">
              The chairs are warm.
              <br />
              <span className="italic text-[#e9ce8c]">The book is waiting.</span>
            </p>
            <p className="mt-5 max-w-sm text-[13.5px] leading-relaxed text-[#a3947a]">
              Today&apos;s timeline, your guests, and the marketing that fills the quiet
              hours — all in one calm place.
            </p>
          </div>

          <div className="flex items-center gap-8 border-t border-[#3a2f1d] pt-7">
            {[
              { v: 'Today view', l: 'see every hour' },
              { v: 'Campaigns', l: 'one-tap WhatsApp' },
              { v: 'Guest book', l: 'VIPs & at-risk' },
            ].map(s => (
              <div key={s.v}>
                <p className="font-serif text-lg text-[#e9ce8c]">{s.v}</p>
                <p className="mt-0.5 text-[11px] uppercase tracking-[0.16em] text-[#7a6d55]">{s.l}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ————— form panel ————— */}
      <div className="flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-sm">
          <div className="mb-9 flex items-center gap-3 lg:hidden">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-[#c8a24b] to-[#96742c]">
              <Scissors className="h-4.5 w-4.5 text-[#fffaef]" />
            </span>
            <span className="font-serif text-xl font-semibold text-[#2a221a]">{businessConfig.name}</span>
          </div>

          <h1 className="font-serif text-[1.9rem] font-semibold text-[#2a221a]">Sign in</h1>
          <p className="mt-2 text-[13.5px] text-[#8a7d68]">Back to the studio — your day is ready.</p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            {error && (
              <div className="flex items-center gap-2 rounded-xl border border-[#b4543f2a] bg-[#b4543f0d] p-3 text-[13px] text-[#a04c38]">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {error}
              </div>
            )}

            <div className="space-y-1.5">
              <label htmlFor="login-email" className="text-[12px] font-semibold text-[#6b5d4a]">Email</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#a3947a]" />
                <Input
                  id="login-email"
                  type="email"
                  placeholder="you@salon.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-11 rounded-xl border-[#ddd2ba] bg-[#fffdf8] pl-10 text-[13.5px] focus-visible:ring-[#b3903f]"
                  required
                  autoComplete="email"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="login-password" className="text-[12px] font-semibold text-[#6b5d4a]">Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#a3947a]" />
                <Input
                  id="login-password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-11 rounded-xl border-[#ddd2ba] bg-[#fffdf8] pl-10 text-[13.5px] focus-visible:ring-[#b3903f]"
                  required
                  autoComplete="current-password"
                />
              </div>
            </div>

            <Button
              type="submit"
              className="gm-btn-gold h-11 w-full rounded-xl text-[14px]"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Opening the studio…
                </>
              ) : (
                'Sign in'
              )}
            </Button>

            {process.env.NODE_ENV === 'development' && (
              <button
                type="button"
                onClick={() => { setEmail('admin@glamchain.com'); setPassword('password123') }}
                className="w-full rounded-xl border border-dashed border-[#d9c998] bg-[#fbf7ec] px-3 py-2.5 text-[11.5px] text-[#8a7d68] transition-colors hover:border-[#c8a24b] hover:text-[#96742c]"
              >
                Demo · tap to fill <span className="font-mono">admin@glamchain.com / password123</span>
              </button>
            )}
          </form>
        </div>
      </div>
    </div>
  )
}
