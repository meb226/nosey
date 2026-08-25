import { writeFile } from 'node:fs/promises'

/**
 * Toybox, brightened. Same three palettes as before — the grounds moved up in
 * lightness and the hues dropped their dust — plus two additions: a favourite
 * star in the header, and a final free-entry step for score and takeaway.
 *
 * The structure stays as settled: one row open at a time, picking auto-advances.
 */

// Brighter than the dusty set, still one family. Every hue is light enough to
// carry near-black label text when it fills a selected option.
const HUES = {
  nose_intensity: '#6aa6df',
  sweetness: '#f0bc52',
  acidity: '#55bf8d',
  tannin: '#9f7ce0',
  body: '#e5875c',
  alcohol: '#ef7d9f',
  finish: '#c77dbe',
}

const VARIANTS = {
  Vine: {
    ground: '#2d7a5f', groundTop: '#3d9979',
    headline: '#f7f3e8', sub: '#cfe6da',
    badgeBg: '#f7f3e8', badgeFg: '#1c4435',
    card: '#fbf6ec', cardOpen: '#ffffff',
    ink: '#1e241f', muted: '#8a9089', empty: '#b3b8b1', hairline: '#e2dacb',
    star: '#f0bc52',
    save: '#f0bc52', saveFg: '#1e241f',
    swatches: ['#2d7a5f', '#9c3f5d', '#3f7fa8', '#7d7a2e'],
  },
  Cask: {
    ground: '#a8455f', groundTop: '#c25873',
    headline: '#fdf3ef', sub: '#f2d0d8',
    badgeBg: '#fdf3ef', badgeFg: '#7a2b42',
    card: '#fdf5ec', cardOpen: '#ffffff',
    ink: '#241c20', muted: '#8d8388', empty: '#b6acb0', hairline: '#e6dbcf',
    star: '#f0bc52',
    save: '#f0bc52', saveFg: '#241c20',
    swatches: ['#a8455f', '#2d7a5f', '#7a5ac0', '#c4713a'],
  },
  Apricot: {
    ground: '#f7bb62', groundTop: '#fdd189',
    headline: '#2a1c12', sub: '#7c5124',
    badgeBg: '#2a1c12', badgeFg: '#fdd189',
    card: '#fffbf3', cardOpen: '#ffffff',
    ink: '#241f1a', muted: '#8a8078', empty: '#b5aca2', hairline: '#ece2d1',
    star: '#c2551f',
    save: '#2a1c12', saveFg: '#fdd189',
    swatches: ['#f7bb62', '#f2967a', '#8fc98c', '#7fb6dd'],
  },
}

const page = (p, openKey) => `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <script src="./support.js"></script>
</head>
<body>
<x-dc>
<helmet>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400..800&display=swap">
  <style>
    body { margin: 0; font-family: 'Bricolage Grotesque', system-ui, sans-serif; }
    a { color: ${p.save}; } a:hover { color: ${p.ink}; }
    * { -webkit-tap-highlight-color: transparent; box-sizing: border-box; }
    button { font-family: inherit; cursor: pointer; }
    input, textarea { font-family: inherit; font-size: 16px; }
  </style>
</helmet>

<div style="width: 375px; min-height: 940px; background: radial-gradient(130% 60% at 50% 0%, ${p.groundTop} 0%, {{ground}} 70%); color: ${p.headline}; display: flex; flex-direction: column;">

  <div style="display: flex; flex-direction: column; gap: 18px; padding: 30px 20px 12px;">

    <div style="display: flex; align-items: flex-start; justify-content: space-between; gap: 14px;">
      <div style="display: flex; flex-direction: column; gap: 9px;">
        <span style="align-self: flex-start; background: ${p.badgeBg}; color: ${p.badgeFg}; font-size: 10px; font-weight: 700; letter-spacing: 0.16em; text-transform: uppercase; padding: 5px 11px; border-radius: 999px;">Bottle 1 of 2</span>
        <h1 style="margin: 0; font-size: 32px; font-weight: 700; line-height: 1.0; letter-spacing: -0.025em; text-wrap: pretty;">Clos des Briords</h1>
        <span style="font-size: 14px; font-weight: 500; color: ${p.sub};">Muscadet Sèvre et Maine · 2022</span>
      </div>

      <button onClick="{{toggleFavourite}}" aria-pressed="{{isFavourite}}" style="flex-shrink: 0; width: 46px; height: 46px; display: flex; align-items: center; justify-content: center; border-radius: 999px; border: 2px solid ${p.ink}; background: {{favBg}}; box-shadow: 0 2px 0 0 ${p.ink}; transform: {{favLift}};">
        <svg width="21" height="21" viewBox="0 0 24 24" stroke="${p.ink}" stroke-width="2" stroke-linejoin="round" fill="{{favFill}}">
          <polygon points="12 2.6 15 9 22 9.9 17 14.7 18.2 21.6 12 18.3 5.8 21.6 7 14.7 2 9.9 9 9"></polygon>
        </svg>
      </button>
    </div>

    <div style="display: flex; flex-direction: column; gap: 9px;">
      <sc-for list="{{rows}}" as="row" hint-placeholder-count="6">
        <div style="border-radius: 12px; border: 2px solid ${p.ink}; overflow: hidden; background: {{row.shellBg}}; box-shadow: {{row.shellShadow}};">

          <button onClick="{{row.toggle}}" style="width: 100%; min-height: 52px; display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 8px 13px; background: none; border: none; text-align: left; color: ${p.ink};">
            <span style="display: flex; align-items: center; gap: 9px;">
              <span style="width: 12px; height: 12px; border-radius: 4px; border: 2px solid ${p.ink}; background: {{row.hue}};"></span>
              <span style="font-size: 13px; font-weight: 700;">{{row.label}}</span>
              <sc-if value="{{row.hasInfo}}" hint-placeholder-val="{{true}}">
                <span style="display: inline-flex; align-items: center; justify-content: center; width: 16px; height: 16px; border-radius: 999px; border: 1.5px solid ${p.muted}; font-size: 10px; font-weight: 700; color: ${p.muted};">i</span>
              </sc-if>
            </span>
            <span style="display: flex; align-items: center; gap: 8px;">
              <span style="font-size: 16px; font-weight: 700; color: {{row.valueColor}};">{{row.valueText}}</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="${p.ink}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="transform: {{row.caret}};">
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>
            </span>
          </button>

          <sc-if value="{{row.showOptions}}" hint-placeholder-val="{{true}}">
            <div style="display: flex; flex-direction: column; gap: 7px; padding: 2px 13px 14px;">
              <sc-for list="{{row.options}}" as="opt" hint-placeholder-count="5">
                <button onClick="{{opt.pick}}" style="width: 100%; min-height: 47px; display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 0 13px; border-radius: 10px; border: 2px solid ${p.ink}; font-size: 16px; font-weight: 600; color: ${p.ink}; background: {{opt.bg}}; box-shadow: {{opt.shadow}}; transform: {{opt.lift}};">
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
            <div style="display: flex; flex-direction: column; gap: 16px; padding: 4px 13px 16px; color: ${p.ink};">

              <div style="display: flex; align-items: center; justify-content: space-between; gap: 12px;">
                <span style="font-size: 12px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: ${p.muted};">Score</span>
                <span style="display: flex; align-items: center; gap: 10px;">
                  <button onClick="{{scoreDown}}" style="width: 46px; height: 46px; border-radius: 10px; border: 2px solid ${p.ink}; background: ${p.cardOpen}; box-shadow: 0 2px 0 0 ${p.ink}; font-size: 22px; font-weight: 700; color: ${p.ink}; line-height: 1;">−</button>
                  <span style="min-width: 58px; text-align: center; font-size: 30px; font-weight: 700; letter-spacing: -0.02em; color: {{scoreColor}};">{{scoreText}}</span>
                  <button onClick="{{scoreUp}}" style="width: 46px; height: 46px; border-radius: 10px; border: 2px solid ${p.ink}; background: ${p.cardOpen}; box-shadow: 0 2px 0 0 ${p.ink}; font-size: 22px; font-weight: 700; color: ${p.ink}; line-height: 1;">+</button>
                </span>
              </div>

              <div style="display: flex; flex-direction: column; gap: 7px;">
                <span style="font-size: 12px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: ${p.muted};">Buy it again</span>
                <div style="display: flex; gap: 8px;">
                  <sc-for list="{{buyOptions}}" as="b" hint-placeholder-count="2">
                    <button onClick="{{b.pick}}" style="flex-grow: 1; min-height: 47px; border-radius: 10px; border: 2px solid ${p.ink}; font-size: 16px; font-weight: 600; color: ${p.ink}; background: {{b.bg}}; box-shadow: {{b.shadow}}; transform: {{b.lift}};">{{b.label}}</button>
                  </sc-for>
                </div>
              </div>

              <div style="display: flex; flex-direction: column; gap: 7px;">
                <span style="font-size: 12px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: ${p.muted};">Drink it with</span>
                <input placeholder="Oysters, or anything salty" style="width: 100%; min-height: 47px; padding: 0 13px; border-radius: 10px; border: 2px solid ${p.ink}; background: ${p.cardOpen}; color: ${p.ink}; outline: none;">
              </div>

              <div style="display: flex; flex-direction: column; gap: 7px;">
                <span style="font-size: 12px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: ${p.muted};">Anything else</span>
                <textarea rows="3" placeholder="The one thing you want to remember" style="width: 100%; padding: 11px 13px; border-radius: 10px; border: 2px solid ${p.ink}; background: ${p.cardOpen}; color: ${p.ink}; outline: none; resize: none;"></textarea>
              </div>

            </div>
          </sc-if>

        </div>
      </sc-for>
    </div>

  </div>

  <div style="flex-grow: 1;"></div>

  <div style="padding: 12px 20px 20px;">
    <button style="width: 100%; min-height: 53px; border-radius: 12px; border: 2px solid ${p.ink}; background: ${p.save}; color: ${p.saveFg}; font-size: 16px; font-weight: 700; box-shadow: 0 3px 0 0 ${p.ink};">Save and pour the next</button>
  </div>

</div>
</x-dc>

<script data-dc-script data-props='{"ground":{"editor":"color","options":${JSON.stringify(p.swatches)},"default":"${p.ground}","section":"Theme"}}'>
class Component extends DCLogic {
  constructor(props) {
    super(props);
    this.state = {
      open: '${openKey}',
      picked: { nose_intensity: 'medium+', sweetness: 'dry' },
      favourite: ${openKey === 'anything_else' ? 'true' : 'false'},
      score: ${openKey === 'anything_else' ? '8' : 'null'},
      buy: ${openKey === 'anything_else' ? "'yes'" : 'null'},
    };
  }

  axes() {
    const L = ['low', 'medium-', 'medium', 'medium+', 'high'];
    return [
      { key: 'nose_intensity', label: 'Nose intensity', hue: '${HUES.nose_intensity}', options: L },
      { key: 'sweetness', label: 'Sweetness', hue: '${HUES.sweetness}', options: ['bone dry', 'dry', 'off-dry', 'medium sweet', 'sweet'] },
      { key: 'acidity', label: 'Acidity', hue: '${HUES.acidity}', options: L },
      { key: 'tannin', label: 'Tannin', hue: '${HUES.tannin}', options: L },
      { key: 'body', label: 'Body', hue: '${HUES.body}', options: L },
      { key: 'alcohol', label: 'Alcohol', hue: '${HUES.alcohol}', options: L },
      { key: 'finish', label: 'Finish', hue: '${HUES.finish}', options: ['short', 'medium', 'long'] },
      // Free entry, not a pick-one — the last step rather than an eighth axis.
      { key: 'anything_else', label: 'Anything else', hue: '${p.cardOpen}', free: true },
    ];
  }

  setScore(delta) {
    const current = this.state.score === null ? 7 : this.state.score + delta;
    this.setState({ score: Math.max(1, Math.min(10, current)) });
  }

  renderVals() {
    const axes = this.axes();
    const open = this.state.open;
    const fav = this.state.favourite;

    const rows = axes.map((a, i) => {
      const value = this.state.picked[a.key] ?? null;
      const isOpen = open === a.key;
      const summary = a.free
        ? (this.state.score === null ? '' : this.state.score + '/10')
        : (value ?? '');
      return {
        label: a.label,
        hue: a.hue,
        hasInfo: !a.free,
        showOptions: isOpen && !a.free,
        showFree: isOpen && !!a.free,
        valueText: summary,
        valueColor: summary ? '${p.ink}' : '${p.empty}',
        shellBg: isOpen ? '${p.cardOpen}' : '${p.card}',
        shellShadow: isOpen ? '0 3px 0 0 ${p.ink}' : '0 2px 0 0 ${p.ink}',
        caret: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
        toggle: () => this.setState({ open: isOpen ? '' : a.key }),
        options: (a.options ?? []).map((o, j) => {
          const on = value === o;
          const total = a.options.length;
          return {
            label: o,
            bg: on ? a.hue : '${p.cardOpen}',
            shadow: on ? '0 1px 0 0 ${p.ink}' : '0 2px 0 0 ${p.ink}',
            lift: on ? 'translateY(1px)' : 'translateY(0)',
            pips: a.options.map((_, k) => ({
              color: k <= j ? '${p.ink}' : (on ? 'rgba(36,31,26,0.25)' : '${p.hairline}'),
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
        bg: on ? '${HUES.acidity}' : '${p.cardOpen}',
        shadow: on ? '0 1px 0 0 ${p.ink}' : '0 2px 0 0 ${p.ink}',
        lift: on ? 'translateY(1px)' : 'translateY(0)',
        pick: () => this.setState({ buy: on ? null : b }),
      };
    });

    return {
      rows: rows,
      buyOptions: buyOptions,
      ground: this.props.ground ?? '${p.ground}',
      isFavourite: fav,
      favBg: fav ? '${p.star}' : '${p.cardOpen}',
      favFill: fav ? '${p.ink}' : 'none',
      favLift: fav ? 'translateY(1px)' : 'translateY(0)',
      toggleFavourite: () => this.setState({ favourite: !fav }),
      scoreText: this.state.score === null ? '—' : String(this.state.score),
      scoreColor: this.state.score === null ? '${p.empty}' : '${p.ink}',
      scoreUp: () => this.setScore(1),
      scoreDown: () => this.setScore(-1),
    };
  }
}
</script>
</body>
</html>
`

for (const [name, p] of Object.entries(VARIANTS)) {
  await writeFile(new URL(`./${name}.dc.html`, import.meta.url), page(p, 'acidity'))
  console.log('wrote', name + '.dc.html')
}
// One artboard showing the new last step open, since it is a new pattern.
await writeFile(new URL('./AnythingElse.dc.html', import.meta.url), page(VARIANTS.Cask, 'anything_else'))
console.log('wrote AnythingElse.dc.html')
