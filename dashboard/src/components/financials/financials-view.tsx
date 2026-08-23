'use client'

import { useAppStore } from '@/lib/store'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
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
  DollarSign,
  TrendingUp,
  TrendingDown,
  Percent,
  Plus,
  Trash2,
  Receipt,
} from 'lucide-react'
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import { formatCurrency } from '@/lib/config'
import { cn } from '@/lib/utils'
import { useEffect, useState, useCallback } from 'react'
import { useToast } from '@/hooks/use-toast'
import { format } from 'date-fns'

interface FinancialsData {
  totalRevenue: number
  totalExpenses: number
  profit: number
  profitMargin: number
  monthlyData: { month: string; revenue: number; expenses: number; profit: number }[]
  expenseByCategory: { category: string; amount: number }[]
  revenueByLocation: { location: string; amount: number }[]
  paymentBreakdown: { method: string; amount: number }[]
  trends: {
    revenue: number
    expenses: number
  }
}

interface Expense {
  id: string
  locationId: string
  category: string
  description: string
  amount: number
  date: string
  locationName: string
}

interface ExpensesData {
  expenses: Expense[]
  total: number
  page: number
  totalPages: number
}

const CHART_COLORS = ['#e11d48', '#0d9488', '#d97706', '#7c3aed', '#0891b2', '#65a30d']
const PIE_COLORS = ['#e11d48', '#0d9488', '#d97706', '#7c3aed', '#0891b2', '#65a30d', '#f59e0b', '#6366f1']

const EXPENSE_CATEGORIES = ['Rent', 'Utilities', 'Salaries', 'Supplies', 'Marketing', 'Insurance', 'Maintenance', 'Equipment', 'Other']

export function FinancialsView() {
  const { selectedLocation } = useAppStore()
  const [data, setData] = useState<FinancialsData | null>(null)
  const [loadedLocation, setLoadedLocation] = useState<string | null>(null)
  const { toast } = useToast()

  // Expense state
  const [expensesData, setExpensesData] = useState<ExpensesData | null>(null)
  const [expensesLoaded, setExpensesLoaded] = useState(false)
  const [expenseDialogOpen, setExpenseDialogOpen] = useState(false)
  const [expenseSubmitting, setExpenseSubmitting] = useState(false)
  const [expenseForm, setExpenseForm] = useState({
    locationId: '',
    category: '',
    description: '',
    amount: '',
    date: '',
  })
  const [deleteExpenseId, setDeleteExpenseId] = useState<string | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [locationOptions, setLocationOptions] = useState<{ id: string; name: string }[]>([])

  const fetchFinancials = useCallback(() => {
    const params = new URLSearchParams()
    if (selectedLocation !== 'all') params.set('locationId', selectedLocation)
    fetch(`/api/financials?${params.toString()}`)
      .then(res => res.json())
      .then(d => { setData(d); setLoadedLocation(selectedLocation) })
      .catch((err) => { console.error('Failed to fetch:', err); setData(null); setLoadedLocation(selectedLocation) })
  }, [selectedLocation])

  useEffect(() => {
    fetchFinancials()
  }, [fetchFinancials])

  // Load locations
  useEffect(() => {
    fetch('/api/dashboard')
      .then(res => res.json())
      .then(d => {
        if (d.locations) setLocationOptions(d.locations.map((l: { id: string; name: string; city: string }) => ({ id: l.id, name: l.name })))
      })
      .catch((err) => { console.error('Failed to fetch:', err) })
  }, [])

  // Fetch expenses
  const fetchExpenses = useCallback(() => {
    const params = new URLSearchParams()
    params.set('limit', '20')
    if (selectedLocation !== 'all') params.set('locationId', selectedLocation)
    fetch(`/api/expenses?${params.toString()}`)
      .then(res => res.json())
      .then(d => { setExpensesData(d); setExpensesLoaded(true) })
      .catch((err) => { console.error('Failed to fetch:', err); setExpensesData(null); setExpensesLoaded(true) })
  }, [selectedLocation])

  useEffect(() => {
    fetchExpenses()
  }, [fetchExpenses])

  const loading = loadedLocation !== selectedLocation

  const handleAddExpense = async () => {
    if (!expenseForm.locationId || !expenseForm.category || !expenseForm.description || !expenseForm.amount) {
      toast({ title: 'Missing fields', description: 'Please fill in all required fields', variant: 'destructive' })
      return
    }

    setExpenseSubmitting(true)
    try {
      const res = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          locationId: expenseForm.locationId,
          category: expenseForm.category,
          description: expenseForm.description,
          amount: parseFloat(expenseForm.amount),
          date: expenseForm.date || undefined,
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to add expense')
      }

      toast({ title: 'Expense added', description: 'The expense has been recorded.' })
      setExpenseDialogOpen(false)
      setExpenseForm({ locationId: '', category: '', description: '', amount: '', date: '' })
      fetchExpenses()
      fetchFinancials()
    } catch (error) {
      toast({ title: 'Error', description: error instanceof Error ? error.message : 'Failed to add expense', variant: 'destructive' })
    } finally {
      setExpenseSubmitting(false)
    }
  }

  const handleDeleteExpense = async () => {
    if (!deleteExpenseId) return
    setDeleteLoading(true)
    try {
      const res = await fetch(`/api/expenses?id=${deleteExpenseId}`, { method: 'DELETE' })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to delete expense')
      }
      toast({ title: 'Expense deleted', description: 'The expense has been removed.' })
      setDeleteExpenseId(null)
      fetchExpenses()
      fetchFinancials()
    } catch (error) {
      toast({ title: 'Error', description: error instanceof Error ? error.message : 'Failed to delete expense', variant: 'destructive' })
    } finally {
      setDeleteLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => <Card key={i}><CardContent className="p-6"><Skeleton className="h-24 w-full" /></CardContent></Card>)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[1, 2, 3, 4].map(i => <Card key={i}><CardContent className="p-6"><Skeleton className="h-72 w-full" /></CardContent></Card>)}
        </div>
      </div>
    )
  }

  const trends = data?.trends || { revenue: 0, expenses: 0 }
  const revenueUp = trends.revenue >= 0
  const expensesUp = trends.expenses >= 0

  // After the loading guard above, data is guaranteed to be non-null
  const d = data!

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Financials</h2>
          <p className="text-sm text-muted-foreground">Revenue, expenses, and profit overview</p>
        </div>
        <Button className="gap-2" onClick={() => setExpenseDialogOpen(true)}>
          <Plus className="w-4 h-4" />
          Add Expense
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <Card className="shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Total Revenue</p>
                <p className="text-2xl font-bold">{formatCurrency(d.totalRevenue)}</p>
                <div className="flex items-center gap-1.5">
                  {revenueUp ? (
                    <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
                  ) : (
                    <TrendingDown className="w-3.5 h-3.5 text-red-500" />
                  )}
                  <span className={cn('text-xs font-medium', revenueUp ? 'text-emerald-600' : 'text-red-600')}>
                    {revenueUp ? '+' : ''}{trends.revenue.toFixed(1)}%
                  </span>
                </div>
              </div>
              <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center">
                <DollarSign className="w-5 h-5" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Total Expenses</p>
                <p className="text-2xl font-bold">{formatCurrency(d.totalExpenses)}</p>
                <div className="flex items-center gap-1.5">
                  {expensesUp ? (
                    <TrendingUp className="w-3.5 h-3.5 text-red-500" />
                  ) : (
                    <TrendingDown className="w-3.5 h-3.5 text-emerald-500" />
                  )}
                  <span className={cn('text-xs font-medium', expensesUp ? 'text-red-600' : 'text-emerald-600')}>
                    {expensesUp ? '+' : ''}{trends.expenses.toFixed(1)}%
                  </span>
                </div>
              </div>
              <div className="w-10 h-10 rounded-lg bg-red-100 text-red-600 flex items-center justify-center">
                <DollarSign className="w-5 h-5" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Net Profit</p>
                <p className="text-2xl font-bold">{formatCurrency(d.profit)}</p>
                <div className="flex items-center gap-1.5">
                  <Percent className="w-3.5 h-3.5 text-primary" />
                  <span className="text-xs font-medium text-primary">{d.profitMargin}% margin</span>
                </div>
              </div>
              <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                <TrendingUp className="w-5 h-5" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue vs Expenses */}
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Revenue vs Expenses</CardTitle>
            <CardDescription>Monthly trend comparison</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={d.monthlyData}>
                  <defs>
                    <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#e11d48" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#e11d48" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="expensesGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0d9488" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#0d9488" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} className="text-muted-foreground" />
                  <YAxis tick={{ fontSize: 12 }} className="text-muted-foreground" tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(value: number, name: string) => [formatCurrency(value), name.charAt(0).toUpperCase() + name.slice(1)]} />
                  <Legend />
                  <Area type="monotone" dataKey="revenue" stroke="#e11d48" fill="url(#revenueGrad)" strokeWidth={2} />
                  <Area type="monotone" dataKey="expenses" stroke="#0d9488" fill="url(#expensesGrad)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Expense Breakdown */}
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Expense Breakdown</CardTitle>
            <CardDescription>By category</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={d.expenseByCategory}
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    dataKey="amount"
                    nameKey="category"
                    label={({ category, percent }) => `${category} ${(percent * 100).toFixed(0)}%`}
                  >
                    {d.expenseByCategory.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Revenue by Location */}
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Revenue by Location</CardTitle>
            <CardDescription>Comparing locations</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={d.revenueByLocation}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="location" tick={{ fontSize: 11 }} className="text-muted-foreground" />
                  <YAxis tick={{ fontSize: 12 }} className="text-muted-foreground" tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(value: number) => [formatCurrency(value), 'Revenue']} />
                  <Bar dataKey="amount" fill="#e11d48" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Payment Method Breakdown */}
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Payment Methods</CardTitle>
            <CardDescription>Revenue by payment type</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={d.paymentBreakdown}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    dataKey="amount"
                    nameKey="method"
                    label={({ method, percent }) => `${method} ${(percent * 100).toFixed(0)}%`}
                  >
                    {d.paymentBreakdown.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Monthly P&L Table */}
      <Card className="shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Monthly Profit & Loss</CardTitle>
          <CardDescription>Detailed monthly breakdown</CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Month</th>
                  <th className="text-right py-3 px-4 font-medium text-muted-foreground">Revenue</th>
                  <th className="text-right py-3 px-4 font-medium text-muted-foreground">Expenses</th>
                  <th className="text-right py-3 px-4 font-medium text-muted-foreground">Profit</th>
                  <th className="text-right py-3 px-4 font-medium text-muted-foreground">Margin</th>
                </tr>
              </thead>
              <tbody>
                {d.monthlyData.map((row) => {
                  const margin = row.revenue > 0 ? ((row.profit / row.revenue) * 100).toFixed(1) : '0.0'
                  return (
                    <tr key={row.month} className="border-b border-border last:border-0 hover:bg-muted/30">
                      <td className="py-3 px-4 font-medium">{row.month}</td>
                      <td className="py-3 px-4 text-right text-emerald-600 font-medium">{formatCurrency(row.revenue)}</td>
                      <td className="py-3 px-4 text-right text-red-600 font-medium">{formatCurrency(row.expenses)}</td>
                      <td className={`py-3 px-4 text-right font-bold ${row.profit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                        {formatCurrency(row.profit)}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className={`text-xs font-medium px-2 py-1 rounded ${parseFloat(margin) >= 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                          {margin}%
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Recent Expenses */}
      <Card className="shadow-sm">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Recent Expenses</CardTitle>
              <CardDescription>Latest expense records</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {!expensesLoaded || !expensesData ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : expensesData.expenses.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Receipt className="w-10 h-10 text-muted-foreground/40 mb-3" />
              <p className="text-muted-foreground text-sm">No expenses recorded yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Date</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Location</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Category</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Description</th>
                    <th className="text-right py-3 px-4 font-medium text-muted-foreground">Amount</th>
                    <th className="text-right py-3 px-4 font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {expensesData.expenses.map((expense) => (
                    <tr key={expense.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="py-3 px-4 whitespace-nowrap text-muted-foreground">
                        {format(new Date(expense.date), 'MMM d, yyyy')}
                      </td>
                      <td className="py-3 px-4">{expense.locationName}</td>
                      <td className="py-3 px-4">
                        <Badge variant="secondary" className="text-xs">
                          {expense.category}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-muted-foreground">{expense.description}</td>
                      <td className="py-3 px-4 text-right font-medium text-red-600">{formatCurrency(expense.amount)}</td>
                      <td className="py-3 px-4 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                          onClick={() => setDeleteExpenseId(expense.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Expense Dialog */}
      <Dialog open={expenseDialogOpen} onOpenChange={setExpenseDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Add Expense</DialogTitle>
            <DialogDescription>Record a new expense for the business.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Location *</Label>
              <Select value={expenseForm.locationId} onValueChange={(value) => setExpenseForm({ ...expenseForm, locationId: value })}>
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
            <div className="grid gap-2">
              <Label>Category *</Label>
              <Select value={expenseForm.category} onValueChange={(value) => setExpenseForm({ ...expenseForm, category: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {EXPENSE_CATEGORIES.map(cat => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Description *</Label>
              <Input
                placeholder="Expense description"
                value={expenseForm.description}
                onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Amount *</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={expenseForm.amount}
                  onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label>Date</Label>
                <Input
                  type="date"
                  value={expenseForm.date}
                  onChange={(e) => setExpenseForm({ ...expenseForm, date: e.target.value })}
                />
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setExpenseDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleAddExpense} disabled={expenseSubmitting}>
              {expenseSubmitting ? 'Adding...' : 'Add Expense'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Expense Confirmation Dialog */}
      <AlertDialog open={!!deleteExpenseId} onOpenChange={(open) => { if (!open) setDeleteExpenseId(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Expense</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this expense? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteExpense}
              disabled={deleteLoading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteLoading ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
