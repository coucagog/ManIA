'use client'

import { useState, useEffect, useCallback } from 'react'

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

export default function TweaksPanel() {
  const [open, setOpen] = useState(false)
  const [T, setT] = useState<TweakState>(DEFAULTS)

  const applyTweaks = useCallback((t: TweakState) => {
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
      r.style.setProperty('--surface', `hsl(${t.bgH},${Math.max(0, s - 0.8).toFixed(1)}%,${(t.bgL - 2.5).toFixed(1)}%)`)
      r.style.setProperty('--surf-hi', `hsl(${t.bgH},${Math.max(0, s - 1.2).toFixed(1)}%,${(t.bgL - 4.5).toFixed(1)}%)`)
      r.style.setProperty('--inset', `hsl(${t.bgH},${Math.max(0, s - 2).toFixed(1)}%,${(t.bgL - 8).toFixed(1)}%)`)
      r.style.setProperty('--border', `hsl(${t.bgH},${Math.max(0, s - 1).toFixed(1)}%,${(t.bgL - 6).toFixed(1)}%)`)
    } else {
      ['--bg','--surface','--surf-hi','--inset','--border'].forEach(v => r.style.removeProperty(v))
    }

    const op = t.neoOp, sp = t.neoSpread
    const dp = +(sp * 0.4).toFixed(1), sm = +(sp * 0.2).toFixed(1), ti = +(sm * 0.5).toFixed(1), tb = +(sp * 0.25).toFixed(1)
    const dC = !dark ? `rgba(160,152,142,${op.toFixed(2)})` : `rgba(20,25,33,${op.toFixed(2)})`
    const lC = !dark ? `rgba(255,255,255,${(op * 0.85).toFixed(2)})` : `rgba(54,63,76,${(op * 0.65).toFixed(2)})`
    const h = (a: number, b: number) => `${a}px ${a}px ${b}px ${dC},-${a}px -${a}px ${b}px ${lC}`
    const hi = (a: number, b: number) => `inset ${a}px ${a}px ${b}px ${dC},inset -${a}px -${a}px ${b}px ${lC}`
    r.style.setProperty('--neo-r', h(dp, sp))
    r.style.setProperty('--neo-r-sm', h(sm, +(sp * 0.5).toFixed(1)))
    r.style.setProperty('--neo-i', hi(sm, +(sp * 0.5).toFixed(1)))
    r.style.setProperty('--neo-i-sm', hi(ti, tb))

    r.style.setProperty('--serif', FS[t.fontDisplay] || FS.serif)
    r.style.setProperty('--sans', FS[t.fontBody] || FS.sans)
    document.body.style.fontSize = t.fontSize + 'px'
    document.body.style.lineHeight = String(t.lineH)
    r.style.setProperty('--r', t.radiusLg + 'px')
    r.style.setProperty('--r-sm', Math.round(t.radiusLg * 0.625) + 'px')

    const d = t.density, sbW = t.sidebarW, p = (b: number) => Math.round(b * d)
    const tbH = t.topbar === 'slim' ? '36px' : t.topbar === 'hidden' ? '0px' : '54px'
    const bw: Record<string, string> = { none:'0px', hairline:'0.5px', normal:'1px', bold:'2px' }
    let css = `@media(min-width:769px){.sidebar{width:${sbW}px!important}.main{margin-left:${sbW}px!important}.page{padding:${p(32)}px!important}.resume-card{padding:${p(28)}px!important;gap:${p(24)}px!important}.sec-card{padding:${p(24)}px!important;gap:${p(12)}px!important}.activity-card{padding:${p(24)}px!important}.sec-grid{gap:${p(20)}px!important;margin-bottom:${p(26)}px!important}.filter-panel{padding:${p(20)}px!important}.cg{gap:${p(18)}px!important}.lesson-center{padding:${p(26)}px ${p(22)}px!important;gap:${p(18)}px!important}.toc{padding:${p(22)}px ${p(14)}px!important;border-right-width:${bw[t.borderW]||'1px'}!important}.p-content{padding:${p(18)}px ${p(14)}px!important}.rpanel{border-left-width:${bw[t.borderW]||'1px'}!important}.auth-card{padding:${p(52)}px ${p(40)}px!important;gap:${p(28)}px!important}}.topbar{height:${tbH}!important;overflow:hidden}.act-item{border-bottom-width:${bw[t.borderW]||'1px'}!important}.p-tabs{border-bottom-width:${bw[t.borderW]||'1px'}!important}.lesson-footer{border-top-width:${bw[t.borderW]||'1px'}!important}.greeting,.lesson-title,.cat-title,.course-name,.sec-title,.cc-title,.logo,.sb-logo,.date-big{letter-spacing:${t.displayTrack}em!important}.tr-para,.act-text,.sec-meta,.toc-ch-title{line-height:${t.lineH}!important}`

    if (t.accentBudget === 'minimal') css += `.date-big{color:var(--fg)!important}.ch-check,.tr-ts,.res-dl{color:var(--muted)!important}.bell-dot{background:var(--muted)!important}.p-tab.active{border-bottom-color:var(--muted)!important;color:var(--fg)!important}`
    else if (t.accentBudget === 'generous') css += `.greeting{color:var(--coral)!important}.cat-title{color:var(--coral)!important}.lesson-title{color:var(--coral)!important}.f-sec-label,.sec-label,.toc-course{color:var(--coral)!important}`

    const el = document.getElementById('tweak-overrides')
    if (el) el.textContent = css
  }, [])

  useEffect(() => { applyTweaks(T) }, [T, applyTweaks])

  function update<K extends keyof TweakState>(key: K, val: TweakState[K]) {
    setT(prev => ({ ...prev, [key]: val }))
  }

  function setBgPreset(p: string) {
    const P: Record<string, { bgH: number; bgL: number }> = {
      cream:{ bgH:30, bgL:94 }, pearl:{ bgH:220, bgL:96 }, white:{ bgH:0, bgL:99 }, lavender:{ bgH:260, bgL:95 }
    }
    if (P[p]) setT(prev => ({ ...prev, bgH: P[p].bgH, bgL: P[p].bgL }))
  }

  function reset() { setT({ ...DEFAULTS }) }

  function copyCSSVars() {
    const r = document.documentElement, s = getComputedStyle(r)
    const vars = ['--bg','--surface','--surf-hi','--inset','--fg','--muted','--border','--coral','--coral-d','--neo-r','--neo-r-sm','--neo-i','--neo-i-sm','--r','--r-sm','--sans','--serif']
    const css = `:root {\n${vars.map(v => `  ${v}: ${s.getPropertyValue(v).trim()};`).join('\n')}\n}`
    navigator.clipboard.writeText(css).catch(() => alert(css))
  }

  const accentPreview = `linear-gradient(90deg,hsl(${T.accentH},${T.accentS}%,${Math.max(20,T.accentL-14)}%),hsl(${T.accentH},${T.accentS}%,${T.accentL}%),hsl(${T.accentH},${T.accentS}%,${Math.min(88,T.accentL+14)}%))`

  function Radio({ group, val, label, current, onClick }: { group: string; val: string; label: string; current: string; onClick: () => void }) {
    return <button className={`tw-radio${current === val ? ' on' : ''}`} data-group={group} data-val={val} onClick={onClick}>{label}</button>
  }

  function Slider({ id, min, max, value, display, onChange }: { id: string; min: number; max: number; value: number; display: string; onChange: (v: number) => void }) {
    return (
      <div className="tw-row">
        <div className="tw-lbl">{id} <span className="tw-val">{display}</span></div>
        <input className="tw-slider" type="range" min={min} max={max} value={value} onChange={e => onChange(+e.target.value)} />
      </div>
    )
  }

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
        <div className="tw-body">

          {/* Couleur d'accent */}
          <div className="tw-section">
            <div className="tw-sec-hd">Couleur d&apos;accent</div>
            <div className="tw-sec-body">
              <Slider id="Teinte" min={0} max={360} value={T.accentH} display={`${T.accentH}°`} onChange={v => update('accentH', v)} />
              <Slider id="Saturation" min={10} max={100} value={T.accentS} display={`${T.accentS}%`} onChange={v => update('accentS', v)} />
              <Slider id="Luminosité" min={25} max={82} value={T.accentL} display={`${T.accentL}%`} onChange={v => update('accentL', v)} />
              <div className="tw-prev" style={{ background: accentPreview }} />
              <div className="tw-row" style={{ marginTop: '4px' }}>
                <div className="tw-lbl">Budget accent</div>
                <div className="tw-radios">
                  <Radio group="budget" val="minimal" label="Minimal" current={T.accentBudget} onClick={() => update('accentBudget', 'minimal')} />
                  <Radio group="budget" val="moderate" label="Modéré" current={T.accentBudget} onClick={() => update('accentBudget', 'moderate')} />
                  <Radio group="budget" val="generous" label="Généreux" current={T.accentBudget} onClick={() => update('accentBudget', 'generous')} />
                </div>
              </div>
            </div>
          </div>

          {/* Fond & Surfaces */}
          <div className="tw-section">
            <div className="tw-sec-hd">Fond &amp; Surfaces</div>
            <div className="tw-sec-body">
              <Slider id="Chaleur" min={0} max={80} value={T.bgH} display={`${T.bgH}°`} onChange={v => update('bgH', v)} />
              <Slider id="Luminosité fond" min={84} max={99} value={T.bgL} display={`${T.bgL}%`} onChange={v => update('bgL', v)} />
              <div className="tw-row">
                <div className="tw-lbl">Preset</div>
                <div className="tw-radios">
                  {(['cream','pearl','white','lavender'] as const).map((p, i) => (
                    <button key={p} className={`tw-radio${(T.bgH === [30,220,0,260][i] && T.bgL === [94,96,99,95][i]) ? ' on' : ''}`} onClick={() => setBgPreset(p)}>
                      {['Crème','Perle','Blanc','Lavande'][i]}
                    </button>
                  ))}
                </div>
              </div>
              <Slider id="Intensité néomorphisme" min={0} max={100} value={Math.round(T.neoOp * 100)} display={`${Math.round(T.neoOp * 100)}%`} onChange={v => update('neoOp', v / 100)} />
              <Slider id="Dispersion ombres" min={2} max={44} value={T.neoSpread} display={`${T.neoSpread}px`} onChange={v => update('neoSpread', v)} />
            </div>
          </div>

          {/* Typographie */}
          <div className="tw-section">
            <div className="tw-sec-hd">Typographie</div>
            <div className="tw-sec-body">
              <div className="tw-row">
                <div className="tw-lbl">Police display</div>
                <div className="tw-radios">
                  <Radio group="fdisplay" val="serif" label="Sérif" current={T.fontDisplay} onClick={() => update('fontDisplay', 'serif')} />
                  <Radio group="fdisplay" val="sans" label="Sans" current={T.fontDisplay} onClick={() => update('fontDisplay', 'sans')} />
                  <Radio group="fdisplay" val="mono" label="Mono" current={T.fontDisplay} onClick={() => update('fontDisplay', 'mono')} />
                </div>
              </div>
              <div className="tw-row">
                <div className="tw-lbl">Police corps</div>
                <div className="tw-radios">
                  <Radio group="fbody" val="sans" label="Sans" current={T.fontBody} onClick={() => update('fontBody', 'sans')} />
                  <Radio group="fbody" val="serif" label="Sérif" current={T.fontBody} onClick={() => update('fontBody', 'serif')} />
                  <Radio group="fbody" val="mono" label="Mono" current={T.fontBody} onClick={() => update('fontBody', 'mono')} />
                </div>
              </div>
              <Slider id="Taille de base" min={12} max={20} value={T.fontSize} display={`${T.fontSize}px`} onChange={v => update('fontSize', v)} />
              <Slider id="Interlignage" min={120} max={200} value={Math.round(T.lineH * 100)} display={T.lineH.toFixed(2)} onChange={v => update('lineH', v / 100)} />
              <Slider id="Tracking titres" min={-6} max={6} value={Math.round(T.displayTrack * 100)} display={T.displayTrack.toFixed(2)} onChange={v => update('displayTrack', v / 100)} />
            </div>
          </div>

          {/* Géométrie */}
          <div className="tw-section">
            <div className="tw-sec-hd">Géométrie</div>
            <div className="tw-sec-body">
              <Slider id="Rayon principal" min={0} max={32} value={T.radiusLg} display={`${T.radiusLg}px`} onChange={v => update('radiusLg', v)} />
              <Slider id="Densité" min={55} max={165} value={Math.round(T.density * 100)} display={`${T.density.toFixed(1)}×`} onChange={v => update('density', v / 100)} />
              <Slider id="Largeur sidebar" min={48} max={160} value={T.sidebarW} display={`${T.sidebarW}px`} onChange={v => update('sidebarW', v)} />
              <div className="tw-row">
                <div className="tw-lbl">Bordures</div>
                <div className="tw-radios">
                  <Radio group="bw" val="none" label="Aucune" current={T.borderW} onClick={() => update('borderW', 'none')} />
                  <Radio group="bw" val="hairline" label="Légère" current={T.borderW} onClick={() => update('borderW', 'hairline')} />
                  <Radio group="bw" val="normal" label="Normale" current={T.borderW} onClick={() => update('borderW', 'normal')} />
                  <Radio group="bw" val="bold" label="Marquée" current={T.borderW} onClick={() => update('borderW', 'bold')} />
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
                  <Radio group="theme" val="light" label="Clair" current={T.theme} onClick={() => update('theme', 'light')} />
                  <Radio group="theme" val="dark" label="Sombre" current={T.theme} onClick={() => update('theme', 'dark')} />
                  <Radio group="theme" val="system" label="Système" current={T.theme} onClick={() => update('theme', 'system')} />
                </div>
              </div>
              <div className="tw-row">
                <div className="tw-lbl">Topbar</div>
                <div className="tw-radios">
                  <Radio group="topbar" val="normal" label="Normal" current={T.topbar} onClick={() => update('topbar', 'normal')} />
                  <Radio group="topbar" val="slim" label="Slim" current={T.topbar} onClick={() => update('topbar', 'slim')} />
                  <Radio group="topbar" val="hidden" label="Masqué" current={T.topbar} onClick={() => update('topbar', 'hidden')} />
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
