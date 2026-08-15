import { useEffect, useMemo, useState } from 'react'
import { Loader2, Plus, Trash2 } from 'lucide-react'
import type { MealEstimate, MealType } from '../api'
import { lookupFood, saveMealToNotion } from '../api'
import {
  caloriesFromMacros,
  scaleFoodItemByGrams,
  scaleMicros,
  sumMacroTotals,
  toEditableItems,
  withMacroCalories,
  type EditableItem,
} from '../nutrition'

function MacroPill({ label, value, unit }: { label: string; value: number; unit: string }) {
  return (
    <div className="rounded-2xl bg-mist/80 px-3 py-3 text-center">
      <p className="text-[11px] font-medium uppercase tracking-wide text-ink-soft/60">{label}</p>
      <p className="mt-1 font-display text-xl font-semibold text-ink">
        {Math.round(value)}
        <span className="ml-0.5 text-sm font-sans font-medium text-ink-soft/70">{unit}</span>
      </p>
    </div>
  )
}

function MicroChip({ label, value, unit }: { label: string; value: number; unit: string }) {
  if (!value) return null
  return (
    <span className="rounded-full bg-white/80 px-2.5 py-1 text-xs text-ink-soft">
      {label}: {value < 10 ? value.toFixed(1) : Math.round(value)}
      {unit}
    </span>
  )
}

interface ResultsPanelProps {
  estimate: MealEstimate
  mealType: MealType
  notionReady: boolean
}

export function ResultsPanel({ estimate, mealType, notionReady }: ResultsPanelProps) {
  const [items, setItems] = useState<EditableItem[]>(() => toEditableItems(estimate.items))
  const [baseCalories] = useState(() =>
    caloriesFromMacros(
      estimate.totals.protein_g,
      estimate.totals.carbs_g,
      estimate.totals.fat_g,
    ),
  )
  const [notionUrl, setNotionUrl] = useState<string | null>(estimate.notion_page_url ?? null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [newItemName, setNewItemName] = useState('')
  const [newItemGrams, setNewItemGrams] = useState('100')
  const [addingItem, setAddingItem] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)
  const [gramDrafts, setGramDrafts] = useState<Record<string, string>>({})

  useEffect(() => {
    setItems(toEditableItems(estimate.items))
    setGramDrafts({})
    setNotionUrl(estimate.notion_page_url ?? null)
    setSaveError(null)
  }, [estimate])

  const totals = useMemo(() => sumMacroTotals(items), [items])
  const micros = useMemo(
    () => scaleMicros(estimate.micros, baseCalories, totals.calories),
    [estimate.micros, baseCalories, totals.calories],
  )

  const tip = estimate.smart_reduction_tip
  const targets = estimate.daily_targets

  function updateItem(id: string, patch: Partial<EditableItem>) {
    setItems((prev) =>
      prev.map((row) => {
        if (row.id !== id) return row
        if (patch.grams !== undefined && patch.grams !== row.grams) {
          return { ...scaleFoodItemByGrams(row, patch.grams), id: row.id }
        }
        return { ...row, ...patch }
      }),
    )
  }

  function commitGrams(id: string, raw: string) {
    const grams = parseFloat(raw)
    if (!Number.isNaN(grams) && grams > 0) {
      updateItem(id, { grams })
    }
    setGramDrafts((prev) => {
      const next = { ...prev }
      delete next[id]
      return next
    })
  }

  function removeItem(id: string) {
    setItems((prev) => prev.filter((row) => row.id !== id))
    setGramDrafts((prev) => {
      const next = { ...prev }
      delete next[id]
      return next
    })
  }

  async function handleAddItem() {
    const name = newItemName.trim()
    const grams = parseFloat(newItemGrams)
    if (!name) {
      setAddError('Enter a food name')
      return
    }
    if (!grams || grams <= 0) {
      setAddError('Enter a valid weight in grams')
      return
    }

    setAddingItem(true)
    setAddError(null)
    try {
      const lookedUp = await lookupFood(name, grams)
      const id = `item-new-${Date.now()}`
      setItems((prev) => [...prev, { ...withMacroCalories(lookedUp), id }])
      setNewItemName('')
      setNewItemGrams('100')
    } catch (err) {
      setAddError(err instanceof Error ? err.message : 'Could not look up food')
    } finally {
      setAddingItem(false)
    }
  }

  async function handleSaveNotion() {
    setSaving(true)
    setSaveError(null)
    try {
      const payload: MealEstimate = {
        ...estimate,
        items: items.map(withMacroCalories),
        totals,
        micros,
      }
      const res = await saveMealToNotion(payload, mealType)
      setNotionUrl(res.notion_page_url)
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="animate-fade-up space-y-4">
      {targets?.calories && (
        <section className="rounded-2xl border border-ink/8 bg-card/90 px-4 py-3 text-sm text-ink-soft">
          <span className="font-medium text-ink">Daily calorie target:</span>{' '}
          {targets.calories_min != null && targets.calories_max != null ? (
            <>
              {Math.round(targets.calories_min)}–{Math.round(targets.calories_max)} kcal range
              <span className="text-ink-soft/70">
                {' '}
                · ~{Math.round(targets.calories)} kcal at your activity level
              </span>
            </>
          ) : (
            <>~{Math.round(targets.calories)} kcal</>
          )}
          {targets.protein_g ? ` · ${targets.protein_g}g protein` : ''}
          {targets.note && <p className="mt-1 text-xs text-ink-soft/70">{targets.note}</p>}
        </section>
      )}

      <section className="rounded-3xl border border-ink/8 bg-card/90 p-5 shadow-[0_16px_40px_-24px_rgba(26,46,36,0.4)] sm:p-6">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
          <div>
            <h2 className="font-display text-2xl font-semibold text-ink">Meal breakdown</h2>
            <p className="mt-1 text-sm text-ink-soft/75">{estimate.meal_summary}</p>
            <p className="mt-1 text-xs text-ink-soft/55">
              Edit grams · calories and protein update live
            </p>
          </div>
          <span className="rounded-full bg-leaf/10 px-2.5 py-1 text-xs font-medium capitalize text-leaf">
            {estimate.confidence} confidence
          </span>
        </div>

        <div className="mb-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <MacroPill label="Calories" value={totals.calories} unit="kcal" />
          <MacroPill label="Protein" value={totals.protein_g} unit="g" />
          <MacroPill label="Carbs" value={totals.carbs_g} unit="g" />
          <MacroPill label="Fat" value={totals.fat_g} unit="g" />
        </div>

        <div className="mb-5 flex flex-wrap gap-2">
          <MicroChip label="Fibre" value={micros.fibre_g} unit="g" />
          <MicroChip label="Iron" value={micros.iron_mg} unit="mg" />
          <MicroChip label="Calcium" value={micros.calcium_mg} unit="mg" />
          <MicroChip label="Zinc" value={micros.zinc_mg} unit="mg" />
          <MicroChip label="Mg" value={micros.magnesium_mg} unit="mg" />
          <MicroChip label="Sodium" value={micros.sodium_mg} unit="mg" />
          <MicroChip label="Potassium" value={micros.potassium_mg} unit="mg" />
        </div>

        <div className="overflow-hidden rounded-2xl border border-ink/8">
          <div className="hidden grid-cols-[1.2fr_0.7fr_0.6fr_0.6fr_2rem] gap-2 bg-ink px-3 py-2 text-[11px] font-medium uppercase tracking-wide text-surface/80 sm:grid">
            <span>Item</span>
            <span>Grams</span>
            <span className="text-right">Cal</span>
            <span className="text-right">Protein</span>
            <span />
          </div>
          <ul className="divide-y divide-ink/8 bg-white">
            {items.map((row) => (
              <li
                key={row.id}
                className="px-3 py-3 sm:grid sm:grid-cols-[1.2fr_0.7fr_0.6fr_0.6fr_2rem] sm:items-center sm:gap-2"
              >
                <div>
                  <input
                    type="text"
                    value={row.item}
                    onChange={(e) => updateItem(row.id, { item: e.target.value })}
                    className="w-full rounded-lg border border-transparent bg-transparent px-1 py-0.5 font-medium text-ink hover:border-ink/10 focus:border-ink/20 focus:bg-mist/40 focus:outline-none"
                  />
                  {(row.notes || row.source) && (
                    <p className="mt-0.5 px-1 text-xs text-ink-soft/60">
                      {row.notes}
                      {row.source && (
                        <span className="ml-1 rounded bg-mist/60 px-1 py-0.5 text-[10px] uppercase tracking-wide">
                          {row.source}
                        </span>
                      )}
                    </p>
                  )}
                </div>
                <div className="mt-2 flex items-center gap-1 sm:mt-0">
                  <input
                    type="text"
                    inputMode="decimal"
                    value={gramDrafts[row.id] ?? String(row.grams)}
                    onChange={(e) =>
                      setGramDrafts((prev) => ({ ...prev, [row.id]: e.target.value }))
                    }
                    onBlur={(e) => commitGrams(row.id, e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.currentTarget.blur()
                      }
                    }}
                    className="w-full rounded-lg border border-ink/10 bg-mist/30 px-2 py-1.5 text-sm text-ink-soft"
                  />
                  <span className="text-xs text-ink-soft/50">g</span>
                </div>
                <div className="mt-2 flex items-center justify-between gap-4 text-sm sm:mt-0 sm:contents">
                  <p className="sm:text-right">
                    <span className="text-ink-soft/50 sm:hidden">Cal </span>
                    <span className="font-semibold text-ink">
                      {Math.round(
                        caloriesFromMacros(row.protein_g, row.carbs_g, row.fat_g),
                      )}
                    </span>
                  </p>
                  <p className="sm:text-right">
                    <span className="text-ink-soft/50 sm:hidden">Protein </span>
                    <span className="font-semibold text-ink">{row.protein_g.toFixed(1)}g</span>
                  </p>
                  <button
                    type="button"
                    onClick={() => removeItem(row.id)}
                    className="hidden rounded-lg p-1.5 text-ink-soft/50 hover:bg-red-50 hover:text-danger sm:block"
                    aria-label={`Remove ${row.item}`}
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => removeItem(row.id)}
                  className="mt-2 flex items-center gap-1 text-xs text-danger sm:hidden"
                >
                  <Trash2 className="size-3.5" /> Remove
                </button>
              </li>
            ))}
            {items.length === 0 && (
              <li className="px-3 py-6 text-center text-sm text-ink-soft/60">
                No items yet. Add a food below or scan again.
              </li>
            )}
          </ul>
        </div>

        <div className="mt-4 rounded-2xl border border-dashed border-ink/15 bg-mist/20 p-3">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-ink-soft/70">
            Add food item
          </p>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <label className="flex-1 text-sm">
              <span className="mb-1 block text-ink-soft/70">Name</span>
              <input
                type="text"
                value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
                placeholder="e.g. paneer, roti, banana"
                className="w-full rounded-xl border border-ink/10 bg-white px-3 py-2 text-sm"
              />
            </label>
            <label className="w-full text-sm sm:w-28">
              <span className="mb-1 block text-ink-soft/70">Grams</span>
              <input
                type="number"
                min={1}
                step={1}
                value={newItemGrams}
                onChange={(e) => setNewItemGrams(e.target.value)}
                className="w-full rounded-xl border border-ink/10 bg-white px-3 py-2 text-sm"
              />
            </label>
            <button
              type="button"
              onClick={() => void handleAddItem()}
              disabled={addingItem}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-ink/90 px-4 py-2.5 text-sm font-medium text-white hover:bg-ink disabled:opacity-60"
            >
              {addingItem ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Plus className="size-4" />
              )}
              Add
            </button>
          </div>
          {addError && <p className="mt-2 text-sm text-danger">{addError}</p>}
          <p className="mt-2 text-xs text-ink-soft/55">
            Nutrition from IFCT database when matched; otherwise AI estimate per 100g.
          </p>
        </div>

        {notionReady && items.length > 0 && (
          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
            <button
              type="button"
              onClick={() => void handleSaveNotion()}
              disabled={saving || !!notionUrl}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-leaf px-5 py-3 text-sm font-semibold text-white transition hover:bg-leaf/90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Saving…
                </>
              ) : notionUrl ? (
                'Saved to Notion'
              ) : (
                'Save to Notion'
              )}
            </button>
            {notionUrl && (
              <a
                href={notionUrl}
                target="_blank"
                rel="noreferrer"
                className="text-center text-sm font-medium text-leaf underline-offset-2 hover:underline"
              >
                Open in Notion →
              </a>
            )}
            {saveError && <p className="text-sm text-danger">{saveError}</p>}
          </div>
        )}

        {estimate.assumptions?.length > 0 && (
          <details className="mt-4 text-xs text-ink-soft/65">
            <summary className="cursor-pointer font-medium text-ink-soft/80">Assumptions</summary>
            <ul className="mt-2 list-disc space-y-1 pl-4">
              {estimate.assumptions.map((a) => (
                <li key={a}>{a}</li>
              ))}
            </ul>
          </details>
        )}
      </section>

      <section className="rounded-3xl border border-leaf/25 bg-gradient-to-br from-[#e8f3ec] to-[#dceee3] p-5 sm:p-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-turmeric-deep">
          Smart Reduction Tip
        </p>
        <p className="mt-2 font-display text-lg leading-snug text-ink sm:text-xl">{tip.tip}</p>
        <div className="mt-3 flex flex-wrap gap-3 text-sm text-ink-soft">
          {tip.estimated_calorie_savings != null && (
            <span className="rounded-full bg-white/70 px-3 py-1">
              ~{Math.round(tip.estimated_calorie_savings)} kcal saved
            </span>
          )}
          {tip.estimated_protein_change_g != null && tip.estimated_protein_change_g !== 0 && (
            <span className="rounded-full bg-white/70 px-3 py-1">
              Protein {tip.estimated_protein_change_g > 0 ? '+' : ''}
              {tip.estimated_protein_change_g.toFixed(1)} g
            </span>
          )}
        </div>
      </section>
    </div>
  )
}
