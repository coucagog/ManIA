// src/app/(public)/formation/page.tsx
//
// Page publique Formation : catalogue RÉEL tiré de la base (titres et méta
// seulement — jamais les chapitres ni les contenus), sessions présentielles
// à venir, et bloc de demande d'accès (file d'attente, cf. §23 : le pas
// humain est ce qui se facture).
//
// Composant SERVEUR. L'interactivité vit dans FormationCatalogue (filtres)
// et FormationAcces (formulaire) — ce dernier est le bloc qui évoluera vers
// l'inscription en ligne + paiement Wave/OM.

import { prisma } from '@/lib/db'
import FormationCatalogue, { CoursPublic } from '@/components/FormationCatalogue'
import FormationAcces from '@/components/FormationAcces'

// Sans ceci, Next pré-rend la page au build : un cours ajouté depuis l'admin
// n'apparaîtrait qu'au prochain déploiement. Le catalogue doit être vivant.
export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Formation aux agents IA — MANIA',
  description:
    'Formez vos équipes aux bonnes pratiques des LLM et des agents IA : cours en ligne, sessions en présentiel à Dakar, cas concrets métier par métier.',
}

function jourDe(d: Date) {
  return new Intl.DateTimeFormat('fr-FR', { day: '2-digit', timeZone: 'UTC' }).format(d)
}
function moisDe(d: Date) {
  return new Intl.DateTimeFormat('fr-FR', { month: 'short', year: 'numeric', timeZone: 'UTC' }).format(d)
}

export default async function FormationPage() {
  const [courses, sessions, sessionsCount] = await Promise.all([
    prisma.course.findMany({ orderBy: { createdAt: 'asc' } }),
    prisma.session.findMany({
      where: { status: 'upcoming', date: { gte: new Date() } },
      orderBy: { date: 'asc' },
      take: 3,
    }),
    prisma.session.count({
      where: { status: 'upcoming', date: { gte: new Date() } },
    }),
  ])

  const items: CoursPublic[] = courses.map(c => ({
    id: c.id,
    title: c.title,
    speaker: c.speaker,
    parcours: c.parcours,
    format: c.format,
    duration: c.duration,
    level: c.level,
    thumbClass: c.thumbClass,
    payant: c.payant,
    prix: c.prix,
  }))

  const parcoursOptions = [...new Set(items.map(c => c.parcours))]
  const formatOptions = [...new Set(items.map(c => c.format))]
  const levelOptions = [...new Set(items.map(c => c.level))]

  const heures = Math.round(items.reduce((s, c) => s + c.duration, 0) / 60)

  const stats: { num: string; lbl: string }[] = [
    { num: String(items.length), lbl: 'cours au catalogue' },
    { num: String(parcoursOptions.length), lbl: 'parcours thématiques' },
    { num: `${heures} h`, lbl: 'de contenu en ligne' },
  ]
  if (sessionsCount > 0) {
    stats.push({
      num: String(sessionsCount),
      lbl: sessionsCount > 1 ? 'sessions présentielles à venir' : 'session présentielle à venir',
    })
  }

  return (
    <>
      {/* ===== HERO ===== */}
      <section className="fp-hero">
        <div className="fp-hero-inner">
          <p className="land-eyebrow">Formation MANIA</p>
          <h1 className="land-h1">Formez vos équipes aux agents IA</h1>
          <p className="land-lead">
            Les bonnes pratiques des LLM, du prompt aux workflows en production —
            avec des cas concrets, métier par métier.
          </p>
          <div className="land-hero-actions">
            <a href="#acces" className="btn-cta-sm">Demander un accès →</a>
            <a href="#parcours" className="btn-soft-sm">Voir les parcours</a>
          </div>
          <p className="fp-note">En ligne + présentiel · À votre rythme · En français</p>
        </div>

        {/* Bandeau stats */}
        <div className="fp-stats">
          {stats.map(s => (
            <div className="land-stat" key={s.lbl}>
              <div className="land-stat-num">{s.num}</div>
              <div className="land-stat-lbl">{s.lbl}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ===== PARCOURS ===== */}
      <section id="parcours" className="land-section">
        <p className="land-eyebrow">Les parcours</p>
        <h2 className="land-h2">
          {parcoursOptions.length} parcours thématiques
        </h2>
        <div className="fp-parcours">
          {parcoursOptions.map((p, i) => {
            const n = items.filter(c => c.parcours === p).length
            return (
              <div className="fp-parcour" key={p}>
                <div className="fp-parcour-num">{String(i + 1).padStart(2, '0')}</div>
                <h3>{p}</h3>
                <div className="fp-parcour-count">{n} cours</div>
              </div>
            )
          })}
        </div>
      </section>

      {/* ===== CATALOGUE ===== */}
      <section className="land-section">
        <p className="land-eyebrow">Catalogue</p>
        <h2 className="land-h2">Tous les cours</h2>
        <FormationCatalogue
          courses={items}
          parcoursOptions={parcoursOptions}
          formatOptions={formatOptions}
          levelOptions={levelOptions}
        />
      </section>

      {/* ===== SESSIONS PRÉSENTIELLES ===== */}
      {sessions.length > 0 && (
        <section className="land-section">
          <p className="land-eyebrow">Présentiel</p>
          <h2 className="land-h2">Prochaines sessions</h2>
          <div className="fp-sessions">
            {sessions.map(s => (
              <div className="fp-session" key={s.id}>
                <div className="fp-session-date">
                  <div className="date-big">{jourDe(s.date)}</div>
                  <div className="date-month">{moisDe(s.date)}</div>
                </div>
                <div>
                  <h3>{s.title}</h3>
                  <p className="fp-session-meta">{s.location}</p>
                  <p className="fp-session-meta">Formateur · {s.instructor}</p>
                  {s.maxSeats != null && (
                    <span className="fp-places">{s.maxSeats} places</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ===== DEMANDE D'ACCÈS (bloc modulaire) ===== */}
      <FormationAcces />
    </>
  )
}
