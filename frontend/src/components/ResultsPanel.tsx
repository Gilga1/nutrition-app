import type { MealEstimate } from '../api'

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

export function ResultsPanel({ estimate }: { estimate: MealEstimate }) {
  const tip = estimate.smart_reduction_tip

  return (
    <div className="animate-fade-up space-y-4">
      <section className="rounded-3xl border border-ink/8 bg-card/90 p-5 shadow-[0_16px_40px_-24px_rgba(26,46,36,0.4)] sm:p-6">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
          <div>
            <h2 className="font-display text-2xl font-semibold text-ink">Meal breakdown</h2>
            <p className="mt-1 text-sm text-ink-soft/75">{estimate.meal_summary}</p>
          </div>
          <span className="rounded-full bg-leaf/10 px-2.5 py-1 text-xs font-medium capitalize text-leaf">
            {estimate.confidence} confidence
          </span>
        </div>

        <div className="mb-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <MacroPill label="Calories" value={estimate.totals.calories} unit="kcal" />
          <MacroPill label="Protein" value={estimate.totals.protein_g} unit="g" />
          <MacroPill label="Carbs" value={estimate.totals.carbs_g} unit="g" />
          <MacroPill label="Fat" value={estimate.totals.fat_g} unit="g" />
        </div>

        <div className="overflow-hidden rounded-2xl border border-ink/8">
          <div className="hidden grid-cols-[1.4fr_1fr_0.7fr_0.7fr] gap-2 bg-ink px-3 py-2 text-[11px] font-medium uppercase tracking-wide text-surface/80 sm:grid">
            <span>Item</span>
            <span>Portion</span>
            <span className="text-right">Cal</span>
            <span className="text-right">Protein</span>
          </div>
          <ul className="divide-y divide-ink/8 bg-white">
            {estimate.items.map((item) => (
              <li key={`${item.item}-${item.portion}`} className="px-3 py-3 sm:grid sm:grid-cols-[1.4fr_1fr_0.7fr_0.7fr] sm:items-center sm:gap-2">
                <div>
                  <p className="font-medium text-ink">{item.item}</p>
                  {item.notes && (
                    <p className="mt-0.5 text-xs text-ink-soft/60">{item.notes}</p>
                  )}
                  <p className="mt-1 text-xs text-ink-soft/70 sm:hidden">{item.portion}</p>
                </div>
                <p className="hidden text-sm text-ink-soft sm:block">{item.portion}</p>
                <div className="mt-2 flex gap-4 text-sm sm:mt-0 sm:contents">
                  <p className="sm:text-right">
                    <span className="text-ink-soft/50 sm:hidden">Cal </span>
                    <span className="font-semibold text-ink">{Math.round(item.calories)}</span>
                  </p>
                  <p className="sm:text-right">
                    <span className="text-ink-soft/50 sm:hidden">Protein </span>
                    <span className="font-semibold text-ink">{item.protein_g.toFixed(1)}g</span>
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>

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
