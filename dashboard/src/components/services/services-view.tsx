'use client'

import { useAppStore } from '@/lib/store'
import { formatCurrency } from '@/lib/config'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Package,
  Clock,
  DollarSign,
  AlertTriangle,
  Box,
  Warehouse,
  Tag,
  Filter,
  Plus,
  Pencil,
  MoreHorizontal,
  Archive,
  RefreshCw,
} from 'lucide-react'
import { useEffect, useState, useCallback } from 'react'
import { useToast } from '@/hooks/use-toast'

interface Service {
  id: string
  name: string
  category: string
  duration: number
  price: number
  description: string | null
  isActive: boolean
}

interface ServiceGroup {
  category: string
  services: Service[]
}

interface ServicesData {
  services: Service[]
  grouped: ServiceGroup[]
  stats: {
    totalServices: number
    avgPrice: number
    categories: number
  }
}

interface InventoryItem {
  id: string
  name: string
  category: string
  quantity: number
  minStock: number
  unitPrice: number
  supplier: string | null
  locationId: string
  locationName: string
  isLowStock: boolean
  lastRestocked: string | null
}

interface InventoryData {
  items: InventoryItem[]
  grouped: { category: string; items: InventoryItem[] }[]
  stats: {
    totalItems: number
    lowStockCount: number
    totalValue: number
    categories: number
  }
}

const categoryIcons: Record<string, string> = {
  Hair: 'bg-rose-100 text-rose-600',
  Nails: 'bg-purple-100 text-purple-600',
  Skin: 'bg-teal-100 text-teal-600',
  Beauty: 'bg-amber-100 text-amber-600',
}

export function ServicesView() {
  const { selectedLocation, currentPage } = useAppStore()
  const [servicesData, setServicesData] = useState<ServicesData | null>(null)
  const [inventoryData, setInventoryData] = useState<InventoryData | null>(null)
  const [servicesLoaded, setServicesLoaded] = useState(false)
  const [inventoryLoadedLocation, setInventoryLoadedLocation] = useState<string | null>(null)
  const [locationOptions, setLocationOptions] = useState<{ id: string; name: string }[]>([])
  const { toast } = useToast()

  // Service form state
  const [serviceDialogOpen, setServiceDialogOpen] = useState(false)
  const [editingService, setEditingService] = useState<Service | null>(null)
  const [serviceSubmitting, setServiceSubmitting] = useState(false)
  const [serviceForm, setServiceForm] = useState({
    name: '',
    category: '',
    duration: '',
    price: '',
    description: '',
  })
  const [deactivateId, setDeactivateId] = useState<string | null>(null)
  const [deactivateLoading, setDeactivateLoading] = useState(false)

  // Inventory form state
  const [inventoryDialogOpen, setInventoryDialogOpen] = useState(false)
  const [editingInventory, setEditingInventory] = useState<InventoryItem | null>(null)
  const [inventorySubmitting, setInventorySubmitting] = useState(false)
  const [inventoryForm, setInventoryForm] = useState({
    name: '',
    category: '',
    quantity: '',
    minStock: '',
    unitPrice: '',
    locationId: '',
    supplier: '',
  })

  // Restock dialog
  const [restockDialogOpen, setRestockDialogOpen] = useState(false)
  const [restockItem, setRestockItem] = useState<InventoryItem | null>(null)
  const [restockQuantity, setRestockQuantity] = useState('')
  const [restockSubmitting, setRestockSubmitting] = useState(false)

  // Existing categories for the service form
  const existingCategories = servicesData?.grouped.map(g => g.category) || []

  const fetchServices = useCallback(() => {
    fetch('/api/services')
      .then(res => res.json())
      .then(d => { setServicesData(d); setServicesLoaded(true) })
      .catch((err) => { console.error('Failed to fetch:', err); setServicesData(null); setServicesLoaded(true) })
  }, [])

  useEffect(() => {
    fetchServices()
  }, [fetchServices])

  // Load locations for filter
  useEffect(() => {
    fetch('/api/dashboard')
      .then(res => res.json())
      .then(d => {
        if (d.locations) setLocationOptions(d.locations.map((l: { id: string; name: string; city: string }) => ({ id: l.id, name: l.name })))
      })
      .catch((err) => { console.error('Failed to fetch:', err) })
  }, [])

  const fetchInventory = useCallback(() => {
    const params = new URLSearchParams()
    if (selectedLocation !== 'all') params.set('locationId', selectedLocation)
    fetch(`/api/inventory?${params.toString()}`)
      .then(res => res.json())
      .then(d => { setInventoryData(d); setInventoryLoadedLocation(selectedLocation) })
      .catch((err) => { console.error('Failed to fetch:', err); setInventoryData(null); setInventoryLoadedLocation(selectedLocation) })
  }, [selectedLocation])

  useEffect(() => {
    fetchInventory()
  }, [fetchInventory])

  const defaultTab = currentPage === 'inventory' ? 'inventory' : 'services'

  // Service CRUD
  const openServiceDialog = (service?: Service) => {
    if (service) {
      setEditingService(service)
      setServiceForm({
        name: service.name,
        category: service.category,
        duration: service.duration.toString(),
        price: service.price.toString(),
        description: service.description || '',
      })
    } else {
      setEditingService(null)
      setServiceForm({ name: '', category: '', duration: '', price: '', description: '' })
    }
    setServiceDialogOpen(true)
  }

  const handleServiceSubmit = async () => {
    if (!serviceForm.name || !serviceForm.category || !serviceForm.duration || !serviceForm.price) {
      toast({ title: 'Missing fields', description: 'Please fill in all required fields', variant: 'destructive' })
      return
    }

    setServiceSubmitting(true)
    try {
      const payload = {
        name: serviceForm.name,
        category: serviceForm.category,
        duration: parseInt(serviceForm.duration),
        price: parseFloat(serviceForm.price),
        description: serviceForm.description || null,
      }

      let res: Response
      if (editingService) {
        res = await fetch('/api/services', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: editingService.id, ...payload }),
        })
      } else {
        res = await fetch('/api/services', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      }

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to save service')
      }

      toast({ title: editingService ? 'Service updated' : 'Service created', description: editingService ? 'The service has been updated.' : 'The new service has been added.' })
      setServiceDialogOpen(false)
      fetchServices()
    } catch (error) {
      toast({ title: 'Error', description: error instanceof Error ? error.message : 'Failed to save service', variant: 'destructive' })
    } finally {
      setServiceSubmitting(false)
    }
  }

  const handleDeactivate = async () => {
    if (!deactivateId) return
    setDeactivateLoading(true)
    try {
      const res = await fetch('/api/services', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: deactivateId, isActive: false }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to deactivate service')
      }
      toast({ title: 'Service deactivated', description: 'The service has been deactivated.' })
      setDeactivateId(null)
      fetchServices()
    } catch (error) {
      toast({ title: 'Error', description: error instanceof Error ? error.message : 'Failed to deactivate service', variant: 'destructive' })
    } finally {
      setDeactivateLoading(false)
    }
  }

  // Inventory CRUD
  const openInventoryDialog = (item?: InventoryItem) => {
    if (item) {
      setEditingInventory(item)
      setInventoryForm({
        name: item.name,
        category: item.category,
        quantity: item.quantity.toString(),
        minStock: item.minStock.toString(),
        unitPrice: item.unitPrice.toString(),
        locationId: item.locationId,
        supplier: item.supplier || '',
      })
    } else {
      setEditingInventory(null)
      setInventoryForm({ name: '', category: '', quantity: '', minStock: '', unitPrice: '', locationId: '', supplier: '' })
    }
    setInventoryDialogOpen(true)
  }

  const handleInventorySubmit = async () => {
    if (!inventoryForm.name || !inventoryForm.category || !inventoryForm.quantity || !inventoryForm.locationId) {
      toast({ title: 'Missing fields', description: 'Please fill in all required fields', variant: 'destructive' })
      return
    }

    setInventorySubmitting(true)
    try {
      const payload = {
        name: inventoryForm.name,
        category: inventoryForm.category,
        quantity: parseInt(inventoryForm.quantity),
        minStock: parseInt(inventoryForm.minStock) || 5,
        unitPrice: parseFloat(inventoryForm.unitPrice) || 0,
        locationId: inventoryForm.locationId,
        supplier: inventoryForm.supplier || null,
      }

      let res: Response
      if (editingInventory) {
        res = await fetch('/api/inventory', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: editingInventory.id, ...payload }),
        })
      } else {
        res = await fetch('/api/inventory', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      }

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to save inventory item')
      }

      toast({ title: editingInventory ? 'Item updated' : 'Item created', description: editingInventory ? 'The inventory item has been updated.' : 'The new inventory item has been added.' })
      setInventoryDialogOpen(false)
      fetchInventory()
    } catch (error) {
      toast({ title: 'Error', description: error instanceof Error ? error.message : 'Failed to save inventory item', variant: 'destructive' })
    } finally {
      setInventorySubmitting(false)
    }
  }

  const handleRestock = async () => {
    if (!restockItem || !restockQuantity) {
      toast({ title: 'Missing quantity', description: 'Please enter a new quantity', variant: 'destructive' })
      return
    }
    setRestockSubmitting(true)
    try {
      const res = await fetch('/api/inventory', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: restockItem.id, quantity: parseInt(restockQuantity) }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to restock item')
      }
      toast({ title: 'Item restocked', description: `Quantity updated to ${restockQuantity}.` })
      setRestockDialogOpen(false)
      setRestockItem(null)
      setRestockQuantity('')
      fetchInventory()
    } catch (error) {
      toast({ title: 'Error', description: error instanceof Error ? error.message : 'Failed to restock item', variant: 'destructive' })
    } finally {
      setRestockSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Services & Inventory</h2>
        <p className="text-sm text-muted-foreground">Manage your service catalog and inventory</p>
      </div>

      <Tabs defaultValue={defaultTab} className="space-y-6">
        <TabsList>
          <TabsTrigger value="services" className="gap-2">
            <Package className="w-4 h-4" />
            Services
          </TabsTrigger>
          <TabsTrigger value="inventory" className="gap-2">
            <Warehouse className="w-4 h-4" />
            Inventory
          </TabsTrigger>
        </TabsList>

        {/* Services Tab */}
        <TabsContent value="services" className="space-y-6">
          {!servicesLoaded || !servicesData ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[1, 2, 3, 4].map(i => <Card key={i}><CardContent className="p-6"><Skeleton className="h-48 w-full" /></CardContent></Card>)}
            </div>
          ) : (
            <>
              {/* Stats */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card className="shadow-sm">
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-rose-100 text-rose-600 flex items-center justify-center">
                      <Package className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Total Services</p>
                      <p className="text-xl font-bold">{servicesData.stats.totalServices}</p>
                    </div>
                  </CardContent>
                </Card>
                <Card className="shadow-sm">
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-teal-100 text-teal-600 flex items-center justify-center">
                      <DollarSign className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Avg Price</p>
                      <p className="text-xl font-bold">{formatCurrency(servicesData.stats.avgPrice)}</p>
                    </div>
                  </CardContent>
                </Card>
                <Card className="shadow-sm">
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center">
                      <Tag className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Categories</p>
                      <p className="text-xl font-bold">{servicesData.stats.categories}</p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Add Service Button */}
              <div className="flex justify-end">
                <Button className="gap-2" onClick={() => openServiceDialog()}>
                  <Plus className="w-4 h-4" />
                  Add Service
                </Button>
              </div>

              {/* Services by Category */}
              <Accordion type="multiple" defaultValue={servicesData.grouped.map(g => g.category)} className="space-y-3">
                {servicesData.grouped.map((group) => (
                  <AccordionItem key={group.category} value={group.category} className="border rounded-lg px-0">
                    <AccordionTrigger className="px-6 hover:no-underline">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${categoryIcons[group.category] || 'bg-gray-100 text-gray-600'}`}>
                          {group.category[0]}
                        </div>
                        <div className="text-left">
                          <span className="font-semibold">{group.category}</span>
                          <span className="text-sm text-muted-foreground ml-2">({group.services.length} services)</span>
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-6 pb-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {group.services.map((service) => (
                          <Card key={service.id} className="shadow-none border bg-muted/30">
                            <CardContent className="p-4">
                              <div className="flex items-start justify-between mb-2">
                                <h4 className="font-medium text-sm">{service.name}</h4>
                                <span className="font-bold text-sm text-primary">{formatCurrency(service.price)}</span>
                              </div>
                              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {service.duration} min
                                </span>
                              </div>
                              {service.description && (
                                <p className="text-xs text-muted-foreground mt-2">{service.description}</p>
                              )}
                              <div className="flex items-center gap-2 mt-3 pt-3 border-t">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-7 text-xs gap-1"
                                  onClick={() => openServiceDialog(service)}
                                >
                                  <Pencil className="w-3 h-3" />
                                  Edit
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-7 text-xs gap-1 text-muted-foreground"
                                  onClick={() => setDeactivateId(service.id)}
                                >
                                  <Archive className="w-3 h-3" />
                                  Deactivate
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </>
          )}
        </TabsContent>

        {/* Inventory Tab */}
        <TabsContent value="inventory" className="space-y-6">
          {inventoryLoadedLocation !== selectedLocation || !inventoryData ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[1, 2, 3, 4].map(i => <Card key={i}><CardContent className="p-6"><Skeleton className="h-48 w-full" /></CardContent></Card>)}
            </div>
          ) : (
            <>
              {/* Stats */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card className="shadow-sm">
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-teal-100 text-teal-600 flex items-center justify-center">
                      <Box className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Total Items</p>
                      <p className="text-xl font-bold">{inventoryData.stats.totalItems}</p>
                    </div>
                  </CardContent>
                </Card>
                <Card className="shadow-sm">
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center">
                      <AlertTriangle className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Low Stock</p>
                      <p className="text-xl font-bold text-amber-600">{inventoryData.stats.lowStockCount}</p>
                    </div>
                  </CardContent>
                </Card>
                <Card className="shadow-sm">
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-rose-100 text-rose-600 flex items-center justify-center">
                      <DollarSign className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Total Value</p>
                      <p className="text-xl font-bold">{formatCurrency(inventoryData.stats.totalValue)}</p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Filter + Add */}
              <Card className="shadow-sm">
                <CardContent className="p-4">
                  <div className="flex flex-col sm:flex-row items-center gap-3">
                    <Filter className="w-4 h-4 text-muted-foreground hidden sm:block" />
                    <Select value={selectedLocation} onValueChange={(value) => useAppStore.getState().setSelectedLocation(value)}>
                      <SelectTrigger className="w-full sm:w-[200px]">
                        <SelectValue placeholder="All Locations" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Locations</SelectItem>
                        {locationOptions.map(loc => (
                          <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <div className="ml-auto">
                      <Button className="gap-2" onClick={() => openInventoryDialog()}>
                        <Plus className="w-4 h-4" />
                        Add Item
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Table */}
              <Card className="shadow-sm">
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border bg-muted/30">
                          <th className="text-left py-3 px-4 font-medium text-muted-foreground">Name</th>
                          <th className="text-left py-3 px-4 font-medium text-muted-foreground">Category</th>
                          <th className="text-left py-3 px-4 font-medium text-muted-foreground">Location</th>
                          <th className="text-right py-3 px-4 font-medium text-muted-foreground">Qty</th>
                          <th className="text-right py-3 px-4 font-medium text-muted-foreground">Min Stock</th>
                          <th className="text-left py-3 px-4 font-medium text-muted-foreground">Status</th>
                          <th className="text-right py-3 px-4 font-medium text-muted-foreground">Price</th>
                          <th className="text-left py-3 px-4 font-medium text-muted-foreground">Supplier</th>
                          <th className="text-right py-3 px-4 font-medium text-muted-foreground">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {inventoryData.items.map((item) => (
                          <tr
                            key={item.id}
                            className={`border-b border-border last:border-0 hover:bg-muted/30 transition-colors ${item.isLowStock ? 'bg-amber-50/50' : ''}`}
                          >
                            <td className="py-3 px-4 font-medium">{item.name}</td>
                            <td className="py-3 px-4 text-muted-foreground">{item.category}</td>
                            <td className="py-3 px-4 text-muted-foreground">{item.locationName}</td>
                            <td className={`py-3 px-4 text-right font-medium ${item.isLowStock ? 'text-amber-600' : ''}`}>
                              {item.quantity}
                            </td>
                            <td className="py-3 px-4 text-right text-muted-foreground">{item.minStock}</td>
                            <td className="py-3 px-4">
                              {item.isLowStock ? (
                                item.quantity <= item.minStock / 2 ? (
                                  <Badge className="bg-red-100 text-red-700 text-xs">Critical</Badge>
                                ) : (
                                  <Badge className="bg-amber-100 text-amber-700 text-xs">Low Stock</Badge>
                                )
                              ) : (
                                <Badge className="bg-emerald-100 text-emerald-700 text-xs">In Stock</Badge>
                              )}
                            </td>
                            <td className="py-3 px-4 text-right">{formatCurrency(item.unitPrice)}</td>
                            <td className="py-3 px-4 text-muted-foreground">{item.supplier || '--'}</td>
                            <td className="py-3 px-4 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-7 text-xs gap-1"
                                  onClick={() => {
                                    setRestockItem(item)
                                    setRestockQuantity(item.quantity.toString())
                                    setRestockDialogOpen(true)
                                  }}
                                >
                                  <RefreshCw className="w-3 h-3" />
                                  Restock
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-7 text-xs gap-1"
                                  onClick={() => openInventoryDialog(item)}
                                >
                                  <Pencil className="w-3 h-3" />
                                  Edit
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>
      </Tabs>

      {/* Service Dialog */}
      <Dialog open={serviceDialogOpen} onOpenChange={setServiceDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{editingService ? 'Edit Service' : 'Add Service'}</DialogTitle>
            <DialogDescription>
              {editingService ? 'Update service details.' : 'Add a new service to your catalog.'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Name *</Label>
              <Input
                placeholder="Service name"
                value={serviceForm.name}
                onChange={(e) => setServiceForm({ ...serviceForm, name: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label>Category *</Label>
              <Select value={serviceForm.category} onValueChange={(value) => setServiceForm({ ...serviceForm, category: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select or type category" />
                </SelectTrigger>
                <SelectContent>
                  {existingCategories.map(cat => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                placeholder="Or type a new category"
                value={serviceForm.category}
                onChange={(e) => setServiceForm({ ...serviceForm, category: e.target.value })}
                className="text-xs"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Duration (min) *</Label>
                <Input
                  type="number"
                  placeholder="60"
                  value={serviceForm.duration}
                  onChange={(e) => setServiceForm({ ...serviceForm, duration: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label>Price *</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={serviceForm.price}
                  onChange={(e) => setServiceForm({ ...serviceForm, price: e.target.value })}
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Description</Label>
              <Textarea
                placeholder="Optional description"
                value={serviceForm.description}
                onChange={(e) => setServiceForm({ ...serviceForm, description: e.target.value })}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setServiceDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleServiceSubmit} disabled={serviceSubmitting}>
              {serviceSubmitting ? 'Saving...' : editingService ? 'Update Service' : 'Add Service'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Deactivate Confirmation Dialog */}
      <AlertDialog open={!!deactivateId} onOpenChange={(open) => { if (!open) setDeactivateId(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate Service</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to deactivate this service? It will no longer appear in the active services list.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deactivateLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeactivate}
              disabled={deactivateLoading}
            >
              {deactivateLoading ? 'Deactivating...' : 'Deactivate'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Inventory Dialog */}
      <Dialog open={inventoryDialogOpen} onOpenChange={setInventoryDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{editingInventory ? 'Edit Item' : 'Add Item'}</DialogTitle>
            <DialogDescription>
              {editingInventory ? 'Update inventory item details.' : 'Add a new inventory item.'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Name *</Label>
              <Input
                placeholder="Item name"
                value={inventoryForm.name}
                onChange={(e) => setInventoryForm({ ...inventoryForm, name: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label>Category *</Label>
              <Input
                placeholder="Category"
                value={inventoryForm.category}
                onChange={(e) => setInventoryForm({ ...inventoryForm, category: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Quantity *</Label>
                <Input
                  type="number"
                  placeholder="0"
                  value={inventoryForm.quantity}
                  onChange={(e) => setInventoryForm({ ...inventoryForm, quantity: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label>Min Stock</Label>
                <Input
                  type="number"
                  placeholder="5"
                  value={inventoryForm.minStock}
                  onChange={(e) => setInventoryForm({ ...inventoryForm, minStock: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Unit Price</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={inventoryForm.unitPrice}
                  onChange={(e) => setInventoryForm({ ...inventoryForm, unitPrice: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label>Location *</Label>
                <Select value={inventoryForm.locationId} onValueChange={(value) => setInventoryForm({ ...inventoryForm, locationId: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select location" />
                  </SelectTrigger>
                  <SelectContent>
                    {locationOptions.map(loc => (
                      <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Supplier</Label>
              <Input
                placeholder="Supplier name"
                value={inventoryForm.supplier}
                onChange={(e) => setInventoryForm({ ...inventoryForm, supplier: e.target.value })}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setInventoryDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleInventorySubmit} disabled={inventorySubmitting}>
              {inventorySubmitting ? 'Saving...' : editingInventory ? 'Update Item' : 'Add Item'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Restock Dialog */}
      <Dialog open={restockDialogOpen} onOpenChange={(open) => { setRestockDialogOpen(open); if (!open) { setRestockItem(null); setRestockQuantity('') } }}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Restock Item</DialogTitle>
            <DialogDescription>
              Update quantity for {restockItem?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Current Quantity</Label>
              <p className="text-sm text-muted-foreground">{restockItem?.quantity ?? '--'}</p>
            </div>
            <div className="grid gap-2">
              <Label>New Quantity *</Label>
              <Input
                type="number"
                placeholder="Enter new quantity"
                value={restockQuantity}
                onChange={(e) => setRestockQuantity(e.target.value)}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => { setRestockDialogOpen(false); setRestockItem(null); setRestockQuantity('') }}>Cancel</Button>
            <Button onClick={handleRestock} disabled={restockSubmitting}>
              {restockSubmitting ? 'Updating...' : 'Update Quantity'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
