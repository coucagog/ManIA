// src/lib/secteurs.ts
//
// SOURCE UNIQUE des secteurs d'activité.
//
// ⚠️ Toute évolution (ajout, renommage de libellé) se fait ICI et NULLE PART
//    AILLEURS : la validation serveur, le <select> du formulaire de candidature
//    et les libellés de l'admin en DÉRIVENT tous. Ajouter un secteur = ajouter
//    une ligne au tableau ci-dessous ; les trois usages suivent automatiquement.
//
// 🔴 Ne JAMAIS renommer un `slug` déjà en base (il y est stocké tel quel).
//    On peut librement changer `long` / `court`, mais pas la clé `slug`.

export type Secteur = {
  slug: string   // identifiant stocké en base de données
  long: string   // libellé du formulaire de candidature (vu par le prospect)
  court: string  // libellé compact de l'écran admin
}

export const SECTEURS: readonly Secteur[] = [
  { slug: 'sante',        long: 'Santé (médecine, optique, paramédical)', court: 'Santé' },
  { slug: 'droit',        long: 'Droit (avocat, notaire, huissier)',      court: 'Droit' },
  { slug: 'finance',      long: 'Banque, finance, assurance',             court: 'Finance / Assurance' },
  { slug: 'commerce',     long: 'Commerce & négoce',                      court: 'Commerce' },
  { slug: 'restauration', long: 'Restauration & hôtellerie',              court: 'Restauration' },
  { slug: 'immobilier',   long: 'Immobilier',                             court: 'Immobilier' },
  { slug: 'artisanat',    long: 'Artisanat & BTP',                        court: 'Artisanat / BTP' },
  { slug: 'services',     long: 'Services & conseil',                     court: 'Services' },
  { slug: 'education',    long: 'Éducation & formation',                  court: 'Éducation' },
  { slug: 'gouvernement', long: 'Administration publique',                court: 'Gouvernement' },
  { slug: 'ong',          long: 'ONG',                                    court: 'ONG' },
  { slug: 'autre',        long: 'Autre secteur',                          court: 'Autre' },
]

// ── Dérivés — NE PAS éditer à la main, ils suivent le tableau ci-dessus ──

/** Slugs valides, pour la validation serveur (actions/demandes.ts). */
export const SECTEUR_SLUGS: readonly string[] = SECTEURS.map(s => s.slug)

/** slug → libellé court, pour l'affichage admin (admin/demandes/page.tsx). */
export const LIB_SECTEUR: Record<string, string> =
  Object.fromEntries(SECTEURS.map(s => [s.slug, s.court]))

/** Slug proposé par défaut dans le formulaire de candidature. */
export const SECTEUR_DEFAUT = 'autre'
