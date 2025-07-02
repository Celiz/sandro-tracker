"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  DollarSign,
  TrendingDown,
  TrendingUp,
  Plus,
  Filter,
  BarChart3,
  Calendar,
  Target,
  PieChart,
  User,
} from "lucide-react"
import {
  format,
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

const platforms = ["Uber", "Cabify", "Didi"]
const conductors = ["Mamá (Claudia)", "Facundo"]
const expenseCategories = ["Nafta","Lavar el auto", "Repuesto", "Other"]

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8", "#82CA9D"]

export default function RideShareTracker() {
  const [earnings, setEarnings] = useState<Earning[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState("all")
  const [selectedPlatform, setSelectedPlatform] = useState("all")
  const [selectedConductor, setSelectedConductor] = useState("all")
  const [statsPeriod, setStatsPeriod] = useState<"day" | "week" | "month">("week")
  const [statsSelectedConductor, setStatsSelectedConductor] = useState("all")

  // Form states
  const [earningForm, setEarningForm] = useState({
    date: format(new Date(), "yyyy-MM-dd"),
    platform: "",
    conductor: "",
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
      toast.success("¡Nuevo día! Listo para registrar nuevas ganancias y gastos")
    }
  }

  useEffect(() => {
    loadData()
    checkAndResetDaily()
  }, [])

  const addEarning = async () => {
    if (earningForm.platform && earningForm.conductor && earningForm.amount) {
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
          conductor: "",
          amount: "",
          description: "",
        })
        toast.success("Ganancia registrada correctamente")
      } catch (error) {
        console.error("Error adding earning:", error)
        toast.error("Error al registrar la ganancia")
      }
    } else {
      toast.error("Por favor completa todos los campos obligatorios")
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
        toast.success("Gasto registrado correctamente")
      } catch (error) {
        console.error("Error adding expense:", error)
        toast.error("Error al registrar el gasto")
      }
    } else {
      toast.error("Por favor completa todos los campos obligatorios")
    }
  }

  // Filter data based on selected date, platform, and conductor
  const filteredEarnings = earnings.filter((earning) => {
    const dateMatch = selectedDate === "all" || earning.date === selectedDate
    const platformMatch = selectedPlatform === "all" || earning.platform === selectedPlatform
    const conductorMatch = selectedConductor === "all" || earning.conductor === selectedConductor
    return dateMatch && platformMatch && conductorMatch
  })

  const filteredExpenses = expenses.filter((expense) => {
    return selectedDate === "all" || expense.date === selectedDate
  })

  // Calculate daily summary
  const totalEarned = filteredEarnings.reduce((sum, earning) => sum + earning.amount, 0)
  const totalSpent = filteredExpenses.reduce((sum, expense) => sum + expense.amount, 0)
  const netIncome = totalEarned - totalSpent

  // Statistics calculations based on period - use ALL data, not filtered
  const getStatsData = () => {
    if (earnings.length === 0 && expenses.length === 0) {
      return []
    }

    // Get all dates from earnings and expenses
    const allDates = [...earnings.map((e) => e.date), ...expenses.map((e) => e.date)]
      .map((dateStr) => new Date(dateStr))
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

        // Filter earnings for this period using string comparison for dates
        const periodEarnings = earnings.filter((e) => {
          if (statsPeriod === "day") {
            const earningDate = e.date
            const periodDate = format(date, "yyyy-MM-dd")
            return earningDate === periodDate
          } else {
            const eDate = new Date(e.date)
            return eDate >= periodStart && eDate <= periodEnd
          }
        })

        // Filter expenses for this period using string comparison for dates
        const periodExpenses = expenses.filter((e) => {
          if (statsPeriod === "day") {
            const expenseDate = e.date
            const periodDate = format(date, "yyyy-MM-dd")
            return expenseDate === periodDate
          } else {
            const eDate = new Date(e.date)
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

  // Platform statistics - use ALL earnings, not filtered
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

  // Conductor statistics - use ALL earnings, not filtered
  const conductorStats = conductors
    .map((conductor) => {
      const conductorEarnings = earnings.filter((e) => e.conductor === conductor)
      const total = conductorEarnings.reduce((sum, e) => sum + e.amount, 0)
      const trips = conductorEarnings.length
      return {
        name: conductor,
        value: total,
        trips,
        average: trips > 0 ? total / trips : 0,
      }
    })
    .filter((stat) => stat.value > 0)

  // Expense category statistics - use ALL expenses, not filtered
  const categoryStats = expenseCategories
    .map((category) => {
      const categoryExpenses = expenses.filter((e) => e.category === category)
      const total = categoryExpenses.reduce((sum, e) => sum + e.amount, 0)
      const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0)
      return {
        name: category,
        value: total,
        percentage: totalExpenses > 0 ? (total / totalExpenses) * 100 : 0,
      }
    })
    .filter((stat) => stat.value > 0)

  const chartData = getStatsData()

  // Get conductor-specific data
  const getConductorStatsData = () => {
    if (earnings.length === 0 && expenses.length === 0) {
      return []
    }

    // Filter by conductor if not "all"
    const conductorEarnings =
      statsSelectedConductor === "all" ? earnings : earnings.filter((e) => e.conductor === statsSelectedConductor)

    // Get all dates from filtered earnings and all expenses
    const allDates = [...conductorEarnings.map((e) => e.date), ...expenses.map((e) => e.date)]
      .map((dateStr) => new Date(dateStr))
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

        // Filter earnings for this period and conductor
        const periodEarnings = conductorEarnings.filter((e) => {
          if (statsPeriod === "day") {
            const earningDate = e.date
            const periodDate = format(date, "yyyy-MM-dd")
            return earningDate === periodDate
          } else {
            const eDate = new Date(e.date)
            return eDate >= periodStart && eDate <= periodEnd
          }
        })

        // Filter expenses for this period (all expenses, not by conductor)
        const periodExpenses = expenses.filter((e) => {
          if (statsPeriod === "day") {
            const expenseDate = e.date
            const periodDate = format(date, "yyyy-MM-dd")
            return expenseDate === periodDate
          } else {
            const eDate = new Date(e.date)
            return eDate >= periodStart && eDate <= periodEnd
          }
        })

        const totalEarnings = periodEarnings.reduce((sum, e) => sum + e.amount, 0)
        const totalExpenses = periodExpenses.reduce((sum, e) => sum + e.amount, 0)
        const trips = periodEarnings.length

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
          viajes: trips,
          promedioPorViaje: trips > 0 ? totalEarnings / trips : 0,
          hasData: totalEarnings > 0 || totalExpenses > 0,
        }
      })
      .filter((item) => item.hasData || statsPeriod === "day")
  }

  const conductorChartData = getConductorStatsData()

  // Get available dates for the filter
  const getAvailableDates = () => {
    const allDates = [...earnings.map((e) => e.date), ...expenses.map((e) => e.date)]
    const uniqueDates = [...new Set(allDates)].sort((a, b) => new Date(b).getTime() - new Date(a).getTime())
    return uniqueDates
  }

  const availableDates = getAvailableDates()

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando datos...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-3 sm:p-4 lg:p-6 space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Dashboard del Conductor</h1>
          <p className="text-sm sm:text-base text-gray-600">Rastrea las ganancias y gastos de Mamá y Facundo</p>
        </div>

        <Tabs defaultValue="dashboard" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4 sm:mb-6">
            <TabsTrigger value="dashboard" className="text-xs sm:text-sm">
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="statistics" className="text-xs sm:text-sm">
              Estadísticas
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-4 sm:space-y-6">
            {/* Daily Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-xs sm:text-sm font-medium">Total Ganado</CardTitle>
                  <TrendingUp className="h-4 w-4 text-green-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-xl sm:text-2xl font-bold text-green-600">${totalEarned.toFixed(2)}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-xs sm:text-sm font-medium">Total Gastado</CardTitle>
                  <TrendingDown className="h-4 w-4 text-red-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-xl sm:text-2xl font-bold text-red-600">${totalSpent.toFixed(2)}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-xs sm:text-sm font-medium">Ganancia Neta</CardTitle>
                  <DollarSign className="h-4 w-4 text-blue-600" />
                </CardHeader>
                <CardContent>
                  <div
                    className={`text-xl sm:text-2xl font-bold ${netIncome >= 0 ? "text-green-600" : "text-red-600"}`}
                  >
                    ${netIncome.toFixed(2)}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Filters */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
                  <Filter className="h-4 w-4 sm:h-5 sm:w-5" />
                  Filtros
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="date-filter" className="text-xs sm:text-sm">
                      Fecha
                    </Label>
                    <Select value={selectedDate} onValueChange={setSelectedDate}>
                      <SelectTrigger className="text-xs sm:text-sm">
                        <SelectValue placeholder="Seleccionar fecha" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todas las fechas</SelectItem>
                        <SelectItem value={format(new Date(), "yyyy-MM-dd")}>Hoy</SelectItem>
                        <SelectItem value={format(subDays(new Date(), 1), "yyyy-MM-dd")}>Ayer</SelectItem>
                        {availableDates.length > 0 && (
                          <SelectItem value="separator" disabled>
                            --- Fechas con datos ---
                          </SelectItem>
                        )}
                        {availableDates.map((date) => (
                          <SelectItem key={date} value={date}>
                            {format(new Date(date), "dd/MM/yyyy", { locale: es })}
                            {date === format(new Date(), "yyyy-MM-dd") ? " (Hoy)" : ""}
                            {date === format(subDays(new Date(), 1), "yyyy-MM-dd") ? " (Ayer)" : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="platform-filter" className="text-xs sm:text-sm">
                      Plataforma
                    </Label>
                    <Select value={selectedPlatform} onValueChange={setSelectedPlatform}>
                      <SelectTrigger className="text-xs sm:text-sm">
                        <SelectValue placeholder="Seleccionar plataforma" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todas las plataformas</SelectItem>
                        {platforms.map((platform) => (
                          <SelectItem key={platform} value={platform}>
                            {platform}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="conductor-filter" className="text-xs sm:text-sm">
                      Conductor
                    </Label>
                    <Select value={selectedConductor} onValueChange={setSelectedConductor}>
                      <SelectTrigger className="text-xs sm:text-sm">
                        <SelectValue placeholder="Seleccionar conductor" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos los conductores</SelectItem>
                        {conductors.map((conductor) => (
                          <SelectItem key={conductor} value={conductor}>
                            {conductor}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
              {/* Add Earnings */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
                    <Plus className="h-4 w-4 sm:h-5 sm:w-5" />
                    Agregar Ganancias
                  </CardTitle>
                  <CardDescription className="text-xs sm:text-sm">Registra las ganancias de los viajes</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 sm:space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="earning-date" className="text-xs sm:text-sm">
                        Fecha
                      </Label>
                      <Input
                        id="earning-date"
                        type="date"
                        value={earningForm.date}
                        onChange={(e) => setEarningForm({ ...earningForm, date: e.target.value })}
                        className="text-xs sm:text-sm"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="earning-platform" className="text-xs sm:text-sm">
                        Plataforma *
                      </Label>
                      <Select
                        value={earningForm.platform}
                        onValueChange={(value) => setEarningForm({ ...earningForm, platform: value })}
                      >
                        <SelectTrigger className="text-xs sm:text-sm">
                          <SelectValue placeholder="Seleccionar plataforma" />
                        </SelectTrigger>
                        <SelectContent>
                          {platforms.map((platform) => (
                            <SelectItem key={platform} value={platform}>
                              {platform}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="earning-conductor" className="text-xs sm:text-sm">
                        Conductor *
                      </Label>
                      <Select
                        value={earningForm.conductor}
                        onValueChange={(value) => setEarningForm({ ...earningForm, conductor: value })}
                      >
                        <SelectTrigger className="text-xs sm:text-sm">
                          <SelectValue placeholder="Seleccionar conductor" />
                        </SelectTrigger>
                        <SelectContent>
                          {conductors.map((conductor) => (
                            <SelectItem key={conductor} value={conductor}>
                              {conductor}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="earning-amount" className="text-xs sm:text-sm">
                        Cantidad Ganada ($) *
                      </Label>
                      <Input
                        id="earning-amount"
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={earningForm.amount}
                        onChange={(e) => setEarningForm({ ...earningForm, amount: e.target.value })}
                        className="text-xs sm:text-sm"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="earning-description" className="text-xs sm:text-sm">
                      Descripción (Opcional)
                    </Label>
                    <Textarea
                      id="earning-description"
                      placeholder="ej. Zona aeropuerto, Viaje premium"
                      value={earningForm.description}
                      onChange={(e) => setEarningForm({ ...earningForm, description: e.target.value })}
                      className="text-xs sm:text-sm min-h-[60px] sm:min-h-[80px]"
                    />
                  </div>

                  <Button onClick={addEarning} className="w-full text-xs sm:text-sm">
                    Agregar Ganancia
                  </Button>
                </CardContent>
              </Card>

              {/* Add Expenses */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
                    <Plus className="h-4 w-4 sm:h-5 sm:w-5" />
                    Agregar Gastos
                  </CardTitle>
                  <CardDescription className="text-xs sm:text-sm">Registra los gastos de conducción</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 sm:space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="expense-date" className="text-xs sm:text-sm">
                        Fecha
                      </Label>
                      <Input
                        id="expense-date"
                        type="date"
                        value={expenseForm.date}
                        onChange={(e) => setExpenseForm({ ...expenseForm, date: e.target.value })}
                        className="text-xs sm:text-sm"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="expense-category" className="text-xs sm:text-sm">
                        Categoría *
                      </Label>
                      <Select
                        value={expenseForm.category}
                        onValueChange={(value) => setExpenseForm({ ...expenseForm, category: value })}
                      >
                        <SelectTrigger className="text-xs sm:text-sm">
                          <SelectValue placeholder="Seleccionar categoría" />
                        </SelectTrigger>
                        <SelectContent>
                          {expenseCategories.map((category) => (
                            <SelectItem key={category} value={category}>
                              {category}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="expense-amount" className="text-xs sm:text-sm">
                      Cantidad ($) *
                    </Label>
                    <Input
                      id="expense-amount"
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={expenseForm.amount}
                      onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                      className="text-xs sm:text-sm"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="expense-description" className="text-xs sm:text-sm">
                      Descripción (Opcional)
                    </Label>
                    <Textarea
                      id="expense-description"
                      placeholder="ej. Gasolinera, Peaje autopista"
                      value={expenseForm.description}
                      onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })}
                      className="text-xs sm:text-sm min-h-[60px] sm:min-h-[80px]"
                    />
                  </div>

                  <Button onClick={addExpense} className="w-full text-xs sm:text-sm">
                    Agregar Gasto
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Recent Transactions */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
              {/* Recent Earnings */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm sm:text-base">Ganancias Recientes</CardTitle>
                  <CardDescription className="text-xs sm:text-sm">{filteredEarnings.length} entradas</CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[300px] sm:h-[400px]">
                    <div className="space-y-3">
                      {filteredEarnings.slice(0, 10).map((earning) => (
                        <div key={earning.id} className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge variant="secondary" className="text-xs">
                                {earning.platform}
                              </Badge>
                              <Badge variant="outline" className="text-xs">
                                {earning.conductor}
                              </Badge>
                              <span className="text-xs text-gray-600">{earning.date}</span>
                            </div>
                            {earning.description && (
                              <p className="text-xs text-gray-600 mt-1 truncate">{earning.description}</p>
                            )}
                          </div>
                          <div className="text-sm sm:text-lg font-semibold text-green-600 ml-2">
                            +${earning.amount.toFixed(2)}
                          </div>
                        </div>
                      ))}
                      {filteredEarnings.length === 0 && (
                        <p className="text-center text-gray-500 py-4 text-xs sm:text-sm">
                          No hay ganancias registradas
                        </p>
                      )}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>

              {/* Recent Expenses */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm sm:text-base">Gastos Recientes</CardTitle>
                  <CardDescription className="text-xs sm:text-sm">{filteredExpenses.length} entradas</CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[300px] sm:h-[400px]">
                    <div className="space-y-3">
                      {filteredExpenses.slice(0, 10).map((expense) => (
                        <div key={expense.id} className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge variant="outline" className="text-xs">
                                {expense.category}
                              </Badge>
                              <span className="text-xs text-gray-600">{expense.date}</span>
                            </div>
                            {expense.description && (
                              <p className="text-xs text-gray-600 mt-1 truncate">{expense.description}</p>
                            )}
                          </div>
                          <div className="text-sm sm:text-lg font-semibold text-red-600 ml-2">
                            -${expense.amount.toFixed(2)}
                          </div>
                        </div>
                      ))}
                      {filteredExpenses.length === 0 && (
                        <p className="text-center text-gray-500 py-4 text-xs sm:text-sm">No hay gastos registrados</p>
                      )}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="statistics" className="space-y-4 sm:space-y-6">
            {/* Period and Conductor Selector */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
                  <Calendar className="h-4 w-4 sm:h-5 sm:w-5" />
                  Configuración de Análisis
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs sm:text-sm">Período de Análisis</Label>
                    <Select value={statsPeriod} onValueChange={(value: "day" | "week" | "month") => setStatsPeriod(value)}>
                      <SelectTrigger className="text-xs sm:text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="day">Por Día</SelectItem>
                        <SelectItem value="week">Por Semana</SelectItem>
                        <SelectItem value="month">Por Mes</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs sm:text-sm">Conductor para Análisis Detallado</Label>
                    <Select value={statsSelectedConductor} onValueChange={setStatsSelectedConductor}>
                      <SelectTrigger className="text-xs sm:text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos los conductores</SelectItem>
                        {conductors.map((conductor) => (
                          <SelectItem key={conductor} value={conductor}>
                            {conductor}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Charts */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6">
              {/* Earnings vs Expenses Chart */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
                    <BarChart3 className="h-4 w-4 sm:h-5 sm:w-5" />
                    Ganancias vs Gastos
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {chartData.length > 0 ? (
                    <div className="h-[250px] sm:h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="period" fontSize={12} tick={{ fontSize: 10 }} />
                          <YAxis fontSize={12} tick={{ fontSize: 10 }} />
                          <Tooltip
                            contentStyle={{ fontSize: "12px" }}
                            formatter={(value: number) => [`$${value.toFixed(2)}`, ""]}
                          />
                          <Bar dataKey="ganancias" fill="#10B981" name="Ganancias" />
                          <Bar dataKey="gastos" fill="#EF4444" name="Gastos" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="h-[250px] sm:h-[300px] flex items-center justify-center">
                      <p className="text-gray-500 text-sm">No hay datos para mostrar</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Net Income Chart */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
                    <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5" />
                    Ganancia Neta
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {chartData.length > 0 ? (
                    <div className="h-[250px] sm:h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="period" fontSize={12} tick={{ fontSize: 10 }} />
                          <YAxis fontSize={12} tick={{ fontSize: 10 }} />
                          <Tooltip
                            contentStyle={{ fontSize: "12px" }}
                            formatter={(value: number) => [`$${value.toFixed(2)}`, "Neto"]}
                          />
                          <Area type="monotone" dataKey="neto" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.3} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="h-[250px] sm:h-[300px] flex items-center justify-center">
                      <p className="text-gray-500 text-sm">No hay datos para mostrar</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Conductor-Specific Analysis */}
            {statsSelectedConductor !== "all" && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
                    <User className="h-4 w-4 sm:h-5 sm:w-5" />
                    Análisis Detallado: {statsSelectedConductor}
                  </CardTitle>
                  <CardDescription className="text-xs sm:text-sm">
                    Estadísticas específicas del conductor seleccionado por {statsPeriod === "day" ? "día" : statsPeriod === "week" ? "semana" : "mes"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {conductorChartData.length > 0 ? (
                    <div className="space-y-6">
                      {/* Summary Cards for Selected Conductor */}
                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 sm:gap-4">
                        <Card className="bg-green-50">
                          <CardContent className="p-3 sm:p-4">
                            <div className="text-center">
                              <div className="text-lg sm:text-xl font-bold text-green-600">
                                ${conductorChartData.reduce((sum, item) => sum + item.ganancias, 0).toFixed(2)}
                              </div>
                              <div className="text-xs sm:text-sm text-gray-600">Total Ganado</div>
                            </div>
                          </CardContent>
                        </Card>
                        <Card className="bg-blue-50">
                          <CardContent className="p-3 sm:p-4">
                            <div className="text-center">
                              <div className="text-lg sm:text-xl font-bold text-blue-600">
                                {conductorChartData.reduce((sum, item) => sum + item.viajes, 0)}
                              </div>
                              <div className="text-xs sm:text-sm text-gray-600">Total Viajes</div>
                            </div>
                          </CardContent>
                        </Card>
                        <Card className="bg-purple-50">
                          <CardContent className="p-3 sm:p-4">
                            <div className="text-center">
                              <div className="text-lg sm:text-xl font-bold text-purple-600">
                                ${(conductorChartData.reduce((sum, item) => sum + item.ganancias, 0) / Math.max(conductorChartData.reduce((sum, item) => sum + item.viajes, 0), 1)).toFixed(2)}
                              </div>
                              <div className="text-xs sm:text-sm text-gray-600">Promedio/Viaje</div>
                            </div>
                          </CardContent>
                        </Card>
                        <Card className="bg-orange-50">
                          <CardContent className="p-3 sm:p-4">
                            <div className="text-center">
                              <div className="text-lg sm:text-xl font-bold text-orange-600">
                                ${(conductorChartData.reduce((sum, item) => sum + item.neto, 0)).toFixed(2)}
                              </div>
                              <div className="text-xs sm:text-sm text-gray-600">Ganancia Neta</div>
                            </div>
                          </CardContent>
                        </Card>
                      </div>

                      {/* Conductor Performance Chart */}
                      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6">
                        <Card>
                          <CardHeader>
                            <CardTitle className="text-sm sm:text-base">Ganancias por Período</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="h-[250px] sm:h-[300px]">
                              <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={conductorChartData}>
                                  <CartesianGrid strokeDasharray="3 3" />
                                  <XAxis dataKey="period" fontSize={12} tick={{ fontSize: 10 }} />
                                  <YAxis fontSize={12} tick={{ fontSize: 10 }} />
                                  <Tooltip
                                    contentStyle={{ fontSize: "12px" }}
                                    formatter={(value: number) => [`$${value.toFixed(2)}`, ""]}
                                  />
                                  <Bar dataKey="ganancias" fill="#10B981" name="Ganancias" />
                                </BarChart>
                              </ResponsiveContainer>
                            </div>
                          </CardContent>
                        </Card>

                        <Card>
                          <CardHeader>
                            <CardTitle className="text-sm sm:text-base">Viajes por Período</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="h-[250px] sm:h-[300px]">
                              <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={conductorChartData}>
                                  <CartesianGrid strokeDasharray="3 3" />
                                  <XAxis dataKey="period" fontSize={12} tick={{ fontSize: 10 }} />
                                  <YAxis fontSize={12} tick={{ fontSize: 10 }} />
                                  <Tooltip
                                    contentStyle={{ fontSize: "12px" }}
                                    formatter={(value: number) => [value, "Viajes"]}
                                  />
                                  <Bar dataKey="viajes" fill="#3B82F6" name="Viajes" />
                                </BarChart>
                              </ResponsiveContainer>
                            </div>
                          </CardContent>
                        </Card>
                      </div>

                      {/* Detailed Performance Table */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-sm sm:text-base">Detalle por Período</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <ScrollArea className="h-[300px]">
                            <div className="space-y-2">
                              {conductorChartData.map((item, index) => (
                                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                  <div className="flex-1">
                                    <div className="font-medium text-sm">{item.period}</div>
                                    <div className="text-xs text-gray-600">{item.viajes} viajes</div>
                                  </div>
                                  <div className="text-right space-y-1">
                                    <div className="font-semibold text-green-600">${item.ganancias.toFixed(2)}</div>
                                    <div className="text-xs text-gray-600">
                                      Prom: ${item.promedioPorViaje.toFixed(2)}/viaje
                                    </div>
                                    <div className={`text-xs font-medium ${item.neto >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                      Neto: ${item.neto.toFixed(2)}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </ScrollArea>
                        </CardContent>
                      </Card>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-gray-500 text-sm">
                        No hay datos disponibles para {statsSelectedConductor} en el período seleccionado
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Platform and Category Charts */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 sm:gap-6">
              {/* Platform Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
                    <PieChart className="h-4 w-4 sm:h-5 sm:w-5" />
                    Por Plataforma
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {platformStats.length > 0 ? (
                    <div className="h-[250px] sm:h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <RechartsPieChart>
                          <Pie
                            data={platformStats}
                            cx="50%"
                            cy="50%"
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="value"
                            label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                          >
                            {platformStats.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip
                            contentStyle={{ fontSize: "12px" }}
                            formatter={(value: number) => [`$${value.toFixed(2)}`, "Total"]}
                          />
                        </RechartsPieChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <p className="text-center text-gray-500 py-8 text-xs sm:text-sm">
                      No hay datos de plataformas disponibles
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Conductor Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
                    <User className="h-4 w-4 sm:h-5 sm:w-5" />
                    Por Conductor
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {conductorStats.length > 0 ? (
                    <div className="h-[250px] sm:h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <RechartsPieChart>
                          <Pie
                            data={conductorStats}
                            cx="50%"
                            cy="50%"
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="value"
                            label={({ name, percent }) => `${name.split(" ")[0]} ${((percent ?? 0) * 100).toFixed(0)}%`}
                          >
                            {conductorStats.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[(index + 2) % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip
                            contentStyle={{ fontSize: "12px" }}
                            formatter={(value: number) => [`$${value.toFixed(2)}`, "Total"]}
                          />
                        </RechartsPieChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <p className="text-center text-gray-500 py-8 text-xs sm:text-sm">
                      No hay datos de conductores disponibles
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Expense Categories */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
                    <Target className="h-4 w-4 sm:h-5 sm:w-5" />
                    Gastos por Categoría
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {categoryStats.length > 0 ? (
                    <div className="h-[250px] sm:h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <RechartsPieChart>
                          <Pie
                            data={categoryStats}
                            cx="50%"
                            cy="50%"
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="value"
                            label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                          >
                            {categoryStats.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[(index + 4) % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip
                            contentStyle={{ fontSize: "12px" }}
                            formatter={(value: number) => [`$${value.toFixed(2)}`, "Total"]}
                          />
                        </RechartsPieChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <p className="text-center text-gray-500 py-8 text-xs sm:text-sm">
                      No hay datos de gastos disponibles
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Detailed Statistics */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
              {/* Platform Details */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm sm:text-base">Detalles por Plataforma</CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[200px] sm:h-[250px]">
                    <div className="space-y-3 sm:space-y-4">
                      {platformStats.map((stat) => (
                        <div key={stat.name} className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="font-medium text-xs sm:text-sm">{stat.name}</span>
                            <div className="text-right">
                              <div className="font-semibold text-xs sm:text-sm">${stat.value.toFixed(2)}</div>
                              <div className="text-xs text-gray-600">{stat.trips} viajes</div>
                            </div>
                          </div>
                          <div className="flex justify-between text-xs text-gray-600">
                            <span>Promedio por viaje</span>
                            <span>${stat.average.toFixed(2)}</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-blue-600 h-2 rounded-full"
                              style={{
                                width: `${platformStats.length > 0 ? (stat.value / Math.max(...platformStats.map((s) => s.value))) * 100 : 0}%`,
                              }}
                            ></div>
                          </div>
                        </div>
                      ))}
                      {platformStats.length === 0 && (
                        <p className="text-center text-gray-500 py-4 text-xs sm:text-sm">
                          No hay datos de plataformas disponibles
                        </p>
                      )}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>

              {/* Conductor Details */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm sm:text-base">Detalles por Conductor</CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[200px] sm:h-[250px]">
                    <div className="space-y-3 sm:space-y-4">
                      {conductorStats.map((stat) => (
                        <div key={stat.name} className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="font-medium text-xs sm:text-sm">{stat.name}</span>
                            <div className="text-right">
                              <div className="font-semibold text-xs sm:text-sm">${stat.value.toFixed(2)}</div>
                              <div className="text-xs text-gray-600">{stat.trips} viajes</div>
                            </div>
                          </div>
                          <div className="flex justify-between text-xs text-gray-600">
                            <span>Promedio por viaje</span>
                            <span>${stat.average.toFixed(2)}</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-green-600 h-2 rounded-full"
                              style={{
                                width: `${conductorStats.length > 0 ? (stat.value / Math.max(...conductorStats.map((s) => s.value))) * 100 : 0}%`,
                              }}
                            ></div>
                          </div>
                        </div>
                      ))}
                      {conductorStats.length === 0 && (
                        <p className="text-center text-gray-500 py-4 text-xs sm:text-sm">
                          No hay datos de conductores disponibles
                        </p>
                      )}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>

              {/* Category Details */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm sm:text-base">Detalles de Gastos</CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[200px] sm:h-[250px]">
                    <div className="space-y-3 sm:space-y-4">
                      {categoryStats.map((stat) => (
                        <div key={stat.name} className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="font-medium text-xs sm:text-sm">{stat.name}</span>
                            <div className="text-right">
                              <div className="font-semibold text-xs sm:text-sm">${stat.value.toFixed(2)}</div>
                              <div className="text-xs text-gray-600">{stat.percentage.toFixed(1)}%</div>
                            </div>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div className="bg-red-500 h-2 rounded-full" style={{ width: `${stat.percentage}%` }}></div>
                          </div>
                        </div>
                      ))}
                      {categoryStats.length === 0 && (
                        <p className="text-center text-gray-500 py-4 text-xs sm:text-sm">
                          No hay datos de gastos disponibles
                        </p>
                      )}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
