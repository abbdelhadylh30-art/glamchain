'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useSession, signIn, signOut } from 'next-auth/react'
import { getBusinessConfig, formatCurrency } from '@/lib/config'
import { BookingWidget } from '@/components/booking/booking-widget'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Scissors, MapPin, Phone, Mail, Clock, CalendarDays, ArrowRight, ChevronRight, Sparkles, Heart, ShieldCheck, Loader2, AlertCircle, LayoutDashboard, Menu, X, Star, MessageCircle, ArrowUp } from 'lucide-react'

interface ServiceItem { id: string; name: string; category: string; duration: number; price: number; description: string | null }
interface ServiceGroup { category: string; services: ServiceItem[] }
interface LocationInfo { id: string; name: string; address: string; city: string; phone: string; email: string; openTime: string; closeTime: string }
const businessConfig = getBusinessConfig()
// Client-safe dashboard origin — NEXTAUTH_URL is server-only and hydrates as undefined on the client
const DASHBOARD_URL = process.env.NEXT_PUBLIC_API_URL || ''

const C = { bg:'#0A0A0F', surface:'#13131C', surface2:'#1A1A28', text:'#F5F5F0', muted:'#9C9CA8', border:'#252530', gold:'#D4AF37', goldLight:'#F0D060', emerald:'#10B981' }
const goldBtn = { background:`linear-gradient(135deg,${C.gold} 0%,${C.goldLight} 100%)`, color:C.bg, border:'none' }
const goldOutline = { background:'transparent', color:C.gold, border:`1px solid ${C.gold}40` }

/* ---- Deterministic particle field (seeded PRNG → identical on server & client, hydration-safe) ---- */
function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6D2B79F5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const PARTICLES = (() => {
  const rnd = mulberry32(20260823)
  return Array.from({ length: 18 }, (_, i) => ({
    id: i,
    left: 3 + rnd() * 94,
    size: 2 + rnd() * 3,
    gold: rnd() > 0.45,
    dur: 16 + rnd() * 20,
    delay: -rnd() * 30,
    op: 0.15 + rnd() * 0.35,
  }))
})()

/* ---- Testimonials (static, Gulf-region flavour) ---- */
const TESTIMONIALS = [
  { name: 'Noor A.', role: 'Regular since 2023', text: 'The best salon experience in Doha. My stylist remembered exactly what I wanted from my last visit — down to the shade.' },
  { name: 'Sarah M.', role: 'Balayage & styling', text: 'Booked through their site in under a minute. Gorgeous space, flawless colour, zero waiting.' },
  { name: 'Fatima K.', role: 'Bridal package', text: 'They treated my whole bridal party like royalty. The attention to detail here is unmatched.' },
  { name: 'Khalid R.', role: 'Spa day gift', text: 'Took my mother for a spa day — she has not stopped talking about it. Worth every riyal.' },
  { name: 'Maryam S.', role: 'Manicure & pedicure', text: 'Finally, a salon that runs on time. Beautiful results and a genuinely relaxing atmosphere.' },
  { name: 'Layla H.', role: 'Keratin treatment', text: 'From the welcome drink to the final mirror moment — pure luxury from start to finish.' },
]

/* ---- Count-up stat (rAF, honours reduced motion) ---- */
function CountUp({ to, decimals = 0, suffix = '' }: { to: number; decimals?: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null)
  const [started, setStarted] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      (es) => es.forEach((e) => { if (e.isIntersecting) { setStarted(true); obs.disconnect() } }),
      { threshold: 0.4 }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [])
  useEffect(() => {
    if (!started || !ref.current) return
    const fmt = (v: number) => (decimals > 0 ? v.toFixed(decimals) : Math.round(v).toLocaleString('en-US')) + suffix
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { ref.current.textContent = fmt(to); return }
    const dur = 1600, t0 = performance.now()
    let raf = 0
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / dur)
      const e = 1 - Math.pow(1 - p, 3)
      if (ref.current) ref.current.textContent = fmt(to * e)
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [started, to, decimals, suffix])
  return <span ref={ref}>{(decimals > 0 ? (0).toFixed(decimals) : '0') + suffix}</span>
}

/* ---- Section heading with eyebrow + animated divider ---- */
function SectionHead({ eyebrow, title, sub }: { eyebrow: string; title: string; sub?: string }) {
  return (
    <div style={{ textAlign: 'center', marginBottom: 48 }}>
      <div data-anim className="gc-reveal gc-eyebrow" style={{ display: 'inline-flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <span className="gc-eyebrow-line" /><span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.22em', textTransform: 'uppercase', color: C.gold }}>{eyebrow}</span><span className="gc-eyebrow-line" />
      </div>
      <h2 data-anim className="gc-reveal" style={{ fontSize: 'clamp(1.75rem,4vw,2.5rem)', fontWeight: 800, color: C.text, letterSpacing: '-0.02em', marginBottom: sub ? 8 : 0 }}>{title}</h2>
      {sub && <p data-anim className="gc-reveal" style={{ color: C.muted, maxWidth: 520, margin: '0 auto' }}>{sub}</p>}
    </div>
  )
}

export default function LandingPage() {
  const { data: session } = useSession()
  const [locationId, setLocationId] = useState<string|null>(null)
  const [location, setLocation] = useState<LocationInfo|null>(null)
  const [serviceGroups, setServiceGroups] = useState<ServiceGroup[]>([])
  const [bookingOpen, setBookingOpen] = useState(false)
  const [preselectedService, setPreselectedService] = useState<string|null>(null)
  const [showLogin, setShowLogin] = useState(false)
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [loginError, setLoginError] = useState('')
  const [loginLoading, setLoginLoading] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const glowRef = useRef<HTMLDivElement>(null)
  const progressRef = useRef<HTMLDivElement>(null)
  const navRef = useRef<HTMLElement>(null)
  const topRef = useRef<HTMLButtonElement>(null)
  const revealObserver = useRef<IntersectionObserver|null>(null)

  /* Data load + reveal observer that ALSO picks up async-rendered cards (bug fix) */
  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || ''
        const cfg = await fetch(`${apiUrl}/api/config`); if(!cfg.ok) return
        const cd = await cfg.json(); if(cancelled||!cd.location) return
        setLocationId(cd.location.id); setLocation(cd.location)
        const bk = await fetch(`${apiUrl}/api/public/booking?locationId=${cd.location.id}`); if(!bk.ok) return
        const bd = await bk.json(); if(!cancelled) setServiceGroups(bd.services||[])
      } catch {}
    }
    load()
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(e => { if(e.isIntersecting) { e.target.classList.add('gc-in'); observer.unobserve(e.target) } })
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' })
    revealObserver.current = observer
    const observeAll = () => document.querySelectorAll('[data-anim]:not(.gc-in)').forEach(el => observer.observe(el))
    const t = setTimeout(observeAll, 60)
    const mo = new MutationObserver(() => observeAll())
    mo.observe(document.body, { childList: true, subtree: true })
    return () => { cancelled = true; clearTimeout(t); mo.disconnect(); observer.disconnect() }
  }, [])

  /* Re-observe when async services arrive */
  useEffect(() => {
    if (serviceGroups.length && revealObserver.current) {
      document.querySelectorAll('[data-anim]:not(.gc-in)').forEach(el => revealObserver.current!.observe(el))
    }
  }, [serviceGroups])

  /* Cursor glow via ref + rAF — zero React re-renders (perf fix) */
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    let raf = 0, tx = innerWidth/2, ty = innerHeight/2, cx = tx, cy = ty
    const onMove = (e: MouseEvent) => { tx = e.clientX; ty = e.clientY }
    const tick = () => {
      cx += (tx - cx) * 0.10; cy += (ty - cy) * 0.10
      if (glowRef.current) glowRef.current.style.transform = `translate3d(${cx - 220}px, ${cy - 220}px, 0)`
      raf = requestAnimationFrame(tick)
    }
    window.addEventListener('mousemove', onMove, { passive: true })
    raf = requestAnimationFrame(tick)
    return () => { window.removeEventListener('mousemove', onMove); cancelAnimationFrame(raf) }
  }, [])

  /* Scroll: progress bar, nav state, back-to-top — one rAF-throttled listener */
  useEffect(() => {
    let raf = 0
    const onScroll = () => {
      if (raf) return
      raf = requestAnimationFrame(() => {
        raf = 0
        const max = document.documentElement.scrollHeight - innerHeight
        const p = max > 0 ? Math.min(1, scrollY / max) : 0
        if (progressRef.current) progressRef.current.style.transform = `scaleX(${p})`
        navRef.current?.classList.toggle('gc-nav-solid', scrollY > 24)
        topRef.current?.classList.toggle('gc-top-visible', scrollY > 600)
      })
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => { window.removeEventListener('scroll', onScroll); if (raf) cancelAnimationFrame(raf) }
  }, [])

  const handleBookNow = useCallback((sid?: string) => { setPreselectedService(sid||null); setBookingOpen(true) }, [])
  const scrollTo = useCallback((id: string) => { setMenuOpen(false); document.getElementById(id)?.scrollIntoView({ behavior:'smooth' }) }, [])
  const navLinks: [string, string][] = [['Services','services'],['Reviews','reviews'],['About','about'],['Contact','contact']]
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault(); setLoginError(''); setLoginLoading(true)
    try { const r = await signIn('credentials', { email:loginEmail, password:loginPassword, redirect:false })
      if(r?.error) setLoginError('Try admin@glamchain.com / password123')
      else { setShowLogin(false); setLoginEmail(''); setLoginPassword('') }
    } catch { setLoginError('Error') } finally { setLoginLoading(false) }
  }
  const handleSignOut = async () => { await signOut({ redirect:false }) }
  const allServices = serviceGroups.flatMap(g => g.services)
  const catAccent = (cat: string) => cat.toLowerCase().includes('hair') ? '#D4AF37' : cat.toLowerCase().includes('nail') ? '#10B981' : cat.toLowerCase().includes('spa') ? '#F472B6' : '#8B9DAF'

  return (
    <div ref={containerRef} style={{ minHeight:'100vh', background:C.bg, color:C.text, position:'relative', overflow:'hidden' }}>

      {/* ===== AMBIENT LAYERS + DESIGN SYSTEM ===== */}
      <style>{`
        @keyframes gcAurora { 0%{background-position:0% 0%} 50%{background-position:100% 50%} 100%{background-position:0% 0%} }
        @keyframes gcFloat { 0%{transform:translateY(0) translateX(0);opacity:0} 10%{opacity:var(--pop,0.5)} 90%{opacity:calc(var(--pop,0.5)*0.6)} 100%{transform:translateY(-120vh) translateX(24px);opacity:0} }
        @keyframes gcSweep { 0%{transform:translateX(-100%)} 100%{transform:translateX(220%)} }
        @keyframes gcDrift { 0%{transform:translate(0,0)} 33%{transform:translate(34px,-22px)} 66%{transform:translate(-22px,16px)} 100%{transform:translate(0,0)} }
        @keyframes gcShimmer { 0%{background-position:200% center} 100%{background-position:-200% center} }
        @keyframes gcMarquee { 0%{transform:translateX(0)} 100%{transform:translateX(-50%)} }
        @keyframes gcScrollDot { 0%{transform:translateY(0);opacity:1} 70%{transform:translateY(14px);opacity:0} 100%{transform:translateY(0);opacity:0} }
        @keyframes gcSpinSlow { to{transform:rotate(360deg)} }

        /* Scroll reveal (with per-element delay) */
        .gc-reveal { opacity:0; transform:translateY(28px); transition:opacity 0.8s cubic-bezier(0.22,1,0.36,1), transform 0.8s cubic-bezier(0.22,1,0.36,1); }
        .gc-reveal.gc-in { opacity:1; transform:translateY(0); }

        /* Shimmering gold gradient text */
        .gc-shimmer-text { background:linear-gradient(110deg, ${C.gold} 20%, ${C.goldLight} 40%, #FFF6D8 50%, ${C.goldLight} 60%, ${C.gold} 80%); background-size:200% auto; -webkit-background-clip:text; background-clip:text; -webkit-text-fill-color:transparent; animation:gcShimmer 5s linear infinite; }

        /* Button shimmer sweep on hover */
        .gc-btn-shimmer { position:relative; overflow:hidden; }
        .gc-btn-shimmer::after { content:''; position:absolute; top:0; left:0; width:100%; height:100%;
          background:linear-gradient(90deg,transparent,rgba(255,255,255,0.35),transparent);
          transform:translateX(-100%); }
        .gc-btn-shimmer:hover::after { animation:gcSweep 0.8s ease; }
        .gc-btn-shimmer { transition:transform 0.25s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.25s ease; }
        .gc-btn-shimmer:hover { transform:translateY(-2px); box-shadow:0 10px 28px rgba(212,175,55,0.25); }
        .gc-btn-shimmer:active { transform:translateY(0) scale(0.98); }

        /* Card lift + inner arrow slide */
        .gc-lift { transition:transform 0.4s cubic-bezier(0.22,1,0.36,1), border-color 0.4s ease, box-shadow 0.4s ease; }
        .gc-lift:hover { transform:translateY(-6px); border-color:rgba(212,175,55,0.35)!important; box-shadow:0 18px 48px rgba(0,0,0,0.5), 0 0 0 1px rgba(212,175,55,0.08), 0 12px 40px rgba(212,175,55,0.07); }
        .gc-arrow { transition:transform 0.3s cubic-bezier(0.22,1,0.36,1); }
        .gc-lift:hover .gc-arrow { transform:translateX(4px); }
        .gc-card-icon { transition:transform 0.4s cubic-bezier(0.34,1.56,0.64,1), background 0.4s ease; }
        .gc-lift:hover .gc-card-icon { transform:scale(1.08) rotate(-3deg); }

        /* Glass */
        .gc-glass { background:rgba(255,255,255,0.03); backdrop-filter:blur(20px); -webkit-backdrop-filter:blur(20px); border:1px solid rgba(212,175,55,0.12); }

        /* Animated divider */
        .gc-divider { width:80px; height:1px; background:linear-gradient(90deg,transparent,${C.gold},transparent); margin:0 auto; position:relative; overflow:visible; }
        .gc-divider::after { content:''; position:absolute; inset:0; background:linear-gradient(90deg,transparent,${C.goldLight},transparent); background-size:200% 100%; animation:gcAurora 3s linear infinite; }

        /* Eyebrow with side lines */
        .gc-eyebrow-line { display:inline-block; width:28px; height:1px; background:linear-gradient(90deg,transparent,rgba(212,175,55,0.6)); }
        .gc-eyebrow-line:last-child { background:linear-gradient(90deg,rgba(212,175,55,0.6),transparent); }

        /* Nav: transparent glass → solid on scroll */
        .gc-nav { position:fixed; top:0; left:0; right:0; z-index:50; background:rgba(10,10,15,0.55); backdrop-filter:blur(16px); -webkit-backdrop-filter:blur(16px); border-bottom:1px solid transparent; transition:background 0.4s ease, border-color 0.4s ease, box-shadow 0.4s ease; }
        .gc-nav-solid { background:rgba(10,10,15,0.88); border-bottom-color:${C.border}; box-shadow:0 8px 32px rgba(0,0,0,0.35); }

        /* Nav link underline */
        .gc-navlink { position:relative; padding:4px 0; }
        .gc-navlink::after { content:''; position:absolute; left:0; bottom:0; width:100%; height:1px; background:linear-gradient(90deg,${C.gold},${C.goldLight}); transform:scaleX(0); transform-origin:left; transition:transform 0.3s cubic-bezier(0.22,1,0.36,1); }
        .gc-navlink:hover::after, .gc-navlink:focus-visible::after { transform:scaleX(1); }

        /* Scroll progress bar */
        .gc-progress { position:fixed; top:0; left:0; right:0; height:2px; z-index:60; background:linear-gradient(90deg,${C.gold},${C.goldLight},${C.emerald}); transform-origin:left; transform:scaleX(0); }

        /* Testimonials marquee */
        .gc-marquee { overflow:hidden; position:relative; -webkit-mask-image:linear-gradient(90deg,transparent,#000 8%,#000 92%,transparent); mask-image:linear-gradient(90deg,transparent,#000 8%,#000 92%,transparent); }
        .gc-marquee-track { display:flex; gap:24px; width:max-content; animation:gcMarquee 46s linear infinite; }
        .gc-marquee:hover .gc-marquee-track { animation-play-state:paused; }

        /* Back-to-top */
        .gc-top { position:fixed; right:22px; bottom:22px; z-index:50; width:46px; height:46px; border-radius:50%; border:1px solid rgba(212,175,55,0.3); background:rgba(19,19,28,0.85); backdrop-filter:blur(10px); color:${C.gold}; display:flex; align-items:center; justify-content:center; cursor:pointer; opacity:0; transform:translateY(12px); pointer-events:none; transition:opacity 0.35s ease, transform 0.35s ease, border-color 0.3s ease, box-shadow 0.3s ease; }
        .gc-top-visible { opacity:1; transform:translateY(0); pointer-events:auto; }
        .gc-top:hover { border-color:rgba(212,175,55,0.7); box-shadow:0 8px 24px rgba(212,175,55,0.18); }

        /* Hero scroll hint */
        .gc-scrollhint { position:absolute; bottom:26px; left:50%; transform:translateX(-50%); display:flex; flex-direction:column; align-items:center; gap:6px; color:${C.muted}; font-size:10px; letter-spacing:0.24em; text-transform:uppercase; }
        .gc-scrollmouse { width:22px; height:34px; border:1px solid rgba(212,175,55,0.4); border-radius:12px; position:relative; }
        .gc-scrollmouse::after { content:''; position:absolute; top:6px; left:50%; width:3px; height:6px; margin-left:-1.5px; border-radius:2px; background:${C.gold}; animation:gcScrollDot 1.8s ease-in-out infinite; }

        /* Focus visibility for keyboard users */
        button:focus-visible, a:focus-visible { outline:2px solid rgba(212,175,55,0.7); outline-offset:2px; border-radius:6px; }

        /* Slow-rotating ornamental ring behind hero glass card */
        .gc-ring { position:absolute; border:1px dashed rgba(212,175,55,0.14); border-radius:50%; animation:gcSpinSlow 40s linear infinite; }

        html { scroll-behavior:smooth; }
        @media (prefers-reduced-motion:reduce) {
          *,*::before,*::after { animation:none!important; transition:none!important; }
          html { scroll-behavior:auto; }
          .gc-reveal { opacity:1; transform:none; }
          .gc-progress { transform:none; }
        }
      `}</style>

      {/* Layer 0: scroll progress */}
      <div ref={progressRef} className="gc-progress" aria-hidden="true" />

      {/* Layer 1: Aurora gradient mesh */}
      <div style={{ position:'fixed', inset:0, zIndex:0, pointerEvents:'none',
        background:`radial-gradient(ellipse at 18% 28%, rgba(212,175,55,0.085), transparent 50%),
                    radial-gradient(ellipse at 82% 18%, rgba(16,185,129,0.055), transparent 50%),
                    radial-gradient(ellipse at 50% 82%, rgba(120,90,220,0.045), transparent 52%),
                    radial-gradient(ellipse at 90% 90%, rgba(212,175,55,0.05), transparent 50%)`,
        backgroundSize:'200% 200%', animation:'gcAurora 22s ease-in-out infinite' }} />

      {/* Layer 2: Dot grid */}
      <div style={{ position:'fixed', inset:0, zIndex:0, pointerEvents:'none', opacity:0.45,
        backgroundImage:`radial-gradient(circle, rgba(255,255,255,0.035) 1px, transparent 1px)`,
        backgroundSize:'26px 26px' }} />

      {/* Layer 3: Film-grain noise */}
      <div aria-hidden="true" style={{ position:'fixed', inset:0, zIndex:0, pointerEvents:'none', opacity:0.5, mixBlendMode:'overlay',
        backgroundImage:`url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.05'/%3E%3C/svg%3E")` }} />

      {/* Layer 4: Edge vignette */}
      <div aria-hidden="true" style={{ position:'fixed', inset:0, zIndex:1, pointerEvents:'none',
        background:'radial-gradient(ellipse at center, transparent 55%, rgba(4,4,8,0.55) 100%)' }} />

      {/* Layer 5: Deterministic floating particles */}
      <div style={{ position:'fixed', inset:0, zIndex:0, pointerEvents:'none', overflow:'hidden' }} aria-hidden="true">
        {PARTICLES.map((p) => (
          <div key={p.id} style={{
            position:'absolute', bottom:'-12px',
            left:`${p.left}%`,
            width:p.size, height:p.size,
            borderRadius:'50%',
            background: p.gold ? 'rgba(212,175,55,0.9)' : 'rgba(16,185,129,0.7)',
            boxShadow: p.gold ? '0 0 6px rgba(212,175,55,0.5)' : '0 0 6px rgba(16,185,129,0.4)',
            ['--pop' as string]: p.op,
            opacity: 0,
            animation:`gcFloat ${p.dur}s linear infinite`,
            animationDelay:`${p.delay}s`,
          }} />
        ))}
      </div>

      {/* Layer 6: Cursor-following glow (ref-driven, no re-render) */}
      <div ref={glowRef} aria-hidden="true" style={{
        position:'fixed', left:0, top:0,
        width:440, height:440, borderRadius:'50%', pointerEvents:'none', zIndex:1, willChange:'transform',
        background:`radial-gradient(circle, rgba(212,175,55,0.05), transparent 70%)`,
      }} />

      {/* ===== CONTENT ===== */}
      <div style={{ position:'relative', zIndex:10 }}>

        {/* NAV */}
        <nav ref={navRef} className="gc-nav" aria-label="Main navigation">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <div style={{width:36,height:36,borderRadius:8,background:`linear-gradient(135deg,${C.emerald},#064E3B)`,display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'0 4px 14px rgba(16,185,129,0.25)'}}><Scissors style={{width:18,height:18,color:C.text}}/></div>
              <span style={{fontWeight:700,fontSize:18,color:C.text,letterSpacing:'-0.02em'}}>{businessConfig.name}</span>
            </div>
            <div className="hidden md:flex items-center gap-8">
              {navLinks.map(([l,id]) => <button key={id} onClick={()=>scrollTo(id)} className="gc-navlink" style={{fontSize:14,color:C.muted,transition:'color 0.2s'}} onMouseEnter={e=>e.currentTarget.style.color=C.gold} onMouseLeave={e=>e.currentTarget.style.color=C.muted}>{l}</button>)}
            </div>
            <div className="flex items-center gap-2">
              {session?.user ? (<>
                <a href={`${DASHBOARD_URL}/dashboard`}><Button size="sm" style={goldBtn} className="gc-btn-shimmer"><LayoutDashboard className="w-4 h-4 mr-1"/>Dashboard</Button></a>
                <Button size="sm" variant="ghost" style={{color:C.muted}} onClick={handleSignOut}>Sign Out</Button>
              </>) : (<>
                <a href={DASHBOARD_URL} className="hidden sm:block"><Button size="sm" variant="outline" style={goldOutline}>Staff Login</Button></a>
                <Button size="sm" style={goldBtn} className="hidden sm:inline-flex gc-btn-shimmer" onClick={()=>handleBookNow()}>Book Now</Button>
              </>)}
              <button className="md:hidden gc-top-icon" aria-label={menuOpen ? 'Close menu' : 'Open menu'} aria-expanded={menuOpen} onClick={()=>setMenuOpen(!menuOpen)} style={{width:38,height:38,display:'flex',alignItems:'center',justifyContent:'center',color:C.text,background:'transparent',border:'none'}}>
                {menuOpen ? <X className="w-5 h-5"/> : <Menu className="w-5 h-5"/>}
              </button>
            </div>
          </div>
          {/* Mobile menu */}
          {menuOpen && (
            <div className="md:hidden" style={{background:'rgba(10,10,15,0.96)',borderTop:`1px solid ${C.border}`,padding:'12px 16px 16px'}}>
              {navLinks.map(([l,id]) => (
                <button key={id} onClick={()=>scrollTo(id)} style={{display:'block',width:'100%',textAlign:'left',padding:'12px 4px',fontSize:15,color:C.muted,borderBottom:'1px solid rgba(37,37,48,0.6)',background:'transparent',borderLeft:'none',borderRight:'none',borderTop:'none'}}>{l}</button>
              ))}
              <div style={{display:'flex',gap:8,marginTop:14}}>
                <Button size="sm" style={goldBtn} className="gc-btn-shimmer flex-1" onClick={()=>{ setMenuOpen(false); handleBookNow() }}>Book Now</Button>
                <a href={DASHBOARD_URL} className="flex-1"><Button size="sm" variant="outline" style={{...goldOutline, width:'100%'}}>Staff Login</Button></a>
              </div>
            </div>
          )}
        </nav>

        {/* HERO */}
        <section style={{minHeight:'92vh',display:'flex',alignItems:'center',paddingTop:72,position:'relative'}}>
          <div style={{position:'absolute',width:320,height:320,borderRadius:'50%',background:'rgba(212,175,55,0.07)',filter:'blur(64px)',top:'8%',left:'4%',animation:'gcDrift 16s ease-in-out infinite'}} />
          <div style={{position:'absolute',width:260,height:260,borderRadius:'50%',background:'rgba(16,185,129,0.05)',filter:'blur(52px)',bottom:'14%',right:'8%',animation:'gcDrift 19s ease-in-out infinite reverse'}} />

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid lg:grid-cols-2 gap-12 items-center w-full py-20">
            <div className="text-center lg:text-left">
              <div data-anim className="gc-reveal" style={{display:'inline-flex',alignItems:'center',gap:8,padding:'6px 16px',borderRadius:20,background:'rgba(212,175,55,0.06)',border:'1px solid rgba(212,175,55,0.18)',color:C.gold,fontSize:13,fontWeight:600,marginBottom:24,letterSpacing:'0.04em'}}>
                <Sparkles className="w-4 h-4" style={{animation:'gcDrift 6s ease-in-out infinite'}} />{businessConfig.tagline}
              </div>
              <h1 data-anim className="gc-reveal" style={{fontSize:'clamp(2.5rem,5vw,4rem)',fontWeight:800,letterSpacing:'-0.03em',marginBottom:16,lineHeight:1.1,color:C.text}}>
                Premium Salon<br/>
                <span className="gc-shimmer-text" style={{fontWeight:800}}>Experience</span>
              </h1>
              <p data-anim className="gc-reveal" style={{fontSize:18,color:C.muted,marginBottom:32,maxWidth:520,lineHeight:1.7,marginLeft:'auto',marginRight:'auto'}}>Where beauty meets elegance. Experience world-class hair, nail, and beauty services crafted by expert stylists in a luxurious setting.</p>
              <div data-anim className="gc-reveal" style={{display:'flex',flexWrap:'wrap',gap:12,justifyContent:'center',marginBottom:36}}>
                <Button size="lg" style={goldBtn} className="gc-btn-shimmer" onClick={()=>handleBookNow()}><CalendarDays className="w-5 h-5 mr-2"/>Book Your Visit</Button>
                <Button size="lg" variant="outline" style={goldOutline} onClick={()=>scrollTo('services')}>Explore Services<ArrowRight className="w-4 h-4 ml-2"/></Button>
              </div>
              <div data-anim className="gc-reveal" style={{display:'flex',flexWrap:'wrap',gap:36,justifyContent:'center'}}>
                <div style={{textAlign:'center'}}>
                  <div style={{fontSize:30,fontWeight:800,color:C.text}}><CountUp to={5000} suffix="+" /></div>
                  <div style={{fontSize:11,color:C.muted,textTransform:'uppercase',letterSpacing:'0.14em',marginTop:2}}>Happy Clients</div>
                </div>
                <div style={{textAlign:'center'}}>
                  <div style={{fontSize:30,fontWeight:800,color:C.text}}><CountUp to={4.9} decimals={1} /></div>
                  <div style={{fontSize:11,color:C.muted,textTransform:'uppercase',letterSpacing:'0.14em',marginTop:2}}>Average Rating</div>
                </div>
                <div style={{textAlign:'center'}}>
                  <div style={{fontSize:30,fontWeight:800,color:C.text}}><CountUp to={8} suffix="+" /></div>
                  <div style={{fontSize:11,color:C.muted,textTransform:'uppercase',letterSpacing:'0.14em',marginTop:2}}>Years of Excellence</div>
                </div>
              </div>
            </div>
            <div style={{display:'flex',justifyContent:'center',position:'relative'}}>
              {/* Ornamental rotating rings */}
              <div className="gc-ring" aria-hidden="true" style={{width:420,height:420,top:'50%',left:'50%',marginTop:-210,marginLeft:-210}} />
              <div className="gc-ring" aria-hidden="true" style={{width:520,height:520,top:'50%',left:'50%',marginTop:-260,marginLeft:-260,animationDirection:'reverse',animationDuration:'60s'}} />
              {session?.user ? (
                <div className="gc-glass gc-lift" style={{borderRadius:16,padding:32,maxWidth:400,width:'100%',boxShadow:'0 20px 60px rgba(0,0,0,0.4)',textAlign:'center',position:'relative'}}>
                  <div style={{width:64,height:64,borderRadius:16,background:`linear-gradient(135deg,${C.gold},${C.goldLight})`,display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 16px',boxShadow:'0 8px 24px rgba(212,175,55,0.3)'}}><LayoutDashboard style={{width:32,height:32,color:C.bg}}/></div>
                  <h2 style={{fontSize:24,fontWeight:700,color:C.text}}>Welcome back</h2><p style={{fontSize:14,color:C.muted,marginTop:4}}>{session.user.email}</p><p style={{fontSize:12,color:C.gold,marginTop:4,textTransform:'capitalize'}}>Role: {(session.user as { role?: string | null }).role}</p>
                  <a href={`${DASHBOARD_URL}/dashboard`} className="block mt-6"><Button size="lg" style={goldBtn} className="w-full gc-btn-shimmer"><LayoutDashboard className="w-5 h-5 mr-2"/>Enter Dashboard</Button></a>
                  <Button size="sm" variant="ghost" style={{color:C.muted,width:'100%',marginTop:12}} onClick={handleSignOut}>Sign out</Button>
                </div>
              ) : showLogin ? (
                <div className="gc-glass gc-lift" style={{borderRadius:16,padding:32,maxWidth:400,width:'100%',boxShadow:'0 20px 60px rgba(0,0,0,0.4)',position:'relative'}}>
                  <div style={{textAlign:'center',marginBottom:24}}>
                    <div style={{width:56,height:56,borderRadius:12,background:`linear-gradient(135deg,${C.gold},${C.goldLight})`,display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 12px',boxShadow:'0 8px 24px rgba(212,175,55,0.3)'}}><Scissors style={{width:28,height:28,color:C.bg}}/></div>
                    <h2 style={{fontSize:24,fontWeight:700,color:C.text}}>Staff Login</h2><p style={{fontSize:14,color:C.muted,marginTop:4}}>Sign in to access the dashboard</p>
                  </div>
                  <form onSubmit={handleLogin} className="space-y-4">
                    {loginError && <div role="alert" style={{display:'flex',alignItems:'center',gap:8,padding:12,borderRadius:8,background:'rgba(220,38,38,0.1)',border:'1px solid rgba(248,113,113,0.2)',color:'#F87171',fontSize:14}}><AlertCircle className="w-4 h-4 shrink-0"/>{loginError}</div>}
                    <div className="relative"><Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{color:C.muted}}/><Input type="email" placeholder="Email address" value={loginEmail} onChange={e=>setLoginEmail(e.target.value)} className="pl-10" required aria-label="Email address" style={{background:C.surface,borderColor:C.border,color:C.text}}/></div>
                    <Input type="password" placeholder="Password" value={loginPassword} onChange={e=>setLoginPassword(e.target.value)} required aria-label="Password" style={{background:C.surface,borderColor:C.border,color:C.text}}/>
                    <Button type="submit" className="w-full gc-btn-shimmer" style={goldBtn} disabled={loginLoading}>{loginLoading?<><Loader2 className="w-4 h-4 mr-2 animate-spin"/>Signing in...</>:'Sign in'}</Button>
                  </form>
                  <div style={{marginTop:20,paddingTop:20,borderTop:`1px solid ${C.border}`,textAlign:'center',fontSize:12,color:C.muted}}><p style={{fontWeight:600,marginBottom:4}}>Demo (all: password123):</p><p style={{fontFamily:'monospace',color:C.gold}}>admin@glamchain.com · owner@noorbeauty.eg</p></div>
                </div>
              ) : (
                <div className="gc-glass gc-lift" style={{borderRadius:16,padding:32,maxWidth:400,width:'100%',textAlign:'center',position:'relative'}}>
                  <div style={{width:56,height:56,borderRadius:12,background:'rgba(212,175,55,0.07)',border:'1px solid rgba(212,175,55,0.15)',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 16px'}}><ShieldCheck style={{width:28,height:28,color:C.gold}}/></div>
                  <h2 style={{fontSize:20,fontWeight:700,color:C.text,marginBottom:8}}>Staff Access</h2>
                  <p style={{fontSize:14,color:C.muted,marginBottom:16}}>Sign in to manage your salon.</p>
                  <Button variant="outline" style={goldOutline} className="w-full" onClick={()=>setShowLogin(true)}>Sign in to Dashboard<ChevronRight className="w-4 h-4 ml-1"/></Button>
                  <div style={{marginTop:20,paddingTop:16,borderTop:'1px solid rgba(212,175,55,0.1)',fontSize:12,color:C.muted}}>
                    <span style={{display:'inline-flex',alignItems:'center',gap:6}}><span style={{width:7,height:7,borderRadius:'50%',background:C.emerald,boxShadow:'0 0 8px rgba(16,185,129,0.7)'}} />Online booking · 7 days a week</span>
                  </div>
                </div>
              )}
            </div>
          </div>
          <div className="gc-scrollhint" aria-hidden="true"><div className="gc-scrollmouse" /><span>Scroll</span></div>
        </section>

        <div style={{padding:'0 16px 60px'}}><div className="gc-divider" /></div>

        {/* SERVICES */}
        <section id="services" style={{padding:'0 16px 80px'}}>
          <div className="max-w-7xl mx-auto">
            <SectionHead eyebrow="Menu" title="Our Services" sub="Discover our range of premium beauty services — tap any treatment to book instantly." />
            {allServices.length > 0 ? (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {allServices.map((svc,i) => (
                  <div key={svc.id} data-anim className="gc-reveal gc-lift" role="button" tabIndex={0} aria-label={`Book ${svc.name}, ${svc.duration} minutes`}
                    style={{background:C.surface,borderRadius:16,padding:24,border:`1px solid ${C.border}`,cursor:'pointer',overflow:'hidden',position:'relative',transitionDelay:`${Math.min(i,8)*60}ms`}}
                    onClick={()=>handleBookNow(svc.id)}
                    onKeyDown={e => { if (e.key==='Enter'||e.key===' ') { e.preventDefault(); handleBookNow(svc.id) } }}>
                    {/* Category accent bar */}
                    <div aria-hidden="true" style={{position:'absolute',top:0,left:0,right:0,height:2,background:`linear-gradient(90deg,${catAccent(svc.category)},transparent)`}} />
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'start',marginBottom:12}}>
                      <span style={{fontSize:11,fontWeight:700,padding:'4px 10px',borderRadius:20,background:`${catAccent(svc.category)}14`,color:catAccent(svc.category),border:`1px solid ${catAccent(svc.category)}30`,letterSpacing:'0.08em',textTransform:'uppercase'}}>{svc.category}</span>
                      <span style={{fontSize:20,fontWeight:800,background:`linear-gradient(135deg,${C.gold},${C.goldLight})`,WebkitBackgroundClip:'text',backgroundClip:'text',WebkitTextFillColor:'transparent'}}>{formatCurrency(svc.price)}</span>
                    </div>
                    <h3 style={{fontWeight:600,fontSize:18,marginBottom:4,color:C.text}}>{svc.name}</h3>
                    {svc.description && <p style={{fontSize:14,color:C.muted,marginBottom:12,lineHeight:1.6}}>{svc.description}</p>}
                    <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',fontSize:14}}>
                      <span style={{display:'flex',alignItems:'center',gap:4,color:C.muted}}><Clock className="w-3.5 h-3.5"/>{svc.duration} min</span>
                      <span style={{display:'flex',alignItems:'center',gap:4,color:C.gold,fontWeight:600}}>Book now<ArrowRight className="w-3.5 h-3.5 gc-arrow"/></span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(260px,1fr))',gap:24}} aria-label="Loading services">
                {[0,1,2,3,4,5].map(i => (
                  <div key={i} style={{background:C.surface,borderRadius:16,padding:24,border:`1px solid ${C.border}`,height:180,position:'relative',overflow:'hidden'}}>
                    <div className="gc-shimmer-bg" style={{position:'absolute',inset:0,background:`linear-gradient(100deg,transparent 30%,rgba(255,255,255,0.04) 50%,transparent 70%)`,backgroundSize:'200% 100%',animation:'gcAurora 1.6s linear infinite'}} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        <div style={{padding:'0 16px 60px'}}><div className="gc-divider" /></div>

        {/* TESTIMONIALS (marquee) */}
        <section id="reviews" style={{padding:'0 16px 80px',overflow:'hidden'}}>
          <div className="max-w-7xl mx-auto">
            <SectionHead eyebrow="Testimonials" title="Loved by Our Clients" sub="Real words from the people who make our chairs busy." />
            <div className="gc-marquee" data-anim>
              <div className="gc-marquee-track">
                {[...TESTIMONIALS, ...TESTIMONIALS].map((t, i) => (
                  <div key={i} className="gc-lift" style={{background:C.surface,borderRadius:16,padding:24,border:`1px solid ${C.border}`,width:340,flexShrink:0}}>
                    <div style={{display:'flex',gap:2,marginBottom:12}}>
                      {Array.from({length:5}).map((_,s) => <Star key={s} className="w-3.5 h-3.5" style={{color:C.gold,fill:C.gold}} />)}
                    </div>
                    <p style={{fontSize:14,color:C.text,opacity:0.85,lineHeight:1.7,marginBottom:16}}>&ldquo;{t.text}&rdquo;</p>
                    <div style={{display:'flex',alignItems:'center',gap:10}}>
                      <div style={{width:36,height:36,borderRadius:'50%',background:`linear-gradient(135deg,${C.gold}30,${C.emerald}30)`,border:'1px solid rgba(212,175,55,0.25)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,fontWeight:700,color:C.gold}}>{t.name.charAt(0)}</div>
                      <div>
                        <div style={{fontSize:13,fontWeight:600,color:C.text}}>{t.name}</div>
                        <div style={{fontSize:11,color:C.muted}}>{t.role}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <div style={{padding:'0 16px 60px'}}><div className="gc-divider" /></div>

        {/* FEATURES */}
        <section id="about" style={{padding:'0 16px 80px'}}>
          <div className="max-w-7xl mx-auto">
            <SectionHead eyebrow="Why Us" title={`Why Choose ${businessConfig.name}?`} sub="The details that turn an appointment into an experience." />
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                {icon:Scissors,t:'Expert Stylists',d:'Years of professional experience and continuous training.'},
                {icon:Sparkles,t:'Premium Products',d:'Finest products from trusted global brands.'},
                {icon:Heart,t:'Personalized Care',d:'Every treatment is tailored to your needs.'},
                {icon:ShieldCheck,t:'Luxury Experience',d:'Relaxing, premium atmosphere from the moment you walk in.'}
              ].map((f,i) => (
                <div key={i} data-anim className="gc-reveal gc-lift" style={{background:C.surface,borderRadius:16,padding:24,border:`1px solid ${C.border}`,transitionDelay:`${i*80}ms`}}>
                  <div className="gc-card-icon" style={{width:48,height:48,borderRadius:12,background:'rgba(212,175,55,0.07)',border:'1px solid rgba(212,175,55,0.14)',display:'flex',alignItems:'center',justifyContent:'center',marginBottom:16}}><f.icon style={{width:24,height:24,color:C.gold}}/></div>
                  <h3 style={{fontWeight:600,fontSize:18,marginBottom:8,color:C.text}}>{f.t}</h3><p style={{fontSize:14,color:C.muted,lineHeight:1.65}}>{f.d}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <div style={{padding:'0 16px 60px'}}><div className="gc-divider" /></div>

        {/* CTA */}
        <section style={{padding:'0 16px 80px'}}>
          <div className="max-w-3xl mx-auto text-center gc-reveal" data-anim>
            <div style={{position:'relative',borderRadius:24,padding:48,overflow:'hidden',background:`linear-gradient(135deg,${C.surface},#0D0D18)`,border:'1px solid rgba(212,175,55,0.15)'}}>
              <div style={{position:'absolute',width:256,height:256,borderRadius:'50%',background:'rgba(212,175,55,0.09)',filter:'blur(60px)',top:-80,right:-80,animation:'gcDrift 12s ease-in-out infinite'}} />
              <div style={{position:'absolute',width:180,height:180,borderRadius:'50%',background:'rgba(16,185,129,0.06)',filter:'blur(50px)',bottom:-60,left:-60,animation:'gcDrift 15s ease-in-out infinite reverse'}} />
              <div style={{position:'relative'}}>
                <h2 style={{fontSize:'clamp(1.75rem,4vw,2.5rem)',fontWeight:800,color:C.text,marginBottom:12,letterSpacing:'-0.02em'}}>Ready to Transform Your Look?</h2>
                <p style={{color:C.muted,marginBottom:28,maxWidth:420,marginLeft:'auto',marginRight:'auto',lineHeight:1.7}}>Book your appointment today and experience the {businessConfig.name} difference.</p>
                <div style={{display:'flex',flexWrap:'wrap',gap:12,justifyContent:'center'}}>
                  <Button size="lg" style={goldBtn} className="gc-btn-shimmer" onClick={()=>handleBookNow()}><CalendarDays className="w-5 h-5 mr-2"/>Book Your Visit</Button>
                  {location?.phone && <a href={`tel:${location.phone.replace(/\s/g,'')}`}><Button size="lg" variant="outline" style={goldOutline}><Phone className="w-4 h-4 mr-2"/>{location.phone}</Button></a>}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CONTACT */}
        <section id="contact" style={{padding:'0 16px 80px'}}>
          <div className="max-w-7xl mx-auto">
            <SectionHead eyebrow="Find Us" title="Get In Touch" sub="Visit us, call us, or send a message — we reply fast." />
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
              {[
                {icon:MapPin,t:'Visit Us',v:location?`${location.address}, ${location.city}`:'—',sub:'Free valet parking'},
                {icon:Phone,t:'Call Us',v:location?.phone||'—',sub:'Sun–Fri, 9am–9pm'},
                {icon:Mail,t:'Email Us',v:location?.email||'—',sub:'Replies within 2 hours'},
                {icon:Clock,t:'Opening Hours',v:location?`${location.openTime} – ${location.closeTime}`:'—',sub:'Open 7 days a week'},
              ].map((item,i) => (
                <div key={i} data-anim className="gc-reveal gc-lift" style={{background:C.surface,borderRadius:16,padding:24,border:`1px solid ${C.border}`,textAlign:'center',transitionDelay:`${i*70}ms`}}>
                  <div className="gc-card-icon" style={{width:48,height:48,borderRadius:12,background:'rgba(212,175,55,0.07)',border:'1px solid rgba(212,175,55,0.14)',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 12px'}}><item.icon style={{width:24,height:24,color:C.gold}}/></div>
                  <h4 style={{fontWeight:600,fontSize:14,marginBottom:4,color:C.text}}>{item.t}</h4>
                  <p style={{fontSize:14,color:C.text,opacity:0.85,marginBottom:2}}>{item.v}</p>
                  <p style={{fontSize:12,color:C.muted}}>{item.sub}</p>
                </div>
              ))}
            </div>
            {/* WhatsApp CTA strip */}
            <div data-anim className="gc-reveal" style={{maxWidth:640,margin:'28px auto 0',padding:'16px 20px',borderRadius:14,background:'rgba(16,185,129,0.05)',border:'1px solid rgba(16,185,129,0.18)',display:'flex',alignItems:'center',gap:14,flexWrap:'wrap',justifyContent:'center'}}>
              <MessageCircle style={{width:20,height:20,color:C.emerald,flexShrink:0}} />
              <span style={{fontSize:14,color:C.muted}}>Prefer WhatsApp? Message us and we will book you in minutes.</span>
              <a href={`https://wa.me/${(location?.phone||businessConfig.contactPhone).replace(/[^\d]/g,'')}`} target="_blank" rel="noopener noreferrer">
                <Button size="sm" style={{background:'rgba(16,185,129,0.12)',color:C.emerald,border:'1px solid rgba(16,185,129,0.35)'}}>Chat on WhatsApp</Button>
              </a>
            </div>
          </div>
        </section>

        {/* FOOTER */}
        <footer style={{padding:'32px 16px',borderTop:`1px solid ${C.border}`,background:'rgba(10,10,15,0.6)'}}>
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">
            <div style={{display:'flex',alignItems:'center',gap:8}}>
              <div style={{width:28,height:28,borderRadius:8,background:`linear-gradient(135deg,${C.emerald},#064E3B)`,display:'flex',alignItems:'center',justifyContent:'center'}}><Scissors style={{width:16,height:16,color:C.text}}/></div>
              <span style={{fontWeight:700,fontSize:14,color:C.text}}>{businessConfig.name}</span>
            </div>
            <p style={{fontSize:12,color:C.muted}}>© {new Date().getFullYear()} {businessConfig.name}. All rights reserved.</p>
            {location && <span style={{display:'flex',alignItems:'center',gap:4,fontSize:12,color:C.muted}}><Clock className="w-3.5 h-3.5"/>{location.openTime} - {location.closeTime}</span>}
          </div>
        </footer>
      </div>

      {/* Booking modal */}
      <BookingWidget open={bookingOpen} onOpenChange={setBookingOpen} locationId={locationId} preselectedServiceId={preselectedService} />

      {/* Back to top */}
      <button ref={topRef} className="gc-top" aria-label="Back to top" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
        <ArrowUp className="w-5 h-5" />
      </button>
    </div>
  )
}
