'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { getBusinessConfig } from '@/lib/config'
import {
  MapPin,
  Users,
  Settings as SettingsIcon,
  Plus,
  Phone,
  Mail,
  Clock,
  UserCheck,
  Scissors,
  AlertTriangle,
  Shield,
  Pencil,
  UserX,
  UserCheck2,
  Lock,
} from 'lucide-react'
import { useEffect, useState, useCallback } from 'react'
import { useToast } from '@/hooks/use-toast'
import { useSession } from 'next-auth/react'
import { usePermissions } from '@/hooks/use-permissions'
import { ROLE_LABELS, ROLE_COLORS, getAssignableRoles } from '@/lib/roles'
import type { RoleType } from '@/lib/roles'

interface LocationData {
  id: string
  name: string
  address: string
  city: string
  phone: string
  email: string
  openTime: string
  closeTime: string
  staffCount: number
  stylistCount: number
}

interface UserData {
  id: string
  name: string
  email: string
  role: string
  phone: string | null
  locationName: string | null
  isActive: boolean
}

interface SettingsData {
  locations: LocationData[]
  users: UserData[]
}

// Role colors and labels are imported from @/lib/roles (single source of truth)
const roleColors = ROLE_COLORS
const roleLabels = ROLE_LABELS

export function SettingsView() {
  const { data: session } = useSession()
  const { can, canAssignRole, assignableRoles, isSuperAdmin, isOwnerOrAbove } = usePermissions()
  const [data, setData] = useState<SettingsData | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [addLocationOpen, setAddLocationOpen] = useState(false)
  const [editLocationOpen, setEditLocationOpen] = useState(false)
  const [editingLocation, setEditingLocation] = useState<LocationData | null>(null)
  const [inviteUserOpen, setInviteUserOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const { toast } = useToast()

  // Location form (add)
  const [locName, setLocName] = useState('')
  const [locAddress, setLocAddress] = useState('')
  const [locCity, setLocCity] = useState('')
  const [locPhone, setLocPhone] = useState('')
  const [locEmail, setLocEmail] = useState('')
  const [locOpenTime, setLocOpenTime] = useState('09:00')
  const [locCloseTime, setLocCloseTime] = useState('21:00')

  // Location form (edit)
  const [editLocName, setEditLocName] = useState('')
  const [editLocAddress, setEditLocAddress] = useState('')
  const [editLocCity, setEditLocCity] = useState('')
  const [editLocPhone, setEditLocPhone] = useState('')
  const [editLocEmail, setEditLocEmail] = useState('')
  const [editLocOpenTime, setEditLocOpenTime] = useState('09:00')
  const [editLocCloseTime, setEditLocCloseTime] = useState('21:00')

  // User form
  const [userName, setUserName] = useState('')
  const [userEmail, setUserEmail] = useState('')
  const [userRole, setUserRole] = useState('staff')
  const [userLocationId, setUserLocationId] = useState('')

  // Change password form
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [changingPassword, setChangingPassword] = useState(false)

  const businessConfig = getBusinessConfig()

  const fetchData = useCallback(() => {
    fetch('/api/settings')
      .then(res => res.json())
      .then(d => { setData(d); setLoaded(true) })
      .catch((err) => { console.error('Failed to fetch:', err); setData(null); setLoaded(true) })
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const resetLocationForm = () => {
    setLocName('')
    setLocAddress('')
    setLocCity('')
    setLocPhone('')
    setLocEmail('')
    setLocOpenTime('09:00')
    setLocCloseTime('21:00')
  }

  const resetEditLocationForm = () => {
    setEditLocName('')
    setEditLocAddress('')
    setEditLocCity('')
    setEditLocPhone('')
    setEditLocEmail('')
    setEditLocOpenTime('09:00')
    setEditLocCloseTime('21:00')
    setEditingLocation(null)
  }

  const resetUserForm = () => {
    setUserName('')
    setUserEmail('')
    setUserRole('staff')
    setUserLocationId('')
  }

  const resetPasswordForm = () => {
    setCurrentPassword('')
    setNewPassword('')
    setConfirmPassword('')
  }

  const handleAddLocation = async () => {
    if (!locName || !locAddress || !locCity) {
      toast({ title: 'Missing fields', description: 'Name, address, and city are required', variant: 'destructive' })
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'location',
          name: locName,
          address: locAddress,
          city: locCity,
          phone: locPhone,
          email: locEmail,
          openTime: locOpenTime,
          closeTime: locCloseTime,
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to add location')
      }

      toast({ title: 'Location added', description: `${locName} has been added.` })
      setAddLocationOpen(false)
      resetLocationForm()
      fetchData()
    } catch (error) {
      toast({ title: 'Error', description: error instanceof Error ? error.message : 'Failed to add location', variant: 'destructive' })
    } finally {
      setSubmitting(false)
    }
  }

  const handleEditLocation = async () => {
    if (!editingLocation) return
    if (!editLocName || !editLocAddress || !editLocCity) {
      toast({ title: 'Missing fields', description: 'Name, address, and city are required', variant: 'destructive' })
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'location',
          id: editingLocation.id,
          name: editLocName,
          address: editLocAddress,
          city: editLocCity,
          phone: editLocPhone,
          email: editLocEmail,
          openTime: editLocOpenTime,
          closeTime: editLocCloseTime,
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to update location')
      }

      toast({ title: 'Location updated', description: `${editLocName} has been updated.` })
      setEditLocationOpen(false)
      resetEditLocationForm()
      fetchData()
    } catch (error) {
      toast({ title: 'Error', description: error instanceof Error ? error.message : 'Failed to update location', variant: 'destructive' })
    } finally {
      setSubmitting(false)
    }
  }

  const openEditLocation = (location: LocationData) => {
    setEditingLocation(location)
    setEditLocName(location.name)
    setEditLocAddress(location.address)
    setEditLocCity(location.city)
    setEditLocPhone(location.phone)
    setEditLocEmail(location.email)
    setEditLocOpenTime(location.openTime)
    setEditLocCloseTime(location.closeTime)
    setEditLocationOpen(true)
  }

  // Fixed: Only POST, no duplicate PUT request
  const handleInviteUser = async () => {
    if (!userName || !userEmail) {
      toast({ title: 'Missing fields', description: 'Name and email are required', variant: 'destructive' })
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'user',
          name: userName,
          email: userEmail,
          role: userRole,
          // Password will be auto-generated by the server
          locationId: userLocationId && userLocationId !== 'all' ? userLocationId : null,
          isActive: true,
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to invite user')
      }

      toast({ title: 'User invited', description: `Invitation sent to ${userEmail}.` })
      setInviteUserOpen(false)
      resetUserForm()
      fetchData()
    } catch (error) {
      toast({ title: 'Error', description: error instanceof Error ? error.message : 'Failed to invite user', variant: 'destructive' })
    } finally {
      setSubmitting(false)
    }
  }

  const handleToggleUserStatus = async (user: UserData) => {
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'user',
          id: user.id,
          isActive: !user.isActive,
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to update user status')
      }

      toast({
        title: user.isActive ? 'User deactivated' : 'User activated',
        description: `${user.name} has been ${user.isActive ? 'deactivated' : 'activated'}.`,
      })
      fetchData()
    } catch (error) {
      toast({ title: 'Error', description: error instanceof Error ? error.message : 'Failed to update user status', variant: 'destructive' })
    }
  }

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast({ title: 'Missing fields', description: 'Please fill in all password fields', variant: 'destructive' })
      return
    }

    if (newPassword !== confirmPassword) {
      toast({ title: 'Passwords do not match', description: 'New password and confirm password must be the same', variant: 'destructive' })
      return
    }

    if (newPassword.length < 6) {
      toast({ title: 'Password too short', description: 'Password must be at least 6 characters', variant: 'destructive' })
      return
    }

    if (!session?.user?.id) {
      toast({ title: 'Error', description: 'Unable to identify current user', variant: 'destructive' })
      return
    }

    setChangingPassword(true)
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        if (res.status === 429) {
          throw new Error('Too many attempts. Please wait a moment before trying again.')
        }
        throw new Error(err.error || 'Failed to change password')
      }

      toast({ title: 'Password changed', description: 'Your password has been updated successfully.' })
      resetPasswordForm()
    } catch (error) {
      toast({ title: 'Error', description: error instanceof Error ? error.message : 'Failed to change password', variant: 'destructive' })
    } finally {
      setChangingPassword(false)
    }
  }

  if (!loaded || !data) {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold">Settings</h2>
        <div className="space-y-4">
          {[1, 2, 3].map(i => <Card key={i}><CardContent className="p-6"><Skeleton className="h-32 w-full" /></CardContent></Card>)}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Settings</h2>
        <p className="text-sm text-muted-foreground">Manage your salon chain settings</p>
      </div>

      <Tabs defaultValue="locations" className="space-y-6">
        <TabsList>
          <TabsTrigger value="locations" className="gap-2">
            <MapPin className="w-4 h-4" />
            Locations
          </TabsTrigger>
          <TabsTrigger value="users" className="gap-2">
            <Users className="w-4 h-4" />
            Users
          </TabsTrigger>
          <TabsTrigger value="general" className="gap-2">
            <SettingsIcon className="w-4 h-4" />
            General
          </TabsTrigger>
        </TabsList>

        {/* Locations Tab */}
        <TabsContent value="locations" className="space-y-4">
          <div className="flex justify-end">
            {isSuperAdmin && (
            <Dialog open={addLocationOpen} onOpenChange={(open) => { setAddLocationOpen(open); if (!open) resetLocationForm() }}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="w-4 h-4" />
                  Add Location
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[450px]">
                <DialogHeader>
                  <DialogTitle>Add New Location</DialogTitle>
                  <DialogDescription>Create a new salon location.</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label>Location Name *</Label>
                    <Input placeholder="e.g. West Bay Salon" value={locName} onChange={(e) => setLocName(e.target.value)} />
                  </div>
                  <div className="grid gap-2">
                    <Label>Address *</Label>
                    <Input placeholder="Street address" value={locAddress} onChange={(e) => setLocAddress(e.target.value)} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label>City *</Label>
                      <Input placeholder="City" value={locCity} onChange={(e) => setLocCity(e.target.value)} />
                    </div>
                    <div className="grid gap-2">
                      <Label>Phone</Label>
                      <Input placeholder="+974 XXXX XXXX" value={locPhone} onChange={(e) => setLocPhone(e.target.value)} />
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label>Email</Label>
                    <Input type="email" placeholder="location@salonchain.com" value={locEmail} onChange={(e) => setLocEmail(e.target.value)} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label>Open Time</Label>
                      <Input type="time" value={locOpenTime} onChange={(e) => setLocOpenTime(e.target.value)} />
                    </div>
                    <div className="grid gap-2">
                      <Label>Close Time</Label>
                      <Input type="time" value={locCloseTime} onChange={(e) => setLocCloseTime(e.target.value)} />
                    </div>
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => { setAddLocationOpen(false); resetLocationForm() }}>Cancel</Button>
                  <Button onClick={handleAddLocation} disabled={submitting}>
                    {submitting ? 'Adding...' : 'Add Location'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
            )}

            {/* Edit Location Dialog */}
            <Dialog open={editLocationOpen} onOpenChange={(open) => { setEditLocationOpen(open); if (!open) resetEditLocationForm() }}>
              <DialogContent className="sm:max-w-[450px]">
                <DialogHeader>
                  <DialogTitle>Edit Location</DialogTitle>
                  <DialogDescription>Update salon location details.</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label>Location Name *</Label>
                    <Input placeholder="e.g. West Bay Salon" value={editLocName} onChange={(e) => setEditLocName(e.target.value)} />
                  </div>
                  <div className="grid gap-2">
                    <Label>Address *</Label>
                    <Input placeholder="Street address" value={editLocAddress} onChange={(e) => setEditLocAddress(e.target.value)} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label>City *</Label>
                      <Input placeholder="City" value={editLocCity} onChange={(e) => setEditLocCity(e.target.value)} />
                    </div>
                    <div className="grid gap-2">
                      <Label>Phone</Label>
                      <Input placeholder="+974 XXXX XXXX" value={editLocPhone} onChange={(e) => setEditLocPhone(e.target.value)} />
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label>Email</Label>
                    <Input type="email" placeholder="location@salonchain.com" value={editLocEmail} onChange={(e) => setEditLocEmail(e.target.value)} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label>Open Time</Label>
                      <Input type="time" value={editLocOpenTime} onChange={(e) => setEditLocOpenTime(e.target.value)} />
                    </div>
                    <div className="grid gap-2">
                      <Label>Close Time</Label>
                      <Input type="time" value={editLocCloseTime} onChange={(e) => setEditLocCloseTime(e.target.value)} />
                    </div>
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => { setEditLocationOpen(false); resetEditLocationForm() }}>Cancel</Button>
                  <Button onClick={handleEditLocation} disabled={submitting}>
                    {submitting ? 'Saving...' : 'Save Changes'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {data.locations.map((location) => (
              <Card key={location.id} className="shadow-sm">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-base">{location.name}</CardTitle>
                      <CardDescription className="mt-1">{location.city}</CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs">Active</Badge>
                      {can('settings_general') && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => openEditLocation(location)}
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{location.address}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Phone className="w-3.5 h-3.5 shrink-0" />
                    {location.phone}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Mail className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{location.email}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="w-3.5 h-3.5 shrink-0" />
                    {location.openTime} - {location.closeTime}
                  </div>
                  <div className="flex gap-4 pt-2 border-t border-border">
                    <div className="flex items-center gap-1.5 text-sm">
                      <UserCheck className="w-3.5 h-3.5 text-muted-foreground" />
                      <span className="text-muted-foreground">Staff:</span>
                      <span className="font-medium">{location.staffCount}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-sm">
                      <Scissors className="w-3.5 h-3.5 text-muted-foreground" />
                      <span className="text-muted-foreground">Stylists:</span>
                      <span className="font-medium">{location.stylistCount}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Users Tab */}
        <TabsContent value="users" className="space-y-4">
          <div className="flex justify-end">
            {can('settings_users_manage') && (
            <Dialog open={inviteUserOpen} onOpenChange={(open) => { setInviteUserOpen(open); if (!open) resetUserForm() }}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="w-4 h-4" />
                  Invite User
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[400px]">
                <DialogHeader>
                  <DialogTitle>Invite User</DialogTitle>
                  <DialogDescription>Send an invitation to a new team member.</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label>Full Name *</Label>
                    <Input placeholder="Enter name" value={userName} onChange={(e) => setUserName(e.target.value)} />
                  </div>
                  <div className="grid gap-2">
                    <Label>Email *</Label>
                    <Input type="email" placeholder="user@salonchain.com" value={userEmail} onChange={(e) => setUserEmail(e.target.value)} />
                  </div>
                  <div className="grid gap-2">
                    <Label>Role</Label>
                    <Select value={userRole} onValueChange={setUserRole}>
                      <SelectTrigger><SelectValue placeholder="Select role" /></SelectTrigger>
                      <SelectContent>
                        {assignableRoles.map((role) => (
                          <SelectItem key={role} value={role}>
                            {ROLE_LABELS[role]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label>Location</Label>
                    <Select value={userLocationId} onValueChange={setUserLocationId}>
                      <SelectTrigger><SelectValue placeholder="All Locations" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Locations</SelectItem>
                        {data.locations.map(loc => (
                          <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => { setInviteUserOpen(false); resetUserForm() }}>Cancel</Button>
                  <Button onClick={handleInviteUser} disabled={submitting}>
                    {submitting ? 'Sending...' : 'Send Invite'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
            )}
          </div>

          <Card className="shadow-sm">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">Name</th>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">Email</th>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">Role</th>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">Location</th>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">Status</th>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.users.map((user) => (
                      <tr key={user.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                        <td className="py-3 px-4 font-medium">{user.name}</td>
                        <td className="py-3 px-4 text-muted-foreground">{user.email}</td>
                        <td className="py-3 px-4">
                          <Badge variant="secondary" className={roleColors[user.role as RoleType] || ''}>
                            {roleLabels[user.role as RoleType] || user.role}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-muted-foreground">{user.locationName || 'All Locations'}</td>
                        <td className="py-3 px-4">
                          <Badge className={user.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-700'}>
                            {user.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </td>
                        <td className="py-3 px-4">
                          {can('settings_users_manage') ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="gap-1.5 h-8 text-xs"
                            onClick={() => handleToggleUserStatus(user)}
                          >
                            {user.isActive ? (
                              <>
                                <UserX className="w-3.5 h-3.5" />
                                Deactivate
                              </>
                            ) : (
                              <>
                                <UserCheck2 className="w-3.5 h-3.5" />
                                Activate
                              </>
                            )}
                          </Button>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* General Tab */}
        <TabsContent value="general" className="space-y-6">
          {/* Chain Information — READ ONLY */}
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Chain Information</CardTitle>
              <CardDescription>Your salon chain details (read-only)</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">Chain Name</p>
                  <p className="text-sm font-medium">{businessConfig.name}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">Contact Email</p>
                  <p className="text-sm font-medium">{businessConfig.contactEmail}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">Contact Phone</p>
                  <p className="text-sm font-medium">{businessConfig.contactPhone}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">Website</p>
                  <p className="text-sm font-medium">{businessConfig.website}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Change Password */}
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Lock className="w-4 h-4" />
                Change Password
              </CardTitle>
              <CardDescription>Update your account password</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="current-password">Current Password</Label>
                <Input
                  id="current-password"
                  type="password"
                  placeholder="Enter current password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="new-password">New Password</Label>
                <Input
                  id="new-password"
                  type="password"
                  placeholder="Enter new password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="confirm-password">Confirm New Password</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  placeholder="Confirm new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
              <div className="flex justify-end">
                <Button onClick={handleChangePassword} disabled={changingPassword}>
                  {changingPassword ? 'Changing...' : 'Change Password'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Danger Zone */}
          <Card className="shadow-sm border-destructive/30">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2 text-destructive">
                <AlertTriangle className="w-4 h-4" />
                Danger Zone
              </CardTitle>
              <CardDescription>Irreversible and destructive actions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4">
                <div className="flex items-start gap-3">
                  <Shield className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Chain data is protected</p>
                    <p className="text-xs text-muted-foreground">
                      Deleting locations, users, or chain data is irreversible. These actions require
                      super admin privileges and should be performed with caution. Contact your system
                      administrator if you need to make destructive changes.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
