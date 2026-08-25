'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useWakeLock } from '@/lib/useWakeLock'
import { WordInput } from '@/components/WordInput'
import { InfoTag } from '@/components/InfoTag'
import { AXIS_INFO, WORD_INFO } from '@/lib/axisInfo'
import { LEVELS, SWEETNESS, FINISH } from '@/lib/types'
import type { Bottle } from '@/lib/types'

/**
 * The six structure axes. Nose intensity is deliberately not one of them —
 * it belongs with the nose words, and the schema orders it that way.
 */
const AXES = [
  { key: 'sweetness', label: 'Sweetness', options: SWEETNESS },
  { key: 'acidity', label: 'Acidity', options: LEVELS },
  { key: 'tannin', label: 'Tannin', options: LEVELS },
  { key: 'body', label: 'Body', options: LEVELS },
  { key: 'alcohol', label: 'Alcohol', options: LEVELS },
  { key: 'finish', label: 'Finish', options: FINISH },
] as const

type Values = Record<string, string | undefined>

function Axis({
  label,
  info,
  options,
  value,
  onPick,
}: {
  label: string
  info: string
  options: readonly string[]
  value: string | undefined
  onPick: (v: string) => void
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[13px] uppercase tracking-wide text-muted">{label}</span>
        <InfoTag label={label} text={info} />
      </div>
      <div className="flex gap-1.5">
        {options.map((o) => (
          <button
            key={o}
            type="button"
            className="axis"
            aria-pressed={value === o}
            onClick={() => onPick(o)}
          >
            {o}
          </button>
        ))}
      </div>
    </div>
  )
}

export function TasteForm({
  bottles,
  sessionId,
  startAt,
}: {
  bottles: Bottle[]
  sessionId: string
  startAt: number
}) {
  const router = useRouter()
  const [index, setIndex] = useState(startAt)
  const [values, setValues] = useState<Values>({})
  const [noseWords, setNoseWords] = useState<string[]>([])
  const [palateWords, setPalateWords] = useState<string[]>([])
  const [score, setScore] = useState('')
  const [takeaway, setTakeaway] = useState('')
  const [saving, setSaving] = useState(false)

  const bottle = bottles[index]
  const last = index === bottles.length - 1

  // Twenty minutes with the phone face-up on the table. Released on save.
  useWakeLock(!saving)

  function reset() {
    setValues({})
    setNoseWords([])
    setPalateWords([])
    setScore('')
    setTakeaway('')
  }

  /** Written per bottle, on completion. Killing the tab loses at most this one. */
  async function save() {
    setSaving(true)
    const res = await fetch('/api/notes', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        bottle_id: bottle.id,
        nose_intensity: values.nose_intensity ?? null,
        sweetness: values.sweetness ?? null,
        acidity: values.acidity ?? null,
        tannin: values.tannin ?? null,
        body: values.body ?? null,
        alcohol: values.alcohol ?? null,
        finish: values.finish ?? null,
        nose_words: noseWords,
        palate_words: palateWords,
        score: score ? Number(score) : null,
        takeaway: takeaway || null,
      }),
    })
    if (!res.ok) {
      setSaving(false)
      return
    }
    if (last) {
      router.push(`/session/${sessionId}/learn`)
    } else {
      reset()
      setIndex(index + 1)
      setSaving(false)
      window.scrollTo(0, 0)
    }
  }

  return (
    <main className="mx-auto flex max-w-sm flex-col gap-6 px-6 pb-4 pt-10">
      <header>
        <div className="text-[13px] uppercase tracking-wide text-muted">
          Bottle {index + 1} of {bottles.length}
        </div>
        <h1 className="mt-1 text-2xl font-semibold">
          {[bottle.producer, bottle.wine].filter(Boolean).join(' ') || 'This one'}
        </h1>
        <p className="text-[15px] text-muted">
          {[bottle.region, bottle.vintage].filter(Boolean).join(' · ')}
        </p>
      </header>

      <section className="flex flex-col gap-3">
        <Axis
          label="Nose intensity"
          info={AXIS_INFO.nose_intensity}
          options={LEVELS}
          value={values.nose_intensity}
          onPick={(v) => setValues({ ...values, nose_intensity: v })}
        />
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[13px] uppercase tracking-wide text-muted">Nose</span>
          <InfoTag label="the nose words" text={WORD_INFO} />
        </div>
        <WordInput words={noseWords} onChange={setNoseWords} placeholder="What do you smell?" />
      </section>

      <section className="flex flex-col gap-3 border-t border-line pt-5">
        {AXES.map((a) => (
          <Axis
            key={a.key}
            label={a.label}
            info={AXIS_INFO[a.key]}
            options={a.options}
            value={values[a.key]}
            onPick={(v) => setValues({ ...values, [a.key]: v })}
          />
        ))}
      </section>

      <section className="flex flex-col gap-3 border-t border-line pt-5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[13px] uppercase tracking-wide text-muted">Palate</span>
          <InfoTag label="the palate words" text={WORD_INFO} />
        </div>
        <WordInput
          words={palateWords}
          onChange={setPalateWords}
          placeholder="What do you taste?"
        />
      </section>

      <label className="flex flex-col gap-1.5">
        <span className="text-[13px] uppercase tracking-wide text-muted">Score</span>
        <input
          className="field"
          inputMode="numeric"
          value={score}
          onChange={(e) => setScore(e.target.value)}
        />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-[13px] uppercase tracking-wide text-muted">Takeaway</span>
        <textarea
          className="field"
          rows={3}
          value={takeaway}
          onChange={(e) => setTakeaway(e.target.value)}
        />
      </label>

      {/*
        A docked action bar, not a floating button: it is opaque and would
        otherwise sit on top of whichever axis happened to be behind it. The
        paper backdrop and the -mx-6 bleed make it read as the bottom of the
        screen. env(safe-area-inset-bottom) padding is on body, so this clears
        the home indicator in standalone.
      */}
      <div className="sticky bottom-0 -mx-6 mt-2 bg-paper px-6 pb-3 pt-3">
        <button className="btn" onClick={save} disabled={saving}>
          {saving ? 'Saving…' : last ? 'Save and see what it was' : 'Save and pour the next'}
        </button>
      </div>
    </main>
  )
}
