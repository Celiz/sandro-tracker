"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  TrendingDown,
  TrendingUp,
  Plus,
  Filter,
  BarChart3,
  Calendar,
  Target,
  PieChart,
  Trash2,
  Home,
  Wallet,
  Car,
  Fuel,
  X,
} from "lucide-react"
import {
  format,
  parseISO,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  subDays,
  eachDayOfInterval,
  eachWeekOfInterval,
  eachMonthOfInterval,
} from "date-fns"
import { es } from "date-fns/locale"
import { supabase, type Earning, type Expense } from "@/lib/supabase"
import { toast } from "sonner"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  Area,
  AreaChart,
} from "recharts"
import { useIsMobile } from "@/hooks/use-mobile"

const platforms = ["Uber", "Cabify", "Didi"]
const CONDUCTOR_NAME = "Sandro"
const expenseCategories = ["Nafta", "Lavar el auto", "Repuesto", "Other"]

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8", "#82CA9D"]

// Iconos para las plataformas
const platformIcons: Record<string, string> = {
  Uber: "🚗",
  Cabify: "🚕",
  Didi: "🚙",
}

// Iconos para categorías de gastos
const categoryIcons: Record<string, React.ReactNode> = {
  Nafta: <Fuel className="h-5 w-5" />,
  "Lavar el auto": <Car className="h-5 w-5" />,
  Repuesto: <Target className="h-5 w-5" />,
  Other: <Wallet className="h-5 w-5" />,
}

export default function RideShareTracker() {
  const isMobile = useIsMobile()
  const [earnings, setEarnings] = useState<Earning[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<"dashboard" | "viajes" | "gastos" | "estadisticas">("dashboard")
  const [selectedDate, setSelectedDate] = useState("all")
  const [selectedPlatform, setSelectedPlatform] = useState("all")
  const [selectedExpenseCategory, setSelectedExpenseCategory] = useState<string | null>(null)
  const [statsPeriod, setStatsPeriod] = useState<"day" | "week" | "month">("week")

  // Sheet states para formularios móvil
  const [earningSheetOpen, setEarningSheetOpen] = useState(false)
  const [expenseSheetOpen, setExpenseSheetOpen] = useState(false)
  const [fabMenuOpen, setFabMenuOpen] = useState(false)

  // Dialog states for confirmation
  const [deleteDialog, setDeleteDialog] = useState({
    open: false,
    type: "" as "earning" | "expense",
    item: null as any,
  })

  // Form states
  const [earningForm, setEarningForm] = useState({
    date: format(new Date(), "yyyy-MM-dd"),
    platform: "",
    conductor: CONDUCTOR_NAME,
    amount: "",
    description: "",
  })

  const [expenseForm, setExpenseForm] = useState({
    date: format(new Date(), "yyyy-MM-dd"),
    category: "",
    amount: "",
    description: "",
  })

  // Load data from Supabase
  const loadData = async () => {
    try {
      setLoading(true)

      const { data: earningsData, error: earningsError } = await supabase
        .from("earnings")
        .select("*")
        .order("created_at", { ascending: false })

      const { data: expensesData, error: expensesError } = await supabase
        .from("expenses")
        .select("*")
        .order("created_at", { ascending: false })

      if (earningsError) throw earningsError
      if (expensesError) throw expensesError

      setEarnings(earningsData || [])
      setExpenses(expensesData || [])
    } catch (error) {
      console.error("Error loading data:", error)
      toast.error("Error al cargar los datos")
    } finally {
      setLoading(false)
    }
  }

  // Check if it's a new day and reset if needed
  const checkAndResetDaily = async () => {
    const lastReset = localStorage.getItem("lastReset")
    const today = format(new Date(), "yyyy-MM-dd")

    if (lastReset !== today) {
      localStorage.setItem("lastReset", today)
      toast.success("¡Nuevo día! Listo para registrar")
    }
  }

  useEffect(() => {
    loadData()
    checkAndResetDaily()
  }, [])

  const addEarning = async () => {
    if (earningForm.platform && earningForm.amount) {
      try {
        const { data, error } = await supabase
          .from("earnings")
          .insert([
            {
              date: earningForm.date,
              platform: earningForm.platform,
              conductor: earningForm.conductor,
              amount: Number.parseFloat(earningForm.amount),
              description: earningForm.description || null,
            },
          ])
          .select()

        if (error) throw error

        setEarnings([data[0], ...earnings])
        setEarningForm({
          date: format(new Date(), "yyyy-MM-dd"),
          platform: "",
          conductor: CONDUCTOR_NAME,
          amount: "",
          description: "",
        })
        setEarningSheetOpen(false)
        toast.success("✅ Ganancia registrada")
      } catch (error) {
        console.error("Error adding earning:", error)
        toast.error("Error al registrar")
      }
    } else {
      toast.error("Completa todos los campos")
    }
  }

  const addExpense = async () => {
    if (expenseForm.category && expenseForm.amount) {
      try {
        const { data, error } = await supabase
          .from("expenses")
          .insert([
            {
              date: expenseForm.date,
              category: expenseForm.category,
              amount: Number.parseFloat(expenseForm.amount),
              description: expenseForm.description || null,
            },
          ])
          .select()

        if (error) throw error

        setExpenses([data[0], ...expenses])
        setExpenseForm({
          date: format(new Date(), "yyyy-MM-dd"),
          category: "",
          amount: "",
          description: "",
        })
        setExpenseSheetOpen(false)
        toast.success("✅ Gasto registrado")
      } catch (error) {
        console.error("Error adding expense:", error)
        toast.error("Error al registrar")
      }
    } else {
      toast.error("Completa todos los campos")
    }
  }

  const deleteExpense = async (expenseId: string, expenseAmount: number, expenseCategory: string) => {
    setDeleteDialog({
      open: true,
      type: "expense",
      item: { id: expenseId, amount: expenseAmount, category: expenseCategory },
    })
  }

  const deleteEarning = async (
    earningId: string,
    earningAmount: number,
    earningPlatform: string,
    earningConductor: string
  ) => {
    setDeleteDialog({
      open: true,
      type: "earning",
      item: { id: earningId, amount: earningAmount, platform: earningPlatform, conductor: earningConductor },
    })
  }

  const confirmDelete = async () => {
    if (!deleteDialog.item) return

    try {
      if (deleteDialog.type === "expense") {
        const { error } = await supabase.from("expenses").delete().eq("id", deleteDialog.item.id)

        if (error) throw error

        setExpenses(expenses.filter((expense) => expense.id !== deleteDialog.item.id))
        toast.success("Gasto eliminado")
      } else if (deleteDialog.type === "earning") {
        const { error } = await supabase.from("earnings").delete().eq("id", deleteDialog.item.id)

        if (error) throw error

        setEarnings(earnings.filter((earning) => earning.id !== deleteDialog.item.id))
        toast.success("Ganancia eliminada")
      }
    } catch (error) {
      console.error("Error deleting item:", error)
      toast.error("Error al eliminar")
    } finally {
      setDeleteDialog({ open: false, type: "" as any, item: null })
    }
  }

  const cancelDelete = () => {
    setDeleteDialog({ open: false, type: "" as any, item: null })
  }

  // Filter data based on selected date and platform
  const filteredEarnings = earnings.filter((earning) => {
    const dateMatch = selectedDate === "all" || earning.date === selectedDate
    const platformMatch = selectedPlatform === "all" || earning.platform === selectedPlatform
    return dateMatch && platformMatch
  })

  const filteredExpenses = expenses.filter((expense) => {
    const dateMatch = selectedDate === "all" || expense.date === selectedDate
    const categoryMatch = !selectedExpenseCategory || expense.category === selectedExpenseCategory
    return dateMatch && categoryMatch
  })

  // Calculate daily summary
  const totalEarned = filteredEarnings.reduce((sum, earning) => sum + earning.amount, 0)
  const totalSpent = filteredExpenses.reduce((sum, expense) => sum + expense.amount, 0)
  const netIncome = totalEarned - totalSpent

  // Statistics calculations based on period
  const getStatsData = () => {
    if (earnings.length === 0 && expenses.length === 0) {
      return []
    }

    const allDates = [...earnings.map((e) => e.date), ...expenses.map((e) => e.date)]
      .map((dateStr) => parseISO(dateStr))
      .sort((a, b) => a.getTime() - b.getTime())

    if (allDates.length === 0) return []

    const earliestDate = allDates[0]
    const latestDate = allDates[allDates.length - 1]
    const today = new Date()

    let startDate: Date
    let endDate: Date
    let intervals: Date[]

    switch (statsPeriod) {
      case "day":
        startDate = earliestDate
        endDate = latestDate > today ? latestDate : today
        intervals = eachDayOfInterval({ start: startDate, end: endDate })
        break
      case "week":
        startDate = startOfWeek(earliestDate, { weekStartsOn: 1 })
        endDate = endOfWeek(latestDate > today ? latestDate : today, { weekStartsOn: 1 })
        intervals = eachWeekOfInterval({ start: startDate, end: endDate }, { weekStartsOn: 1 })
        break
      case "month":
        startDate = startOfMonth(earliestDate)
        endDate = endOfMonth(latestDate > today ? latestDate : today)
        intervals = eachMonthOfInterval({ start: startDate, end: endDate })
        break
      default:
        startDate = earliestDate
        endDate = latestDate > today ? latestDate : today
        intervals = eachDayOfInterval({ start: startDate, end: endDate })
    }

    return intervals
      .map((date) => {
        let periodStart: Date
        let periodEnd: Date

        switch (statsPeriod) {
          case "day":
            periodStart = new Date(date.getFullYear(), date.getMonth(), date.getDate())
            periodEnd = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59)
            break
          case "week":
            periodStart = startOfWeek(date, { weekStartsOn: 1 })
            periodEnd = endOfWeek(date, { weekStartsOn: 1 })
            break
          case "month":
            periodStart = startOfMonth(date)
            periodEnd = endOfMonth(date)
            break
          default:
            periodStart = new Date(date.getFullYear(), date.getMonth(), date.getDate())
            periodEnd = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59)
        }

        const periodEarnings = earnings.filter((e) => {
          if (statsPeriod === "day") {
            return e.date === format(date, "yyyy-MM-dd")
          } else {
            const eDate = parseISO(e.date)
            return eDate >= periodStart && eDate <= periodEnd
          }
        })

        const periodExpenses = expenses.filter((e) => {
          if (statsPeriod === "day") {
            return e.date === format(date, "yyyy-MM-dd")
          } else {
            const eDate = parseISO(e.date)
            return eDate >= periodStart && eDate <= periodEnd
          }
        })

        const totalEarnings = periodEarnings.reduce((sum, e) => sum + e.amount, 0)
        const totalExpenses = periodExpenses.reduce((sum, e) => sum + e.amount, 0)

        let label: string
        switch (statsPeriod) {
          case "day":
            label = format(date, "dd/MM", { locale: es })
            break
          case "week":
            label = `S${format(date, "w", { locale: es })}`
            break
          case "month":
            label = format(date, "MMM", { locale: es })
            break
          default:
            label = format(date, "dd/MM", { locale: es })
        }

        return {
          period: label,
          ganancias: totalEarnings,
          gastos: totalExpenses,
          neto: totalEarnings - totalExpenses,
          hasData: totalEarnings > 0 || totalExpenses > 0,
        }
      })
      .filter((item) => item.hasData || statsPeriod === "day")
  }

  // Platform statistics
  const platformStats = platforms
    .map((platform) => {
      const platformEarnings = earnings.filter((e) => e.platform === platform)
      const total = platformEarnings.reduce((sum, e) => sum + e.amount, 0)
      const trips = platformEarnings.length
      return {
        name: platform,
        value: total,
        trips,
        average: trips > 0 ? total / trips : 0,
      }
    })
    .filter((stat) => stat.value > 0)

  // Expense category statistics
  const categoryStats = expenseCategories
    .map((category) => {
      const categoryExpenses = expenses.filter((e) => e.category === category)
      const total = categoryExpenses.reduce((sum, e) => sum + e.amount, 0)
      const totalExpensesSum = expenses.reduce((sum, e) => sum + e.amount, 0)
      return {
        name: category,
        value: total,
        percentage: totalExpensesSum > 0 ? (total / totalExpensesSum) * 100 : 0,
      }
    })
    .filter((stat) => stat.value > 0)

  const chartData = getStatsData()

  // Get available dates for the filter
  const getAvailableDates = () => {
    const allDates = [...earnings.map((e) => e.date), ...expenses.map((e) => e.date)]
    const uniqueDates = [...new Set(allDates)].sort((a, b) => parseISO(b).getTime() - parseISO(a).getTime())
    return uniqueDates
  }

  const availableDates = getAvailableDates()

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-green-600 mx-auto"></div>
          <p className="mt-6 text-xl text-gray-600">Cargando...</p>
        </div>
      </div>
    )
  }

  // ============ COMPONENTES MÓVILES ============

  // Tarjeta de resumen principal (Ganancia Neta como héroe)
  const MobileSummaryCard = () => (
    <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white shadow-xl">
      <CardContent className="p-6">
        <div className="text-center">
          <p className="text-green-100 text-lg mb-2">Ganancia Neta</p>
          <p className={`text-5xl font-bold mb-4 ${netIncome >= 0 ? "text-white" : "text-red-200"}`}>
            ${netIncome.toFixed(0)}
          </p>
          <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-green-400">
            <div>
              <p className="text-green-100 text-sm">Ganado</p>
              <p className="text-2xl font-semibold">+${totalEarned.toFixed(0)}</p>
            </div>
            <div>
              <p className="text-green-100 text-sm">Gastado</p>
              <p className="text-2xl font-semibold">-${totalSpent.toFixed(0)}</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )

  // Transacción como card móvil
  const MobileTransactionCard = ({
    type,
    item,
  }: {
    type: "earning" | "expense"
    item: Earning | Expense
  }) => {
    const isEarning = type === "earning"
    const earning = item as Earning
    const expense = item as Expense

    return (
      <div
        className={`p-4 rounded-xl ${
          isEarning ? "bg-green-50 border-2 border-green-200" : "bg-red-50 border-2 border-red-200"
        }`}
      >
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              {isEarning ? (
                <>
                  <span className="text-2xl">{platformIcons[earning.platform]}</span>
                  <Badge className="text-sm py-1 px-3">{earning.conductor.split(" ")[0]}</Badge>
                </>
              ) : (
                <>
                  <div className="p-2 bg-red-100 rounded-lg">{categoryIcons[expense.category]}</div>
                  <span className="font-medium text-lg">{expense.category}</span>
                </>
              )}
            </div>
            <p className="text-gray-600">{format(parseISO(item.date), "dd MMM yyyy", { locale: es })}</p>
            {item.description && <p className="text-gray-500 text-sm mt-1">{item.description}</p>}
          </div>
          <div className="flex items-center gap-3">
            <span className={`text-2xl font-bold ${isEarning ? "text-green-600" : "text-red-600"}`}>
              {isEarning ? "+" : "-"}${item.amount.toFixed(0)}
            </span>
            <Button
              variant="ghost"
              size="icon"
              onClick={() =>
                isEarning
                  ? deleteEarning(earning.id, earning.amount, earning.platform, earning.conductor)
                  : deleteExpense(expense.id, expense.amount, expense.category)
              }
              className="h-12 w-12 hover:bg-red-100 text-red-500"
            >
              <Trash2 className="h-6 w-6" />
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // ============ CONTENIDO DE TABS ============

  // Tab Dashboard
  const DashboardContent = () => (
    <div className="space-y-6 pb-20">
      <MobileSummaryCard />

      {/* Accesos rápidos */}
      <div className="grid grid-cols-2 gap-3">
        <Card 
          className="cursor-pointer hover:shadow-md transition-shadow border-2 border-green-200"
          onClick={() => setActiveTab("viajes")}
        >
          <CardContent className="p-4 text-center">
            <Car className="h-8 w-8 mx-auto text-green-600 mb-2" />
            <p className="font-semibold text-green-700">Ver Viajes</p>
            <p className="text-sm text-gray-500">{earnings.length} registrados</p>
          </CardContent>
        </Card>
        <Card 
          className="cursor-pointer hover:shadow-md transition-shadow border-2 border-red-200"
          onClick={() => setActiveTab("gastos")}
        >
          <CardContent className="p-4 text-center">
            <Wallet className="h-8 w-8 mx-auto text-red-600 mb-2" />
            <p className="font-semibold text-red-700">Ver Gastos</p>
            <p className="text-sm text-gray-500">{expenses.length} registrados</p>
          </CardContent>
        </Card>
      </div>

      {/* Transacciones recientes - Vista previa */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold">Últimas Transacciones</h2>
        </div>
        <div className="space-y-3">
          {[...earnings.slice(0, 3), ...expenses.slice(0, 3)]
            .sort((a, b) => parseISO(b.date).getTime() - parseISO(a.date).getTime())
            .slice(0, 4)
            .map((item) => {
              const isEarning = "platform" in item
              return (
                <MobileTransactionCard
                  key={item.id}
                  type={isEarning ? "earning" : "expense"}
                  item={item}
                />
              )
            })}
          {earnings.length === 0 && expenses.length === 0 && (
            <Card className="p-8 text-center">
              <p className="text-gray-500 text-lg">No hay transacciones</p>
              <p className="text-gray-400">Usa el botón + para agregar</p>
            </Card>
          )}
        </div>
      </div>
    </div>
  )

  // Tab Viajes (Ganancias)
  const ViajesContent = () => (
    <div className="space-y-6 pb-20">
      {/* Resumen de ganancias */}
      <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
        <CardContent className="p-6 text-center">
          <p className="text-green-100 text-lg mb-2">Total Ganado</p>
          <p className="text-4xl font-bold">${totalEarned.toFixed(0)}</p>
          <p className="text-green-100 mt-2">{filteredEarnings.length} viajes</p>
        </CardContent>
      </Card>

      {/* Filtro por plataforma */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Filtrar por Plataforma</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedPlatform("all")}
              className={`selection-chip ${selectedPlatform === "all" ? "selection-chip-active bg-gray-800" : "selection-chip-inactive"}`}
            >
              Todas
            </button>
            {platforms.map((platform) => (
              <button
                key={platform}
                onClick={() => setSelectedPlatform(platform)}
                className={`selection-chip flex items-center gap-2 ${selectedPlatform === platform ? "selection-chip-active bg-green-600 text-white" : "selection-chip-inactive"}`}
              >
                <span className="text-xl">{platformIcons[platform]}</span>
                {platform}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Filtro por fecha */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Calendar className="h-5 w-5" />
            Filtrar por Fecha
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={selectedDate} onValueChange={setSelectedDate}>
            <SelectTrigger className="mobile-input">
              <SelectValue placeholder="Seleccionar fecha" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-lg py-3">Todas las fechas</SelectItem>
              <SelectItem value={format(new Date(), "yyyy-MM-dd")} className="text-lg py-3">Hoy</SelectItem>
              <SelectItem value={format(subDays(new Date(), 1), "yyyy-MM-dd")} className="text-lg py-3">Ayer</SelectItem>
              {availableDates.slice(0, 10).map((date) => (
                <SelectItem key={date} value={date} className="text-lg py-3">
                  {format(parseISO(date), "dd MMM yyyy", { locale: es })}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Distribución por plataforma */}
      {platformStats.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <PieChart className="h-5 w-5" />
              Por Plataforma
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {platformStats.map((stat) => (
                <div key={stat.name} className="flex justify-between items-center p-3 bg-green-50 rounded-lg border border-green-200">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{platformIcons[stat.name]}</span>
                    <div>
                      <span className="font-medium text-lg">{stat.name}</span>
                      <p className="text-gray-500 text-sm">{stat.trips} viajes • Prom: ${stat.average.toFixed(0)}</p>
                    </div>
                  </div>
                  <p className="font-bold text-xl text-green-600">${stat.value.toFixed(0)}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Lista de viajes */}
      <div className="space-y-3">
        <h2 className="text-xl font-bold">Historial de Viajes</h2>
        {filteredEarnings.map((earning) => (
          <MobileTransactionCard key={earning.id} type="earning" item={earning} />
        ))}
        {filteredEarnings.length === 0 && (
          <Card className="p-8 text-center">
            <p className="text-gray-500 text-lg">No hay viajes registrados</p>
            <p className="text-gray-400">Usa el botón + para agregar</p>
          </Card>
        )}
      </div>
    </div>
  )

  // Tab Gastos
  const GastosContent = () => (
    <div className="space-y-6 pb-20">
      {/* Resumen de gastos */}
      <div className="grid grid-cols-1 gap-4">
        <Card className="bg-gradient-to-br from-red-500 to-red-600 text-white">
          <CardContent className="p-6 text-center">
            <p className="text-red-100 text-lg mb-2">Total Gastado</p>
            <p className="text-4xl font-bold">${totalSpent.toFixed(0)}</p>
            <p className="text-red-100 mt-2">{filteredExpenses.length} gastos</p>
          </CardContent>
        </Card>
      </div>

      {/* Filtro de categoría */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Filtrar por Categoría</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedExpenseCategory(null)}
              className={`selection-chip ${
                !selectedExpenseCategory ? "selection-chip-active bg-gray-800" : "selection-chip-inactive"
              }`}
            >
              Todas
            </button>
            {expenseCategories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedExpenseCategory(cat)}
                className={`selection-chip flex items-center gap-2 ${
                  selectedExpenseCategory === cat ? "selection-chip-active bg-red-600 text-white" : "selection-chip-inactive"
                }`}
              >
                {categoryIcons[cat]}
                {cat}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Gráfico de distribución */}
      {categoryStats.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <PieChart className="h-5 w-5" />
              Distribución
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPieChart>
                  <Pie
                    data={categoryStats}
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                  >
                    {categoryStats.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[(index + 4) % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => [`$${value.toFixed(0)}`, "Total"]} />
                </RechartsPieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Lista de gastos */}
      <div className="space-y-3">
        <h2 className="text-xl font-bold">Historial de Gastos</h2>
        {filteredExpenses.map((expense) => (
          <MobileTransactionCard key={expense.id} type="expense" item={expense} />
        ))}
        {filteredExpenses.length === 0 && (
          <Card className="p-8 text-center">
            <p className="text-gray-500 text-lg">No hay gastos</p>
          </Card>
        )}
      </div>
    </div>
  )

  // Tab Estadísticas
  const EstadisticasContent = () => (
    <div className="space-y-6 pb-20">
      {/* Selector de período */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Calendar className="h-5 w-5" />
            Período de Análisis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            {(["day", "week", "month"] as const).map((period) => (
              <button
                key={period}
                onClick={() => setStatsPeriod(period)}
                className={`flex-1 selection-chip ${
                  statsPeriod === period ? "selection-chip-active bg-blue-600 text-white" : "selection-chip-inactive"
                }`}
              >
                {period === "day" ? "Día" : period === "week" ? "Semana" : "Mes"}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Gráfico de ganancias vs gastos */}
      {chartData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <BarChart3 className="h-5 w-5" />
              Ganancias vs Gastos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="period" fontSize={14} />
                  <YAxis fontSize={14} />
                  <Tooltip formatter={(value: number) => [`$${value.toFixed(0)}`, ""]} />
                  <Bar dataKey="ganancias" fill="#10B981" name="Ganancias" />
                  <Bar dataKey="gastos" fill="#EF4444" name="Gastos" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Gráfico de ganancia neta */}
      {chartData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <TrendingUp className="h-5 w-5" />
              Ganancia Neta
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="period" fontSize={14} />
                  <YAxis fontSize={14} />
                  <Tooltip formatter={(value: number) => [`$${value.toFixed(0)}`, "Neto"]} />
                  <Area type="monotone" dataKey="neto" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.3} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Distribución por plataforma */}
      {platformStats.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <PieChart className="h-5 w-5" />
              Por Plataforma
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPieChart>
                  <Pie
                    data={platformStats}
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                  >
                    {platformStats.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => [`$${value.toFixed(0)}`, "Total"]} />
                </RechartsPieChart>
              </ResponsiveContainer>
            </div>
            {/* Detalles por plataforma */}
            <div className="space-y-3 mt-4">
              {platformStats.map((stat) => (
                <div key={stat.name} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{platformIcons[stat.name]}</span>
                    <span className="font-medium text-lg">{stat.name}</span>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-lg">${stat.value.toFixed(0)}</p>
                    <p className="text-gray-500 text-sm">{stat.trips} viajes</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )

  // ============ RENDER PRINCIPAL ============

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-40 px-4 py-4">
        <h1 className="text-2xl font-bold text-center">
          {activeTab === "dashboard" && "🚗 Mi Tracker"}
          {activeTab === "viajes" && "🚕 Mis Viajes"}
          {activeTab === "gastos" && "💸 Gastos"}
          {activeTab === "estadisticas" && "📊 Estadísticas"}
        </h1>
      </div>

      {/* Contenido principal */}
      <div className="max-w-2xl mx-auto p-4">
        {activeTab === "dashboard" && <DashboardContent />}
        {activeTab === "viajes" && <ViajesContent />}
        {activeTab === "gastos" && <GastosContent />}
        {activeTab === "estadisticas" && <EstadisticasContent />}
      </div>

      {/* FAB Menu */}
      {fabMenuOpen && (
        <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setFabMenuOpen(false)}>
          <div className="absolute bottom-44 right-5 space-y-3" onClick={(e) => e.stopPropagation()}>
            <Button
              onClick={() => {
                setFabMenuOpen(false)
                setEarningSheetOpen(true)
              }}
              className="w-full h-14 bg-green-600 hover:bg-green-700 text-lg rounded-full shadow-lg flex items-center gap-3 px-6"
            >
              <TrendingUp className="h-6 w-6" />
              Agregar Ganancia
            </Button>
            <Button
              onClick={() => {
                setFabMenuOpen(false)
                setExpenseSheetOpen(true)
              }}
              className="w-full h-14 bg-red-600 hover:bg-red-700 text-lg rounded-full shadow-lg flex items-center gap-3 px-6"
            >
              <TrendingDown className="h-6 w-6" />
              Agregar Gasto
            </Button>
          </div>
        </div>
      )}

      {/* Botón FAB */}
      <button
        onClick={() => setFabMenuOpen(!fabMenuOpen)}
        className={`fab-button transition-all duration-300 ${
          fabMenuOpen
            ? "bg-gray-800 rotate-45"
            : "bg-green-600 hover:bg-green-700"
        } text-white`}
      >
        {fabMenuOpen ? <X className="h-8 w-8" /> : <Plus className="h-8 w-8" />}
      </button>

      {/* Navegación inferior */}
      <nav className="bottom-nav">
        <div className="grid grid-cols-4 max-w-lg mx-auto">
          <button
            onClick={() => setActiveTab("dashboard")}
            className={`flex flex-col items-center py-3 ${
              activeTab === "dashboard" ? "text-green-600" : "text-gray-500"
            }`}
          >
            <Home className="h-6 w-6" />
            <span className="text-xs mt-1 font-medium">Inicio</span>
          </button>
          <button
            onClick={() => setActiveTab("viajes")}
            className={`flex flex-col items-center py-3 ${
              activeTab === "viajes" ? "text-green-600" : "text-gray-500"
            }`}
          >
            <Car className="h-6 w-6" />
            <span className="text-xs mt-1 font-medium">Viajes</span>
          </button>
          <button
            onClick={() => setActiveTab("gastos")}
            className={`flex flex-col items-center py-3 ${
              activeTab === "gastos" ? "text-red-600" : "text-gray-500"
            }`}
          >
            <Wallet className="h-6 w-6" />
            <span className="text-xs mt-1 font-medium">Gastos</span>
          </button>
          <button
            onClick={() => setActiveTab("estadisticas")}
            className={`flex flex-col items-center py-3 ${
              activeTab === "estadisticas" ? "text-blue-600" : "text-gray-500"
            }`}
          >
            <BarChart3 className="h-6 w-6" />
            <span className="text-xs mt-1 font-medium">Stats</span>
          </button>
        </div>
      </nav>

      {/* Sheet de agregar ganancia */}
      <Sheet open={earningSheetOpen} onOpenChange={setEarningSheetOpen}>
        <SheetContent side="bottom" className="rounded-t-3xl">
          <SheetHeader className="pb-4">
            <SheetTitle className="text-2xl">💰 Agregar Ganancia</SheetTitle>
            <SheetDescription className="text-base">Registra el viaje realizado</SheetDescription>
          </SheetHeader>
          <ScrollArea className="h-[calc(90vh-180px)] pr-4">
            <div className="space-y-6 pb-6">
              <div className="space-y-3">
                <Label className="mobile-label">Fecha</Label>
                <Input
                  type="date"
                  value={earningForm.date}
                  onChange={(e) => setEarningForm({ ...earningForm, date: e.target.value })}
                  className="mobile-input"
                />
              </div>

              <div className="space-y-3">
                <Label className="mobile-label">Plataforma *</Label>
                <div className="flex flex-wrap gap-3">
                  {platforms.map((platform) => (
                    <button
                      key={platform}
                      type="button"
                      onClick={() => setEarningForm({ ...earningForm, platform })}
                      className={`selection-chip flex items-center gap-2 ${
                        earningForm.platform === platform ? "selection-chip-active bg-green-600 text-white" : "selection-chip-inactive"
                      }`}
                    >
                      <span className="text-xl">{platformIcons[platform]}</span>
                      <span>{platform}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <Label className="mobile-label">Monto ($) *</Label>
                <Input
                  type="number"
                  inputMode="decimal"
                  placeholder="0.00"
                  value={earningForm.amount}
                  onChange={(e) => setEarningForm({ ...earningForm, amount: e.target.value })}
                  className="mobile-input text-2xl font-bold text-center"
                />
              </div>

              <div className="space-y-3">
                <Label className="mobile-label">Descripción (opcional)</Label>
                <Textarea
                  placeholder="Ej: Viaje al aeropuerto"
                  value={earningForm.description}
                  onChange={(e) => setEarningForm({ ...earningForm, description: e.target.value })}
                  className="mobile-input min-h-[80px]"
                />
              </div>
            </div>
          </ScrollArea>
          <div className="pt-4 border-t">
            <Button onClick={addEarning} className="w-full mobile-button bg-green-600 hover:bg-green-700">
              <Plus className="h-6 w-6 mr-2" />
              Guardar Ganancia
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Sheet de agregar gasto */}
      <Sheet open={expenseSheetOpen} onOpenChange={setExpenseSheetOpen}>
        <SheetContent side="bottom" className="rounded-t-3xl">
          <SheetHeader className="pb-4">
            <SheetTitle className="text-2xl">💸 Agregar Gasto</SheetTitle>
            <SheetDescription className="text-base">Registra el gasto realizado</SheetDescription>
          </SheetHeader>
          <ScrollArea className="h-[calc(85vh-180px)] pr-4">
            <div className="space-y-6 pb-6">
              <div className="space-y-3">
                <Label className="mobile-label">Fecha</Label>
                <Input
                  type="date"
                  value={expenseForm.date}
                  onChange={(e) => setExpenseForm({ ...expenseForm, date: e.target.value })}
                  className="mobile-input"
                />
              </div>

              <div className="space-y-3">
                <Label className="mobile-label">Categoría *</Label>
                <div className="grid grid-cols-2 gap-3">
                  {expenseCategories.map((category) => (
                    <button
                      key={category}
                      type="button"
                      onClick={() => setExpenseForm({ ...expenseForm, category })}
                      className={`selection-chip flex items-center justify-center gap-2 ${
                        expenseForm.category === category ? "selection-chip-active bg-red-600 text-white" : "selection-chip-inactive"
                      }`}
                    >
                      {categoryIcons[category]}
                      <span>{category}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <Label className="mobile-label">Monto ($) *</Label>
                <Input
                  type="number"
                  inputMode="decimal"
                  placeholder="0.00"
                  value={expenseForm.amount}
                  onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                  className="mobile-input text-2xl font-bold text-center"
                />
              </div>

              <div className="space-y-3">
                <Label className="mobile-label">Descripción (opcional)</Label>
                <Textarea
                  placeholder="Ej: Shell estación centro"
                  value={expenseForm.description}
                  onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })}
                  className="mobile-input min-h-[80px]"
                />
              </div>
            </div>
          </ScrollArea>
          <div className="pt-4 border-t">
            <Button onClick={addExpense} className="w-full mobile-button bg-red-600 hover:bg-red-700">
              <Plus className="h-6 w-6 mr-2" />
              Guardar Gasto
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialog.open} onOpenChange={(open) => !open && cancelDelete()}>
        <DialogContent className="max-w-[90vw] rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl text-red-600">¿Eliminar?</DialogTitle>
            <DialogDescription className="text-base">
              Esta acción no se puede deshacer
            </DialogDescription>
          </DialogHeader>

          {deleteDialog.item && (
            <div className="py-4">
              <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                {deleteDialog.type === "expense" ? (
                  <>
                    <div className="flex justify-between text-lg">
                      <span>Categoría:</span>
                      <span className="font-medium">{deleteDialog.item.category}</span>
                    </div>
                    <div className="flex justify-between text-lg">
                      <span>Monto:</span>
                      <span className="font-bold text-red-600">${deleteDialog.item.amount.toFixed(0)}</span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex justify-between text-lg">
                      <span>Plataforma:</span>
                      <span className="font-medium">
                        {platformIcons[deleteDialog.item.platform]} {deleteDialog.item.platform}
                      </span>
                    </div>
                    <div className="flex justify-between text-lg">
                      <span>Conductor:</span>
                      <span className="font-medium">{deleteDialog.item.conductor}</span>
                    </div>
                    <div className="flex justify-between text-lg">
                      <span>Monto:</span>
                      <span className="font-bold text-green-600">${deleteDialog.item.amount.toFixed(0)}</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          <DialogFooter className="flex-row gap-3">
            <Button variant="outline" onClick={cancelDelete} className="flex-1 h-14 text-lg">
              Cancelar
            </Button>
            <Button variant="destructive" onClick={confirmDelete} className="flex-1 h-14 text-lg">
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
