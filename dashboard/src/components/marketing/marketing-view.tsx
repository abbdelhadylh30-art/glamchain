'use client'

import { useEffect, useMemo, useState } from 'react'
import { useAppStore } from '@/lib/store'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Megaphone,
  Sparkles,
  HeartHandshake,
  Gift,
  Star,
  BellRing,
  Users,
  MessageCircle,
  Send,
  CalendarClock,
  MoreHorizontal,
  Plus,
  CheckCircle2,
  XCircle,
  Crown,
  UserX,
  UserPlus,
  PhoneOff,
} from 'lucide-react'
import { format, formatDistanceToNow } from 'date-fns'
import { useToast } from '@/hooks/use-toast'

interface Campaign {
  id: string
  name: string
  type: string
  channel: string
  status: string
  message: string
  segment: string
  audienceCount: number
  sentCount: number
  scheduledFor: string | null
  sentAt: string | null
  createdAt: string
}

interface Segment {
  id: string
  label: string
  description: string
  count: number
}

const SEGMENT_ICONS: Record<string, typeof Crown> = {
  vip: Crown,
  at_risk: UserX,
  no_show: PhoneOff,
  new_guests: UserPlus,
  all: Users,
}

const TYPE_META: Record<string, { label: string; icon: typeof Gift; blurb: string; template: string }> = {
  win_back: {
    label: 'Win them back',
    icon: HeartHandshake,
    blurb: 'For guests who have gone quiet — a warm reason to return.',
    template: 'Hi {name} 💛 It has been a while! Your chair at GlamChain misses you. Come back in the next 10 days and enjoy 25% off your favourite ritual — just reply to this message.',
  },
  offer: {
    label: 'Quiet-hours offer',
    icon: Gift,
    blurb: 'Turn empty chairs into takings with a time-boxed discount.',
    template: 'Good morning {name}! Our chairs are quiet this Tuesday 10am–2pm — enjoy 20% off all hair rituals in those hours. Tap to grab a slot before they go ✨',
  },
  new_service: {
    label: 'New service launch',
    icon: Sparkles,
    blurb: 'Give loyal guests first access to what just landed.',
    template: '{name}, something new just landed at GlamChain — our Keratin Silk Ritual. As one of our favourites, you get first access + a complimentary gloss this month.',
  },
  review: {
    label: 'Review request',
    icon: Star,
    blurb: 'A gentle ask, right after the glow is fresh.',
    template: 'Thank you for visiting GlamChain, {name}! If you loved your ritual, would you share a quick review? It means the world to our artists 💛',
  },
  birthday: {
    label: 'Birthday treat',
    icon: Megaphone,
    blurb: 'A little gift on their month.',
    template: 'Happy birthday {name}! 🎉 Celebrate with us — a complimentary deep-conditioning add-on with any ritual this month, from your GlamChain family.',
  },
  custom: {
    label: 'Write your own',
    icon: Megaphone,
    blurb: 'A blank canvas in your own voice.',
    template: 'Hello {name}, ',
  },
}

const STATUS_STYLE: Record<string, string> = {
  sent: 'bg-[#7d8b6a1f] text-[#5c6b48]',
  scheduled: 'bg-[#c8a24b26] text-[#8a6d2a]',
  draft: 'bg-[#efe7d6] text-[#6b5d4a]',
  cancelled: 'bg-[#b4543f1a] text-[#a04c38]',
}

export function MarketingView() {
  const { toast } = useToast()
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [segments, setSegments] = useState<Segment[]>([])
  const [whatsappProvider, setWhatsappProvider] = useState('mock')
  const [loading, setLoading] = useState(true)
  const [composerOpen, setComposerOpen] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  // composer state
  const [cName, setCName] = useState('')
  const [cType, setCType] = useState('offer')
  const [cSegment, setCSegment] = useState('all')
  const [cMessage, setCMessage] = useState(TYPE_META.offer.template)
  const [cSchedule, setCSchedule] = useState('')
  const [saving, setSaving] = useState(false)

  const load = () => {
    setLoading(true)
    fetch('/api/marketing')
      .then(r => r.json())
      .then(d => {
        setCampaigns(d.campaigns || [])
        setSegments(d.segments || [])
        setWhatsappProvider(d.whatsappProvider || 'mock')
      })
      .catch(() => toast({ title: 'Could not load marketing data', variant: 'destructive' }))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const segmentLabel = (id: string) => segments.find(s => s.id === id)?.label || id
  const segmentCount = (id: string) => segments.find(s => s.id === id)?.count ?? 0

  const totals = useMemo(() => {
    const sent = campaigns.filter(c => c.status === 'sent')
    const guests = sent.reduce((s, c) => s + c.sentCount, 0)
    return { sentCount: sent.length, guests }
  }, [campaigns])

  const openComposer = (type?: string) => {
    const t = type || 'offer'
    setCType(t)
    setCMessage(TYPE_META[t].template)
    setCName('')
    setCSegment('all')
    setCSchedule('')
    setComposerOpen(true)
  }

  const createCampaign = async () => {
    if (!cName.trim() || !cMessage.trim()) {
      toast({ title: 'A name and a message, please', variant: 'destructive' })
      return
    }
    setSaving(true)
    try {
      const res = await fetch('/api/marketing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: cName,
          type: cType,
          channel: 'whatsapp',
          message: cMessage,
          segment: cSegment,
          scheduledFor: cSchedule || undefined,
        }),
      })
      if (!res.ok) throw new Error()
      toast({ title: cSchedule ? 'Campaign scheduled ✨' : 'Campaign saved as draft', description: `${cName} → ${segmentLabel(cSegment)}` })
      setComposerOpen(false)
      load()
    } catch {
      toast({ title: 'Could not save the campaign', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const act = async (id: string, action: 'send' | 'cancel' | 'schedule') => {
    setBusyId(id)
    try {
      const res = await fetch('/api/marketing', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action, scheduledFor: action === 'schedule' ? new Date(Date.now() + 86400000).toISOString() : undefined }),
      })
      if (!res.ok) throw new Error()
      toast({
        title: action === 'send' ? 'Campaign sent 🚀' : action === 'schedule' ? 'Scheduled for tomorrow' : 'Campaign cancelled',
        description: action === 'send' && whatsappProvider === 'mock' ? 'Demo mode — connect WhatsApp (Meta Cloud API) to dispatch for real.' : undefined,
      })
      load()
    } catch {
      toast({ title: 'That did not work — try again', variant: 'destructive' })
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="space-y-7">
      {/* ————— intro band ————— */}
      <section className="gm-rise relative overflow-hidden rounded-2xl border border-[#e8dfc9] bg-gradient-to-r from-[#2a2114] via-[#33291a] to-[#2a2114] px-6 py-7 sm:px-8">
        <div className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-[#c8a24b1f] blur-3xl" />
        <div className="relative flex flex-wrap items-center justify-between gap-5">
          <div>
            <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-[#c8a24b]">
              <Megaphone className="h-3.5 w-3.5" />
              Marketing studio
            </p>
            <h2 className="mt-2 font-serif text-[1.7rem] sm:text-3xl font-semibold text-[#f3ead9]">
              Fill the quiet hours, <span className="gm-gold-text italic">win back the rest.</span>
            </h2>
            <p className="mt-2 max-w-xl text-[13px] text-[#a3947a]">
              {totals.sentCount} campaigns sent · {totals.guests} guests reached · WhatsApp {whatsappProvider === 'mock' ? 'in demo mode' : 'connected'}
            </p>
          </div>
          <Button className="gm-btn-gold h-11 rounded-full px-6 gap-2" onClick={() => openComposer()}>
            <Plus className="h-4 w-4" /> New campaign
          </Button>
        </div>
      </section>

      {/* ————— segments ————— */}
      <section className="gm-rise-1">
        <div className="mb-4 flex items-end justify-between">
          <div>
            <h3 className="font-serif text-lg font-semibold text-[#2a221a]">Who to reach</h3>
            <p className="text-[12.5px] text-[#8a7d68]">Live segments, straight from your guest book</p>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {loading
            ? [1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-36 rounded-2xl bg-[#efe7d6]" />)
            : segments.map(seg => {
                const Icon = SEGMENT_ICONS[seg.id] || Users
                return (
                  <button
                    key={seg.id}
                    onClick={() => openComposerWithSegment(seg.id)}
                    className="gm-stat group rounded-2xl p-5 text-left"
                  >
                    <div className="flex items-start justify-between">
                      <span className="gm-chip h-9 w-9"><Icon className="h-4.5 w-4.5" /></span>
                      <span className="font-serif text-[1.6rem] font-semibold text-[#2a221a]">{seg.count}</span>
                    </div>
                    <p className="mt-4 text-[13.5px] font-semibold text-[#2a221a] group-hover:text-[#96742c]">{seg.label}</p>
                    <p className="mt-1 text-[11.5px] leading-snug text-[#a3947a]">{seg.description}</p>
                    <span className="mt-3 inline-flex items-center gap-1 text-[11px] font-semibold text-[#96742c] opacity-0 transition-opacity group-hover:opacity-100">
                      Draft a message <Send className="h-3 w-3" />
                    </span>
                  </button>
                )
              })}
        </div>
      </section>

      {/* ————— campaign templates quick-start ————— */}
      <section className="gm-rise-2">
        <div className="mb-4">
          <h3 className="font-serif text-lg font-semibold text-[#2a221a]">Start from a proven idea</h3>
          <p className="text-[12.5px] text-[#8a7d68]">One tap pre-writes the message — edit before sending</p>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Object.entries(TYPE_META).filter(([k]) => k !== 'custom').map(([key, meta]) => (
            <button key={key} onClick={() => openComposer(key)} className="gm-card group rounded-2xl p-5 text-left transition-all duration-300 hover:-translate-y-1 hover:border-[#d9c998]">
              <div className="flex items-center gap-3">
                <span className="gm-chip h-10 w-10"><meta.icon className="h-5 w-5" /></span>
                <div>
                  <p className="text-[14px] font-semibold text-[#2a221a]">{meta.label}</p>
                  <p className="text-[11.5px] text-[#a3947a]">{meta.blurb}</p>
                </div>
              </div>
              <p className="mt-4 line-clamp-2 rounded-xl bg-[#fbf7ec] border border-[#f0e6c8] px-3.5 py-2.5 text-[12px] italic leading-relaxed text-[#6b5d4a]">
                “{meta.template}”
              </p>
              <span className="mt-3 inline-flex items-center gap-1 text-[11.5px] font-semibold text-[#96742c] opacity-0 transition-opacity group-hover:opacity-100">
                Use this template <Plus className="h-3 w-3" />
              </span>
            </button>
          ))}
        </div>
      </section>

      {/* ————— campaigns list ————— */}
      <section className="gm-rise-3">
        <div className="mb-4">
          <h3 className="font-serif text-lg font-semibold text-[#2a221a]">Your campaigns</h3>
          <p className="text-[12.5px] text-[#8a7d68]">Everything you have sent, scheduled or sketched</p>
        </div>

        {loading ? (
          <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-24 rounded-2xl bg-[#efe7d6]" />)}</div>
        ) : campaigns.length === 0 ? (
          <Card className="gm-card rounded-2xl py-14 text-center">
            <CardContent>
              <Megaphone className="mx-auto h-8 w-8 text-[#c8a24b]" />
              <p className="mt-4 font-serif text-lg text-[#2a221a]">No campaigns yet</p>
              <p className="mt-1 text-[13px] text-[#8a7d68]">Start with a win-back — it is the highest-ROI message in the book.</p>
              <Button className="gm-btn-gold mt-5 rounded-full px-6" onClick={() => openComposer('win_back')}>Draft a win-back</Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {campaigns.map(c => {
              const TypeIcon = TYPE_META[c.type]?.icon || Megaphone
              const expanded = expandedId === c.id
              return (
                <Card key={c.id} className="gm-card rounded-2xl overflow-hidden transition-shadow hover:shadow-[0_14px_36px_-18px_rgba(42,34,26,0.22)]">
                  <div className="flex flex-wrap items-center gap-4 px-5 py-4 sm:px-6">
                    <span className="gm-chip h-11 w-11 shrink-0"><TypeIcon className="h-5 w-5" /></span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                        <p className="text-[14.5px] font-semibold text-[#2a221a]">{c.name}</p>
                        <span className={cn('gm-badge', STATUS_STYLE[c.status])}>
                          <span className="gm-badge-dot" />{c.status}
                        </span>
                      </div>
                      <p className="mt-0.5 text-[12px] text-[#8a7d68]">
                        {segmentLabel(c.segment)} · {c.audienceCount} guests
                        {c.status === 'sent' && c.sentAt && ` · sent ${formatDistanceToNow(new Date(c.sentAt))} ago`}
                        {c.status === 'scheduled' && c.scheduledFor && ` · fires ${format(new Date(c.scheduledFor), 'd MMM, h:mm a')}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {c.status === 'draft' && (
                        <>
                          <Button size="sm" className="gm-btn-gold h-8 rounded-full px-4 gap-1.5" disabled={busyId === c.id} onClick={() => act(c.id, 'send')}>
                            <Send className="h-3.5 w-3.5" /> Send now
                          </Button>
                          <Button size="sm" variant="outline" className="h-8 rounded-full border-[#ddd2ba] text-[#6b5d4a] hover:bg-[#f3ecdb]" disabled={busyId === c.id} onClick={() => act(c.id, 'schedule')}>
                            <CalendarClock className="h-3.5 w-3.5" />
                          </Button>
                        </>
                      )}
                      {c.status === 'scheduled' && (
                        <Button size="sm" variant="outline" className="h-8 rounded-full border-[#ddd2ba] text-[#a04c38] hover:bg-[#b4543f0f] hover:text-[#8f3f2c]" disabled={busyId === c.id} onClick={() => act(c.id, 'cancel')}>
                          <XCircle className="mr-1 h-3.5 w-3.5" /> Cancel
                        </Button>
                      )}
                      {c.status === 'sent' && (
                        <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-[#5c6b48]">
                          <CheckCircle2 className="h-4 w-4" /> {c.sentCount} reached
                        </span>
                      )}
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-[#a3947a] hover:bg-[#f3ecdb] hover:text-[#2a221a]" onClick={() => setExpandedId(expanded ? null : c.id)} aria-label="Toggle message">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  {expanded && (
                    <div className="border-t border-[#f0e6c8] bg-[#fbf7ec] px-6 py-5">
                      <p className="mb-2 text-[10.5px] font-bold uppercase tracking-[0.2em] text-[#96742c]">Message preview · WhatsApp</p>
                      <div className="gm-bubble max-w-lg px-4 py-3">
                        <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-[#3d3223]">{c.message}</p>
                        <p className="mt-1.5 text-right text-[10px] text-[#a3947a]">{format(new Date(c.createdAt), 'd MMM · HH:mm')} ✓✓</p>
                      </div>
                    </div>
                  )}
                </Card>
              )
            })}
          </div>
        )}
      </section>

      {/* ————— composer dialog ————— */}
      <Dialog open={composerOpen} onOpenChange={setComposerOpen}>
        <DialogContent className="max-w-2xl rounded-2xl border-[#e8dfc9] bg-[#fffdf8] p-0 overflow-hidden">
          <div className="bg-gradient-to-r from-[#f7f0dd] to-[#f0e6c8] px-6 py-5 border-b border-[#e8dfc9]">
            <DialogHeader className="space-y-1">
              <DialogTitle className="font-serif text-xl text-[#2a221a]">Draft a campaign</DialogTitle>
              <DialogDescription className="text-[12.5px] text-[#8a7d68]">
                Pre-written by ritual — yours to edit. Use {'{name}'} to greet each guest personally.
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="grid gap-5 px-6 py-5 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="c-name" className="text-[12px] font-semibold text-[#6b5d4a]">Campaign name</Label>
              <Input id="c-name" value={cName} onChange={e => setCName(e.target.value)} placeholder="e.g. Thursday quiet-hours 20% off"
                className="h-10 rounded-xl border-[#ddd2ba] bg-[#fffdf8] text-[13.5px] focus-visible:ring-[#b3903f]" />
            </div>

            <div className="space-y-2">
              <Label className="text-[12px] font-semibold text-[#6b5d4a]">Idea</Label>
              <Select value={cType} onValueChange={v => { setCType(v); setCMessage(TYPE_META[v]?.template || '') }}>
                <SelectTrigger className="h-10 rounded-xl border-[#ddd2ba] text-[13.5px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(TYPE_META).map(([k, m]) => (
                    <SelectItem key={k} value={k} className="text-[13px]">{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-[12px] font-semibold text-[#6b5d4a]">Audience</Label>
              <Select value={cSegment} onValueChange={setCSegment}>
                <SelectTrigger className="h-10 rounded-xl border-[#ddd2ba] text-[13.5px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {segments.map(s => (
                    <SelectItem key={s.id} value={s.id} className="text-[13px]">{s.label} — {s.count}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 sm:col-span-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="c-msg" className="text-[12px] font-semibold text-[#6b5d4a]">Message</Label>
                <span className="text-[11px] text-[#a3947a]">{cMessage.length} chars · {Math.ceil(cMessage.length / 60)} SMS-ish</span>
              </div>
              <Textarea id="c-msg" value={cMessage} onChange={e => setCMessage(e.target.value)} rows={5}
                className="rounded-xl border-[#ddd2ba] bg-[#fffdf8] text-[13.5px] leading-relaxed focus-visible:ring-[#b3903f]" />
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="c-sched" className="text-[12px] font-semibold text-[#6b5d4a]">Schedule (optional)</Label>
              <Input id="c-sched" type="datetime-local" value={cSchedule} onChange={e => setCSchedule(e.target.value)}
                className="h-10 w-full rounded-xl border-[#ddd2ba] bg-[#fffdf8] text-[13.5px] sm:w-64 focus-visible:ring-[#b3903f]" />
            </div>

            {/* live preview */}
            <div className="sm:col-span-2">
              <p className="mb-2 text-[10.5px] font-bold uppercase tracking-[0.2em] text-[#96742c]">Preview</p>
              <div className="gm-bubble max-w-md px-4 py-3">
                <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-[#3d3223]">
                  {cMessage.replaceAll('{name}', 'Noora')}
                </p>
                <p className="mt-1.5 flex items-center justify-end gap-1 text-[10px] text-[#a3947a]">
                  <MessageCircle className="h-3 w-3" /> WhatsApp · {segmentCount(cSegment)} guests
                </p>
              </div>
            </div>
          </div>

          <DialogFooter className="border-t border-[#f0e6c8] bg-[#fbf7ec] px-6 py-4">
            <div className="flex w-full items-center justify-between gap-3">
              <p className="text-[11.5px] text-[#a3947a]">
                {cSchedule ? `Will fire ${cSchedule ? format(new Date(cSchedule), 'd MMM, h:mm a') : ''}` : `Sending now reaches ${segmentCount(cSegment)} guests`}
              </p>
              <div className="flex gap-2.5">
                <Button variant="outline" className="h-10 rounded-full border-[#ddd2ba] text-[#6b5d4a] hover:bg-[#f3ecdb]" onClick={() => setComposerOpen(false)}>Cancel</Button>
                <Button className="gm-btn-gold h-10 rounded-full px-6 gap-2" disabled={saving} onClick={createCampaign}>
                  <BellRing className="h-4 w-4" /> {saving ? 'Saving…' : cSchedule ? 'Schedule campaign' : 'Save & review'}
                </Button>
              </div>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )

  function openComposerWithSegment(segmentId: string) {
    openComposer(segmentId === 'at_risk' ? 'win_back' : segmentId === 'new_guests' ? 'review' : 'offer')
    setTimeout(() => setCSegment(segmentId), 60)
  }
}
