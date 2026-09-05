export type Taster = string

export type User = {
  id: string
  external_id: string | null
  email: string | null
  display_name: string
}

export type Group = {
  id: string
  name: string
  invite_code: string
}

/** Who is signed in, and which group's cellar they are looking at. */
export type SessionUser = {
  id: string
  displayName: string
  groupId: string
  groupName: string
}

/** The six structure axes, plus finish. These get checked against reference values. */
export const LEVELS = ['low', 'medium-', 'medium', 'medium+', 'high'] as const
export type Level = (typeof LEVELS)[number]

export const SWEETNESS = ['bone dry', 'dry', 'off-dry', 'medium sweet', 'sweet'] as const
export type Sweetness = (typeof SWEETNESS)[number]

export const FINISH = ['short', 'medium', 'long'] as const
export type Finish = (typeof FINISH)[number]

export type Session = {
  id: string
  group_id: string
  number: number
  module: string | null
  focus: string | null
  blind: boolean
  created_at: string
}

export type Bottle = {
  id: string
  session_id: string
  position: number
  producer: string | null
  wine: string | null
  grape: string | null
  region: string | null
  country: string | null
  vintage: number | null
  abv: number | null
  price: number | null
  retailer: string | null
  label_photo_url: string | null
}

export type Note = {
  id: string
  bottle_id: string
  user_id: string
  nose_intensity: Level | null
  sweetness: Sweetness | null
  acidity: Level | null
  tannin: Level | null
  body: Level | null
  alcohol: Level | null
  finish: Finish | null
  nose_words: string[]
  palate_words: string[]
  score: number | null
  buy_again: boolean | null
  drink_with: string | null
  favourite: boolean
  blind_guess: string | null
  blind_correct: boolean | null
  takeaway: string | null
  created_at: string
}

/** What the taste screen submits. */
export type NoteDraft = Omit<Note, 'id' | 'created_at' | 'user_id'>
