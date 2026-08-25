import { LEVELS, SWEETNESS, FINISH } from './types'

/**
 * The single source of truth for what the taste screen asks and in what order.
 *
 * Each axis carries TWO colours. `chip` is the saturated tile on the folder
 * header; `fill` is the lighter tint a selected option fills with. One shared
 * colour cannot do both — saturated enough for the chip to read on #9900CC is
 * too dark to carry near-black option text.
 *
 * `kind` splits the three row shapes: `level` picks one of a list, `words` is
 * free flavour entry that is never graded, `free` is the closing step.
 */
export type AxisKind = 'level' | 'words' | 'free'

export type Axis = {
  key: string
  label: string
  kind: AxisKind
  chip: string
  fill?: string
  options?: readonly string[]
  /** Which notes column this writes to. */
  column?: string
}

export const AXES: Axis[] = [
  {
    key: 'nose_intensity',
    label: 'Nose intensity',
    kind: 'level',
    chip: '#2f88db',
    fill: '#8fc0e8',
    options: LEVELS,
  },
  { key: 'nose_words', label: 'Nose', kind: 'words', chip: '#4bb3d8' },
  {
    key: 'sweetness',
    label: 'Sweetness',
    kind: 'level',
    chip: '#f2ac13',
    fill: '#f6cc6e',
    options: SWEETNESS,
  },
  { key: 'acidity', label: 'Acidity', kind: 'level', chip: '#16b070', fill: '#6fd3ab', options: LEVELS },
  { key: 'tannin', label: 'Tannin', kind: 'level', chip: '#8b5cf6', fill: '#b39cf2', options: LEVELS },
  { key: 'body', label: 'Body', kind: 'level', chip: '#ec6a2e', fill: '#f2a077', options: LEVELS },
  { key: 'alcohol', label: 'Alcohol', kind: 'level', chip: '#f2497e', fill: '#f78fae', options: LEVELS },
  // Teal, not the magenta it used to be: on a #9900CC header a magenta chip
  // reads as a marginally different purple, and this axis loses its identity.
  { key: 'finish', label: 'Finish', kind: 'level', chip: '#0fa5b0', fill: '#7fd3da', options: FINISH },
  { key: 'palate_words', label: 'Palate', kind: 'words', chip: '#c2557a' },
  { key: 'anything_else', label: 'Anything else', kind: 'free', chip: '#ffffff' },
]

/** The order the accordion advances through. */
export const AXIS_KEYS = AXES.map((a) => a.key)
