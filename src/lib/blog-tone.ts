// src/lib/blog-tone.ts
//
// Attribue à chaque article un aplat d'illustration (.tone-1 … .tone-7,
// cf. globals.css) dérivé de son slug : déterministe, zéro champ à gérer
// dans l'admin. Utilisé quand l'article n'a pas d'imageUrl.

export function toneDe(slug: string): string {
  let h = 0
  for (const ch of slug) h = (h * 31 + (ch.codePointAt(0) ?? 0)) >>> 0
  return `tone-${(h % 7) + 1}`
}
