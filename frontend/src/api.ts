export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active'
export type MealType = 'Breakfast' | 'Lunch' | 'Dinner' | 'Snack' | 'Pre-workout'
export type MedicalCondition = 'thyroid' | 'diabetes' | 'hypertension' | 'pcos' | 'none'

export interface UserProfile {
  height_cm?: number | null
  weight_kg?: number | null
  age?: number | null
  sex?: 'male' | 'female' | null
  activity_level: ActivityLevel
  conditions: MedicalCondition[]
}

export interface FoodItem {
  item: string
  portion: string
  calories: number
  protein_g: number
  carbs_g: number
  fat_g: number
  notes?: string | null
}

export interface MacroTotals {
  calories: number
  protein_g: number
  carbs_g: number
  fat_g: number
}

export interface MicroTotals {
  fibre_g: number
  calcium_mg: number
  iron_mg: number
  zinc_mg: number
  magnesium_mg: number
  sodium_mg: number
  potassium_mg: number
  sugar_g: number
  vitamin_c_mg: number
  vitamin_d_iu: number
}

export interface DailyTargets {
  calories?: number | null
  protein_g?: number | null
  note?: string | null
}

export interface SmartReductionTip {
  tip: string
  estimated_calorie_savings?: number | null
  estimated_protein_change_g?: number | null
}

export interface MealEstimate {
  meal_summary: string
  items: FoodItem[]
  totals: MacroTotals
  micros: MicroTotals
  daily_targets?: DailyTargets | null
  smart_reduction_tip: SmartReductionTip
  confidence: string
  assumptions: string[]
  notion_page_url?: string | null
}

export interface HealthResponse {
  status: string
  model: string
  vision_configured: boolean
  notion_configured: boolean
}

const API_BASE = import.meta.env.VITE_API_BASE ?? ''

export async function checkHealth(): Promise<HealthResponse> {
  const res = await fetch(`${API_BASE}/api/health`)
  if (!res.ok) throw new Error('Backend unreachable')
  return res.json()
}

export async function estimateMeal(
  file: File,
  options: {
    mealType: MealType
    profile: UserProfile | null
    saveToNotion: boolean
  },
): Promise<MealEstimate> {
  const form = new FormData()
  form.append('file', file)
  form.append('meal_type', options.mealType)
  form.append('save_to_notion', String(options.saveToNotion))
  if (options.profile) {
    form.append('profile_json', JSON.stringify(options.profile))
  }
  const res = await fetch(`${API_BASE}/api/estimate`, {
    method: 'POST',
    body: form,
  })
  if (!res.ok) {
    let detail = 'Estimation failed'
    try {
      const body = await res.json()
      detail = body.detail ?? detail
    } catch {
      /* ignore */
    }
    throw new Error(typeof detail === 'string' ? detail : JSON.stringify(detail))
  }
  return res.json()
}
