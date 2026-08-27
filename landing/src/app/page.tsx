'use client'

import { useState, useEffect, useRef } from 'react'
import { useSession } from 'next-auth/react'
import Image from 'next/image'
import { getBusinessConfig } from '@/lib/config'
import { BookingWidget } from '@/components/booking/booking-widget'
import { Button } from '@/components/ui/button'
import {
  Phone, Mail, MapPin, Clock, ArrowRight, Sparkles, Heart, ShieldCheck,
  CalendarDays, Star, Menu, X, ChevronDown, MessageCircle, ArrowUp,
  Gem, HandHeart, Leaf, Crown, Scissors, LayoutDashboard, Instagram, Facebook,
} from 'lucide-react'

const businessConfig = getBusinessConfig()
const DASHBOARD_URL = process.env.NEXT_PUBLIC_API_URL || ''
const WHATSAPP = 'https://wa.me/97444112233?text=Hello%20GlamChain%20—%20I%27d%20like%20to%20book%20a%20visit.'

/* ————— data ————— */

interface ServiceItem { id: string; name: string; category: string; duration: number; price: number; description: string | null }
interface ServiceGroup { category: string; services: ServiceItem[] }
interface LocationInfo { id: string; name: string; address: string; city: string; phone: string; email: string; openTime: string; closeTime: string }

const FALLBACK_SERVICES: ServiceGroup[] = [
  {
    category: 'Hair Artistry',
    services: [
      { id: 'f1', name: 'Signature Cut & Style', category: 'Hair Artistry', duration: 60, price: 250, description: 'Consultation, precision cut, ritual wash and finish' },
      { id: 'f2', name: 'Balayage & Gloss', category: 'Hair Artistry', duration: 180, price: 850, description: 'Hand-painted dimension sealed with mirror gloss' },
      { id: 'f3', name: 'Keratin Silk Ritual', category: 'Hair Artistry', duration: 150, price: 700, description: 'Frizz-free silk that lasts up to four months' },
      { id: 'f4', name: 'Bridal Updo & Trial', category: 'Hair Artistry', duration: 120, price: 650, description: 'Sculpted updo with prior design consultation' },
    ],
  },
  {
    category: 'Skin & Glow',
    services: [
      { id: 'f5', name: '24K Gold Facial', category: 'Skin & Glow', duration: 75, price: 480, description: 'Lifting facial with gold leaf and hyaluronic drench' },
      { id: 'f6', name: 'HydraGlow Ritual', category: 'Skin & Glow', duration: 60, price: 390, description: 'Deep cleanse, gentle exfoliation, glow infusion' },
    ],
  },
  {
    category: 'Hands & Feet',
    services: [
      { id: 'f7', name: 'Champagne Manicure', category: 'Hands & Feet', duration: 60, price: 220, description: 'Soak, shaping, cuticle care and mirror polish' },
      { id: 'f8', name: 'Velvet Pedicure', category: 'Hands & Feet', duration: 75, price: 260, description: 'Warm soak, exfoliation and pressure-point massage' },
    ],
  },
]

const RITUALS = [
  {
    icon: HandHeart,
    title: 'A Warm Welcome',
    text: 'Karak on arrival, a unhurried consultation — your stylist listens first, then crafts. You will never feel like a number on a list.',
  },
  {
    icon: Gem,
    title: 'Master Craftsmanship',
    text: 'Twelve master stylists trained in London, Dubai and Paris. Every service follows a precision protocol, never a shortcut.',
  },
  {
    icon: Leaf,
    title: 'A Calm Sanctuary',
    text: 'Warm light, soft music, beautifully scented air. Our space is designed to slow your heartbeat the moment you step in.',
  },
  {
    icon: ShieldCheck,
    title: 'Aftercare That Lasts',
    text: 'Personalised care cards, product guidance and a follow-up check-in — because your glow should outlive the appointment.',
  },
]

const STYLISTS = [
  { initials: 'NS', name: 'Noura Al-Sayed', role: 'Creative Director · Colour', rating: 4.9, tag: 'Balayage specialist', hue: 'from-[#c8a24b] to-[#a37c2b]' },
  { initials: 'MK', name: 'Mariam Khoury', role: 'Senior Stylist · Cutting', rating: 4.8, tag: 'Precision bobs', hue: 'from-[#c0856f] to-[#a3685a]' },
  { initials: 'SA', name: 'Sara Ayman', role: 'Bridal Artist', rating: 5.0, tag: '20+ bridal parties', hue: 'from-[#9c8b5e] to-[#6e6142]' },
  { initials: 'LA', name: 'Layla Adel', role: 'Skin Therapist', rating: 4.9, tag: '24K gold facials', hue: 'from-[#b3a68e] to-[#8a7d68]' },
]

const GALLERY = [
  { src: '/images/story-craft.png', caption: 'The craft', sub: 'Updo artistry', ratio: 'aspect-square', span: '' },
  { src: '/images/gallery-bridal.png', caption: 'The bride', sub: 'Wedding mornings', ratio: 'aspect-[3/4]', span: 'row-span-2' },
  { src: '/images/gallery-nails.png', caption: 'The detail', sub: 'Champagne manicure', ratio: 'aspect-[3/4]', span: '' },
  { src: '/images/gallery-spa.png', caption: 'The pause', sub: 'Spa corner', ratio: 'aspect-square', span: '' },
]

const TESTIMONIALS = [
  { name: 'Noor A.', role: 'Regular since 2023', text: 'The best salon experience in Doha. My stylist remembered exactly what I wanted from my last visit — down to the shade.' },
  { name: 'Sarah M.', role: 'Balayage & styling', text: 'Booked through their site in under a minute. Gorgeous space, flawless colour, zero waiting. This is how a salon should feel.' },
  { name: 'Fatima K.', role: 'Bridal package', text: 'They treated my whole bridal party like royalty — karak, candles, calm music. The attention to detail here is unmatched.' },
  { name: 'Khalid R.', role: 'Spa day gift', text: 'Took my mother for a spa day — she has not stopped talking about it. Worth every riyal, and the warmest staff in the city.' },
  { name: 'Maryam S.', role: 'Manicure & pedicure', text: 'Finally, a salon that runs on time. Beautiful results, a genuinely relaxing atmosphere, and my nails lasted four weeks.' },
  { name: 'Layla H.', role: 'Keratin treatment', text: 'From the welcome drink to the final mirror moment — pure luxury from start to finish. I will not go anywhere else.' },
]

const MARQUEE_ITEMS = ['Balayage', 'Bridal Artistry', 'Keratin Silk', '24K Gold Facials', 'Champagne Manicure', 'Precision Cuts', 'Velvet Pedicure', 'Hair Spa Rituals']

/* ————— helpers ————— */

function formatPrice(n: number) {
  return `QR ${n.toLocaleString('en-US')}`
}

function CountUp({ to, suffix = '' }: { to: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null)
  const [val, setVal] = useState(0)
  const started = useRef(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && !started.current) {
        started.current = true
        const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
        if (reduce) { setVal(to); return }
        const t0 = performance.now()
        const dur = 1800
        const tick = (t: number) => {
          const p = Math.min(1, (t - t0) / dur)
          setVal(Math.round(to * (1 - Math.pow(1 - p, 3))))
          if (p < 1) requestAnimationFrame(tick)
        }
        requestAnimationFrame(tick)
      }
    }, { threshold: 0.4 })
    obs.observe(el)
    return () => obs.disconnect()
  }, [to])
  return <span ref={ref}>{val.toLocaleString('en-US')}{suffix}</span>
}

/* ————— page ————— */

export default function Home() {
  const { data: session } = useSession()
  const [bookingOpen, setBookingOpen] = useState(false)
  const [preselect, setPreselect] = useState<string | null>(null)
  const [locationId, setLocationId] = useState<string | null>(null)
  const [location, setLocation] = useState<LocationInfo | null>(null)
  const [serviceGroups, setServiceGroups] = useState<ServiceGroup[]>(FALLBACK_SERVICES)
  const [liveServices, setLiveServices] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [showTop, setShowTop] = useState(false)
  const [tIndex, setTIndex] = useState(0)

  const progressRef = useRef<HTMLDivElement>(null)
  const navRef = useRef<HTMLElement>(null)

  /* data load */
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || ''
        const cfg = await fetch(`${apiUrl}/api/config`)
        if (!cfg.ok) return
        const cd = await cfg.json()
        if (cancelled || !cd.location) return
        setLocationId(cd.location.id)
        setLocation(cd.location)
        const bk = await fetch(`${apiUrl}/api/public/booking?locationId=${cd.location.id}`)
        if (!bk.ok) return
        const bd = await bk.json()
        if (!cancelled && bd.services?.length) { setServiceGroups(bd.services); setLiveServices(true) }
      } catch { /* fallback menu stays */ }
    })()
    return () => { cancelled = true }
  }, [])

  /* reveal observer — picks up async content too */
  useEffect(() => {
    const obs = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('gc-in'); obs.unobserve(e.target) } })
    }, { threshold: 0.1, rootMargin: '0px 0px -5% 0px' })
    const observeAll = () => document.querySelectorAll('[data-anim]:not(.gc-in)').forEach((el) => obs.observe(el))
    const t = setTimeout(observeAll, 60)
    const mo = new MutationObserver(() => observeAll())
    mo.observe(document.body, { childList: true, subtree: true })
    return () => { clearTimeout(t); mo.disconnect(); obs.disconnect() }
  }, [])

  /* scroll effects: progress + nav state + back-to-top */
  useEffect(() => {
    let raf = 0
    const onScroll = () => {
      if (raf) return
      raf = requestAnimationFrame(() => {
        raf = 0
        const max = document.documentElement.scrollHeight - innerHeight
        if (progressRef.current) progressRef.current.style.transform = `scaleX(${max > 0 ? Math.min(1, scrollY / max) : 0})`
        setScrolled(scrollY > 24)
        setShowTop(scrollY > 700)
      })
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => { window.removeEventListener('scroll', onScroll); if (raf) cancelAnimationFrame(raf) }
  }, [])

  /* testimonial rotation */
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const id = setInterval(() => setTIndex((i) => (i + 1) % TESTIMONIALS.length), 5200)
    return () => clearInterval(id)
  }, [])

  const openBooking = (serviceId?: string) => { setPreselect(serviceId ?? null); setBookingOpen(true) }

  const navLinks = [
    { href: '#experience', label: 'Experience' },
    { href: '#services', label: 'Services' },
    { href: '#story', label: 'Our Story' },
    { href: '#stylists', label: 'Stylists' },
    { href: '#gallery', label: 'Gallery' },
    { href: '#visit', label: 'Visit' },
  ]

  const activeT = TESTIMONIALS[tIndex]

  return (
    <div className="relative min-h-screen bg-background">
      <div className="gc-grain" aria-hidden />
      <div ref={progressRef} className="gc-progress" aria-hidden />

      {/* ————— announcement bar ————— */}
      <div className="relative z-40 bg-gradient-to-r from-[#a37c2b] via-[#e9ce8c] to-[#a37c2b] text-[#241b0e]">
        <p className="mx-auto max-w-7xl px-4 py-1.5 text-center text-[11px] font-semibold tracking-[0.18em] uppercase sm:text-xs">
          Now welcoming guests at our West Bay atelier · Complimentary consultation with every first visit
        </p>
      </div>

      {/* ————— navbar ————— */}
      <nav
        ref={navRef}
        className={`sticky top-0 z-50 transition-all duration-500 ${scrolled
          ? 'bg-[#171210]/92 shadow-[0_10px_40px_-16px_rgba(0,0,0,0.8)] backdrop-blur-xl border-b border-[rgba(200,162,75,0.16)]'
          : 'bg-transparent border-b border-transparent'}`}
      >
        <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
          {/* wordmark */}
          <a href="#top" className="group flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-full border border-[rgba(200,162,75,0.45)] bg-gradient-to-br from-[#241b0e] to-[#171210] shadow-[inset_0_1px_0_rgba(233,206,140,0.25)]">
              <Scissors className="h-4 w-4 text-[#e9ce8c] transition-transform duration-500 group-hover:rotate-[20deg]" />
            </span>
            <span className="leading-none">
              <span className="block font-serif text-[1.35rem] font-semibold tracking-[0.08em] text-[#f3ead9]">Glam<span className="gc-gold-text">Chain</span></span>
              <span className="mt-0.5 block text-[9px] font-medium uppercase tracking-[0.42em] text-[#b3a68e]">Maison de Beauté</span>
            </span>
          </a>

          {/* desktop links */}
          <div className="hidden items-center gap-8 lg:flex">
            {navLinks.map((l) => <a key={l.href} href={l.href} className="gc-navlink text-[13px] font-medium">{l.label}</a>)}
          </div>

          <div className="flex items-center gap-2.5">
            <a href={`tel:${(location?.phone || businessConfig.contactPhone).replace(/\s/g, '')}`} className="hidden items-center gap-2 text-[13px] text-[#e6dbc6] transition-colors hover:text-[#e9ce8c] xl:flex">
              <Phone className="h-3.5 w-3.5 text-[#c8a24b]" />
              {location?.phone || businessConfig.contactPhone}
            </a>
            {session?.user ? (
              <a href={`${DASHBOARD_URL}/dashboard`}>
                <Button size="sm" className="gc-btn-gold h-9 gap-1.5 rounded-full px-4">
                  <LayoutDashboard className="h-3.5 w-3.5" /> Dashboard
                </Button>
              </a>
            ) : (
              <Button size="sm" onClick={() => openBooking()} className="gc-btn-gold h-9 rounded-full px-5">
                Book Now
              </Button>
            )}
            <Button variant="ghost" size="icon" className="h-9 w-9 text-[#e6dbc6] lg:hidden" onClick={() => setMenuOpen(!menuOpen)} aria-label="Menu">
              {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        {/* mobile menu */}
        {menuOpen && (
          <div className="border-t border-[rgba(200,162,75,0.16)] bg-[#1b1511]/98 px-6 py-5 backdrop-blur-xl lg:hidden">
            <div className="flex flex-col gap-1">
              {navLinks.map((l) => (
                <a key={l.href} href={l.href} onClick={() => setMenuOpen(false)} className="rounded-lg px-3 py-3 text-sm text-[#e6dbc6] transition-colors hover:bg-[rgba(200,162,75,0.08)] hover:text-[#e9ce8c]">
                  {l.label}
                </a>
              ))}
              <Button onClick={() => { setMenuOpen(false); openBooking() }} className="gc-btn-gold mt-3 h-11 w-full rounded-full">
                <CalendarDays className="mr-2 h-4 w-4" /> Book Your Visit
              </Button>
            </div>
          </div>
        )}
      </nav>

      {/* ————— hero ————— */}
      <header id="top" className="relative overflow-hidden">
        {/* ambient glows */}
        <div className="gc-glow left-[-10%] top-[8%] h-[460px] w-[460px] bg-[rgba(200,137,111,0.14)]" aria-hidden />
        <div className="gc-glow right-[-6%] top-[30%] h-[520px] w-[520px] bg-[rgba(200,162,75,0.13)]" style={{ animationDelay: '-5s' }} aria-hidden />

        <div className="relative mx-auto grid max-w-7xl items-center gap-14 px-4 pb-20 pt-14 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:gap-8 lg:pb-28 lg:pt-20">
          {/* copy */}
          <div className="relative z-10">
            <p className="gc-eyebrow left" data-anim>West Bay · Doha · Est. 2014</p>

            <h1 data-anim style={{ '--anim-delay': '90ms' } as React.CSSProperties} className="mt-6 font-serif text-[2.9rem] font-medium leading-[1.06] text-[#f3ead9] sm:text-6xl lg:text-[4.3rem]">
              Where beauty is <span className="gc-gold-text italic">crafted</span>,
              <br />
              and confidence begins.
            </h1>

            <p data-anim style={{ '--anim-delay': '180ms' } as React.CSSProperties} className="mt-7 max-w-xl text-[15px] leading-relaxed text-[#b3a68e] sm:text-base">
              Step out of the city's rush and into a warm, amber-lit sanctuary. Our master stylists
              design hair, skin and nail rituals around you — unhurried, precise, and personal.
              Welcome to your hour of calm.
            </p>

            <div data-anim style={{ '--anim-delay': '270ms' } as React.CSSProperties} className="mt-9 flex flex-wrap items-center gap-4">
              <Button size="lg" onClick={() => openBooking()} className="gc-btn-gold h-[52px] rounded-full px-8 text-[15px]">
                <CalendarDays className="mr-2 h-4.5 w-4.5" /> Book Your Visit
              </Button>
              <a href="#services">
                <Button size="lg" className="gc-btn-ghost h-[52px] rounded-full px-7 text-[15px]">
                  Explore the Menu <ArrowRight className="ml-1.5 h-4 w-4" />
                </Button>
              </a>
            </div>

            {/* trust row */}
            <div data-anim style={{ '--anim-delay': '360ms' } as React.CSSProperties} className="mt-11 flex flex-wrap items-center gap-x-9 gap-y-4">
              <div>
                <div className="flex items-center gap-1">
                  {[0, 1, 2, 3, 4].map((i) => <Star key={i} className="gc-star h-3.5 w-3.5 fill-[#e9ce8c] text-[#e9ce8c]" />)}
                </div>
                <p className="mt-1.5 text-xs text-[#b3a68e]"><span className="font-semibold text-[#e6dbc6]">4.9</span> · 640+ reviews</p>
              </div>
              <div className="h-9 w-px bg-[rgba(200,162,75,0.2)]" aria-hidden />
              <div>
                <p className="font-serif text-xl text-[#e9ce8c]"><CountUp to={5200} suffix="+" /></p>
                <p className="mt-0.5 text-xs text-[#b3a68e]">guests welcomed</p>
              </div>
              <div className="h-9 w-px bg-[rgba(200,162,75,0.2)]" aria-hidden />
              <div>
                <p className="font-serif text-xl text-[#e9ce8c]"><CountUp to={12} /></p>
                <p className="mt-0.5 text-xs text-[#b3a68e]">master stylists</p>
              </div>
            </div>
          </div>

          {/* imagery */}
          <div data-anim="zoom" className="relative mx-auto w-full max-w-[440px] lg:max-w-none">
            <div className="gc-arch aspect-[4/5.1] border border-[rgba(200,162,75,0.25)] bg-[#241b14] shadow-[0_40px_90px_-30px_rgba(0,0,0,0.85)]">
              <Image src="/images/hero-salon.png" alt="The warm, amber-lit interior of the GlamChain salon" width={864} height={1152} priority className="h-full w-full object-cover" />
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#171210]/55 via-transparent to-transparent" />
            </div>

            {/* floating rating card */}
            <div className="gc-float-card absolute -left-4 top-14 w-[188px] rounded-2xl p-4 sm:-left-8">
              <div className="flex items-center gap-1">
                {[0, 1, 2, 3, 4].map((i) => <Star key={i} className="h-3 w-3 fill-[#e9ce8c] text-[#e9ce8c]" />)}
              </div>
              <p className="mt-2 font-serif text-[13px] italic leading-snug text-[#e6dbc6]">"Feels less like a salon, more like a sanctuary."</p>
              <p className="mt-1.5 text-[10px] uppercase tracking-[0.18em] text-[#b3a68e]">— Doha Magazine</p>
            </div>

            {/* floating availability card */}
            <div className="gc-float-card delay absolute -right-3 bottom-16 w-[212px] rounded-2xl p-4 sm:-right-6">
              <div className="flex items-center gap-2.5">
                <span className="relative flex h-9 w-9 items-center justify-center rounded-full bg-[rgba(200,162,75,0.15)]">
                  <Clock className="h-4 w-4 text-[#e9ce8c]" />
                  <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-[#26201a] bg-emerald-400" />
                </span>
                <div>
                  <p className="text-[11px] font-semibold text-[#f3ead9]">Next opening today</p>
                  <p className="text-[11px] text-[#b3a68e]">4:30 PM · Noura Al-Sayed</p>
                </div>
              </div>
              <button onClick={() => openBooking()} className="mt-3 w-full rounded-full border border-[rgba(200,162,75,0.4)] py-1.5 text-[11px] font-semibold text-[#e9ce8c] transition-all hover:bg-[rgba(200,162,75,0.12)]">
                Claim this slot →
              </button>
            </div>
          </div>
        </div>

        {/* scroll cue */}
        <div className="pointer-events-none absolute bottom-6 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-2 lg:flex" aria-hidden>
          <span className="text-[10px] uppercase tracking-[0.3em] text-[#8d8271]">Scroll</span>
          <ChevronDown className="h-4 w-4 animate-bounce text-[#c8a24b]" />
        </div>
      </header>

      {/* ————— marquee ribbon ————— */}
      <section className="gc-marquee border-y border-[rgba(200,162,75,0.14)] bg-[#1a1410] py-5" aria-label="Our signature services">
        <div className="gc-marquee-track">
          {[0, 1].map((copy) => (
            <div key={copy} className="flex shrink-0 items-center" aria-hidden={copy === 1}>
              {MARQUEE_ITEMS.map((item) => (
                <span key={`${copy}-${item}`} className="flex items-center">
                  <span className="px-7 font-serif text-lg italic text-[#cdbf9f] sm:text-xl">{item}</span>
                  <Sparkles className="h-3.5 w-3.5 text-[#c8a24b]" />
                </span>
              ))}
            </div>
          ))}
        </div>
      </section>

      {/* ————— the experience / rituals ————— */}
      <section id="experience" className="relative py-24 lg:py-32">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div data-anim className="mx-auto max-w-2xl text-center">
            <p className="gc-eyebrow">The GlamChain Ritual</p>
            <h2 className="mt-5 font-serif text-4xl font-medium leading-tight text-[#f3ead9] sm:text-[2.75rem]">
              More than an appointment — <span className="gc-gold-text italic">an experience</span>
            </h2>
            <p className="mt-5 text-[15px] leading-relaxed text-[#b3a68e]">
              Four quiet promises we keep with every guest, on every visit.
            </p>
          </div>

          <div className="mt-16 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {RITUALS.map((r, i) => (
              <div key={r.title} data-anim style={{ '--anim-delay': `${i * 110}ms` } as React.CSSProperties} className="gc-card group rounded-2xl p-7">
                <div className="flex h-12 w-12 items-center justify-center rounded-full border border-[rgba(200,162,75,0.35)] bg-[rgba(200,162,75,0.08)] transition-all duration-500 group-hover:scale-110 group-hover:border-[rgba(200,162,75,0.6)]">
                  <r.icon className="h-5 w-5 text-[#e9ce8c]" />
                </div>
                <h3 className="mt-6 font-serif text-xl text-[#f3ead9]">{r.title}</h3>
                <p className="mt-3 text-[13.5px] leading-relaxed text-[#a89b85]">{r.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ————— services menu ————— */}
      <section id="services" className="relative overflow-hidden border-y border-[rgba(200,162,75,0.1)] bg-[#1b1511] py-24 lg:py-32">
        <div className="gc-glow left-[12%] top-[-8%] h-[380px] w-[380px] bg-[rgba(200,162,75,0.08)]" aria-hidden />
        <div className="relative mx-auto max-w-5xl px-4 sm:px-6">
          <div data-anim className="text-center">
            <p className="gc-eyebrow">The Menu</p>
            <h2 className="mt-5 font-serif text-4xl font-medium text-[#f3ead9] sm:text-[2.75rem]">
              Signature <span className="gc-gold-text italic">rituals</span> &amp; pricing
            </h2>
            <p className="mx-auto mt-5 max-w-xl text-[15px] leading-relaxed text-[#b3a68e]">
              {liveServices
                ? 'Live from our booking desk — prices and durations exactly as booked by our team.'
                : 'A curated selection of our most-loved services. The full menu awaits at booking.'}
            </p>
          </div>

          <div className="mt-14 grid gap-x-14 gap-y-12 md:grid-cols-2">
            {serviceGroups.map((g, gi) => (
              <div key={g.category} data-anim style={{ '--anim-delay': `${gi * 120}ms` } as React.CSSProperties}>
                <div className="flex items-center gap-4">
                  <Crown className="h-4 w-4 text-[#c8a24b]" />
                  <h3 className="font-serif text-2xl italic text-[#e9ce8c]">{g.category}</h3>
                  <div className="h-px flex-1 bg-[rgba(200,162,75,0.2)]" />
                </div>
                <ul className="mt-6 space-y-5">
                  {g.services.map((s) => (
                    <li key={s.id}>
                      <button onClick={() => openBooking(s.id)} className="group w-full text-left">
                        <div className="gc-menu-row">
                          <span className="text-[15px] font-medium text-[#f3ead9] transition-colors group-hover:text-[#e9ce8c]">{s.name}</span>
                          <span className="leader" />
                          <span className="whitespace-nowrap font-serif text-[15px] text-[#e9ce8c]">{formatPrice(s.price)}</span>
                        </div>
                        <div className="mt-1 flex items-center gap-3 text-[12px] text-[#948871]">
                          <span>{Math.floor(s.duration / 60) > 0 ? `${Math.floor(s.duration / 60)}h ` : ''}{s.duration % 60}m</span>
                          {s.description && <><span className="text-[#5c5343]">·</span><span className="truncate">{s.description}</span></>}
                          <span className="ml-auto hidden items-center gap-1 text-[#c8a24b] opacity-0 transition-opacity group-hover:opacity-100 sm:flex">
                            Book <ArrowRight className="h-3 w-3" />
                          </span>
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <p data-anim className="mt-14 text-center text-[13px] text-[#8d8271]">
            All rituals include consultation, warm towel service and our signature karak welcome.
            <span className="mx-2 text-[#c8a24b]">✦</span>
            Tap any service to book it instantly.
          </p>
        </div>
      </section>

      {/* ————— story ————— */}
      <section id="story" className="relative py-24 lg:py-32">
        <div className="mx-auto grid max-w-7xl items-center gap-14 px-4 sm:px-6 lg:grid-cols-2 lg:gap-20">
          <div data-anim="left" className="relative mx-auto w-full max-w-[420px]">
            <div className="gc-arch aspect-[4/5] border border-[rgba(200,162,75,0.25)] bg-[#241b14] shadow-[0_40px_90px_-30px_rgba(0,0,0,0.85)]">
              <Image src="/images/story-owner.png" alt="The founder of GlamChain in the salon" width={864} height={1152} className="h-full w-full object-cover" />
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#171210]/60 via-transparent to-transparent" />
            </div>
            <div className="gc-float-card absolute -right-4 bottom-10 rounded-2xl px-5 py-4 sm:-right-8">
              <p className="font-serif text-2xl text-[#e9ce8c]"><CountUp to={12} /></p>
              <p className="text-[11px] uppercase tracking-[0.2em] text-[#b3a68e]">years of craft</p>
            </div>
          </div>

          <div>
            <p data-anim className="gc-eyebrow left">Our Story</p>
            <h2 data-anim style={{ '--anim-delay': '80ms' } as React.CSSProperties} className="mt-5 font-serif text-4xl font-medium leading-tight text-[#f3ead9] sm:text-[2.75rem]">
              A sanctuary, <span className="gc-gold-text italic">not a salon.</span>
            </h2>
            <div data-anim style={{ '--anim-delay': '160ms' } as React.CSSProperties} className="mt-6 space-y-4 text-[15px] leading-relaxed text-[#b3a68e]">
              <p>
                GlamChain began in 2014 with a simple belief: beauty should never feel rushed.
                What started as a two-chair studio above a West Bay bookshop is today a quiet
                maison known for precision colour, honest advice and the warmest karak in Doha.
              </p>
              <p>
                We still book fewer guests per stylist than anyone in the city — on purpose.
                It means every consultation is unhurried, every finish is checked twice, and
                nobody ever waits. That is the whole secret.
              </p>
            </div>

            <div data-anim style={{ '--anim-delay': '240ms' } as React.CSSProperties} className="mt-9 grid grid-cols-3 gap-6 border-t border-[rgba(200,162,75,0.16)] pt-8">
              <div>
                <p className="font-serif text-[1.7rem] text-[#e9ce8c]"><CountUp to={98} suffix="%" /></p>
                <p className="mt-1 text-[11px] uppercase tracking-[0.16em] text-[#8d8271]">guests return</p>
              </div>
              <div>
                <p className="font-serif text-[1.7rem] text-[#e9ce8c]"><CountUp to={640} suffix="+" /></p>
                <p className="mt-1 text-[11px] uppercase tracking-[0.16em] text-[#8d8271]">five-star reviews</p>
              </div>
              <div>
                <p className="font-serif text-[1.7rem] text-[#e9ce8c]"><CountUp to={31} /></p>
                <p className="mt-1 text-[11px] uppercase tracking-[0.16em] text-[#8d8271]">artisan products</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ————— stylists ————— */}
      <section id="stylists" className="relative border-y border-[rgba(200,162,75,0.1)] bg-[#1b1511] py-24 lg:py-32">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div data-anim className="flex flex-wrap items-end justify-between gap-6">
            <div className="max-w-xl">
              <p className="gc-eyebrow left">The Artists</p>
              <h2 className="mt-5 font-serif text-4xl font-medium leading-tight text-[#f3ead9] sm:text-[2.75rem]">
                Masters behind <span className="gc-gold-text italic">the mirror</span>
              </h2>
            </div>
            <Button onClick={() => openBooking()} className="gc-btn-ghost h-11 rounded-full px-6">
              Book with your favourite <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>

          <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {STYLISTS.map((s, i) => (
              <div key={s.name} data-anim style={{ '--anim-delay': `${i * 110}ms` } as React.CSSProperties} className="gc-card group rounded-2xl p-7 text-center">
                <div className={`relative mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br ${s.hue} p-[2px]`}>
                  <span className="flex h-full w-full items-center justify-center rounded-full bg-[#221b14] font-serif text-xl tracking-wide text-[#e9ce8c]">
                    {s.initials}
                  </span>
                  <span className="absolute -bottom-1 rounded-full border border-[rgba(200,162,75,0.4)] bg-[#1b1511] px-2 py-px text-[9px] font-semibold uppercase tracking-[0.14em] text-[#c8a24b]">
                    {s.tag.split(' ')[0]}
                  </span>
                </div>
                <h3 className="mt-7 font-serif text-lg text-[#f3ead9]">{s.name}</h3>
                <p className="mt-1 text-[12px] text-[#948871]">{s.role}</p>
                <div className="mt-4 flex items-center justify-center gap-1.5">
                  <Star className="h-3.5 w-3.5 fill-[#e9ce8c] text-[#e9ce8c]" />
                  <span className="text-[13px] font-semibold text-[#e6dbc6]">{s.rating.toFixed(1)}</span>
                  <span className="text-[11px] text-[#8d8271]">· {s.tag}</span>
                </div>
                <button onClick={() => openBooking()} className="mt-5 w-full rounded-full border border-[rgba(200,162,75,0.3)] py-2 text-[12px] font-semibold text-[#cdbf9f] opacity-0 transition-all duration-500 hover:bg-[rgba(200,162,75,0.1)] hover:text-[#e9ce8c] group-hover:opacity-100">
                  Book with {s.name.split(' ')[0]} →
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ————— gallery ————— */}
      <section id="gallery" className="relative py-24 lg:py-32">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div data-anim className="mx-auto max-w-2xl text-center">
            <p className="gc-eyebrow">The Gallery</p>
            <h2 className="mt-5 font-serif text-4xl font-medium text-[#f3ead9] sm:text-[2.75rem]">
              Moments from <span className="gc-gold-text italic">the maison</span>
            </h2>
          </div>

          <div className="mt-14 grid grid-cols-2 gap-4 lg:grid-cols-4 lg:grid-rows-2">
            {GALLERY.map((g, i) => (
              <figure key={g.src} data-anim="zoom" style={{ '--anim-delay': `${i * 110}ms` } as React.CSSProperties} className={`gc-zoom group relative rounded-2xl border border-[rgba(200,162,75,0.18)] ${g.ratio} ${g.span}`}>
                <Image src={g.src} alt={`${g.caption} — ${g.sub}`} fill sizes="(max-width: 1024px) 50vw, 25vw" className="object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#171210]/78 via-transparent to-transparent opacity-80 transition-opacity duration-500 group-hover:opacity-100" />
                <figcaption className="absolute bottom-4 left-4 right-4">
                  <p className="font-serif text-base italic text-[#f3ead9]">{g.caption}</p>
                  <p className="text-[11px] uppercase tracking-[0.18em] text-[#c8a24b]">{g.sub}</p>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* ————— testimonials ————— */}
      <section className="relative overflow-hidden border-y border-[rgba(200,162,75,0.1)] bg-[#1b1511] py-24 lg:py-32">
        <div className="gc-glow right-[8%] top-[10%] h-[360px] w-[360px] bg-[rgba(200,137,111,0.1)]" aria-hidden />
        <div className="relative mx-auto max-w-4xl px-4 sm:px-6">
          <div data-anim className="text-center">
            <p className="gc-eyebrow">Kind Words</p>
            <h2 className="mt-5 font-serif text-4xl font-medium text-[#f3ead9] sm:text-[2.75rem]">
              Loved by <span className="gc-gold-text italic">our guests</span>
            </h2>
          </div>

          <div data-anim style={{ '--anim-delay': '150ms' } as React.CSSProperties} className="gc-card mt-14 rounded-3xl px-7 py-12 text-center sm:px-14">
            <div className="gc-divider text-lg" aria-hidden>❝</div>
            <blockquote key={tIndex} className="gc-anim-quote mx-auto mt-6 max-w-2xl">
              <p className="font-serif text-xl italic leading-relaxed text-[#e6dbc6] sm:text-2xl">{activeT.text}</p>
              <footer className="mt-7">
                <p className="text-sm font-semibold text-[#f3ead9]">{activeT.name}</p>
                <p className="mt-0.5 text-[11px] uppercase tracking-[0.2em] text-[#8d8271]">{activeT.role}</p>
              </footer>
            </blockquote>
            <div className="mt-8 flex items-center justify-center gap-2">
              {TESTIMONIALS.map((_, i) => (
                <button key={i} onClick={() => setTIndex(i)} aria-label={`Testimonial ${i + 1}`}
                  className={`h-1.5 rounded-full transition-all duration-500 ${i === tIndex ? 'w-7 bg-[#e9ce8c]' : 'w-1.5 bg-[rgba(200,162,75,0.3)] hover:bg-[rgba(200,162,75,0.55)]'}`} />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ————— booking CTA ————— */}
      <section id="book" className="relative overflow-hidden py-24 lg:py-32">
        <div className="gc-glow left-1/2 top-1/2 h-[540px] w-[720px] -translate-x-1/2 -translate-y-1/2 bg-[rgba(200,162,75,0.1)]" aria-hidden />
        <div className="relative mx-auto max-w-4xl px-4 text-center sm:px-6">
          <p data-anim className="gc-eyebrow">Reservations</p>
          <h2 data-anim style={{ '--anim-delay': '80ms' } as React.CSSProperties} className="mt-5 font-serif text-[2.6rem] font-medium leading-tight text-[#f3ead9] sm:text-5xl">
            Your chair is <span className="gc-gold-text italic">waiting.</span>
          </h2>
          <p data-anim style={{ '--anim-delay': '160ms' } as React.CSSProperties} className="mx-auto mt-6 max-w-xl text-[15px] leading-relaxed text-[#b3a68e]">
            Four quiet steps — choose your ritual, pick your artist, select a time, confirm.
            Sixty seconds, no calls, no waiting.
          </p>

          <div data-anim style={{ '--anim-delay': '220ms' } as React.CSSProperties} className="mx-auto mt-12 grid max-w-2xl grid-cols-2 gap-3 sm:grid-cols-4">
            {['Choose ritual', 'Pick artist', 'Select time', 'Confirmed'].map((step, i) => (
              <div key={step} className="gc-card rounded-xl px-3 py-5">
                <span className="mx-auto flex h-8 w-8 items-center justify-center rounded-full border border-[rgba(200,162,75,0.4)] font-serif text-sm text-[#e9ce8c]">{i + 1}</span>
                <p className="mt-3 text-[11.5px] font-medium text-[#cdbf9f]">{step}</p>
              </div>
            ))}
          </div>

          <div data-anim style={{ '--anim-delay': '280ms' } as React.CSSProperties} className="mt-11">
            <Button size="lg" onClick={() => openBooking()} className="gc-btn-gold h-[56px] rounded-full px-10 text-base">
              <CalendarDays className="mr-2.5 h-5 w-5" /> Reserve Your Ritual
            </Button>
            <p className="mt-4 text-[12.5px] text-[#8d8271]">
              Instant confirmation · Free rescheduling up to 12h before · No card required
            </p>
          </div>
        </div>
      </section>

      {/* ————— visit ————— */}
      <section id="visit" className="relative border-t border-[rgba(200,162,75,0.1)] bg-[#1b1511] py-24 lg:py-32">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div data-anim className="mx-auto max-w-2xl text-center">
            <p className="gc-eyebrow">Visit Us</p>
            <h2 className="mt-5 font-serif text-4xl font-medium text-[#f3ead9] sm:text-[2.75rem]">
              Find your way <span className="gc-gold-text italic">to calm</span>
            </h2>
          </div>

          <div className="mt-14 grid gap-5 md:grid-cols-3">
            <div data-anim className="gc-card rounded-2xl p-8">
              <MapPin className="h-5 w-5 text-[#e9ce8c]" />
              <h3 className="mt-5 font-serif text-xl text-[#f3ead9]">The Atelier</h3>
              <p className="mt-3 text-[13.5px] leading-relaxed text-[#a89b85]">
                {location?.address || 'Building 23, Al Funduq Street, West Bay'}
                <br />{location?.city || 'Doha, Qatar'}
              </p>
              <a href="https://maps.google.com/?q=West+Bay+Doha" target="_blank" rel="noreferrer" className="mt-5 inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-[#c8a24b] transition-colors hover:text-[#e9ce8c]">
                Open in maps <ArrowRight className="h-3.5 w-3.5" />
              </a>
            </div>

            <div data-anim style={{ '--anim-delay': '110ms' } as React.CSSProperties} className="gc-card rounded-2xl p-8">
              <Clock className="h-5 w-5 text-[#e9ce8c]" />
              <h3 className="mt-5 font-serif text-xl text-[#f3ead9]">Hours</h3>
              <ul className="mt-3 space-y-2 text-[13.5px] text-[#a89b85]">
                <li className="flex justify-between gap-4"><span>Sat – Thu</span><span className="text-[#cdbf9f]">10:00 — 22:00</span></li>
                <li className="flex justify-between gap-4"><span>Friday</span><span className="text-[#cdbf9f]">14:00 — 23:00</span></li>
                <li className="flex justify-between gap-4 border-t border-[rgba(200,162,75,0.12)] pt-2"><span>Ladies' mornings</span><span className="text-[#cdbf9f]">Sun &amp; Tue</span></li>
              </ul>
            </div>

            <div data-anim style={{ '--anim-delay': '220ms' } as React.CSSProperties} className="gc-card rounded-2xl p-8">
              <Phone className="h-5 w-5 text-[#e9ce8c]" />
              <h3 className="mt-5 font-serif text-xl text-[#f3ead9]">Say Hello</h3>
              <ul className="mt-3 space-y-2.5 text-[13.5px] text-[#a89b85]">
                <li><a href={`tel:${(location?.phone || businessConfig.contactPhone).replace(/\s/g, '')}`} className="flex items-center gap-2.5 transition-colors hover:text-[#e9ce8c]"><Phone className="h-3.5 w-3.5 text-[#c8a24b]" />{location?.phone || businessConfig.contactPhone}</a></li>
                <li><a href={`mailto:${location?.email || businessConfig.contactEmail}`} className="flex items-center gap-2.5 transition-colors hover:text-[#e9ce8c]"><Mail className="h-3.5 w-3.5 text-[#c8a24b]" />{location?.email || businessConfig.contactEmail}</a></li>
                <li><a href={WHATSAPP} target="_blank" rel="noreferrer" className="flex items-center gap-2.5 transition-colors hover:text-[#e9ce8c]"><MessageCircle className="h-3.5 w-3.5 text-[#c8a24b]" />WhatsApp us anytime</a></li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ————— footer ————— */}
      <footer className="border-t border-[rgba(200,162,75,0.14)] bg-[#14100d]">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
          <div className="grid gap-12 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
            <div>
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-full border border-[rgba(200,162,75,0.45)]">
                  <Scissors className="h-3.5 w-3.5 text-[#e9ce8c]" />
                </span>
                <span className="font-serif text-xl tracking-[0.06em] text-[#f3ead9]">Glam<span className="gc-gold-text">Chain</span></span>
              </div>
              <p className="mt-5 max-w-xs text-[13px] leading-relaxed text-[#8d8271]">
                A maison de beauté in the heart of West Bay — where every visit is a ritual,
                and every guest is family.
              </p>
              <div className="mt-6 flex gap-3">
                <a href="https://instagram.com" target="_blank" rel="noreferrer" aria-label="Instagram" className="flex h-9 w-9 items-center justify-center rounded-full border border-[rgba(200,162,75,0.3)] text-[#b3a68e] transition-all hover:border-[rgba(200,162,75,0.6)] hover:text-[#e9ce8c]"><Instagram className="h-4 w-4" /></a>
                <a href="https://facebook.com" target="_blank" rel="noreferrer" aria-label="Facebook" className="flex h-9 w-9 items-center justify-center rounded-full border border-[rgba(200,162,75,0.3)] text-[#b3a68e] transition-all hover:border-[rgba(200,162,75,0.6)] hover:text-[#e9ce8c]"><Facebook className="h-4 w-4" /></a>
                <a href={WHATSAPP} target="_blank" rel="noreferrer" aria-label="WhatsApp" className="flex h-9 w-9 items-center justify-center rounded-full border border-[rgba(200,162,75,0.3)] text-[#b3a68e] transition-all hover:border-[rgba(200,162,75,0.6)] hover:text-[#e9ce8c]"><MessageCircle className="h-4 w-4" /></a>
              </div>
            </div>

            <div>
              <h4 className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#c8a24b]">Explore</h4>
              <ul className="mt-5 space-y-3 text-[13.5px] text-[#a89b85]">
                {navLinks.map((l) => <li key={l.href}><a href={l.href} className="transition-colors hover:text-[#e9ce8c]">{l.label}</a></li>)}
              </ul>
            </div>

            <div>
              <h4 className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#c8a24b]">Rituals</h4>
              <ul className="mt-5 space-y-3 text-[13.5px] text-[#a89b85]">
                {MARQUEE_ITEMS.slice(0, 5).map((s) => <li key={s}><button onClick={() => openBooking()} className="transition-colors hover:text-[#e9ce8c]">{s}</button></li>)}
              </ul>
            </div>

            <div>
              <h4 className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#c8a24b]">Hours</h4>
              <ul className="mt-5 space-y-3 text-[13.5px] text-[#a89b85]">
                <li>Sat – Thu · 10:00 — 22:00</li>
                <li>Friday · 14:00 — 23:00</li>
                <li className="pt-2"><a href={DASHBOARD_URL} className="inline-flex items-center gap-1.5 text-[12px] text-[#6e6455] transition-colors hover:text-[#c8a24b]"><LayoutDashboard className="h-3 w-3" /> Staff sign-in</a></li>
              </ul>
            </div>
          </div>

          <div className="mt-14 flex flex-col items-center justify-between gap-4 border-t border-[rgba(200,162,75,0.12)] pt-8 sm:flex-row">
            <p className="text-[12px] text-[#6e6455]">© {new Date().getFullYear()} {businessConfig.name} · Maison de Beauté · West Bay, Doha</p>
            <p className="flex items-center gap-1.5 text-[12px] text-[#6e6455]">Crafted with <Heart className="h-3 w-3 fill-[#c0856f] text-[#c0856f]" /> in Qatar</p>
          </div>
        </div>
      </footer>

      {/* ————— floats ————— */}
      <a href={WHATSAPP} target="_blank" rel="noreferrer" aria-label="Chat on WhatsApp"
        className="gc-fab fixed bottom-6 right-6 z-40 h-13 w-13 border border-[rgba(200,162,75,0.45)] bg-gradient-to-br from-[#2a2118] to-[#1b1511] p-3.5 shadow-[0_14px_36px_-10px_rgba(0,0,0,0.7)] hover:border-[rgba(200,162,75,0.8)]">
        <MessageCircle className="h-6 w-6 text-[#e9ce8c]" />
        <span className="absolute -right-0.5 -top-0.5 flex h-3 w-3"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#c8a24b] opacity-60" /><span className="relative inline-flex h-3 w-3 rounded-full border-2 border-[#171210] bg-[#e9ce8c]" /></span>
      </a>

      <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} aria-label="Back to top"
        className={`gc-fab fixed bottom-6 left-6 z-40 h-11 w-11 border border-[rgba(200,162,75,0.35)] bg-[#1b1511]/90 backdrop-blur hover:border-[rgba(200,162,75,0.7)] ${showTop ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-3 opacity-0'}`}>
        <ArrowUp className="mx-auto h-4.5 w-4.5 text-[#e9ce8c]" />
      </button>

      {/* ————— booking dialog ————— */}
      <BookingWidget open={bookingOpen} onOpenChange={setBookingOpen} locationId={locationId} preselectedServiceId={preselect} />
    </div>
  )
}
