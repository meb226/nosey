import sharp from 'sharp'
import { mkdir, writeFile, access } from 'node:fs/promises'
import { basename } from 'node:path'
import palette from '../palette.json' with { type: 'json' }

/**
 * Home-screen icons.
 *
 * Drop a logo at assets/logo.svg (or .png), or pass a path:
 *   npm run icons                 # uses assets/logo.* if present, else the drawn mark
 *   npm run icons -- my-logo.svg
 *
 * Three iOS facts this script exists to handle:
 *
 * 1. THE APPLE ICON MUST BE OPAQUE. iOS composites transparency onto black,
 *    so a transparent logo lands on the home screen in a black box. Every
 *    output here is flattened onto the app's ground colour.
 *
 * 2. DO NOT PRE-ROUND THE CORNERS. iOS applies its own superellipse mask. A
 *    logo that already has rounded corners gets rounded twice and reads as
 *    inset and slightly wrong. Supply a full-bleed square.
 *
 * 3. iOS USES apple-icon.png FOR THE HOME SCREEN, not the manifest icons.
 *    The manifest entries are for Android and desktop. Both are generated.
 */

// From palette.json, the same file Tailwind reads — so the icon and the UI
// cannot drift apart.
const { ground: GROUND, ink: INK, folder: FOLDER } = palette

/** The stand-in until a real logo lands: a tilted glass, filled. */
const FALLBACK = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="${GROUND}"/>
  <defs>
    <clipPath id="bowl">
      <path d="M170 122 H342 C342 212 310 260 256 260 C202 260 170 212 170 122 Z"/>
    </clipPath>
  </defs>
  <g transform="rotate(-8 256 256)" stroke="${INK}" stroke-width="20"
     stroke-linecap="round" stroke-linejoin="round" fill="none">
    <rect x="150" y="178" width="212" height="110" fill="${FOLDER}" stroke="none"
          clip-path="url(#bowl)"/>
    <path d="M170 122 H342 C342 212 310 260 256 260 C202 260 170 212 170 122 Z"/>
    <path d="M256 260 V356"/>
    <path d="M196 366 H316"/>
  </g>
</svg>`

async function exists(p) {
  try {
    await access(p)
    return true
  } catch {
    return false
  }
}

function flag(name) {
  const i = process.argv.indexOf(`--${name}`)
  return i === -1 ? null : process.argv[i + 1]
}

/**
 * A supplied logo usually carries its own full-bleed background, so padding it
 * with the app's ground colour would draw a border around it. Sampling the
 * source's own corner pixel makes any letterboxing invisible instead.
 */
/**
 * Repaint the logo's background to the app's folder purple.
 *
 * A flood fill from the border, not a colour swap: the wine surface at the rim
 * is also purple, and a swap would hit it. The background is the only purple
 * region connected to the edge of the canvas, so filling inward from the border
 * reaches it and nothing else.
 *
 * This is what makes padding seamless — once the background is genuinely flat
 * and known, the pad matches it exactly and no backdrop trickery is needed.
 */
async function normalizeBackground(src, target) {
  const { data, info } = await sharp(src)
    .flatten({ background: target })
    .raw()
    .toBuffer({ resolveWithObject: true })

  const { width: w, height: h, channels: ch } = info
  const tr = parseInt(target.slice(1, 3), 16)
  const tg = parseInt(target.slice(3, 5), 16)
  const tb = parseInt(target.slice(5, 7), 16)

  const seedR = data[0], seedG = data[1], seedB = data[2]
  const TOL = 78 * 78
  const near = (i) => {
    const dr = data[i] - seedR, dg = data[i + 1] - seedG, db = data[i + 2] - seedB
    return dr * dr + dg * dg + db * db <= TOL
  }

  const seen = new Uint8Array(w * h)
  const stack = []
  for (let x = 0; x < w; x++) {
    stack.push(x, (h - 1) * w + x)
  }
  for (let y = 0; y < h; y++) {
    stack.push(y * w, y * w + w - 1)
  }

  let filled = 0
  while (stack.length) {
    const p = stack.pop()
    if (seen[p]) continue
    const i = p * ch
    if (!near(i)) continue
    seen[p] = 1
    data[i] = tr
    data[i + 1] = tg
    data[i + 2] = tb
    filled++
    const x = p % w
    const y = (p / w) | 0
    if (x > 0) stack.push(p - 1)
    if (x < w - 1) stack.push(p + 1)
    if (y > 0) stack.push(p - w)
    if (y < h - 1) stack.push(p + w)
  }

  const pct = Math.round((filled / (w * h)) * 100)
  console.log(`  background repainted to ${target} (${pct}% of the canvas, flood-filled from the edges)`)
  return sharp(data, { raw: { width: w, height: h, channels: ch } }).png().toBuffer()
}

async function sampleCorner(src) {
  const { data } = await sharp(src)
    .extract({ left: 0, top: 0, width: 1, height: 1 })
    .flatten({ background: GROUND })
    .raw()
    .toBuffer({ resolveWithObject: true })
  const hex = (n) => n.toString(16).padStart(2, '0')
  return `#${hex(data[0])}${hex(data[1])}${hex(data[2])}`
}

async function findSource() {
  const arg = process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : null
  if (arg) {
    if (!(await exists(arg))) {
      console.error(`no such file: ${arg}`)
      process.exit(1)
    }
    return arg
  }
  for (const p of ['assets/logo.png', 'assets/logo.jpg']) {
    if (await exists(p)) return p
  }
  for (const p of ['assets/logo.svg', 'assets/logo.png', 'assets/logo.jpg']) {
    if (await exists(p)) return p
  }
  return null
}

const source = await findSource()
let input = source ?? Buffer.from(FALLBACK)

// A supplied logo is treated as full-bleed unless told otherwise; the drawn
// fallback is a floating mark and wants breathing room.
const BG = flag('bg') ?? FOLDER
const INSET = flag('inset') != null ? Number(flag('inset')) : source ? 0 : 0.1

if (source) {
  const meta = await sharp(source).metadata()
  console.log(`source: ${basename(source)} (${meta.width}×${meta.height}${meta.hasAlpha ? ', has alpha' : ''})`)
  const found = await sampleCorner(source)
  console.log(`  its own background: ${found}`)
  if (meta.hasAlpha) {
    console.log(`  transparency will be flattened onto ${BG} — iOS would use black otherwise`)
  }
  if (meta.width && meta.height && meta.width !== meta.height) {
    console.log('  not square: it will be letterboxed onto the ground colour rather than cropped')
  }
  if (!process.argv.includes('--keep-bg')) {
    input = await normalizeBackground(source, BG)
  }
} else {
  console.log('source: the built-in drawn mark (no assets/logo.* found)')
}

/**
 * `inset` is the share of the canvas left as breathing room. iOS rounds its
 * own corners, so 10% keeps artwork clear of the mask; Android's maskable
 * spec crops to a 40%-radius circle, which needs closer to 20%.
 */
/**
 * When a render needs padding, the fill cannot be a single sampled colour: a
 * logo whose background carries any gradient will show a visible box where the
 * flat pad meets it. So the backdrop is the source itself, blown up to fill and
 * heavily blurred — it matches the artwork's own colours and gradient at every
 * edge, and the seam disappears.
 */
async function backdrop(size) {
  return sharp(input)
    .resize(size, size, { fit: 'cover' })
    .blur(Math.max(2, Math.round(size / 12)))
    .flatten({ background: BG })
    .toBuffer()
}

async function render(out, size, inset) {
  const art = Math.round(size * (1 - inset * 2))
  const pad = Math.round((size - art) / 2)
  const resized = await sharp(input)
    .resize(art, art, { fit: 'contain', background: BG })
    .toBuffer()

  const base = sharp({ create: { width: size, height: size, channels: 4, background: BG } })

  await base
    .composite([{ input: resized, top: pad, left: pad }])
    .flatten({ background: BG })
    .png()
    .toFile(out)
  console.log(`  ${out} (${size}×${size})${pad > 0 ? ` — ${Math.round(inset * 100)}% margin, blurred backdrop` : ''}`)
}

await mkdir('public', { recursive: true })

// iOS home screen. 180px is what Safari asks for.
await render('app/apple-icon.png', 180, INSET)
// Browser tab and the manifest's any-purpose entries.
await render('app/icon.png', 512, INSET)
await render('public/icon-192.png', 192, INSET)
await render('public/icon-512.png', 512, INSET)
// Android maskable: more padding, because the launcher crops to a circle.
// Android crops to a circle, so this one always keeps a margin — filled with
// the sampled background, which makes it read as part of the artwork.
await render('public/icon-maskable-512.png', 512, Math.max(INSET, 0.18))

if (!source) await writeFile('public/icon.svg', FALLBACK)

console.log('done')
