'use client'

import { useState } from 'react'

/**
 * Flavor words. These are never graded — they exist to be reflected back and
 * grouped, so entry stays completely free-form. No autocomplete from a fixed
 * lexicon: suggesting the vocabulary is the same anchoring problem as showing
 * the descriptors before you taste.
 */
export function WordInput({
  words,
  onChange,
  placeholder,
}: {
  words: string[]
  onChange: (w: string[]) => void
  placeholder: string
}) {
  const [draft, setDraft] = useState('')

  function commit(raw: string) {
    const next = raw
      .split(',')
      .map((w) => w.trim().toLowerCase())
      .filter((w) => w && !words.includes(w))
    if (next.length) onChange([...words, ...next])
    setDraft('')
  }

  return (
    <div className="flex flex-col gap-2">
      {words.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {words.map((w) => (
            <button
              key={w}
              type="button"
              onClick={() => onChange(words.filter((x) => x !== w))}
              className="rounded-full border border-line bg-white px-3 py-1.5 text-[15px] active:bg-line"
            >
              {w} <span className="text-muted">×</span>
            </button>
          ))}
        </div>
      )}
      <input
        className="field"
        value={draft}
        placeholder={placeholder}
        autoCapitalize="none"
        autoCorrect="off"
        onChange={(e) => {
          if (e.target.value.endsWith(',')) commit(e.target.value)
          else setDraft(e.target.value)
        }}
        onBlur={() => commit(draft)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            commit(draft)
          }
        }}
      />
    </div>
  )
}
