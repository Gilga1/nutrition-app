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

export interface SmartReductionTip {
  tip: string
  estimated_calorie_savings?: number | null
  estimated_protein_change_g?: number | null
}

export interface MealEstimate {
  meal_summary: string
  items: FoodItem[]
  totals: MacroTotals
  smart_reduction_tip: SmartReductionTip
  confidence: string
  assumptions: string[]
}

export interface HealthResponse {
  status: string
  model: string
  vision_configured: boolean
}

const API_BASE = import.meta.env.VITE_API_BASE ?? ''

export async function checkHealth(): Promise<HealthResponse> {
  const res = await fetch(`${API_BASE}/api/health`)
  if (!res.ok) throw new Error('Backend unreachable')
  return res.json()
}

export async function estimateMeal(file: File): Promise<MealEstimate> {
  const form = new FormData()
  form.append('file', file)
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
