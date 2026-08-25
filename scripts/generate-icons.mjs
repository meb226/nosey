import sharp from 'sharp'
import { mkdir, writeFile } from 'node:fs/promises'

/**
 * A filled glass, tilted the way you tilt one to look at the rim. iOS masks
 * the corners itself, so the mark is drawn well inside a full-bleed square
 * rather than on a rounded card.
 */
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="#faf7f2"/>
  <defs>
    <clipPath id="bowl">
      <path d="M170 122 H342 C342 212 310 260 256 260 C202 260 170 212 170 122 Z"/>
    </clipPath>
  </defs>
  <g transform="rotate(-8 256 256)" stroke="#6b2440" stroke-width="20"
     stroke-linecap="round" stroke-linejoin="round" fill="none">
    <!-- Wine level, clipped to the bowl so it can never cross the outline. -->
    <rect x="150" y="178" width="212" height="110" fill="#6b2440" stroke="none"
          clip-path="url(#bowl)"/>
    <path d="M170 122 H342 C342 212 310 260 256 260 C202 260 170 212 170 122 Z"/>
    <path d="M256 260 V356"/>
    <path d="M196 366 H316"/>
  </g>
</svg>`

const out = 'public'
await mkdir(out, { recursive: true })

for (const size of [192, 512]) {
  await sharp(Buffer.from(svg)).resize(size, size).png().toFile(`${out}/icon-${size}.png`)
}

// File-based metadata icons: Next emits the <link> tags, and iOS uses the
// apple one for the home screen.
await sharp(Buffer.from(svg)).resize(180, 180).png().toFile('app/apple-icon.png')
await sharp(Buffer.from(svg)).resize(512, 512).png().toFile('app/icon.png')
await writeFile(`${out}/icon.svg`, svg)

console.log('icons written')
