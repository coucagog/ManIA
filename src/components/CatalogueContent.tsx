'use client'

import { useState } from 'react'
import Link from 'next/link'

export type CourseItem = {
  id: string
  slug: string
  title: string
  speaker: string
  parcours: string
  format: string
  duration: number
  level: string
  thumbClass: string
  progress: number
}

interface Props {
  courses: CourseItem[]
  parcoursOptions: string[]
  formatOptions: string[]
  levelOptions: string[]
  defaultQuery?: string
}

export default function CatalogueContent({ courses, parcoursOptions, formatOptions, levelOptions, defaultQuery = '' }: Props) {
  const [selParcours, setSelParcours] = useState(new Set(parcoursOptions))
  const [selFormats, setSelFormats] = useState(new Set(formatOptions))
  const [selLevels, setSelLevels] = useState(new Set(levelOptions))
  const [query, setQuery] = useState(defaultQuery)

  function toggle<T>(set: Set<T>, fn: (s: Set<T>) => void, val: T) {
    const next = new Set(set)
    next.has(val) ? next.delete(val) : next.add(val)
    fn(next)
  }

  const q = query.toLowerCase().trim()
  const filtered = courses.filter(c =>
    selParcours.has(c.parcours) &&
    selFormats.has(c.format) &&
    selLevels.has(c.level) &&
    (!q || c.title.toLowerCase().includes(q) || c.speaker.toLowerCase().includes(q) || c.parcours.toLowerCase().includes(q))
  )

  return (
    <div className="cat-body">
      <div className="filter-panel">
        <div className="f-section">
          <div className="f-sec-label">Parcours</div>
          <div className="f-opts">
            {parcoursOptions.map(p => (
              <div key={p} className="f-opt" onClick={() => toggle(selParcours, setSelParcours, p)} style={{ cursor: 'pointer' }}>
                <div className={`f-box${selParcours.has(p) ? ' on' : ''}`}>{selParcours.has(p) ? '✓' : ''}</div> {p}
              </div>
            ))}
          </div>
        </div>
        <div className="f-section">
          <div className="f-sec-label">Format</div>
          <div className="f-opts">
            {formatOptions.map(f => (
              <div key={f} className="f-opt" onClick={() => toggle(selFormats, setSelFormats, f)} style={{ cursor: 'pointer' }}>
                <div className={`f-box${selFormats.has(f) ? ' on' : ''}`}>{selFormats.has(f) ? '✓' : ''}</div> {f}
              </div>
            ))}
          </div>
        </div>
        <div className="f-section">
          <div className="f-sec-label">Niveau</div>
          <div className="f-opts">
            {levelOptions.map(l => (
              <div key={l} className="f-opt" onClick={() => toggle(selLevels, setSelLevels, l)} style={{ cursor: 'pointer' }}>
                <div className={`f-box${selLevels.has(l) ? ' on' : ''}`}>{selLevels.has(l) ? '✓' : ''}</div> {l}
              </div>
            ))}
          </div>
        </div>
        <div className="f-section">
          <div className="f-sec-label">Recherche</div>
          <input
            className="f-in"
            type="text"
            placeholder="Titre, intervenant…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            style={{ fontSize: '13px' }}
          />
        </div>
        {(filtered.length < courses.length || query) && (
          <button
            className="link-s"
            style={{ marginTop: '12px', fontSize: '12px' }}
            onClick={() => {
              setSelParcours(new Set(parcoursOptions))
              setSelFormats(new Set(formatOptions))
              setSelLevels(new Set(levelOptions))
              setQuery('')
            }}
          >
            Tout réinitialiser
          </button>
        )}
      </div>

      <div className="cg">
        {filtered.length === 0 && (
          <p style={{ color: 'var(--muted)', fontSize: '14px', gridColumn: '1/-1', paddingTop: '32px' }}>
            Aucun cours correspond à ces filtres.
          </p>
        )}
        {filtered.map(course => {
          const inProg = course.progress > 0 && course.progress < 100
          const done = course.progress === 100
          return (
            <Link key={course.id} href={`/cours/${course.slug}`} className="cc">
              <div className={`cc-thumb ${course.thumbClass}`}>
                <div className="cc-thumb-lbl">{course.parcours}</div>
                <span className={`cc-badge${inProg ? ' inprog' : ''}`}>
                  {inProg ? 'En cours' : done ? '✓ Terminé' : course.format}
                </span>
              </div>
              <div className="cc-body">
                <div className="cc-title">{course.title}</div>
                <div className="cc-speaker">par {course.speaker}</div>
                <div className="cc-meta">
                  {course.duration} min <span className="cc-dot">·</span> {course.level}
                </div>
                {course.progress > 0 && (
                  <div className="cc-prog">
                    <div className="cc-prog-fill" style={{ width: `${course.progress}%` }}></div>
                  </div>
                )}
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
