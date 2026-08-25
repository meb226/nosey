import { writeFile } from 'node:fs/promises'

/** Home, intake and cellar, in Epilogue on Grape. They inherit whichever purple wins. */
const P = {
  ground: '#9d6ee8', groundTop: '#ac82ee',
  headline: '#211d26', sub: '#211d26',
  badgeBg: '#211d26', badgeFg: '#f6f2ea',
  card: '#f7f4ef', cardOpen: '#ffffff',
  ink: '#211d26', muted: '#7d7686', empty: '#b4aec0', hairline: '#e4ddd2',
  star: '#f2ac13', save: '#211d26', saveFg: '#f6f2ea',
  swatches: ['#9d6ee8', '#b46ad6', '#8a7cf5', '#6042a8'],
}
const CHIPS = ['#2f88db', '#f2ac13', '#16b070', '#7c4ceb', '#ec6a2e', '#f2497e', '#c53fb5']

const head = `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <script src="./support.js"></script>
</head>
<body>
<x-dc>
<helmet>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Epilogue:wght@400..800&display=swap">
  <style>
    body { margin: 0; font-family: Epilogue, system-ui, sans-serif; }
    a { color: ${P.save}; } a:hover { color: ${P.ink}; }
    * { -webkit-tap-highlight-color: transparent; box-sizing: border-box; }
    button { font-family: inherit; cursor: pointer; }
    input, textarea { font-family: inherit; font-size: 16px; }
  </style>
</helmet>
`
const prop = `data-props='{"ground":{"editor":"color","options":${JSON.stringify(P.swatches)},"default":"${P.ground}","section":"Theme"}}'`
const wrap = (h, body, logic) => `${head}
<div style="width: 375px; min-height: ${h}px; background: linear-gradient(180deg, ${P.groundTop} 0%, {{ground}} 46%); color: ${P.headline}; display: flex; flex-direction: column;">
${body}
</div>
</x-dc>
<script data-dc-script ${prop}>
${logic}
</script>
</body>
</html>
`
const label = (t) => `<span style="font-size: 12px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: ${P.muted};">${t}</span>`
const field = (t, v, span) => `
  <label style="display: flex; flex-direction: column; gap: 6px; ${span ? 'grid-column: span 2;' : ''}">
    ${label(t)}
    <input value="${v}" style="width: 100%; min-height: 46px; padding: 0 12px; border-radius: 9px; border: 2px solid ${P.hairline}; background: ${P.cardOpen}; color: ${P.ink}; outline: none;">
  </label>`

/* ------------------------------------------------------------------ home */

const home = wrap(720, `
  <div style="display: flex; flex-direction: column; gap: 22px; padding: 44px 20px 24px;">

    <div style="display: flex; flex-direction: column; gap: 6px;">
      <h1 style="margin: 0; font-size: 46px; font-weight: 800; letter-spacing: -0.04em; line-height: 0.95;">Wino</h1>
      <span style="font-size: 16px; font-weight: 500; color: ${P.sub}; text-wrap: pretty;">Write it down first. Then find out what it was.</span>
    </div>

    <div style="display: flex; gap: 8px;">
      <sc-for list="{{stats}}" as="s" hint-placeholder-count="3">
        <div style="flex-grow: 1; display: flex; flex-direction: column; gap: 1px; padding: 11px 12px; border-radius: 11px; border: 2px solid ${P.ink}; background: ${P.card}; color: ${P.ink};">
          <span style="font-size: 24px; font-weight: 800; letter-spacing: -0.03em; line-height: 1.1;">{{s.n}}</span>
          <span style="font-size: 12px; font-weight: 600; color: ${P.muted};">{{s.label}}</span>
        </div>
      </sc-for>
    </div>

    <button style="width: 100%; min-height: 58px; border-radius: 12px; border: 2px solid ${P.ink}; background: ${P.save}; color: ${P.saveFg}; font-size: 18px; font-weight: 700;">Start a session</button>

    <div style="display: flex; flex-direction: column; gap: 9px;">
      ${label('Pick up where you left off')}
      <sc-for list="{{recent}}" as="r" hint-placeholder-count="2">
        <button style="display: flex; align-items: center; gap: 11px; width: 100%; text-align: left; padding: 13px; border-radius: 11px; border: 2px solid ${P.ink}; background: ${P.card}; color: ${P.ink};">
          <span style="flex-shrink: 0; width: 17px; height: 17px; border-radius: 5px; border: 2px solid ${P.ink}; background: {{r.chip}};"></span>
          <span style="flex-grow: 1; min-width: 0; display: flex; flex-direction: column; gap: 1px;">
            <span style="font-size: 16px; font-weight: 700; letter-spacing: -0.012em;">{{r.title}}</span>
            <span style="font-size: 13px; font-weight: 500; color: ${P.muted};">{{r.meta}}</span>
          </span>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="${P.ink}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 6 15 12 9 18"></polyline></svg>
        </button>
      </sc-for>
    </div>

    <button style="width: 100%; min-height: 50px; border-radius: 12px; border: 2px solid ${P.ink}; background: transparent; color: ${P.ink}; font-size: 16px; font-weight: 600;">My cellar</button>
  </div>
  <div style="flex-grow: 1;"></div>
`, `
class Component extends DCLogic {
  renderVals() {
    return {
      ground: this.props.ground ?? '${P.ground}',
      stats: [
        { n: '14', label: 'bottles' },
        { n: '5', label: 'favourites' },
        { n: '7', label: 'sessions' },
      ],
      recent: [
        { title: 'Cool vs. warm Chardonnay', meta: 'Session 7 · both written', chip: '${CHIPS[1]}' },
        { title: 'Loire Cabernet Franc', meta: 'Session 6 · she has not written hers', chip: '${CHIPS[4]}' },
      ],
    };
  }
}
`)

/* ---------------------------------------------------------------- intake */

const intake = wrap(1240, `
  <div style="display: flex; flex-direction: column; gap: 20px; padding: 32px 20px 12px;">

    <div style="display: flex; flex-direction: column; gap: 5px;">
      <h1 style="margin: 0; font-size: 32px; font-weight: 800; letter-spacing: -0.028em; line-height: 1.02;">New session</h1>
      <span style="font-size: 15px; font-weight: 500; color: ${P.sub}; text-wrap: pretty;">Photograph both labels. Everything read off them is yours to correct.</span>
    </div>

    <div style="display: flex; flex-direction: column; gap: 13px; padding: 15px 14px; border-radius: 12px; border: 2px solid ${P.ink}; background: ${P.card}; color: ${P.ink};">
      <div style="display: grid; grid-template-columns: 88px 1fr; gap: 10px;">
        ${field('No.', '8')}
        ${field('Module', 'Whites, week 3')}
      </div>
      <label style="display: flex; flex-direction: column; gap: 6px;">
        ${label('What is this flight testing')}
        <textarea rows="2" style="width: 100%; padding: 11px 12px; border-radius: 9px; border: 2px solid ${P.hairline}; background: ${P.cardOpen}; color: ${P.ink}; outline: none; resize: none;">Same grape, stainless vs. oak</textarea>
      </label>
    </div>

    <sc-for list="{{bottles}}" as="b" hint-placeholder-count="2">
      <div style="display: flex; flex-direction: column; gap: 13px; padding: 15px 14px; border-radius: 12px; border: 2px solid ${P.ink}; background: ${P.card}; color: ${P.ink};">

        <div style="display: flex; align-items: center; justify-content: space-between; gap: 10px;">
          <span style="display: flex; align-items: center; gap: 10px;">
            <span style="width: 17px; height: 17px; border-radius: 5px; border: 2px solid ${P.ink}; background: {{b.chip}};"></span>
            <span style="font-size: 16px; font-weight: 700; letter-spacing: -0.012em;">{{b.title}}</span>
          </span>
          <sc-if value="{{b.read}}" hint-placeholder-val="{{true}}">
            <span style="font-size: 11px; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; color: ${P.ink}; background: ${P.star}; border: 2px solid ${P.ink}; border-radius: 999px; padding: 3px 9px;">Check it</span>
          </sc-if>
        </div>

        <sc-if value="{{b.read}}" hint-placeholder-val="{{true}}">
          <div style="display: flex; flex-direction: column; gap: 13px;">
            <div style="display: flex; align-items: center; justify-content: center; height: 104px; border-radius: 9px; border: 2px solid ${P.hairline}; background: #efe9df; color: ${P.muted}; gap: 8px;">
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M3 8.5A1.5 1.5 0 0 1 4.5 7h2L8 5h8l1.5 2h2A1.5 1.5 0 0 1 21 8.5v9A1.5 1.5 0 0 1 19.5 19h-15A1.5 1.5 0 0 1 3 17.5z"></path><circle cx="12" cy="12.5" r="3.4"></circle>
              </svg>
              <span style="font-size: 13px; font-weight: 600;">Label photo</span>
            </div>
            <div style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px;">
              ${field('Producer', 'Domaine de la Pépière', true)}
              ${field('Cuvée', 'Clos des Briords', true)}
              ${field('Grape', 'Melon de Bourgogne')}
              ${field('Region', 'Muscadet')}
              ${field('Vintage', '2022')}
              ${field('ABV', '12')}
            </div>
          </div>
        </sc-if>

        <sc-if value="{{b.empty}}" hint-placeholder-val="{{true}}">
          <button onClick="{{b.shoot}}" style="display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 9px; width: 100%; height: 148px; border-radius: 9px; border: 2px dashed ${P.muted}; background: ${P.cardOpen}; color: ${P.ink};">
            <svg width="27" height="27" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M3 8.5A1.5 1.5 0 0 1 4.5 7h2L8 5h8l1.5 2h2A1.5 1.5 0 0 1 21 8.5v9A1.5 1.5 0 0 1 19.5 19h-15A1.5 1.5 0 0 1 3 17.5z"></path><circle cx="12" cy="12.5" r="3.4"></circle>
            </svg>
            <span style="font-size: 16px; font-weight: 700;">Photograph the label</span>
            <span style="font-size: 13px; font-weight: 500; color: ${P.muted};">or fill it in yourself</span>
          </button>
        </sc-if>

      </div>
    </sc-for>
  </div>

  <div style="flex-grow: 1;"></div>
  <div style="padding: 12px 20px 20px;">
    <button style="width: 100%; min-height: 54px; border-radius: 12px; border: 2px solid ${P.ink}; background: ${P.save}; color: ${P.saveFg}; font-size: 17px; font-weight: 700;">Start tasting</button>
  </div>
`, `
class Component extends DCLogic {
  constructor(props) { super(props); this.state = { shot: [true, false] }; }
  renderVals() {
    const shot = this.state.shot;
    return {
      ground: this.props.ground ?? '${P.ground}',
      bottles: [0, 1].map((i) => ({
        title: 'Bottle ' + (i + 1),
        chip: ['${CHIPS[2]}', '${CHIPS[3]}'][i],
        read: shot[i],
        empty: !shot[i],
        shoot: () => {
          const next = shot.slice();
          next[i] = true;
          this.setState({ shot: next });
        },
      })),
    };
  }
}
`)

/* ---------------------------------------------------------------- cellar */

const cellar = wrap(1020, `
  <div style="display: flex; flex-direction: column; gap: 16px; padding: 32px 20px 24px;">
    <div style="display: flex; align-items: flex-end; justify-content: space-between; gap: 12px;">
      <div style="display: flex; flex-direction: column; gap: 3px;">
        <h1 style="margin: 0; font-size: 32px; font-weight: 800; letter-spacing: -0.028em; line-height: 1.02;">My cellar</h1>
        <span style="font-size: 15px; font-weight: 500; color: ${P.sub};">{{countLine}}</span>
      </div>
    </div>

    <div style="position: relative; display: flex; align-items: center;">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="${P.muted}" stroke-width="2.5" stroke-linecap="round" style="position: absolute; left: 13px;">
        <circle cx="11" cy="11" r="7"></circle><line x1="16.5" y1="16.5" x2="21" y2="21"></line>
      </svg>
      <input placeholder="Grape, region, a word you wrote" style="width: 100%; min-height: 48px; padding: 0 13px 0 40px; border-radius: 11px; border: 2px solid ${P.ink}; background: ${P.card}; color: ${P.ink}; outline: none;">
    </div>

    <div style="display: flex; flex-wrap: wrap; gap: 7px;">
      <sc-for list="{{filters}}" as="f" hint-placeholder-count="4">
        <button onClick="{{f.pick}}" style="display: flex; align-items: center; gap: 6px; min-height: 38px; padding: 0 13px; border-radius: 999px; border: 2px solid {{f.bc}}; font-size: 15px; font-weight: {{f.weight}}; color: ${P.ink}; background: {{f.bg}};">
          <sc-if value="{{f.isStar}}" hint-placeholder-val="{{true}}">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="{{f.starFill}}" stroke="${P.ink}" stroke-width="2" stroke-linejoin="round"><polygon points="12 2.6 15 9 22 9.9 17 14.7 18.2 21.6 12 18.3 5.8 21.6 7 14.7 2 9.9 9 9"></polygon></svg>
          </sc-if>
          <span>{{f.label}}</span>
        </button>
      </sc-for>
    </div>

    <div style="display: flex; flex-direction: column; gap: 9px;">
      <sc-for list="{{bottles}}" as="b" hint-placeholder-count="4">
        <div style="display: flex; border-radius: 12px; border: 2px solid ${P.ink}; overflow: hidden; background: ${P.card};">
          <span style="flex-shrink: 0; width: 11px; background: {{b.hue}}; border-right: 2px solid ${P.ink};"></span>
          <div style="flex-grow: 1; min-width: 0; display: flex; flex-direction: column; gap: 4px; padding: 13px; color: ${P.ink};">
            <div style="display: flex; align-items: flex-start; justify-content: space-between; gap: 10px;">
              <span style="font-size: 17px; font-weight: 700; line-height: 1.15; letter-spacing: -0.014em; text-wrap: pretty;">{{b.name}}</span>
              <span style="display: flex; flex-shrink: 0; align-items: center; gap: 7px;">
                <sc-if value="{{b.favourite}}" hint-placeholder-val="{{true}}">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="${P.star}" stroke="${P.ink}" stroke-width="2" stroke-linejoin="round"><polygon points="12 2.6 15 9 22 9.9 17 14.7 18.2 21.6 12 18.3 5.8 21.6 7 14.7 2 9.9 9 9"></polygon></svg>
                </sc-if>
                <span style="display: inline-flex; align-items: center; justify-content: center; min-width: 32px; height: 26px; padding: 0 7px; border-radius: 7px; border: 2px solid ${P.ink}; background: ${P.cardOpen}; font-size: 14px; font-weight: 700;">{{b.score}}</span>
              </span>
            </div>
            <span style="font-size: 13px; font-weight: 500; color: ${P.muted};">{{b.meta}}</span>
            <span style="font-size: 15px; line-height: 1.4; text-wrap: pretty;">{{b.takeaway}}</span>
          </div>
        </div>
      </sc-for>
    </div>
  </div>
  <div style="flex-grow: 1;"></div>
`, `
class Component extends DCLogic {
  constructor(props) { super(props); this.state = { filter: 'all' }; }
  all() {
    return [
      { name: 'Clos des Briords', grape: 'Melon de Bourgogne', meta: 'Muscadet Sèvre et Maine · 2022', hue: '${CHIPS[1]}', score: '9', favourite: true, takeaway: 'The salt is the whole point. Would not have called the acid high before tonight.' },
      { name: 'Vietti Perbacco', grape: 'Nebbiolo', meta: 'Langhe · 2021', hue: '${CHIPS[3]}', score: '8', favourite: false, takeaway: 'Grip that dries the gums long after the fruit has gone.' },
      { name: 'Hirsch Zöbing', grape: 'Grüner Veltliner', meta: 'Kamptal · 2021', hue: '${CHIPS[2]}', score: '7', favourite: true, takeaway: 'White pepper is real and not something I talked myself into.' },
      { name: 'Foradori Granato', grape: 'Teroldego', meta: 'Vigneti delle Dolomiti · 2019', hue: '${CHIPS[0]}', score: '9', favourite: true, takeaway: 'Both of us said medium tannin. Both of us were a step low.' },
    ];
  }
  renderVals() {
    const all = this.all();
    const f = this.state.filter;
    const shown = f === 'all' ? all : f === 'fav' ? all.filter((b) => b.favourite) : all.filter((b) => b.grape === f);
    const defs = [{ key: 'all', label: 'All' }, { key: 'fav', label: 'Favourites', star: true }, { key: 'Nebbiolo', label: 'Nebbiolo' }];
    return {
      ground: this.props.ground ?? '${P.ground}',
      bottles: shown,
      countLine: shown.length === all.length ? all.length + ' bottles · 3 favourites' : shown.length + ' of ' + all.length + ' bottles',
      filters: defs.map((d) => {
        const on = f === d.key;
        return {
          label: d.label, isStar: !!d.star,
          starFill: on ? '${P.star}' : 'none',
          bg: on ? '${P.star}' : '${P.card}',
          bc: on ? '${P.ink}' : '${P.hairline}',
          weight: on ? 700 : 500,
          pick: () => this.setState({ filter: d.key }),
        };
      }),
    };
  }
}
`)

await writeFile(new URL('./Home.dc.html', import.meta.url), home)
await writeFile(new URL('./Intake.dc.html', import.meta.url), intake)
await writeFile(new URL('./CellarPurple.dc.html', import.meta.url), cellar)
console.log('wrote Home, Intake, CellarPurple')
