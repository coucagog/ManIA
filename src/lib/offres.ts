// src/lib/offres.ts
//
// SOURCE UNIQUE des offres commerciales (cf. STACK-5 §50).
//
// ⚠️ Toute évolution (prix, palier, limite) se fait ICI et NULLE PART AILLEURS :
//    la page publique /agent-ia, le <select> de la candidature, la validation
//    serveur et l'affichage admin en DÉRIVENT tous.
//
// 🔴 C'est la leçon du §26 (STACK-2) : la liste des secteurs vivait à trois
//    endroits, elle a désynchronisé DEUX FOIS dans la même journée, et le
//    symptôme — « Secteur invalide » — ne se voyait qu'en testant un envoi
//    réel. Une offre proposée par le formulaire mais absente de la validation
//    produirait exactement le même échec silencieux.
//
// 🔴 Ne JAMAIS renommer un `code` déjà stocké en base. Les libellés et les
//    prix se changent librement ; la clé, non.

export type Offre = {
  code: string
  nom: string
  cible: string
  /** FCFA par mois. `null` = sur devis. */
  prixMensuel: number | null
  /** FCFA, une fois. `null` = sur devis. */
  miseEnService: number | null
  /** Ce que devient la question de la clé LLM sur ce palier. */
  llm: string
  personnes: string
  profils: string
  hebergement: string
  /**
   * Palier ouvert aux métiers à secret professionnel (santé, droit, finance) ?
   * 🔴 Faux partout sauf en stack locale, tant que la pseudonymisation n'existe
   *    pas : c'est la décision d'exclusion du §50, et elle est cohérente avec
   *    ce qu'affirme déjà /confidentialite.
   */
  secretPro: boolean
  /**
   * Palier mis en avant : carte sombre + libellé « Le plus choisi ».
   * ⚠️ Un SEUL palier doit le porter. C'est une donnée, pas un `if` codé en
   *    dur dans la page — pour déplacer la mise en avant, on change ce
   *    drapeau et rien d'autre.
   */
  miseEnAvant?: boolean
  /** Puces affichées sur la carte de la page publique. */
  points: readonly string[]
}

export const OFFRES: readonly Offre[] = [
  {
    code: 'essentiel',
    nom: 'Essentiel',
    // ⚠️ Volontairement SANS « élève » : un élève seul occuperait un conteneur
    //    entier (§4.1, un conteneur par client) alors que la machine en porte
    //    5 à 6. Le public scolaire passe par « Organisation », un établissement
    //    = un locataire, N élèves dedans via TenantMember (§18).
    cible: 'Indépendant, artisan, commerce',
    prixMensuel: 30_000,
    miseEnService: 75_000,
    llm: 'Inclus — crédit plafonné rechargeable',
    personnes: '1 personne',
    profils: '1 profil métier',
    hebergement: 'Hébergé par MANIA',
    secretPro: false,
    points: [
      'Aucun abonnement IA à souscrire de votre côté',
      'Agent configuré sur vos usages et votre vocabulaire',
      'Espace isolé, sauvegarde chiffrée quotidienne',
    ],
  },
  {
    code: 'cabinet',
    nom: 'Cabinet',
    cible: 'Cabinet, agence, PME, école',
    prixMensuel: 135_000,
    miseEnService: 150_000,
    llm: 'Inclus — crédit élargi, rechargeable',
    personnes: "Jusqu'à 5 personnes",
    profils: '3 profils métier',
    hebergement: 'Hébergé par MANIA',
    secretPro: false,
    miseEnAvant: true,
    points: [
      'Plusieurs métiers configurés dans un même agent',
      'Comptes distincts pour votre équipe',
      'Point de suivi mensuel',
    ],
  },
  {
    code: 'organisation',
    nom: 'Organisation',
    // C'est AUSSI l'offre des établissements scolaires : un établissement =
    // un locataire, ses élèves étant des membres de cet espace unique.
    cible: 'École, ONG, administration',
    prixMensuel: null,
    miseEnService: null,
    llm: 'Sur devis',
    personnes: 'Au-delà de 5 personnes',
    profils: 'Sur mesure',
    hebergement: 'Hébergé ou dédié',
    secretPro: false,
    points: [
      'Élèves ou collaborateurs réunis dans un espace unique',
      'Interlocuteur dédié, formation des encadrants',
      'Ressources et crédit dimensionnés avec vous',
    ],
  },
  {
    code: 'locale',
    nom: 'Stack locale',
    cible: 'Qui veut maîtriser entièrement ses données',
    prixMensuel: null,
    miseEnService: null,
    llm: 'Modèle ouvert exécuté sur VOTRE machine — aucun coût par jeton',
    personnes: 'Selon votre matériel',
    profils: 'Sur mesure',
    hebergement: 'Votre infrastructure',
    secretPro: true,
    points: [
      'Vos contenus ne sont jamais envoyés à un fournisseur d’IA',
      'Poste dédié avec onduleur, ou serveur GPU selon vos volumes',
      'Le seul palier ouvert aux métiers à secret professionnel',
    ],
  },
]

// ─────────────────────────────────────────────────────────────
//  Offre de lancement (décision du 2026-08-10)
// ─────────────────────────────────────────────────────────────
// ⚠️ Une promotion sans contrepartie ET sans fin devient permanente sans que
//    personne ne l'ait décidée. Les deux bornes sont donc explicites.
export const PROMO_LANCEMENT = {
  actif: true,
  titre: 'Offre de lancement',
  texte:
    'Mise en service offerte aux 5 premiers clients, pour tout engagement de 6 mois.',
  places: 5,
  engagementMois: 6,
} as const

/** Recharges de crédit proposées, en FCFA. */
export const RECHARGES: readonly number[] = [5_000, 10_000, 25_000]

/** Un an = 10 mois payés (2 offerts) — décision §32. */
export const MOIS_PAYES_PAR_AN = 10

// ─────────────────────────────────────────────────────────────
//  Secteurs à secret professionnel
// ─────────────────────────────────────────────────────────────
// 🔴 Ces secteurs ne sont PAS rejetés : ils sont signalés. Un prospect
//    médecin qui demande « Essentiel » doit être accueilli et rappelé, pas
//    éconduit par un message d'erreur. La règle vit ici, à côté des offres,
//    et non dupliquée dans le formulaire et dans l'admin.
export const SECTEURS_SECRET_PRO: readonly string[] = ['sante', 'droit', 'finance']

/**
 * Vrai si le couple (secteur, offre) demande une reprise de contact avant
 * provisionnement : métier à secret professionnel sur un palier hébergé.
 * Tolérant aux valeurs vides — une demande sans offre choisie n'est pas
 * signalée.
 */
export function offreASignaler(secteur: string | null, offre: string | null): boolean {
  if (!secteur || !offre) return false
  if (!SECTEURS_SECRET_PRO.includes(secteur)) return false
  const o = OFFRES.find(x => x.code === offre)
  return !!o && !o.secretPro
}

// ── Dérivés — NE PAS éditer à la main, ils suivent le tableau ci-dessus ──

/** Codes valides, pour la validation serveur (actions/demandes.ts). */
export const OFFRE_CODES: readonly string[] = OFFRES.map(o => o.code)

/** code → nom, pour l'affichage admin. */
export const LIB_OFFRE: Record<string, string> =
  Object.fromEntries(OFFRES.map(o => [o.code, o.nom]))

/**
 * Formatage FCFA homogene partout : « 30 000 FCFA », espaces insecables.
 * ⚠️ Volontairement SANS `toLocaleString` : le separateur de milliers depend
 *    de l ICU embarque dans Node, et le local (Windows) ne produit pas
 *    forcement le meme caractere que la prod (`node:22-alpine`). Un rendu
 *    serveur different du rendu client provoque une erreur d hydratation.
 */
export function prixFcfa(montant: number): string {
  const groupe = montant.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '\u00A0')
  return `${groupe}\u00A0FCFA`
}
