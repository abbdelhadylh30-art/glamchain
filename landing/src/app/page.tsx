'use client'

import { useState, useEffect, useRef } from 'react'
import { useSession, signIn, signOut } from 'next-auth/react'
import { getBusinessConfig, formatCurrency } from '@/lib/config'
import { BookingWidget } from '@/components/booking/booking-widget'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Scissors, MapPin, Phone, Mail, Clock, Star, CalendarDays, Award, ArrowRight, ChevronRight, Sparkles, Heart, ShieldCheck, Loader2, AlertCircle, LayoutDashboard } from 'lucide-react'

interface ServiceItem { id: string; name: string; category: string; duration: number; price: number; description: string | null }
interface ServiceGroup { category: string; services: ServiceItem[] }
interface LocationInfo { id: string; name: string; address: string; city: string; phone: string; email: string; openTime: string; closeTime: string }
const businessConfig = getBusinessConfig()

const C = { bg:'#0A0A0F', surface:'#13131C', surface2:'#1A1A28', text:'#F5F5F0', muted:'#8B8B96', border:'#252530', gold:'#D4AF37', goldLight:'#F0D060', emerald:'#10B981' }
const goldBtn = { background:`linear-gradient(135deg,${C.gold} 0%,${C.goldLight} 100%)`, color:C.bg, border:'none' }
const goldOutline = { background:'transparent', color:C.gold, border:`1px solid ${C.gold}40` }

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
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })
  const containerRef = useRef<HTMLDivElement>(null)

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
      entries.forEach(e => { if(e.isIntersecting) e.target.classList.add('gc-in') })
    }, { threshold: 0.12 })
    setTimeout(() => document.querySelectorAll('[data-anim]').forEach(el => observer.observe(el)), 100)
    return () => { cancelled = true; observer.disconnect() }
  }, [])

  const handleBookNow = (sid?: string) => { setPreselectedService(sid||null); setBookingOpen(true) }
  const scrollTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior:'smooth' })
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault(); setLoginError(''); setLoginLoading(true)
    try { const r = await signIn('credentials', { email:loginEmail, password:loginPassword, redirect:false })
      if(r?.error) setLoginError('Try admin@glamchain.com / password123')
      else { setShowLogin(false); setLoginEmail(''); setLoginPassword('') }
    } catch { setLoginError('Error') } finally { setLoginLoading(false) }
  }
  const handleSignOut = async () => { await signOut({ redirect:false }) }
  const allServices = serviceGroups.flatMap(g => g.services)

  return (
    <div ref={containerRef} style={{ minHeight:'100vh', background:C.bg, color:C.text, position:'relative', overflow:'hidden' }}
      onMouseMove={e => setMousePos({ x: e.clientX, y: e.clientY })}>

      {/* ===== AMBIENT BACKGROUND LAYERS ===== */}
      <style>{`
        /* Aurora gradient — slowly shifting color mesh, fixed behind everything */
        @keyframes gcAurora {
          0%{background-position:0% 0%} 50%{background-position:100% 50%} 100%{background-position:0% 0%}
        }
        /* Floating particles — drift upward slowly */
        @keyframes gcFloat {
          0%{transform:translateY(0) translateX(0);opacity:0} 10%{opacity:0.6} 90%{opacity:0.4} 100%{transform:translateY(-120vh) translateX(20px);opacity:0}
        }
        /* Gold shimmer sweep — on button hover */
        @keyframes gcSweep { 0%{transform:translateX(-100%)} 100%{transform:translateX(200%)} }
        /* Card glow on hover */
        @keyframes gcPulse { 0%,100%{box-shadow:0 0 0 rgba(212,175,55,0)} 50%{box-shadow:0 0 30px rgba(212,175,55,0.08)} }
        /* Slow drift for orbs */
        @keyframes gcDrift { 0%{transform:translate(0,0)} 33%{transform:translate(30px,-20px)} 66%{transform:translate(-20px,15px)} 100%{transform:translate(0,0)} }
        /* Scroll-triggered reveal */
        .gc-reveal { opacity:0; transform:translateY(30px); transition:all 0.8s cubic-bezier(0.22,1,0.36,1); }
        .gc-reveal.gc-in { opacity:1; transform:translateY(0); }
        /* Button shimmer sweep on hover */
        .gc-btn-shimmer { position:relative; overflow:hidden; }
        .gc-btn-shimmer::after { content:''; position:absolute; top:0; left:0; width:100%; height:100%;
          background:linear-gradient(90deg,transparent,rgba(255,255,255,0.3),transparent);
          transform:translateX(-100%); transition:none; }
        .gc-btn-shimmer:hover::after { animation:gcSweep 0.8s ease; }
        /* Card hover */
        .gc-lift { transition:all 0.4s cubic-bezier(0.22,1,0.36,1); }
        .gc-lift:hover { transform:translateY(-6px); border-color:rgba(212,175,55,0.3)!important; box-shadow:0 12px 40px rgba(212,175,55,0.06); }
        /* Gold text */
        .gc-gold-text { background:linear-gradient(135deg,${C.gold},${C.goldLight},${C.gold}); -webkit-background-clip:text; background-clip:text; --webkit-text-fill-color:transparent; }
        /* Glass */
        .gc-glass { background:rgba(255,255,255,0.03); backdrop-filter:blur(20px); -webkit-backdrop-filter:blur(20px); border:1px solid rgba(212,175,55,0.12); }
        /* Animated divider */
        .gc-divider { width:80px; height:1px; background:linear-gradient(90deg,transparent,${C.gold},transparent); margin:0 auto; position:relative; }
        .gc-divider::after { content:''; position:absolute; inset:0; background:linear-gradient(90deg,transparent,${C.goldLight},transparent); background-size:200% 100%; animation:gcAurora 3s linear infinite; }
        html { scroll-behavior:smooth; }
        @media (prefers-reduced-motion:reduce) { *{animation:none!important;transition:none!important} html{scroll-behavior:auto} }
      `}</style>

      {/* Layer 1: Aurora gradient mesh (fixed, behind everything) */}
      <div style={{ position:'fixed', inset:0, zIndex:0, pointerEvents:'none',
        background:`radial-gradient(ellipse at 20% 30%, rgba(212,175,55,0.06), transparent 50%),
                    radial-gradient(ellipse at 80% 20%, rgba(16,185,129,0.04), transparent 50%),
                    radial-gradient(ellipse at 50% 80%, rgba(99,102,241,0.03), transparent 50%),
                    radial-gradient(ellipse at 90% 90%, rgba(212,175,55,0.03), transparent 50%)`,
        backgroundSize:'200% 200%', animation:'gcAurora 20s ease-in-out infinite' }} />

      {/* Layer 2: Dot grid pattern (subtle texture) */}
      <div style={{ position:'fixed', inset:0, zIndex:0, pointerEvents:'none', opacity:0.4,
        backgroundImage:`radial-gradient(circle, rgba(255,255,255,0.03) 1px, transparent 1px)`,
        backgroundSize:'24px 24px' }} />

      {/* Layer 3: Floating particles (15 dots drifting upward) */}
      <div style={{ position:'fixed', inset:0, zIndex:0, pointerEvents:'none', overflow:'hidden' }}>
        {Array.from({ length: 15 }).map((_, i) => (
          <div key={i} style={{
            position:'absolute', bottom:'-10px',
            left:`${5 + Math.random() * 90}%`,
            width:`${2 + Math.random() * 3}px`, height:`${2 + Math.random() * 3}px`,
            borderRadius:'50%',
            background: Math.random() > 0.5 ? `rgba(212,175,55,${0.2 + Math.random() * 0.3})` : `rgba(16,185,129,${0.1 + Math.random() * 0.2})`,
            animation:`gcFloat ${15 + Math.random() * 20}s linear infinite`,
            animationDelay:`${Math.random() * 20}s`,
          }} />
        ))}
      </div>

      {/* Layer 4: Cursor-following glow */}
      <div style={{
        position:'fixed', left:mousePos.x - 200, top:mousePos.y - 200,
        width:400, height:400, borderRadius:'50%', pointerEvents:'none', zIndex:0,
        background:`radial-gradient(circle, rgba(212,175,55,0.04), transparent 70%)`,
        transition:'left 0.3s ease, top 0.3s ease',
      }} />

      {/* ===== CONTENT (z-index 10) ===== */}
      <div style={{ position:'relative', zIndex:10 }}>

        {/* NAV */}
        <nav style={{ position:'fixed', top:0, left:0, right:0, zIndex:50, background:'rgba(10,10,15,0.7)', backdropFilter:'blur(16px)', borderBottom:`1px solid ${C.border}` }}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center h-16">
            <div className="flex items-center gap-2"><div style={{width:36,height:36,borderRadius:8,background:`linear-gradient(135deg,${C.emerald},#064E3B)`,display:'flex',alignItems:'center',justifyContent:'center'}}><Scissors style={{width:18,height:18,color:C.text}}/></div><span style={{fontWeight:700,fontSize:18,color:C.text,letterSpacing:'-0.02em'}}>{businessConfig.name}</span></div>
            <div className="hidden md:flex items-center gap-8">
              {[['Services','services'],['About','about'],['Contact','contact']].map(([l,id]) => <button key={id} onClick={()=>scrollTo(id)} style={{fontSize:14,color:C.muted,transition:'color 0.2s'}} onMouseEnter={e=>e.currentTarget.style.color=C.gold} onMouseLeave={e=>e.currentTarget.style.color=C.muted}>{l}</button>)}
            </div>
            <div className="flex items-center gap-2">
              {session?.user ? (<><a href={`${process.env.NEXTAUTH_URL}/dashboard`}><Button size="sm" style={goldBtn}><LayoutDashboard className="w-4 h-4 mr-1"/>Dashboard</Button></a><Button size="sm" variant="ghost" style={{color:C.muted}} onClick={handleSignOut}>Sign Out</Button></>) : (<><a href={process.env.NEXTAUTH_URL}><Button size="sm" variant="outline" style={goldOutline}>Staff Login</Button></a><Button size="sm" style={goldBtn} className="hidden sm:inline-flex gc-btn-shimmer" onClick={()=>handleBookNow()}>Book Now</Button></>)}
            </div>
          </div>
        </nav>

        {/* HERO */}
        <section style={{minHeight:'92vh',display:'flex',alignItems:'center',paddingTop:64,position:'relative'}}>
          {/* Drifting orbs */}
          <div style={{position:'absolute',width:300,height:300,borderRadius:'50%',background:'rgba(212,175,55,0.06)',filter:'blur(60px)',top:'10%',left:'5%',animation:'gcDrift 15s ease-in-out infinite'}} />
          <div style={{position:'absolute',width:250,height:250,borderRadius:'50%',background:'rgba(16,185,129,0.04)',filter:'blur(50px)',bottom:'15%',right:'10%',animation:'gcDrift 18s ease-in-out infinite reverse'}} />

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid lg:grid-cols-2 gap-12 items-center w-full py-20">
            <div className="text-center lg:text-left">
              <div data-anim className="gc-reveal" style={{display:'inline-flex',alignItems:'center',gap:8,padding:'6px 16px',borderRadius:20,background:'rgba(212,175,55,0.06)',border:'1px solid rgba(212,175,55,0.15)',color:C.gold,fontSize:14,fontWeight:500,marginBottom:24}}><Sparkles className="w-4 h-4"/>{businessConfig.tagline}</div>
              <h1 data-anim className="gc-reveal" style={{fontSize:'clamp(2.5rem,5vw,4rem)',fontWeight:800,letterSpacing:'-0.03em',marginBottom:16,lineHeight:1.1,color:C.text}}>Premium Salon<br/><span style={{background:`linear-gradient(135deg,${C.gold},${C.goldLight},${C.gold})`,WebkitBackgroundClip:'text',backgroundClip:'text',WebkitTextFillColor:'transparent',fontWeight:800}}>Experience</span></h1>
              <p data-anim className="gc-reveal" style={{fontSize:18,color:C.muted,marginBottom:32,maxWidth:520,lineHeight:1.6,marginLeft:'auto',marginRight:'auto'}}>Where beauty meets elegance. Experience world-class hair, nail, and beauty services crafted by expert stylists in a luxurious setting.</p>
              <div data-anim className="gc-reveal" style={{display:'flex',flexWrap:'wrap',gap:12,justifyContent:'center',marginBottom:32}}>
                <Button size="lg" style={goldBtn} className="gc-btn-shimmer" onClick={()=>handleBookNow()}><CalendarDays className="w-5 h-5 mr-2"/>Book Your Visit</Button>
                <Button size="lg" variant="outline" style={goldOutline} onClick={()=>scrollTo('services')}>Explore Services<ArrowRight className="w-4 h-4 ml-2"/></Button>
              </div>
              <div data-anim className="gc-reveal" style={{display:'flex',flexWrap:'wrap',gap:32,justifyContent:'center'}}>
                {[['5,000+','Happy Clients'],['4.9','Average Rating'],['8+','Years of Excellence']].map(([v,l]) => <div key={l} style={{textAlign:'center'}}><div style={{fontSize:28,fontWeight:800,color:C.text}}>{v}</div><div style={{fontSize:12,color:C.muted,textTransform:'uppercase',letterSpacing:'0.08em'}}>{l}</div></div>)}
              </div>
            </div>
            <div style={{display:'flex',justifyContent:'center'}}>
              {session?.user ? (
                <div className="gc-glass gc-lift" style={{borderRadius:16,padding:32,maxWidth:400,width:'100%',boxShadow:'0 20px 60px rgba(0,0,0,0.4)',textAlign:'center'}}>
                  <div style={{width:64,height:64,borderRadius:16,background:`linear-gradient(135deg,${C.gold},${C.goldLight})`,display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 16px'}}><LayoutDashboard style={{width:32,height:32,color:C.bg}}/></div>
                  <h2 style={{fontSize:24,fontWeight:700,color:C.text}}>Welcome back</h2><p style={{fontSize:14,color:C.muted,marginTop:4}}>{session.user.email}</p><p style={{fontSize:12,color:C.gold,marginTop:4,textTransform:'capitalize'}}>Role: {session.user.role}</p>
                  <a href={`${process.env.NEXTAUTH_URL}/dashboard`} className="block mt-6"><Button size="lg" style={goldBtn} className="w-full gc-btn-shimmer"><LayoutDashboard className="w-5 h-5 mr-2"/>Enter Dashboard</Button></a>
                  <Button size="sm" variant="ghost" style={{color:C.muted,width:'100%',marginTop:12}} onClick={handleSignOut}>Sign out</Button>
                </div>
              ) : showLogin ? (
                <div className="gc-glass gc-lift" style={{borderRadius:16,padding:32,maxWidth:400,width:'100%',boxShadow:'0 20px 60px rgba(0,0,0,0.4)'}}>
                  <div style={{textAlign:'center',marginBottom:24}}><div style={{width:56,height:56,borderRadius:12,background:`linear-gradient(135deg,${C.gold},${C.goldLight})`,display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 12px'}}><Scissors style={{width:28,height:28,color:C.bg}}/></div><h2 style={{fontSize:24,fontWeight:700,color:C.text}}>Staff Login</h2><p style={{fontSize:14,color:C.muted,marginTop:4}}>Sign in to access the dashboard</p></div>
                  <form onSubmit={handleLogin} className="space-y-4">
                    {loginError && <div style={{display:'flex',alignItems:'center',gap:8,padding:12,borderRadius:8,background:'rgba(220,38,38,0.1)',color:'#F87171',fontSize:14}}><AlertCircle className="w-4 h-4 shrink-0"/>{loginError}</div>}
                    <div className="relative"><Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{color:C.muted}}/><Input type="email" placeholder="Email address" value={loginEmail} onChange={e=>setLoginEmail(e.target.value)} className="pl-10" required style={{background:C.surface,borderColor:C.border,color:C.text}}/></div>
                    <Input type="password" placeholder="Password" value={loginPassword} onChange={e=>setLoginPassword(e.target.value)} required style={{background:C.surface,borderColor:C.border,color:C.text}}/>
                    <Button type="submit" className="w-full gc-btn-shimmer" style={goldBtn} disabled={loginLoading}>{loginLoading?<><Loader2 className="w-4 h-4 mr-2 animate-spin"/>Signing in...</>:'Sign in'}</Button>
                  </form>
                  <div style={{marginTop:20,paddingTop:20,borderTop:`1px solid ${C.border}`,textAlign:'center',fontSize:12,color:C.muted}}><p style={{fontWeight:600,marginBottom:4}}>Demo (all: password123):</p><p style={{fontFamily:'monospace',color:C.gold}}>admin@glamchain.com · owner@noorbeauty.eg</p></div>
                </div>
              ) : (
                <div className="gc-glass gc-lift" style={{borderRadius:16,padding:32,maxWidth:400,width:'100%',textAlign:'center'}}>
                  <div style={{width:56,height:56,borderRadius:12,background:'rgba(212,175,55,0.06)',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 16px'}}><ShieldCheck style={{width:28,height:28,color:C.gold}}/></div>
                  <h2 style={{fontSize:20,fontWeight:700,color:C.text,marginBottom:8}}>Staff Access</h2><p style={{fontSize:14,color:C.muted,marginBottom:16}}>Sign in to manage your salon.</p>
                  <Button variant="outline" style={goldOutline} className="w-full" onClick={()=>setShowLogin(true)}>Sign in to Dashboard<ChevronRight className="w-4 h-4 ml-1"/></Button>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Animated divider */}
        <div style={{padding:'0 16px 60px'}}><div className="gc-divider" /></div>

        {/* SERVICES */}
        <section id="services" style={{padding:'0 16px 80px'}}>
          <div className="max-w-7xl mx-auto">
            <div style={{textAlign:'center',marginBottom:48}}>
              <h2 data-anim className="gc-reveal" style={{fontSize:'clamp(1.75rem,4vw,2.5rem)',fontWeight:800,color:C.text,marginBottom:8}}>Our Services</h2>
              <p data-anim className="gc-reveal" style={{color:C.muted,maxWidth:500,margin:'0 auto'}}>Discover our range of premium beauty services.</p>
            </div>
            {allServices.length > 0 ? (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {allServices.map((svc,i) => (
                  <div key={svc.id} data-anim className="gc-reveal gc-lift" style={{background:C.surface,borderRadius:16,padding:24,border:`1px solid ${C.border}`,cursor:'pointer'}} onClick={()=>handleBookNow(svc.id)}>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'start',marginBottom:12}}>
                      <span style={{fontSize:11,fontWeight:600,padding:'4px 10px',borderRadius:20,background:'rgba(212,175,55,0.08)',color:C.gold,backdropFilter:'blur(4px)'}}>{svc.category}</span>
                      <span style={{fontSize:20,fontWeight:800,background:`linear-gradient(135deg,${C.gold},${C.goldLight})`,WebkitBackgroundClip:'text',backgroundClip:'text',WebkitTextFillColor:'transparent'}}>{formatCurrency(svc.price)}</span>
                    </div>
                    <h3 style={{fontWeight:600,fontSize:18,marginBottom:4,color:C.text}}>{svc.name}</h3>
                    {svc.description && <p style={{fontSize:14,color:C.muted,marginBottom:12}}>{svc.description}</p>}
                    <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',fontSize:14}}>
                      <span style={{display:'flex',alignItems:'center',gap:4,color:C.muted}}><Clock className="w-3.5 h-3.5"/>{svc.duration} min</span>
                      <span style={{display:'flex',alignItems:'center',gap:4,color:C.gold,fontWeight:600}}>Book now<ArrowRight className="w-3.5 h-3.5"/></span>
                    </div>
                  </div>
                ))}
              </div>
            ) : <div style={{textAlign:'center',padding:48,color:C.muted}}>Loading services...</div>}
          </div>
        </section>

        <div style={{padding:'0 16px 60px'}}><div className="gc-divider" /></div>

        {/* FEATURES */}
        <section id="about" style={{padding:'0 16px 80px'}}>
          <div className="max-w-7xl mx-auto">
            <div style={{textAlign:'center',marginBottom:48}}><h2 data-anim className="gc-reveal" style={{fontSize:'clamp(1.75rem,4vw,2.5rem)',fontWeight:800,color:C.text}}>Why Choose {businessConfig.name}?</h2></div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[{icon:Scissors,t:'Expert Stylists',d:'Years of professional experience and continuous training.'},{icon:Sparkles,t:'Premium Products',d:'Finest products from trusted global brands.'},{icon:Heart,t:'Personalized Care',d:'Every treatment is tailored to your needs.'},{icon:ShieldCheck,t:'Luxury Experience',d:'Relaxing, premium atmosphere from the moment you walk in.'}].map((f,i) => (
                <div key={i} data-anim className="gc-reveal gc-lift" style={{background:C.surface,borderRadius:16,padding:24,border:`1px solid ${C.border}`}}>
                  <div style={{width:48,height:48,borderRadius:12,background:'rgba(212,175,55,0.06)',display:'flex',alignItems:'center',justifyContent:'center',marginBottom:16}}><f.icon style={{width:24,height:24,color:C.gold}}/></div>
                  <h3 style={{fontWeight:600,fontSize:18,marginBottom:8,color:C.text}}>{f.t}</h3><p style={{fontSize:14,color:C.muted}}>{f.d}</p>
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
              <div style={{position:'absolute',width:256,height:256,borderRadius:'50%',background:'rgba(212,175,55,0.08)',filter:'blur(60px)',top:-80,right:-80,animation:'gcDrift 12s ease-in-out infinite'}} />
              <div style={{position:'relative'}}>
                <h2 style={{fontSize:'clamp(1.75rem,4vw,2.5rem)',fontWeight:800,color:C.text,marginBottom:12}}>Ready to Transform Your Look?</h2>
                <p style={{color:C.muted,marginBottom:24,maxWidth:400,marginLeft:'auto',marginRight:'auto'}}>Book your appointment today and experience the {businessConfig.name} difference.</p>
                <Button size="lg" style={goldBtn} className="gc-btn-shimmer" onClick={()=>handleBookNow()}><CalendarDays className="w-5 h-5 mr-2"/>Book Your Visit</Button>
              </div>
            </div>
          </div>
        </section>

        {/* CONTACT */}
        <section id="contact" style={{padding:'0 16px 80px'}}>
          <div className="max-w-7xl mx-auto">
            <div style={{textAlign:'center',marginBottom:48}}><h2 data-anim className="gc-reveal" style={{fontSize:'clamp(1.75rem,4vw,2.5rem)',fontWeight:800,color:C.text}}>Get In Touch</h2></div>
            <div className="grid sm:grid-cols-3 gap-6 max-w-4xl mx-auto">
              {[{icon:MapPin,t:'Visit Us',v:location?`${location.address}, ${location.city}`:'Loading...'},{icon:Phone,t:'Call Us',v:location?.phone||'Loading...'},{icon:Mail,t:'Email Us',v:location?.email||'Loading...'}].map((item,i) => (
                <div key={i} data-anim className="gc-reveal gc-lift" style={{background:C.surface,borderRadius:16,padding:24,border:`1px solid ${C.border}`,textAlign:'center'}}>
                  <div style={{width:48,height:48,borderRadius:12,background:'rgba(212,175,55,0.06)',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 12px'}}><item.icon style={{width:24,height:24,color:C.gold}}/></div>
                  <h4 style={{fontWeight:600,fontSize:14,marginBottom:4,color:C.text}}>{item.t}</h4><p style={{fontSize:14,color:C.muted}}>{item.v}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FOOTER */}
        <footer style={{padding:'32px 16px',borderTop:`1px solid ${C.border}`}}>
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">
            <div style={{display:'flex',alignItems:'center',gap:8}}><div style={{width:28,height:28,borderRadius:8,background:`linear-gradient(135deg,${C.emerald},#064E3B)`,display:'flex',alignItems:'center',justifyContent:'center'}}><Scissors style={{width:16,height:16,color:C.text}}/></div><span style={{fontWeight:700,fontSize:14,color:C.text}}>{businessConfig.name}</span></div>
            <p style={{fontSize:12,color:C.muted}}>© {new Date().getFullYear()} {businessConfig.name}. All rights reserved.</p>
            {location && <span style={{display:'flex',alignItems:'center',gap:4,fontSize:12,color:C.muted}}><Clock className="w-3.5 h-3.5"/>{location.openTime} - {location.closeTime}</span>}
          </div>
        </footer>
      </div>
    </div>
  )
}
