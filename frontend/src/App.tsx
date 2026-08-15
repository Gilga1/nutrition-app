import { useEffect, useId, useRef, useState, type ChangeEvent } from 'react'
import { Camera, ImagePlus, Loader2, RefreshCw, Sparkles, UtensilsCrossed } from 'lucide-react'
import { checkHealth, estimateMeal, type MealEstimate } from './api'
import { ResultsPanel } from './components/ResultsPanel'

type Status = 'idle' | 'analyzing' | 'done' | 'error'

export default function App() {
  const inputId = useId()
  const fileRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [estimate, setEstimate] = useState<MealEstimate | null>(null)
  const [status, setStatus] = useState<Status>('idle')
  const [error, setError] = useState<string | null>(null)
  const [backendOk, setBackendOk] = useState<boolean | null>(null)
  const [visionReady, setVisionReady] = useState(false)

  useEffect(() => {
    checkHealth()
      .then((h) => {
        setBackendOk(true)
        setVisionReady(h.vision_configured)
      })
      .catch(() => {
        setBackendOk(false)
        setVisionReady(false)
      })
  }, [])

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview)
    }
  }, [preview])

  async function handleFile(file: File | undefined) {
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setError('Please choose a photo (JPG, PNG, or WEBP).')
      setStatus('error')
      return
    }

    if (preview) URL.revokeObjectURL(preview)
    const url = URL.createObjectURL(file)
    setPreview(url)
    setEstimate(null)
    setError(null)
    setStatus('analyzing')

    try {
      const result = await estimateMeal(file)
      setEstimate(result)
      setStatus('done')
    } catch (err) {
      setStatus('error')
      setError(err instanceof Error ? err.message : 'Something went wrong')
    }
  }

  function onInputChange(e: ChangeEvent<HTMLInputElement>) {
    void handleFile(e.target.files?.[0])
    e.target.value = ''
  }

  function reset() {
    if (preview) URL.revokeObjectURL(preview)
    setPreview(null)
    setEstimate(null)
    setError(null)
    setStatus('idle')
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col px-4 pb-10 pt-6 sm:max-w-2xl sm:px-6">
      <header className="animate-fade-up mb-8">
        <p className="mb-2 font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl">
          ThaliScan
        </p>
        <p className="max-w-md text-sm leading-relaxed text-ink-soft/80 sm:text-base">
          Snap your North Indian veg thali — get calories, protein, and one smart cut.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-ink-soft/70">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 ${
              backendOk === false
                ? 'bg-red-100 text-danger'
                : backendOk
                  ? 'bg-leaf/10 text-leaf'
                  : 'bg-black/5'
            }`}
          >
            <span
              className={`size-1.5 rounded-full ${
                backendOk === false ? 'bg-danger' : backendOk ? 'bg-leaf' : 'bg-ink/30 animate-pulse-soft'
              }`}
            />
            {backendOk === null
              ? 'Checking API…'
              : backendOk
                ? visionReady
                  ? 'API ready'
                  : 'API up · set NVIDIA_API_KEY'
                : 'API offline'}
          </span>
        </div>
      </header>

      <main className="flex flex-1 flex-col gap-5">
        <section className="animate-fade-up relative overflow-hidden rounded-3xl border border-ink/8 bg-card/80 shadow-[0_20px_50px_-28px_rgba(26,46,36,0.45)] backdrop-blur-sm">
          <div
            className="pointer-events-none absolute inset-0 opacity-40"
            style={{
              backgroundImage:
                'radial-gradient(circle at 20% 20%, rgba(212,160,23,0.12), transparent 40%), radial-gradient(circle at 80% 0%, rgba(61,107,79,0.1), transparent 35%)',
            }}
          />

          <div className="relative p-5 sm:p-6">
            {preview ? (
              <div className="overflow-hidden rounded-2xl bg-ink/5">
                <img
                  src={preview}
                  alt="Meal preview"
                  className="max-h-72 w-full object-cover sm:max-h-80"
                />
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-ink/15 bg-mist/50 px-4 py-14 text-center">
                <div className="flex size-14 items-center justify-center rounded-2xl bg-ink text-turmeric">
                  <UtensilsCrossed className="size-7" strokeWidth={1.75} />
                </div>
                <p className="font-display text-xl text-ink">Your plate, estimated</p>
                <p className="max-w-xs text-sm text-ink-soft/75">
                  Dal, sabzi, roti, rice, paneer — portions in katoris, fat from ghee/oil counted in.
                </p>
              </div>
            )}

            <input
              ref={fileRef}
              id={inputId}
              type="file"
              accept="image/*"
              capture="environment"
              className="sr-only"
              onChange={onInputChange}
            />

            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
              <label
                htmlFor={inputId}
                className="inline-flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-2xl bg-ink px-5 py-3.5 text-sm font-semibold text-surface transition hover:bg-ink-soft active:scale-[0.98]"
              >
                {status === 'analyzing' ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Reading plate…
                  </>
                ) : (
                  <>
                    <Camera className="size-4 text-turmeric" />
                    Take Photo / Upload
                  </>
                )}
              </label>

              {preview && (
                <button
                  type="button"
                  onClick={reset}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-ink/15 bg-white/70 px-4 py-3.5 text-sm font-medium text-ink-soft transition hover:bg-white"
                >
                  <RefreshCw className="size-4" />
                  Reset
                </button>
              )}
            </div>

            <p className="mt-3 flex items-center gap-1.5 text-xs text-ink-soft/60">
              <ImagePlus className="size-3.5" />
              Private local app — photos stay on your machine / Tailscale network.
            </p>
          </div>
        </section>

        {error && (
          <div
            className="animate-fade-up rounded-2xl border border-danger/20 bg-red-50 px-4 py-3 text-sm text-danger"
            role="alert"
          >
            {error}
          </div>
        )}

        {status === 'analyzing' && (
          <div className="animate-fade-up flex items-center gap-3 rounded-2xl border border-ink/8 bg-card/90 px-4 py-4 text-sm text-ink-soft">
            <Sparkles className="size-5 animate-pulse-soft text-turmeric" />
            Identifying North Indian dishes and estimating portions…
          </div>
        )}

        {estimate && <ResultsPanel estimate={estimate} />}
      </main>

      <footer className="mt-10 text-center text-xs text-ink-soft/50">
        Prototype · estimates only · not medical advice
      </footer>
    </div>
  )
}
