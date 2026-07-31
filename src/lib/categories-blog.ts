// src/lib/categories-blog.ts
//
// SOURCE UNIQUE des catégories du blog — même principe que secteurs.ts :
// la validation serveur, le formulaire admin et les filtres publics en
// dérivent tous. Ajouter une catégorie = ajouter une ligne ici.
//
// 🔴 Ne JAMAIS renommer un `slug` déjà en base (il y est stocké tel quel).

export type CategorieBlog = {
  slug: string    // identifiant stocké en base
  libelle: string // libellé affiché (filtres publics, admin)
}

export const CATEGORIES_BLOG: readonly CategorieBlog[] = [
  { slug: 'bonnes-pratiques',     libelle: 'Bonnes pratiques' },
  { slug: 'securite-conformite',  libelle: 'Sécurité & conformité' },
  { slug: 'formation',            libelle: 'Formation' },
  { slug: 'plateforme',           libelle: 'Plateforme' },
]

// ── Dérivés — NE PAS éditer à la main ──

export const CATEGORIE_SLUGS: readonly string[] = CATEGORIES_BLOG.map(c => c.slug)

export const LIB_CATEGORIE: Record<string, string> =
  Object.fromEntries(CATEGORIES_BLOG.map(c => [c.slug, c.libelle]))

export const CATEGORIE_DEFAUT = 'bonnes-pratiques'
