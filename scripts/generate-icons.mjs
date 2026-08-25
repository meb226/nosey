import sharp from 'sharp'
import { mkdir, writeFile, access } from 'node:fs/promises'
import { basename } from 'node:path'

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

const GROUND = '#dfa3f5'
const INK = '#241a2b'
const FOLDER = '#9900cc'

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

async function findSource() {
  const arg = process.argv[2]
  if (arg) {
    if (!(await exists(arg))) {
      console.error(`no such file: ${arg}`)
      process.exit(1)
    }
    return arg
  }
  for (const p of ['assets/logo.svg', 'assets/logo.png', 'assets/logo.jpg']) {
    if (await exists(p)) return p
  }
  return null
}

const source = await findSource()
const input = source ?? Buffer.from(FALLBACK)

if (source) {
  const meta = await sharp(source).metadata()
  console.log(`source: ${basename(source)} (${meta.width}×${meta.height}${meta.hasAlpha ? ', has alpha' : ''})`)
  if (meta.hasAlpha) {
    console.log(`  transparency will be flattened onto ${GROUND} — iOS would use black otherwise`)
  }
  if (meta.width && meta.height && meta.width !== meta.height) {
    console.log('  not square: it will be letterboxed onto the ground colour rather than cropped')
  }
} else {
  console.log('source: the built-in drawn mark (no assets/logo.* found)')
}

/**
 * `inset` is the share of the canvas left as breathing room. iOS rounds its
 * own corners, so 10% keeps artwork clear of the mask; Android's maskable
 * spec crops to a 40%-radius circle, which needs closer to 20%.
 */
async function render(out, size, inset) {
  const art = Math.round(size * (1 - inset * 2))
  const pad = Math.round((size - art) / 2)
  const resized = await sharp(input)
    .resize(art, art, { fit: 'contain', background: GROUND })
    .toBuffer()
  await sharp({
    create: { width: size, height: size, channels: 4, background: GROUND },
  })
    .composite([{ input: resized, top: pad, left: pad }])
    .flatten({ background: GROUND })
    .png()
    .toFile(out)
  console.log(`  ${out} (${size}×${size})`)
}

await mkdir('public', { recursive: true })

// iOS home screen. 180px is what Safari asks for.
await render('app/apple-icon.png', 180, 0.1)
// Browser tab and the manifest's any-purpose entries.
await render('app/icon.png', 512, 0.1)
await render('public/icon-192.png', 192, 0.1)
await render('public/icon-512.png', 512, 0.1)
// Android maskable: more padding, because the launcher crops to a circle.
await render('public/icon-maskable-512.png', 512, 0.2)

if (!source) await writeFile('public/icon.svg', FALLBACK)

console.log('done')
