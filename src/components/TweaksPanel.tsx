'use client'

import { useState, useRef, useEffect, useCallback } from 'react'

type TweakState = {
  accentH: number; accentS: number; accentL: number; accentBudget: string
  bgH: number; bgL: number; neoOp: number; neoSpread: number
  fontDisplay: string; fontBody: string; fontSize: number; lineH: number; displayTrack: number
  radiusLg: number; density: number; sidebarW: number; borderW: string
  theme: string; topbar: string
}

const DEFAULTS: TweakState = {
  accentH:19, accentS:83, accentL:68, accentBudget:'moderate',
  bgH:30, bgL:94, neoOp:0.85, neoSpread:20,
  fontDisplay:'serif', fontBody:'sans', fontSize:15, lineH:1.5, displayTrack:-0.02,
  radiusLg:16, density:1.0, sidebarW:72, borderW:'hairline',
  theme:'light', topbar:'normal',
}

const FS: Record<string, string> = {
  serif: "'Iowan Old Style','Charter',Georgia,serif",
  sans: "-apple-system,BlinkMacSystemFont,'Segoe UI',system-ui,sans-serif",
  mono: "ui-monospace,'JetBrains Mono','IBM Plex Mono',Menlo,monospace",
}

function applyTweaks(t: TweakState) {
  const r = document.documentElement
  const dark = t.theme === 'dark' || (t.theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
  r.dataset.theme = dark ? 'dark' : ''
  if (t.theme !== 'system') localStorage.setItem('theme', t.theme)

  const acc = `hsl(${t.accentH},${t.accentS}%,${t.accentL}%)`
  const accD = `hsl(${t.accentH},${t.accentS}%,${Math.max(20, t.accentL - 14)}%)`
  r.style.setProperty('--coral', acc)
  r.style.setProperty('--coral-d', accD)

  if (!dark) {
    const s = Math.max(0, (t.bgL - 88) * 2 + t.bgH * 0.1)
    r.style.setProperty('--bg', `hsl(${t.bgH},${s.toFixed(1)}%,${t.bgL}%)`)
    r.style.setProperty('--surface', `hsl(${t.bgH},${Math.max(0,s-.8).toFixed(1)}%,${(t.bgL-2.5).toFixed(1)}%)`)
    r.style.setProperty('--surf-hi', `hsl(${t.bgH},${Math.max(0,s-1.2).toFixed(1)}%,${(t.bgL-4.5).toFixed(1)}%)`)
    r.style.setProperty('--inset', `hsl(${t.bgH},${Math.max(0,s-2).toFixed(1)}%,${(t.bgL-8).toFixed(1)}%)`)
    r.style.setProperty('--border', `hsl(${t.bgH},${Math.max(0,s-1).toFixed(1)}%,${(t.bgL-6).toFixed(1)}%)`)
  } else {
    ['--bg','--surface','--surf-hi','--inset','--border'].forEach(v => r.style.removeProperty(v))
  }

  const op = t.neoOp, sp = t.neoSpread
  const dp = +(sp*.4).toFixed(1), sm = +(sp*.2).toFixed(1), ti = +(sm*.5).toFixed(1), tb = +(sp*.25).toFixed(1)
  const dC = !dark ? `rgba(160,152,142,${op.toFixed(2)})` : `rgba(20,25,33,${op.toFixed(2)})`
  const lC = !dark ? `rgba(255,255,255,${(op*.85).toFixed(2)})` : `rgba(54,63,76,${(op*.65).toFixed(2)})`
  const h = (a: number, b: number) => `${a}px ${a}px ${b}px ${dC},-${a}px -${a}px ${b}px ${lC}`
  const hi = (a: number, b: number) => `inset ${a}px ${a}px ${b}px ${dC},inset -${a}px -${a}px ${b}px ${lC}`
  r.style.setProperty('--neo-r', h(dp, sp))
  r.style.setProperty('--neo-r-sm', h(sm, +(sp*.5).toFixed(1)))
  r.style.setProperty('--neo-i', hi(sm, +(sp*.5).toFixed(1)))
  r.style.setProperty('--neo-i-sm', hi(ti, tb))

  r.style.setProperty('--serif', FS[t.fontDisplay] || FS.serif)
  r.style.setProperty('--sans', FS[t.fontBody] || FS.sans)
  document.body.style.fontSize = t.fontSize + 'px'
  document.body.style.lineHeight = String(t.lineH)
  r.style.setProperty('--r', t.radiusLg + 'px')
  r.style.setProperty('--r-sm', Math.round(t.radiusLg * .625) + 'px')

  const d = t.density, sbW = t.sidebarW, p = (b: number) => Math.round(b * d)
  const tbH = t.topbar === 'slim' ? '36px' : t.topbar === 'hidden' ? '0px' : '54px'
  const bw: Record<string, string> = { none:'0px', hairline:'0.5px', normal:'1px', bold:'2px' }
  const bv = bw[t.borderW] || '1px'
  let css = `@media(min-width:769px){.sidebar{width:${sbW}px!important}.main{margin-left:${sbW}px!important}.page{padding:${p(32)}px!important}.resume-card{padding:${p(28)}px!important;gap:${p(24)}px!important}.sec-card{padding:${p(24)}px!important;gap:${p(12)}px!important}.activity-card{padding:${p(24)}px!important}.sec-grid{gap:${p(20)}px!important;margin-bottom:${p(26)}px!important}.filter-panel{padding:${p(20)}px!important}.cg{gap:${p(18)}px!important}.lesson-center{padding:${p(26)}px ${p(22)}px!important;gap:${p(18)}px!important}.toc{padding:${p(22)}px ${p(14)}px!important;border-right-width:${bv}!important}.p-content{padding:${p(18)}px ${p(14)}px!important}.rpanel{border-left-width:${bv}!important}.auth-card{padding:${p(52)}px ${p(40)}px!important;gap:${p(28)}px!important}}.topbar{height:${tbH}!important;overflow:hidden}.act-item{border-bottom-width:${bv}!important}.p-tabs{border-bottom-width:${bv}!important}.lesson-footer{border-top-width:${bv}!important}.greeting,.lesson-title,.cat-title,.course-name,.sec-title,.cc-title,.logo,.sb-logo,.date-big{letter-spacing:${t.displayTrack}em!important}.tr-para,.act-text,.sec-meta,.toc-ch-title{line-height:${t.lineH}!important}`
  if (t.accentBudget === 'minimal') css += `.date-big{color:var(--fg)!important}.ch-check,.tr-ts,.res-dl{color:var(--muted)!important}.bell-dot{background:var(--muted)!important}.p-tab.active{border-bottom-color:var(--muted)!important;color:var(--fg)!important}`
  else if (t.accentBudget === 'generous') css += `.greeting{color:var(--coral)!important}.cat-title{color:var(--coral)!important}.lesson-title{color:var(--coral)!important}.f-sec-label,.sec-label,.toc-course{color:var(--coral)!important}`
  const el = document.getElementById('tweak-overrides')
  if (el) el.textContent = css
}

// ── Slider: uncontrolled input, local display state only ──────────────────
function Slider({ label, min, max, init, fmt, onInput }: {
  label: string; min: number; max: number; init: number
  fmt: (v: number) => string
  onInput: (v: number) => void
}) {
  const [display, setDisplay] = useState(fmt(init))
  const resetRef = useRef(init)

  return (
    <div className="tw-row">
      <div className="tw-lbl">{label} <span className="tw-val">{display}</span></div>
      <input
        className="tw-slider"
        type="range"
        min={min}
        max={max}
        defaultValue={resetRef.current}
        onInput={e => {
          const v = +(e.target as HTMLInputElement).value
          setDisplay(fmt(v))
          onInput(v)
        }}
      />
    </div>
  )
}

// ── Radio button ──────────────────────────────────────────────────────────
function Radio({ val, label, current, onClick }: { val: string; label: string; current: string; onClick: () => void }) {
  return (
    <button className={`tw-radio${current === val ? ' on' : ''}`} onClick={onClick}>{label}</button>
  )
}

export default function TweaksPanel() {
  const [open, setOpen] = useState(false)
  const [resetKey, setResetKey] = useState(0)

  // T is a ref — mutations never trigger re-renders, so sliders drag smoothly
  const T = useRef<TweakState>({ ...DEFAULTS })

  // Radio/display state (needs re-render to show selected state)
  const [radios, setRadios] = useState({
    accentBudget: DEFAULTS.accentBudget,
    fontDisplay: DEFAULTS.fontDisplay,
    fontBody: DEFAULTS.fontBody,
    borderW: DEFAULTS.borderW,
    theme: DEFAULTS.theme,
    topbar: DEFAULTS.topbar,
    bgPreset: 'cream',
  })
  const [accentPreview, setAccentPreview] = useState(
    `linear-gradient(90deg,hsl(${DEFAULTS.accentH},${DEFAULTS.accentS}%,${Math.max(20,DEFAULTS.accentL-14)}%),hsl(${DEFAULTS.accentH},${DEFAULTS.accentS}%,${DEFAULTS.accentL}%),hsl(${DEFAULTS.accentH},${DEFAULTS.accentS}%,${Math.min(88,DEFAULTS.accentL+14)}%))`
  )

  useEffect(() => { applyTweaks(T.current) }, [])

  function set<K extends keyof TweakState>(key: K, val: TweakState[K]) {
    T.current[key] = val
    applyTweaks(T.current)
  }

  function setRadio<K extends keyof typeof radios>(key: K, val: string) {
    setRadios(r => ({ ...r, [key]: val }))
    ;(T.current as Record<string, unknown>)[key] = val
    applyTweaks(T.current)
  }

  function updateAccentPreview() {
    const t = T.current
    setAccentPreview(`linear-gradient(90deg,hsl(${t.accentH},${t.accentS}%,${Math.max(20,t.accentL-14)}%),hsl(${t.accentH},${t.accentS}%,${t.accentL}%),hsl(${t.accentH},${t.accentS}%,${Math.min(88,t.accentL+14)}%))`)
  }

  function setBgPreset(p: string) {
    const P: Record<string, { bgH: number; bgL: number }> = {
      cream:{bgH:30,bgL:94}, pearl:{bgH:220,bgL:96}, white:{bgH:0,bgL:99}, lavender:{bgH:260,bgL:95}
    }
    if (!P[p]) return
    T.current.bgH = P[p].bgH
    T.current.bgL = P[p].bgL
    setRadios(r => ({ ...r, bgPreset: p }))
    setResetKey(k => k + 1) // force re-mount sliders with new defaultValues
    applyTweaks(T.current)
  }

  const reset = useCallback(() => {
    T.current = { ...DEFAULTS }
    setRadios({ accentBudget:'moderate', fontDisplay:'serif', fontBody:'sans', borderW:'hairline', theme:'light', topbar:'normal', bgPreset:'cream' })
    setAccentPreview(`linear-gradient(90deg,hsl(19,83%,54%),hsl(19,83%,68%),hsl(19,83%,82%))`)
    setResetKey(k => k + 1)
    applyTweaks(T.current)
  }, [])

  function copyCSSVars() {
    const r = document.documentElement, s = getComputedStyle(r)
    const vars = ['--bg','--surface','--surf-hi','--inset','--fg','--muted','--border','--coral','--coral-d','--neo-r','--neo-r-sm','--neo-i','--neo-i-sm','--r','--r-sm','--sans','--serif']
    const css = `:root {\n${vars.map(v => `  ${v}: ${s.getPropertyValue(v).trim()};`).join('\n')}\n}`
    navigator.clipboard.writeText(css).catch(() => alert(css))
  }

  const D = DEFAULTS

  return (
    <>
      <button id="tw-trigger" onClick={() => setOpen(o => !o)} title="Tweaks design">⚙</button>
      <div id="tw-panel" className={open ? 'open' : ''}>
        <div className="tw-head">
          <span className="tw-title">Tweaks</span>
          <button className="tw-reset" onClick={reset}>Réinitialiser</button>
          <button className="tw-copy" onClick={copyCSSVars}>Copier CSS</button>
          <button className="tw-x" onClick={() => setOpen(false)}>×</button>
        </div>

        <div className="tw-body" key={resetKey}>

          {/* Couleur d'accent */}
          <div className="tw-section">
            <div className="tw-sec-hd">Couleur d&apos;accent</div>
            <div className="tw-sec-body">
              <Slider label="Teinte" min={0} max={360} init={D.accentH} fmt={v => `${v}°`}
                onInput={v => { set('accentH', v); updateAccentPreview() }} />
              <Slider label="Saturation" min={10} max={100} init={D.accentS} fmt={v => `${v}%`}
                onInput={v => { set('accentS', v); updateAccentPreview() }} />
              <Slider label="Luminosité" min={25} max={82} init={D.accentL} fmt={v => `${v}%`}
                onInput={v => { set('accentL', v); updateAccentPreview() }} />
              <div className="tw-prev" style={{ background: accentPreview }} />
              <div className="tw-row" style={{ marginTop: 4 }}>
                <div className="tw-lbl">Budget accent</div>
                <div className="tw-radios">
                  {(['minimal','moderate','generous'] as const).map((v, i) => (
                    <Radio key={v} val={v} label={['Minimal','Modéré','Généreux'][i]} current={radios.accentBudget}
                      onClick={() => setRadio('accentBudget', v)} />
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Fond & Surfaces */}
          <div className="tw-section">
            <div className="tw-sec-hd">Fond &amp; Surfaces</div>
            <div className="tw-sec-body">
              <Slider label="Chaleur" min={0} max={80} init={T.current.bgH} fmt={v => `${v}°`}
                onInput={v => set('bgH', v)} />
              <Slider label="Luminosité fond" min={84} max={99} init={T.current.bgL} fmt={v => `${v}%`}
                onInput={v => set('bgL', v)} />
              <div className="tw-row">
                <div className="tw-lbl">Preset</div>
                <div className="tw-radios">
                  {(['cream','pearl','white','lavender'] as const).map((p, i) => (
                    <button key={p} className={`tw-radio${radios.bgPreset === p ? ' on' : ''}`}
                      onClick={() => setBgPreset(p)}>
                      {['Crème','Perle','Blanc','Lavande'][i]}
                    </button>
                  ))}
                </div>
              </div>
              <Slider label="Intensité néomorphisme" min={0} max={100} init={Math.round(D.neoOp*100)} fmt={v => `${v}%`}
                onInput={v => set('neoOp', v/100)} />
              <Slider label="Dispersion ombres" min={2} max={44} init={D.neoSpread} fmt={v => `${v}px`}
                onInput={v => set('neoSpread', v)} />
            </div>
          </div>

          {/* Typographie */}
          <div className="tw-section">
            <div className="tw-sec-hd">Typographie</div>
            <div className="tw-sec-body">
              <div className="tw-row">
                <div className="tw-lbl">Police display</div>
                <div className="tw-radios">
                  {(['serif','sans','mono'] as const).map((v, i) => (
                    <Radio key={v} val={v} label={['Sérif','Sans','Mono'][i]} current={radios.fontDisplay}
                      onClick={() => setRadio('fontDisplay', v)} />
                  ))}
                </div>
              </div>
              <div className="tw-row">
                <div className="tw-lbl">Police corps</div>
                <div className="tw-radios">
                  {(['sans','serif','mono'] as const).map((v, i) => (
                    <Radio key={v} val={v} label={['Sans','Sérif','Mono'][i]} current={radios.fontBody}
                      onClick={() => setRadio('fontBody', v)} />
                  ))}
                </div>
              </div>
              <Slider label="Taille de base" min={12} max={20} init={D.fontSize} fmt={v => `${v}px`}
                onInput={v => set('fontSize', v)} />
              <Slider label="Interlignage" min={120} max={200} init={Math.round(D.lineH*100)} fmt={v => (v/100).toFixed(2)}
                onInput={v => set('lineH', v/100)} />
              <Slider label="Tracking titres" min={-6} max={6} init={Math.round(D.displayTrack*100)} fmt={v => (v/100).toFixed(2)}
                onInput={v => set('displayTrack', v/100)} />
            </div>
          </div>

          {/* Géométrie */}
          <div className="tw-section">
            <div className="tw-sec-hd">Géométrie</div>
            <div className="tw-sec-body">
              <Slider label="Rayon principal" min={0} max={32} init={D.radiusLg} fmt={v => `${v}px`}
                onInput={v => set('radiusLg', v)} />
              <Slider label="Densité" min={55} max={165} init={Math.round(D.density*100)} fmt={v => `${(v/100).toFixed(1)}×`}
                onInput={v => set('density', v/100)} />
              <Slider label="Largeur sidebar" min={48} max={160} init={D.sidebarW} fmt={v => `${v}px`}
                onInput={v => set('sidebarW', v)} />
              <div className="tw-row">
                <div className="tw-lbl">Bordures</div>
                <div className="tw-radios">
                  {(['none','hairline','normal','bold'] as const).map((v, i) => (
                    <Radio key={v} val={v} label={['Aucune','Légère','Normale','Marquée'][i]} current={radios.borderW}
                      onClick={() => setRadio('borderW', v)} />
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Thème & Mode */}
          <div className="tw-section">
            <div className="tw-sec-hd">Thème &amp; Mode</div>
            <div className="tw-sec-body">
              <div className="tw-row">
                <div className="tw-lbl">Mode</div>
                <div className="tw-radios">
                  {(['light','dark','system'] as const).map((v, i) => (
                    <Radio key={v} val={v} label={['Clair','Sombre','Système'][i]} current={radios.theme}
                      onClick={() => setRadio('theme', v)} />
                  ))}
                </div>
              </div>
              <div className="tw-row">
                <div className="tw-lbl">Topbar</div>
                <div className="tw-radios">
                  {(['normal','slim','hidden'] as const).map((v, i) => (
                    <Radio key={v} val={v} label={['Normal','Slim','Masqué'][i]} current={radios.topbar}
                      onClick={() => setRadio('topbar', v)} />
                  ))}
                </div>
              </div>
            </div>
          </div>

        </div>
        <div className="tw-foot">
          <button className="tw-copyall" onClick={copyCSSVars}>↓ Exporter les variables CSS</button>
        </div>
      </div>
    </>
  )
}
