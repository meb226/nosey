'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

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
  reading: boolean
  error: string | null
}

const EMPTY: Draft = {
  producer: '',
  wine: '',
  grape: '',
  region: '',
  country: '',
  vintage: '',
  abv: '',
  price: '',
  retailer: '',
  label_photo_url: null,
  reading: false,
  error: null,
}

const FIELDS = [
  ['producer', 'Producer'],
  ['wine', 'Cuvée'],
  ['grape', 'Grape'],
  ['region', 'Region'],
  ['country', 'Country'],
  ['vintage', 'Vintage'],
  ['abv', 'ABV'],
  ['price', 'Price'],
  ['retailer', 'Retailer'],
] as const

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
   * Photo → Blob → OCR → prefill. Everything OCR returns lands in an editable
   * input; nothing is committed until the form is submitted. OCR proposes.
   */
  async function readLabel(i: number, file: File) {
    patch(i, { reading: true, error: null })

    const form = new FormData()
    form.append('file', file)
    const up = await fetch('/api/upload', { method: 'POST', body: form })
    if (!up.ok) {
      patch(i, { reading: false, error: "couldn't upload that photo" })
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
      patch(i, { reading: false, error: 'photo saved, but the label was hard to read' })
      return
    }
    const d = await res.json()
    patch(i, {
      reading: false,
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
    <form onSubmit={submit} className="mx-auto flex max-w-sm flex-col gap-6 px-6 py-10">
      <h1 className="text-2xl font-semibold">New session</h1>

      <div className="flex gap-3">
        <label className="flex w-24 flex-col gap-1.5">
          <span className="text-[13px] uppercase tracking-wide text-muted">No.</span>
          <input
            className="field"
            inputMode="numeric"
            value={number}
            onChange={(e) => setNumber(e.target.value)}
          />
        </label>
        <label className="flex flex-1 flex-col gap-1.5">
          <span className="text-[13px] uppercase tracking-wide text-muted">Module</span>
          <input className="field" value={module} onChange={(e) => setModule(e.target.value)} />
        </label>
      </div>

      <label className="flex flex-col gap-1.5">
        <span className="text-[13px] uppercase tracking-wide text-muted">
          What is this flight testing
        </span>
        <textarea
          className="field"
          rows={2}
          value={focus}
          onChange={(e) => setFocus(e.target.value)}
          placeholder="Same grape, cool vs. warm climate"
        />
      </label>

      {bottles.map((b, i) => (
        <section key={i} className="flex flex-col gap-3 border-t border-line pt-5">
          <h2 className="text-[13px] uppercase tracking-wide text-muted">Bottle {i + 1}</h2>

          {b.label_photo_url && (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={b.label_photo_url}
              alt=""
              className="h-40 w-full rounded-lg object-cover"
            />
          )}

          <label className="btn cursor-pointer text-center">
            {b.reading ? 'Reading the label…' : b.label_photo_url ? 'Retake photo' : 'Photograph label'}
            <input
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) void readLabel(i, f)
              }}
            />
          </label>

          {b.error && <p className="text-[14px] text-wine">{b.error}</p>}

          <div className="grid grid-cols-2 gap-3">
            {FIELDS.map(([key, label]) => (
              <label
                key={key}
                className={`flex flex-col gap-1.5 ${key === 'producer' || key === 'wine' ? 'col-span-2' : ''}`}
              >
                <span className="text-[13px] uppercase tracking-wide text-muted">{label}</span>
                <input
                  className="field"
                  inputMode={
                    key === 'vintage' || key === 'abv' || key === 'price' ? 'decimal' : 'text'
                  }
                  value={b[key]}
                  onChange={(e) => patch(i, { [key]: e.target.value })}
                />
              </label>
            ))}
          </div>
        </section>
      ))}

      <button className="btn" disabled={busy}>
        {busy ? 'Pouring…' : 'Start tasting'}
      </button>
    </form>
  )
}
