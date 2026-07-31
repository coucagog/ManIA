// src/components/FormationCatalogue.tsx
//
// Catalogue PUBLIC des cours (page /formation) : recherche + puces de filtres
// (parcours / format / niveau) + grille de cartes. Composant client — même
// rôle que CatalogueContent côté apprenant, mais :
//   - les cartes ne mènent PAS au cours : elles renvoient vers #acces
//     (l'accès se demande, il n'est pas en libre-service) ;
//   - chaque carte porte le badge tarif « Gratuit » / prix FCFA (freemium §33).
'use client'

import { useState } from 'react'

export type CoursPublic = {
  id: string
  title: string
  speaker: string
  parcours: string
  format: string
  duration: number
  level: string
  thumbClass: string
  payant: boolean
  prix: number | null
}

type Props = {
  courses: CoursPublic[]
  parcoursOptions: string[]
  formatOptions: string[]
  levelOptions: string[]
}

// Format FCFA déterministe (espace fine insécable) : évite les écarts
// d'hydratation que peut produire toLocaleString selon l'environnement.
function prixFCFA(n: number) {
  return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' FCFA'
}

const TOUS = 'Tous'

function ChipRow({
  label, options, value, onChange,
}: {
  label: string
  options: string[]
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div className="fp-chiprow">
      <span className="fp-chiplbl">{label}</span>
      {[TOUS, ...options].map(opt => (
        <button
          key={opt}
          type="button"
          className={`pchip${value === opt ? ' is-active' : ''}`}
          onClick={() => onChange(opt)}
        >
          {opt}
        </button>
      ))}
    </div>
  )
}

export default function FormationCatalogue({
  courses, parcoursOptions, formatOptions, levelOptions,
}: Props) {
  const [search, setSearch] = useState('')
  const [parcours, setParcours] = useState(TOUS)
  const [format, setFormat] = useState(TOUS)
  const [level, setLevel] = useState(TOUS)

  const q = search.trim().toLowerCase()
  const filtered = courses.filter(c => {
    if (parcours !== TOUS && c.parcours !== parcours) return false
    if (format !== TOUS && c.format !== format) return false
    if (level !== TOUS && c.level !== level) return false
    if (q && !`${c.title} ${c.speaker} ${c.parcours}`.toLowerCase().includes(q)) return false
    return true
  })

  return (
    <>
      <div className="fp-filtres">
        <input
          className="f-in fp-search"
          type="search"
          placeholder="Rechercher un cours, un intervenant…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          aria-label="Rechercher dans le catalogue"
        />
        <ChipRow label="Parcours" options={parcoursOptions} value={parcours} onChange={setParcours} />
        <ChipRow label="Format" options={formatOptions} value={format} onChange={setFormat} />
        <ChipRow label="Niveau" options={levelOptions} value={level} onChange={setLevel} />
      </div>

      {filtered.length === 0 ? (
        <div className="fp-vide">Aucun cours ne correspond à ces filtres.</div>
      ) : (
        <div className="fp-grid">
          {filtered.map(c => (
            <a href="#acces" className="cc" key={c.id}>
              <div className={`cc-thumb ${c.thumbClass}`}>
                <span className={`fp-price${c.payant ? ' fp-price--payant' : ''}`}>
                  {c.payant ? prixFCFA(c.prix ?? 0) : 'Gratuit'}
                </span>
                <div className="cc-thumb-lbl">{c.parcours}</div>
              </div>
              <div className="cc-body">
                <div className="cc-title">{c.title}</div>
                <div className="cc-speaker">Par {c.speaker}</div>
                <div className="cc-meta">
                  {c.format}<span className="cc-dot">·</span>
                  {c.duration} min<span className="cc-dot">·</span>
                  {c.level}
                </div>
              </div>
            </a>
          ))}
        </div>
      )}
    </>
  )
}
