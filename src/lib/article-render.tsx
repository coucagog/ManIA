// src/lib/article-render.tsx
//
// Rendu du contenu d'article : mini-markdown → éléments React.
// Volontairement SANS dépendance externe et SANS dangerouslySetInnerHTML :
// on construit des éléments React, il n'y a donc rien à échapper.
//
// Blocs supportés :   ## titre   ### sous-titre   - liste   > citation
//                     ``` bloc de code ```   paragraphes (ligne vide = séparation)
// Inline supporté :   **gras**   `code`   [texte](https://… | /chemin | mailto:…)
//
// ⚠️ Les liens n'acceptent que http(s), mailto: et les chemins internes « / » —
//    jamais javascript: ni data:.

import type { ReactNode } from 'react'

type Bloc =
  | { type: 'h2' | 'h3'; text: string }
  | { type: 'p' | 'quote'; lines: string[] }
  | { type: 'ul'; items: string[] }
  | { type: 'code'; code: string }

const INLINE_RE = /(`[^`]+`|\*\*[^*]+\*\*|\[[^\]]+\]\((?:https?:\/\/|\/|mailto:)[^)\s]*\))/g

function inline(text: string, keyBase: string): ReactNode[] {
  const parts = text.split(INLINE_RE)
  return parts.map((part, i) => {
    const key = `${keyBase}-${i}`
    if (!part) return null
    if (part.startsWith('`') && part.endsWith('`')) {
      return <code className="art-code-in" key={key}>{part.slice(1, -1)}</code>
    }
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={key}>{part.slice(2, -2)}</strong>
    }
    const lien = part.match(/^\[([^\]]+)\]\(((?:https?:\/\/|\/|mailto:)[^)\s]*)\)$/)
    if (lien) {
      const externe = lien[2].startsWith('http')
      return (
        <a href={lien[2]} key={key} {...(externe ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>
          {lien[1]}
        </a>
      )
    }
    return part
  })
}

function decouper(src: string): Bloc[] {
  const lines = src.replace(/\r\n/g, '\n').split('\n')
  const blocs: Bloc[] = []
  let i = 0

  while (i < lines.length) {
    const brut = lines[i]
    const line = brut.trim()

    if (!line) { i++; continue }

    if (line.startsWith('```')) {
      const buf: string[] = []
      i++
      while (i < lines.length && !lines[i].trim().startsWith('```')) { buf.push(lines[i]); i++ }
      i++ // saute la clôture
      blocs.push({ type: 'code', code: buf.join('\n') })
      continue
    }
    if (line.startsWith('### ')) { blocs.push({ type: 'h3', text: line.slice(4) }); i++; continue }
    if (line.startsWith('## ')) { blocs.push({ type: 'h2', text: line.slice(3) }); i++; continue }

    if (/^[-*] /.test(line)) {
      const items: string[] = []
      while (i < lines.length && /^[-*] /.test(lines[i].trim())) { items.push(lines[i].trim().slice(2)); i++ }
      blocs.push({ type: 'ul', items })
      continue
    }
    if (line.startsWith('>')) {
      const buf: string[] = []
      while (i < lines.length && lines[i].trim().startsWith('>')) { buf.push(lines[i].trim().replace(/^>\s?/, '')); i++ }
      blocs.push({ type: 'quote', lines: buf })
      continue
    }

    // Paragraphe : jusqu'à la ligne vide ou au prochain marqueur de bloc
    const buf: string[] = []
    while (
      i < lines.length && lines[i].trim() &&
      !/^(#{2,3} |[-*] |>|```)/.test(lines[i].trim())
    ) { buf.push(lines[i].trim()); i++ }
    if (buf.length) blocs.push({ type: 'p', lines: buf })
  }
  return blocs
}

export function renderArticle(contenu: string): ReactNode {
  const blocs = decouper(contenu)
  return blocs.map((b, k) => {
    switch (b.type) {
      case 'h2': return <h2 key={k}>{inline(b.text, `h${k}`)}</h2>
      case 'h3': return <h3 key={k}>{inline(b.text, `h${k}`)}</h3>
      case 'ul': return (
        <ul key={k}>
          {b.items.map((it, j) => <li key={j}>{inline(it, `l${k}-${j}`)}</li>)}
        </ul>
      )
      case 'quote': return (
        <blockquote className="art-quote" key={k}>
          {inline(b.lines.join(' '), `q${k}`)}
        </blockquote>
      )
      case 'code': return <pre className="art-code" key={k}>{b.code}</pre>
      case 'p': return <p key={k}>{inline(b.lines.join(' '), `p${k}`)}</p>
    }
  })
}

/** Temps de lecture estimé (minutes) — utilisé quand l'admin ne le fixe pas. */
export function tempsLectureEstime(contenu: string): number {
  const mots = contenu.split(/\s+/).filter(Boolean).length
  return Math.max(1, Math.round(mots / 220))
}
