import { redirect } from 'next/navigation'

/** /log was the original name. Kept so old links and bookmarks still land. */
export default function Log() {
  redirect('/cellar')
}
