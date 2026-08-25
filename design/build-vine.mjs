import { writeFile } from 'node:fs/promises'

/**
 * Vine is settled. What is open now is the typeface, and the accordion type
 * scale — every row label went 13px -> 15px, values 16px -> 18px, options
 * 16px -> 17px, so the rows carry at arm's length on a table.
 */

const P = {
  ground: '#2d7a5f', groundTop: '#3d9979',
  headline: '#f7f3e8', sub: '#cfe6da',
  badgeBg: '#f7f3e8', badgeFg: '#1c4435',
  card: '#fbf6ec', cardOpen: '#ffffff',
  ink: '#1e241f', muted: '#7f867e', empty: '#b3b8b1', hairline: '#e2dacb',
  star: '#f0bc52', save: '#f0bc52', saveFg: '#1e241f',
  swatches: ['#2d7a5f', '#a8455f', '#3f7fa8', '#7d7a2e'],
}

const HUES = {
  nose_intensity: '#6aa6df', sweetness: '#f0bc52', acidity: '#55bf8d',
  tannin: '#9f7ce0', body: '#e5875c', alcohol: '#ef7d9f', finish: '#c77dbe',
}

const FONTS = {
  Bricolage: {
    link: 'family=Bricolage+Grotesque:opsz,wght@12..96,400..800',
    display: "'Bricolage Grotesque', system-ui, sans-serif",
    ui: "'Bricolage Grotesque', system-ui, sans-serif",
    titleWeight: 700, titleSize: 32, titleTrack: '-0.025em', rowWeight: 700,
  },
  Gabarito: {
    link: 'family=Gabarito:wght@400..900',
    display: "Gabarito, system-ui, sans-serif",
    ui: "Gabarito, system-ui, sans-serif",
    titleWeight: 800, titleSize: 33, titleTrack: '-0.02em', rowWeight: 700,
  },
  Zilla: {
    link: 'family=Zilla+Slab:wght@400;500;600;700',
    display: "'Zilla Slab', Georgia, serif",
    ui: "'Zilla Slab', Georgia, serif",
    titleWeight: 700, titleSize: 31, titleTrack: '-0.01em', rowWeight: 600,
  },
}

const taste = (f, openKey) => `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <script src="./support.js"></script>
</head>
<body>
<x-dc>
<helmet>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?${f.link}&display=swap">
  <style>
    body { margin: 0; font-family: ${f.ui}; }
    a { color: ${P.save}; } a:hover { color: ${P.ink}; }
    * { -webkit-tap-highlight-color: transparent; box-sizing: border-box; }
    button { font-family: inherit; cursor: pointer; }
    input, textarea { font-family: inherit; font-size: 16px; }
  </style>
</helmet>

<div style="width: 375px; min-height: 960px; background: radial-gradient(130% 60% at 50% 0%, ${P.groundTop} 0%, {{ground}} 70%); color: ${P.headline}; display: flex; flex-direction: column;">

  <div style="display: flex; flex-direction: column; gap: 18px; padding: 30px 20px 12px;">

    <div style="display: flex; align-items: flex-start; justify-content: space-between; gap: 14px;">
      <div style="display: flex; flex-direction: column; gap: 9px;">
        <span style="align-self: flex-start; background: ${P.badgeBg}; color: ${P.badgeFg}; font-size: 10px; font-weight: 700; letter-spacing: 0.16em; text-transform: uppercase; padding: 5px 11px; border-radius: 999px;">Bottle 1 of 2</span>
        <h1 style="margin: 0; font-family: ${f.display}; font-size: ${f.titleSize}px; font-weight: ${f.titleWeight}; line-height: 1.02; letter-spacing: ${f.titleTrack}; text-wrap: pretty;">Clos des Briords</h1>
        <span style="font-size: 15px; font-weight: 500; color: ${P.sub};">Muscadet Sèvre et Maine · 2022</span>
      </div>
      <button onClick="{{toggleFavourite}}" aria-pressed="{{isFavourite}}" style="flex-shrink: 0; width: 46px; height: 46px; display: flex; align-items: center; justify-content: center; border-radius: 999px; border: 2px solid ${P.ink}; background: {{favBg}}; box-shadow: 0 2px 0 0 ${P.ink}; transform: {{favLift}};">
        <svg width="21" height="21" viewBox="0 0 24 24" stroke="${P.ink}" stroke-width="2" stroke-linejoin="round" fill="{{favFill}}">
          <polygon points="12 2.6 15 9 22 9.9 17 14.7 18.2 21.6 12 18.3 5.8 21.6 7 14.7 2 9.9 9 9"></polygon>
        </svg>
      </button>
    </div>

    <div style="display: flex; flex-direction: column; gap: 9px;">
      <sc-for list="{{rows}}" as="row" hint-placeholder-count="6">
        <div style="border-radius: 12px; border: 2px solid ${P.ink}; overflow: hidden; background: {{row.shellBg}}; box-shadow: {{row.shellShadow}};">

          <button onClick="{{row.toggle}}" style="width: 100%; min-height: 54px; display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 9px 13px; background: none; border: none; text-align: left; color: ${P.ink};">
            <span style="display: flex; align-items: center; gap: 9px;">
              <span style="width: 13px; height: 13px; border-radius: 4px; border: 2px solid ${P.ink}; background: {{row.hue}};"></span>
              <span style="font-size: 15px; font-weight: ${f.rowWeight};">{{row.label}}</span>
              <sc-if value="{{row.hasInfo}}" hint-placeholder-val="{{true}}">
                <span style="display: inline-flex; align-items: center; justify-content: center; width: 18px; height: 18px; border-radius: 999px; border: 1.5px solid ${P.muted}; font-size: 11px; font-weight: 700; color: ${P.muted};">i</span>
              </sc-if>
            </span>
            <span style="display: flex; align-items: center; gap: 8px;">
              <span style="font-size: 18px; font-weight: ${f.rowWeight}; color: {{row.valueColor}};">{{row.valueText}}</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="${P.ink}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="transform: {{row.caret}};">
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>
            </span>
          </button>

          <sc-if value="{{row.showOptions}}" hint-placeholder-val="{{true}}">
            <div style="display: flex; flex-direction: column; gap: 7px; padding: 2px 13px 14px;">
              <sc-for list="{{row.options}}" as="opt" hint-placeholder-count="5">
                <button onClick="{{opt.pick}}" style="width: 100%; min-height: 48px; display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 0 13px; border-radius: 10px; border: 2px solid ${P.ink}; font-size: 17px; font-weight: 600; color: ${P.ink}; background: {{opt.bg}}; box-shadow: {{opt.shadow}}; transform: {{opt.lift}};">
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
            <div style="display: flex; flex-direction: column; gap: 16px; padding: 4px 13px 16px; color: ${P.ink};">
              <div style="display: flex; align-items: center; justify-content: space-between; gap: 12px;">
                <span style="font-size: 13px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: ${P.muted};">Score</span>
                <span style="display: flex; align-items: center; gap: 10px;">
                  <button onClick="{{scoreDown}}" style="width: 46px; height: 46px; border-radius: 10px; border: 2px solid ${P.ink}; background: ${P.cardOpen}; box-shadow: 0 2px 0 0 ${P.ink}; font-size: 22px; font-weight: 700; color: ${P.ink}; line-height: 1;">−</button>
                  <span style="min-width: 60px; text-align: center; font-family: ${f.display}; font-size: 32px; font-weight: ${f.titleWeight}; color: {{scoreColor}};">{{scoreText}}</span>
                  <button onClick="{{scoreUp}}" style="width: 46px; height: 46px; border-radius: 10px; border: 2px solid ${P.ink}; background: ${P.cardOpen}; box-shadow: 0 2px 0 0 ${P.ink}; font-size: 22px; font-weight: 700; color: ${P.ink}; line-height: 1;">+</button>
                </span>
              </div>
              <div style="display: flex; flex-direction: column; gap: 7px;">
                <span style="font-size: 13px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: ${P.muted};">Buy it again</span>
                <div style="display: flex; gap: 8px;">
                  <sc-for list="{{buyOptions}}" as="b" hint-placeholder-count="2">
                    <button onClick="{{b.pick}}" style="flex-grow: 1; min-height: 48px; border-radius: 10px; border: 2px solid ${P.ink}; font-size: 17px; font-weight: 600; color: ${P.ink}; background: {{b.bg}}; box-shadow: {{b.shadow}}; transform: {{b.lift}};">{{b.label}}</button>
                  </sc-for>
                </div>
              </div>
              <div style="display: flex; flex-direction: column; gap: 7px;">
                <span style="font-size: 13px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: ${P.muted};">Drink it with</span>
                <input placeholder="Oysters, or anything salty" style="width: 100%; min-height: 48px; padding: 0 13px; border-radius: 10px; border: 2px solid ${P.ink}; background: ${P.cardOpen}; color: ${P.ink}; outline: none;">
              </div>
              <div style="display: flex; flex-direction: column; gap: 7px;">
                <span style="font-size: 13px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: ${P.muted};">Anything else</span>
                <textarea rows="3" placeholder="The one thing you want to remember" style="width: 100%; padding: 11px 13px; border-radius: 10px; border: 2px solid ${P.ink}; background: ${P.cardOpen}; color: ${P.ink}; outline: none; resize: none;"></textarea>
              </div>
            </div>
          </sc-if>

        </div>
      </sc-for>
    </div>
  </div>

  <div style="flex-grow: 1;"></div>

  <div style="padding: 12px 20px 20px;">
    <button style="width: 100%; min-height: 54px; border-radius: 12px; border: 2px solid ${P.ink}; background: ${P.save}; color: ${P.saveFg}; font-size: 17px; font-weight: 700; box-shadow: 0 3px 0 0 ${P.ink};">Save and pour the next</button>
  </div>

</div>
</x-dc>

<script data-dc-script data-props='{"ground":{"editor":"color","options":${JSON.stringify(P.swatches)},"default":"${P.ground}","section":"Theme"}}'>
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
      { key: 'anything_else', label: 'Anything else', hue: '${P.cardOpen}', free: true },
    ];
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
        label: a.label, hue: a.hue, hasInfo: !a.free,
        showOptions: isOpen && !a.free, showFree: isOpen && !!a.free,
        valueText: summary,
        valueColor: summary ? '${P.ink}' : '${P.empty}',
        shellBg: isOpen ? '${P.cardOpen}' : '${P.card}',
        shellShadow: isOpen ? '0 3px 0 0 ${P.ink}' : '0 2px 0 0 ${P.ink}',
        caret: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
        toggle: () => this.setState({ open: isOpen ? '' : a.key }),
        options: (a.options ?? []).map((o, j) => {
          const on = value === o;
          const total = a.options.length;
          return {
            label: o,
            bg: on ? a.hue : '${P.cardOpen}',
            shadow: on ? '0 1px 0 0 ${P.ink}' : '0 2px 0 0 ${P.ink}',
            lift: on ? 'translateY(1px)' : 'translateY(0)',
            pips: a.options.map((_, k) => ({
              color: k <= j ? '${P.ink}' : (on ? 'rgba(30,36,31,0.25)' : '${P.hairline}'),
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
        bg: on ? '${HUES.acidity}' : '${P.cardOpen}',
        shadow: on ? '0 1px 0 0 ${P.ink}' : '0 2px 0 0 ${P.ink}',
        lift: on ? 'translateY(1px)' : 'translateY(0)',
        pick: () => this.setState({ buy: on ? null : b }),
      };
    });

    return {
      rows: rows, buyOptions: buyOptions,
      ground: this.props.ground ?? '${P.ground}',
      isFavourite: fav,
      favBg: fav ? '${P.star}' : '${P.cardOpen}',
      favFill: fav ? '${P.ink}' : 'none',
      favLift: fav ? 'translateY(1px)' : 'translateY(0)',
      toggleFavourite: () => this.setState({ favourite: !fav }),
      scoreText: this.state.score === null ? '—' : String(this.state.score),
      scoreColor: this.state.score === null ? '${P.empty}' : '${P.ink}',
      scoreUp: () => this.setScore(1),
      scoreDown: () => this.setScore(-1),
    };
  }
}
</script>
</body>
</html>
`

for (const [name, f] of Object.entries(FONTS)) {
  await writeFile(new URL(`./Type${name}.dc.html`, import.meta.url), taste(f, 'acidity'))
  console.log('wrote Type' + name + '.dc.html')
}
