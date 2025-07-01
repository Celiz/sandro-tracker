import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type Earning = {
  id: string
  date: string
  platform: string
  amount: number
  description?: string
  created_at?: string
}

export type Expense = {
  id: string
  date: string
  category: string
  amount: number
  description?: string
  created_at?: string
}
