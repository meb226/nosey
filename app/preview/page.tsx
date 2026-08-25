import { notFound } from 'next/navigation'
import { TasteForm } from '@/components/TasteForm'
import type { Bottle } from '@/lib/types'

/**
 * Dev-only. The taste screen with fake bottles and no database, so the layout
 * can be worked on before Neon exists and without burning a real session.
 * Saving from here will 401 — that is the point; this is for looking at.
 */
export const dynamic = 'force-dynamic'

const FAKE: Bottle[] = [
  {
    id: 'preview-1',
    session_id: 'preview',
    position: 1,
    producer: 'Domaine de la Pépière',
    wine: 'Clos des Briords',
    grape: 'Melon de Bourgogne',
    region: 'Muscadet Sèvre et Maine',
    country: 'France',
    vintage: 2022,
    abv: 12,
    price: null,
    retailer: null,
    label_photo_url: null,
  },
  {
    id: 'preview-2',
    session_id: 'preview',
    position: 2,
    producer: 'Vietti',
    wine: 'Perbacco',
    grape: 'Nebbiolo',
    region: 'Langhe',
    country: 'Italy',
    vintage: 2021,
    abv: 14,
    price: null,
    retailer: null,
    label_photo_url: null,
  },
]

export default function Preview() {
  if (process.env.NODE_ENV === 'production') notFound()
  return <TasteForm bottles={FAKE} sessionId="preview" startAt={0} />
}
