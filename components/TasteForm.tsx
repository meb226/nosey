'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useWakeLock } from '@/lib/useWakeLock'
import { WordInput } from '@/components/WordInput'
import { InfoTag } from '@/components/InfoTag'
import { AXES, AXIS_BY_KEY } from '@/lib/axes'
import { AXIS_INFO, WORD_INFO } from '@/lib/axisInfo'
import type { Bottle } from '@/lib/types'
import palette from '@/palette.json'

type Levels = Record<string, string | undefined>

function Caret({ open }: { open: boolean }) {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={open ? 'rotate-180' : ''}
      aria-hidden
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  )
}

function Star({ filled }: { filled: boolean }) {
  return (
    <svg
      width="21"
      height="21"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinejoin="round"
      fill={filled ? 'currentColor' : 'none'}
      aria-hidden
    >
      <polygon points="12 2.6 15 9 22 9.9 17 14.7 18.2 21.6 12 18.3 5.8 21.6 7 14.7 2 9.9 9 9" />
    </svg>
  )
}

/** A low-to-high read alongside the word, so the scale is visible as well as named. */
function Pips({ index, total, selected }: { index: number; total: number; selected: boolean }) {
  return (
    <span className="flex h-3.5 items-end gap-[3px]" aria-hidden>
      {Array.from({ length: total }, (_, k) => (
        <span
          key={k}
          className="w-1 rounded-sm"
          style={{
            height: `${5 + Math.round((k / (total - 1)) * 9)}px`,
            background:
              k <= index ? palette.ink : selected ? 'rgba(36,26,43,0.3)' : palette.hairline,
          }}
        />
      ))}
    </span>
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
  const [open, setOpen] = useState<string>(AXES[0].key)
  const [levels, setLevels] = useState<Levels>({})
  const [noseWords, setNoseWords] = useState<string[]>([])
  const [palateWords, setPalateWords] = useState<string[]>([])
  const [score, setScore] = useState<number | null>(null)
  const [buyAgain, setBuyAgain] = useState<boolean | null>(null)
  const [drinkWith, setDrinkWith] = useState('')
  const [takeaway, setTakeaway] = useState('')
  const [favourite, setFavourite] = useState(false)
  const [saving, setSaving] = useState(false)

  const bottle = bottles[index]
  const last = index === bottles.length - 1

  // Twenty minutes with the phone face-up on the table. Released on save.
  useWakeLock(!saving)

  function advance(fromKey: string) {
    const i = AXES.findIndex((a) => a.key === fromKey)
    setOpen(AXES[i + 1] ? AXES[i + 1].key : '')
  }

  function reset() {
    setOpen(AXES[0].key)
    setLevels({})
    setNoseWords([])
    setPalateWords([])
    setScore(null)
    setBuyAgain(null)
    setDrinkWith('')
    setTakeaway('')
    setFavourite(false)
  }

  /** Written per bottle, on completion. Killing the tab loses at most this one. */
  async function save() {
    setSaving(true)
    const res = await fetch('/api/notes', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        bottle_id: bottle.id,
        nose_intensity: levels.nose_intensity ?? null,
        sweetness: levels.sweetness ?? null,
        acidity: levels.acidity ?? null,
        tannin: levels.tannin ?? null,
        body: levels.body ?? null,
        alcohol: levels.alcohol ?? null,
        finish: levels.finish ?? null,
        nose_words: noseWords,
        palate_words: palateWords,
        score,
        buy_again: buyAgain,
        drink_with: drinkWith || null,
        favourite,
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

  /** What a shut folder shows on its right, so you can see how far along you are. */
  function summary(key: string): string {
    if (key === 'nose_words') return noseWords.length ? `${noseWords.length} words` : ''
    if (key === 'palate_words') return palateWords.length ? `${palateWords.length} words` : ''
    if (key === 'anything_else') return score != null ? `${score}/10` : ''
    return levels[key] ?? ''
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col bg-gradient-to-b from-groundtop to-ground to-[46%]">
      <div className="flex flex-col gap-5 px-5 pb-3 pt-8">
        <div className="flex items-start justify-between gap-3.5">
          <div className="flex flex-col gap-2.5">
            <span className="self-start rounded-full bg-headline px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-groundtop">
              Bottle {index + 1} of {bottles.length}
            </span>
            <h1 className="text-[32px] font-extrabold leading-[1.04] tracking-[-0.026em] text-headline text-pretty">
              {[bottle.producer, bottle.wine].filter(Boolean).join(' ') || 'This one'}
            </h1>
            <span className="text-[15px] font-semibold text-sub">
              {[bottle.region, bottle.vintage].filter(Boolean).join(' · ')}
            </span>
          </div>

          <button
            type="button"
            onClick={() => setFavourite(!favourite)}
            aria-pressed={favourite}
            aria-label="Mark as a favourite"
            className={`flex h-[46px] w-[46px] flex-shrink-0 items-center justify-center rounded-full border-2 border-ink text-ink ${
              favourite ? 'bg-amber' : 'bg-white'
            }`}
          >
            <Star filled={favourite} />
          </button>
        </div>

        <div className="flex flex-col gap-2.5">
          {AXES.map((axis) => {
            const isOpen = open === axis.key
            const value = summary(axis.key)
            return (
              <div key={axis.key} className="folder">
                <button
                  type="button"
                  data-open={isOpen}
                  aria-expanded={isOpen}
                  onClick={() => setOpen(isOpen ? '' : axis.key)}
                  className="folder-head"
                >
                  <span className="flex items-center gap-2.5">
                    <span className="chip" style={{ background: axis.chip }} aria-hidden />
                    <span className="text-[15px] font-bold tracking-[-0.008em]">{axis.label}</span>
                  </span>
                  <span className="flex items-center gap-2.5">
                    <span
                      className={`text-[18px] font-bold ${value ? 'text-onfolder' : 'text-onfoldermuted'}`}
                    >
                      {value || '—'}
                    </span>
                    <Caret open={isOpen} />
                  </span>
                </button>

                {isOpen && (
                  <div className="folder-body">
                    {axis.kind === 'level' && (
                      <>
                        <InfoTag label={axis.label} text={AXIS_INFO[axis.key]} />
                        <div className="flex flex-col gap-[7px]">
                          {axis.options!.map((o, j) => {
                            const on = levels[axis.key] === o
                            return (
                              <button
                                key={o}
                                type="button"
                                aria-pressed={on}
                                className="opt"
                                style={on ? { background: axis.fill } : undefined}
                                onClick={() => {
                                  setLevels({ ...levels, [axis.key]: o })
                                  advance(axis.key)
                                }}
                              >
                                <span>{o}</span>
                                <Pips index={j} total={axis.options!.length} selected={on} />
                              </button>
                            )
                          })}
                        </div>
                      </>
                    )}

                    {axis.kind === 'words' && (
                      <>
                        <InfoTag label={`the ${axis.label.toLowerCase()} words`} text={WORD_INFO} />
                        <WordInput
                          words={axis.key === 'nose_words' ? noseWords : palateWords}
                          onChange={axis.key === 'nose_words' ? setNoseWords : setPalateWords}
                          placeholder={
                            axis.key === 'nose_words' ? 'What do you smell?' : 'What do you taste?'
                          }
                        />
                        <button
                          type="button"
                          onClick={() => advance(axis.key)}
                          className="btn-quiet mt-3"
                        >
                          Next
                        </button>
                      </>
                    )}

                    {axis.kind === 'free' && (
                      <div className="flex flex-col gap-4">
                        <div className="flex items-center justify-between gap-3">
                          <span className="eyebrow">Score</span>
                          <span className="flex items-center gap-2.5">
                            <button
                              type="button"
                              aria-label="Lower the score"
                              onClick={() => setScore(Math.max(1, (score ?? 8) - 1))}
                              className="h-12 w-12 rounded-[9px] border-2 border-ink bg-white text-[23px] font-bold leading-none text-ink active:bg-ink active:text-white"
                            >
                              −
                            </button>
                            <span
                              className={`min-w-[60px] text-center text-[33px] font-extrabold tracking-[-0.026em] ${
                                score == null ? 'text-empty' : 'text-ink'
                              }`}
                            >
                              {score ?? '—'}
                            </span>
                            <button
                              type="button"
                              aria-label="Raise the score"
                              onClick={() => setScore(Math.min(10, (score ?? 6) + 1))}
                              className="h-12 w-12 rounded-[9px] border-2 border-ink bg-white text-[23px] font-bold leading-none text-ink active:bg-ink active:text-white"
                            >
                              +
                            </button>
                          </span>
                        </div>

                        <div className="flex flex-col gap-2">
                          <span className="eyebrow">Buy it again</span>
                          <div className="flex gap-[7px]">
                            {[true, false].map((yes) => (
                              <button
                                key={String(yes)}
                                type="button"
                                aria-pressed={buyAgain === yes}
                                className="opt flex-1 justify-center"
                                style={buyAgain === yes ? { background: AXIS_BY_KEY.acidity.fill } : undefined}
                                onClick={() => setBuyAgain(buyAgain === yes ? null : yes)}
                              >
                                {yes ? 'Yes' : 'No'}
                              </button>
                            ))}
                          </div>
                        </div>

                        <label className="flex flex-col gap-2">
                          <span className="eyebrow">Drink it with</span>
                          <input
                            className="field min-h-[50px]"
                            value={drinkWith}
                            onChange={(e) => setDrinkWith(e.target.value)}
                            placeholder="Oysters, or anything salty"
                          />
                        </label>

                        <label className="flex flex-col gap-2">
                          <span className="eyebrow">Anything else</span>
                          <textarea
                            className="field resize-none"
                            rows={3}
                            value={takeaway}
                            onChange={(e) => setTakeaway(e.target.value)}
                            placeholder="The one thing you want to remember"
                          />
                        </label>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      <div className="flex-1" />

      {/*
        A docked bar, not a floating button: it needs an opaque backdrop or
        the folders scroll through behind it. env() padding on body clears
        the home indicator.
      */}
      <div className="sticky bottom-0 bg-ground px-5 pb-5 pt-3">
        <button className="btn" onClick={save} disabled={saving}>
          {saving ? 'Saving…' : last ? 'Save and see what it was' : 'Save and pour the next'}
        </button>
      </div>
    </main>
  )
}
