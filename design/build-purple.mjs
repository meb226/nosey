import { writeFile } from 'node:fs/promises'

/**
 * Epilogue, clean treatment, purple ground. Plus the two screens that had
 * never been drawn: the front of the app, and label intake.
 *
 * The chips now pop because each axis carries TWO values, not one. The small
 * square uses a saturated `chip`; the selected option fills with a lighter
 * `fill`. Saturating a single shared colour would have made the chips sing
 * and pushed the near-black option text under a readable contrast ratio —
 * splitting the role fixes both at once.
 */
const HUES = {
  nose_intensity: { chip: '#2f88db', fill: '#8fc0e8' },
  sweetness:      { chip: '#f2ac13', fill: '#f6cc6e' },
  acidity:        { chip: '#16b070', fill: '#6fd3ab' },
  tannin:         { chip: '#7c4ceb', fill: '#b39cf2' },
  body:           { chip: '#ec6a2e', fill: '#f2a077' },
  alcohol:        { chip: '#f2497e', fill: '#f78fae' },
  finish:         { chip: '#c53fb5', fill: '#dd8fd3' },
}

const BASE = {
  // Dark type on the ground, not cream: at this lightness a cream headline
  // drops under 4:1, and ink on saturated purple is what makes it read light
  // rather than merely pale. Sub-text shares the headline's ink and separates
  // by size and weight instead of by colour, which keeps it at 4.6:1.
  headline: '#211d26', sub: '#211d26',
  badgeBg: '#211d26', badgeFg: '#f6f2ea',
  card: '#f7f4ef', cardOpen: '#ffffff',
  ink: '#211d26', muted: '#7d7686', empty: '#b4aec0', hairline: '#e4ddd2',
  star: '#f2ac13',
  // The primary button goes ink on a light ground — amber on light purple is
  // two mid-tones fighting, and the star needs the amber more than this does.
  save: '#211d26', saveFg: '#f6f2ea',
  swatches: ['#9d6ee8', '#b46ad6', '#8a7cf5', '#6042a8'],
}

const PURPLES = {
  Amethyst:   { ...BASE, ground: '#9d6ee8', groundTop: '#ac82ee' },
  Orchid:     { ...BASE, ground: '#b46ad6', groundTop: '#c17fde' },
  Periwinkle: { ...BASE, ground: '#8a7cf5', groundTop: '#9b8ff8' },
}

const FONT = {
  link: 'family=Epilogue:wght@400..800',
  stack: 'Epilogue, system-ui, sans-serif',
}

const head = (p) => `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <script src="./support.js"></script>
</head>
<body>
<x-dc>
<helmet>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?${FONT.link}&display=swap">
  <style>
    body { margin: 0; font-family: ${FONT.stack}; }
    a { color: ${p.save}; } a:hover { color: ${p.ink}; }
    * { -webkit-tap-highlight-color: transparent; box-sizing: border-box; }
    button { font-family: inherit; cursor: pointer; }
    input, textarea { font-family: inherit; font-size: 16px; }
  </style>
</helmet>
`

const shell = (p, h, body) => `${head(p)}
<div style="width: 375px; min-height: ${h}px; background: linear-gradient(180deg, ${p.groundTop} 0%, {{ground}} 46%); color: ${p.headline}; display: flex; flex-direction: column;">
${body}
</div>
</x-dc>
`

const groundProp = (p) =>
  `data-props='{"ground":{"editor":"color","options":${JSON.stringify(p.swatches)},"default":"${p.ground}","section":"Theme"}}'`

/* ---------------------------------------------------------------- taste */

const taste = (p) => shell(p, 960, `
  <div style="display: flex; flex-direction: column; gap: 20px; padding: 32px 20px 12px;">
    <div style="display: flex; align-items: flex-start; justify-content: space-between; gap: 14px;">
      <div style="display: flex; flex-direction: column; gap: 10px;">
        <span style="align-self: flex-start; background: ${p.badgeBg}; color: ${p.badgeFg}; font-size: 10px; font-weight: 700; letter-spacing: 0.16em; text-transform: uppercase; padding: 5px 11px; border-radius: 999px;">Bottle 1 of 2</span>
        <h1 style="margin: 0; font-size: 32px; font-weight: 800; line-height: 1.04; letter-spacing: -0.026em; text-wrap: pretty;">Clos des Briords</h1>
        <span style="font-size: 15px; font-weight: 500; color: ${p.sub};">Muscadet Sèvre et Maine · 2022</span>
      </div>
      <button onClick="{{toggleFavourite}}" aria-pressed="{{isFavourite}}" style="flex-shrink: 0; width: 46px; height: 46px; display: flex; align-items: center; justify-content: center; border-radius: 999px; border: 2px solid ${p.ink}; background: {{favBg}};">
        <svg width="21" height="21" viewBox="0 0 24 24" stroke="${p.ink}" stroke-width="2" stroke-linejoin="round" fill="{{favFill}}">
          <polygon points="12 2.6 15 9 22 9.9 17 14.7 18.2 21.6 12 18.3 5.8 21.6 7 14.7 2 9.9 9 9"></polygon>
        </svg>
      </button>
    </div>

    <div style="display: flex; flex-direction: column; gap: 8px;">
      <sc-for list="{{rows}}" as="row" hint-placeholder-count="6">
        <div style="border-radius: 12px; border: 2px solid ${p.ink}; overflow: hidden; background: {{row.shellBg}};">
          <button onClick="{{row.toggle}}" style="width: 100%; min-height: 56px; display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 9px 14px; background: none; border: none; text-align: left; color: ${p.ink};">
            <span style="display: flex; align-items: center; gap: 11px;">
              <span style="width: 17px; height: 17px; border-radius: 5px; border: 2px solid ${p.ink}; background: {{row.chip}};"></span>
              <span style="font-size: 15px; font-weight: 600;">{{row.label}}</span>
              <sc-if value="{{row.hasInfo}}" hint-placeholder-val="{{true}}">
                <span style="display: inline-flex; align-items: center; justify-content: center; width: 18px; height: 18px; border-radius: 999px; border: 1.5px solid ${p.muted}; font-size: 11px; font-weight: 600; color: ${p.muted};">i</span>
              </sc-if>
            </span>
            <span style="display: flex; align-items: center; gap: 8px;">
              <span style="font-size: 18px; font-weight: 700; color: {{row.valueColor}};">{{row.valueText}}</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="${p.ink}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="transform: {{row.caret}};">
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>
            </span>
          </button>
          <sc-if value="{{row.showOptions}}" hint-placeholder-val="{{true}}">
            <div style="display: flex; flex-direction: column; gap: 6px; padding: 0 14px 14px;">
              <sc-for list="{{row.options}}" as="opt" hint-placeholder-count="5">
                <button onClick="{{opt.pick}}" style="width: 100%; min-height: 48px; display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 0 13px; border-radius: 9px; border: 2px solid {{opt.bc}}; font-size: 17px; font-weight: {{opt.weight}}; color: ${p.ink}; background: {{opt.bg}};">
                  <span>{{opt.label}}</span>
                  <span style="display: flex; gap: 3px; align-items: flex-end; height: 14px;">
                    <sc-for list="{{opt.pips}}" as="pip" hint-placeholder-count="5">
                      <span style="width: 4px; border-radius: 2px; background: {{pip.color}}; height: {{pip.h}};"></span>
                    </sc-for>
                  </span>
                </button>
              </sc-for>
            </div>
          </sc-if>
          <sc-if value="{{row.showFree}}" hint-placeholder-val="{{true}}">
            <div style="display: flex; flex-direction: column; gap: 15px; padding: 0 14px 16px; color: ${p.ink};">
              <div style="display: flex; align-items: center; justify-content: space-between; gap: 12px;">
                <span style="font-size: 13px; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase; color: ${p.muted};">Score</span>
                <span style="display: flex; align-items: center; gap: 10px;">
                  <button onClick="{{scoreDown}}" style="width: 46px; height: 46px; border-radius: 9px; border: 2px solid ${p.ink}; background: ${p.cardOpen}; font-size: 22px; font-weight: 600; color: ${p.ink}; line-height: 1;">−</button>
                  <span style="min-width: 60px; text-align: center; font-size: 32px; font-weight: 800; letter-spacing: -0.026em; color: {{scoreColor}};">{{scoreText}}</span>
                  <button onClick="{{scoreUp}}" style="width: 46px; height: 46px; border-radius: 9px; border: 2px solid ${p.ink}; background: ${p.cardOpen}; font-size: 22px; font-weight: 600; color: ${p.ink}; line-height: 1;">+</button>
                </span>
              </div>
              <div style="display: flex; flex-direction: column; gap: 7px;">
                <span style="font-size: 13px; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase; color: ${p.muted};">Buy it again</span>
                <div style="display: flex; gap: 7px;">
                  <sc-for list="{{buyOptions}}" as="b" hint-placeholder-count="2">
                    <button onClick="{{b.pick}}" style="flex-grow: 1; min-height: 48px; border-radius: 9px; border: 2px solid {{b.bc}}; font-size: 17px; font-weight: {{b.weight}}; color: ${p.ink}; background: {{b.bg}};">{{b.label}}</button>
                  </sc-for>
                </div>
              </div>
              <div style="display: flex; flex-direction: column; gap: 7px;">
                <span style="font-size: 13px; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase; color: ${p.muted};">Anything else</span>
                <textarea rows="3" placeholder="The one thing you want to remember" style="width: 100%; padding: 11px 13px; border-radius: 9px; border: 2px solid ${p.hairline}; background: ${p.cardOpen}; color: ${p.ink}; outline: none; resize: none;"></textarea>
              </div>
            </div>
          </sc-if>
        </div>
      </sc-for>
    </div>
  </div>
  <div style="flex-grow: 1;"></div>
  <div style="padding: 12px 20px 20px;">
    <button style="width: 100%; min-height: 54px; border-radius: 12px; border: 2px solid ${p.ink}; background: ${p.save}; color: ${p.saveFg}; font-size: 17px; font-weight: 700;">Save and pour the next</button>
  </div>
`) + `
<script data-dc-script ${groundProp(p)}>
class Component extends DCLogic {
  constructor(props) {
    super(props);
    this.state = { open: 'acidity', picked: { nose_intensity: 'medium+', sweetness: 'dry' }, favourite: false, score: null, buy: null };
  }
  axes() {
    const L = ['low', 'medium-', 'medium', 'medium+', 'high'];
    const H = ${JSON.stringify(HUES)};
    return [
      { key: 'nose_intensity', label: 'Nose intensity', options: L },
      { key: 'sweetness', label: 'Sweetness', options: ['bone dry', 'dry', 'off-dry', 'medium sweet', 'sweet'] },
      { key: 'acidity', label: 'Acidity', options: L },
      { key: 'tannin', label: 'Tannin', options: L },
      { key: 'body', label: 'Body', options: L },
      { key: 'alcohol', label: 'Alcohol', options: L },
      { key: 'finish', label: 'Finish', options: ['short', 'medium', 'long'] },
      { key: 'anything_else', label: 'Anything else', free: true },
    ].map((a) => Object.assign(a, { chip: (H[a.key] || {}).chip || '${p.cardOpen}', fill: (H[a.key] || {}).fill }));
  }
  setScore(d) {
    const c = this.state.score === null ? 7 : this.state.score + d;
    this.setState({ score: Math.max(1, Math.min(10, c)) });
  }
  renderVals() {
    const axes = this.axes();
    const open = this.state.open;
    const fav = this.state.favourite;
    const rows = axes.map((a, i) => {
      const value = this.state.picked[a.key] ?? null;
      const isOpen = open === a.key;
      const summary = a.free ? (this.state.score === null ? '' : this.state.score + '/10') : (value ?? '');
      return {
        label: a.label, chip: a.chip, hasInfo: !a.free,
        showOptions: isOpen && !a.free, showFree: isOpen && !!a.free,
        valueText: summary,
        valueColor: summary ? '${p.ink}' : '${p.empty}',
        shellBg: isOpen ? '${p.cardOpen}' : '${p.card}',
        caret: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
        toggle: () => this.setState({ open: isOpen ? '' : a.key }),
        options: (a.options ?? []).map((o, j) => {
          const on = value === o;
          const total = a.options.length;
          return {
            label: o,
            bg: on ? a.fill : '${p.cardOpen}',
            bc: on ? '${p.ink}' : '${p.hairline}',
            weight: on ? 700 : 500,
            pips: a.options.map((_, k) => ({
              color: k <= j ? '${p.ink}' : (on ? 'rgba(33,29,38,0.28)' : '${p.hairline}'),
              h: String(5 + Math.round((k / (total - 1)) * 9)) + 'px',
            })),
            pick: () => {
              const next = Object.assign({}, this.state.picked);
              next[a.key] = o;
              const following = axes[i + 1];
              this.setState({ picked: next, open: following ? following.key : '' });
            },
          };
        }),
      };
    });
    const buyOptions = ['yes', 'no'].map((b) => {
      const on = this.state.buy === b;
      return {
        label: b === 'yes' ? 'Yes' : 'No',
        bg: on ? '${HUES.acidity.fill}' : '${p.cardOpen}',
        bc: on ? '${p.ink}' : '${p.hairline}',
        weight: on ? 700 : 500,
        pick: () => this.setState({ buy: on ? null : b }),
      };
    });
    return {
      rows: rows, buyOptions: buyOptions, ground: this.props.ground ?? '${p.ground}',
      isFavourite: fav,
      favBg: fav ? '${p.star}' : '${p.cardOpen}',
      favFill: fav ? '${p.ink}' : 'none',
      toggleFavourite: () => this.setState({ favourite: !fav }),
      scoreText: this.state.score === null ? '—' : String(this.state.score),
      scoreColor: this.state.score === null ? '${p.empty}' : '${p.ink}',
      scoreUp: () => this.setScore(1), scoreDown: () => this.setScore(-1),
    };
  }
}
</script>
</body>
</html>
`

for (const [name, p] of Object.entries(PURPLES)) {
  await writeFile(new URL(`./Taste${name}.dc.html`, import.meta.url), taste(p))
  console.log('wrote Taste' + name + '.dc.html')
}
