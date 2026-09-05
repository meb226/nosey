'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { AXES } from '@/lib/axes'
import { resizeImage } from '@/lib/resizeImage'

type Draft = {
  producer: string
  wine: string
  grape: string
  region: string
  country: string
  vintage: string
  abv: string
  price: string
  retailer: string
  label_photo_url: string | null
  read: boolean
  reading: boolean
  error: string | null
}

const EMPTY: Draft = {
  producer: '', wine: '', grape: '', region: '', country: '',
  vintage: '', abv: '', price: '', retailer: '',
  label_photo_url: null, read: false, reading: false, error: null,
}

const FIELDS = [
  ['producer', 'Producer', true],
  ['wine', 'Cuvée', true],
  ['grape', 'Grape', false],
  ['region', 'Region', false],
  ['country', 'Country', false],
  ['vintage', 'Vintage', false],
  ['abv', 'ABV', false],
  ['price', 'Price', false],
  ['retailer', 'Retailer', false],
] as const

function CameraIcon({ size = 27 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M3 8.5A1.5 1.5 0 0 1 4.5 7h2L8 5h8l1.5 2h2A1.5 1.5 0 0 1 21 8.5v9A1.5 1.5 0 0 1 19.5 19h-15A1.5 1.5 0 0 1 3 17.5z" />
      <circle cx="12" cy="12.5" r="3.4" />
    </svg>
  )
}

export function NewSessionForm({ nextNumber }: { nextNumber: number }) {
  const router = useRouter()
  const [number, setNumber] = useState(String(nextNumber))
  const [module, setModule] = useState('')
  const [focus, setFocus] = useState('')
  const [bottles, setBottles] = useState<Draft[]>([{ ...EMPTY }, { ...EMPTY }])
  const [busy, setBusy] = useState(false)

  function patch(i: number, next: Partial<Draft>) {
    setBottles((bs) => bs.map((b, j) => (j === i ? { ...b, ...next } : b)))
  }

  /**
   * Photo → Blob → Claude vision → prefill. Everything that comes back lands
   * in an editable input and the CHECK IT badge says out loud that a machine
   * guessed. Nothing commits until the form is submitted. OCR proposes.
   */
  async function readLabel(i: number, file: File) {
    patch(i, { reading: true, error: null })

    // Shrunk in the browser, so neither the upload, the blob store nor the
    // vision call ever sees the full-size photo.
    const form = new FormData()
    form.append('file', await resizeImage(file))
    const up = await fetch('/api/upload', { method: 'POST', body: form })
    if (!up.ok) {
      patch(i, { reading: false, error: "Couldn't upload that photo." })
      return
    }
    const { url } = await up.json()
    patch(i, { label_photo_url: url })

    const res = await fetch('/api/ocr', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ imageUrl: url }),
    })
    if (!res.ok) {
      patch(i, { reading: false, read: true, error: 'Photo saved, but the label was hard to read. Fill it in yourself.' })
      return
    }
    const d = await res.json()
    patch(i, {
      reading: false,
      read: true,
      producer: d.producer ?? '',
      wine: d.wine ?? '',
      grape: d.grape ?? '',
      region: d.region ?? '',
      country: d.country ?? '',
      vintage: d.vintage != null ? String(d.vintage) : '',
      abv: d.abv != null ? String(d.abv) : '',
    })
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    const res = await fetch('/api/sessions', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        number: Number(number) || null,
        module: module || null,
        focus: focus || null,
        bottles: bottles.map((b) => ({
          producer: b.producer || null,
          wine: b.wine || null,
          grape: b.grape || null,
          region: b.region || null,
          country: b.country || null,
          vintage: b.vintage ? Number(b.vintage) : null,
          abv: b.abv ? Number(b.abv) : null,
          price: b.price ? Number(b.price) : null,
          retailer: b.retailer || null,
          label_photo_url: b.label_photo_url,
        })),
      }),
    })
    if (!res.ok) {
      setBusy(false)
      return
    }
    const { id } = await res.json()
    router.push(`/session/${id}/taste`)
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col bg-gradient-to-b from-groundtop to-ground to-[46%]">
      <form onSubmit={submit} className="flex flex-col gap-5 px-5 pb-3 pt-8">
        <div className="flex flex-col gap-1">
          <h1 className="text-[32px] font-extrabold leading-[1.02] tracking-[-0.028em] text-headline">
            New session
          </h1>
          <p className="text-[15px] font-semibold text-sub text-pretty">
            Photograph both labels. Everything read off them is yours to correct.
          </p>
        </div>

        <div className="folder">
          <div className="folder-body gap-3.5">
            <div className="grid grid-cols-[88px_1fr] gap-2.5">
              <label className="flex flex-col gap-1.5">
                <span className="eyebrow">No.</span>
                <input
                  className="field min-h-[46px]"
                  inputMode="numeric"
                  value={number}
                  onChange={(e) => setNumber(e.target.value)}
                />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="eyebrow">Module</span>
                <input
                  className="field min-h-[46px]"
                  value={module}
                  onChange={(e) => setModule(e.target.value)}
                />
              </label>
            </div>
            <label className="flex flex-col gap-1.5">
              <span className="eyebrow">What is this flight testing</span>
              <textarea
                className="field resize-none"
                rows={2}
                value={focus}
                onChange={(e) => setFocus(e.target.value)}
                placeholder="Same grape, stainless vs. oak"
              />
            </label>
          </div>
        </div>

        {bottles.map((b, i) => (
          <div key={i} className="folder">
            <div className="folder-body gap-3.5">
              <div className="flex items-center justify-between gap-2.5">
                <span className="flex items-center gap-2.5">
                  <span
                    className="chip border-ink"
                    style={{ background: AXES[i * 3].chip }}
                    aria-hidden
                  />
                  <span className="text-[16px] font-bold tracking-[-0.012em]">Bottle {i + 1}</span>
                </span>
                {b.read && (
                  <span className="rounded-full border-2 border-ink bg-amber px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-[0.05em]">
                    Check it
                  </span>
                )}
              </div>

              {b.label_photo_url ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={b.label_photo_url}
                  alt=""
                  className="h-[104px] w-full rounded-[9px] border-2 border-hairline object-cover"
                />
              ) : null}

              {b.error && <p className="text-[14px] font-semibold text-ink">{b.error}</p>}

              {!b.read ? (
                <label
                  className={`flex h-[148px] w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-[9px] border-2 border-dashed border-muted bg-white text-ink active:bg-hairline ${
                    b.reading ? 'opacity-60' : ''
                  }`}
                >
                  <CameraIcon />
                  <span className="text-[16px] font-bold">
                    {b.reading ? 'Reading the label…' : 'Photograph the label'}
                  </span>
                  <span className="text-[13px] font-medium text-muted">or fill it in yourself</span>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    disabled={b.reading}
                    onChange={(e) => {
                      const f = e.target.files?.[0]
                      if (f) void readLabel(i, f)
                    }}
                  />
                </label>
              ) : (
                <div className="grid grid-cols-2 gap-2.5">
                  {FIELDS.map(([key, label, wide]) => (
                    <label
                      key={key}
                      className={`flex flex-col gap-1.5 ${wide ? 'col-span-2' : ''}`}
                    >
                      <span className="eyebrow">{label}</span>
                      <input
                        className="field min-h-[46px]"
                        inputMode={
                          key === 'vintage' || key === 'abv' || key === 'price' ? 'decimal' : 'text'
                        }
                        value={b[key]}
                        onChange={(e) => patch(i, { [key]: e.target.value })}
                      />
                    </label>
                  ))}
                </div>
              )}

              {!b.read && (
                <button
                  type="button"
                  className="btn-quiet"
                  onClick={() => patch(i, { read: true })}
                >
                  Skip the photo
                </button>
              )}
            </div>
          </div>
        ))}

        <button className="btn" disabled={busy}>
          {busy ? 'Pouring…' : 'Start tasting'}
        </button>
      </form>
      <div className="flex-1" />
    </main>
  )
}
