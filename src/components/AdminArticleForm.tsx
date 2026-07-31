// src/components/AdminArticleForm.tsx
//
// Formulaire de création / édition d'un article de blog. Même patron que
// AdminCourseForm. Le contenu s'écrit en mini-markdown (voir l'aide sous le
// champ) — rendu par src/lib/article-render.tsx.
'use client'

import { useActionState } from 'react'
import { createArticle, updateArticle, deleteArticle } from '@/app/actions/blog'
import { CATEGORIES_BLOG, CATEGORIE_DEFAUT } from '@/lib/categories-blog'
import ArticleImageUpload from '@/components/ArticleImageUpload'
import Link from 'next/link'

type ArticleData = {
  id: string; slug: string; titre: string; chapo: string; contenu: string
  categorie: string; imageUrl: string | null; tempsLecture: number | null
  statut: string
}
type Props = { mode: 'create' } | { mode: 'edit'; article: ArticleData }

export default function AdminArticleForm(props: Props) {
  const fn = props.mode === 'create' ? createArticle : updateArticle
  const [state, action, pending] = useActionState<{ error?: string; ok?: boolean } | undefined, FormData>(fn, undefined)
  const a = props.mode === 'edit' ? props.article : null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div className="sec-card">
        <div style={{ fontSize: '11px', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '16px' }}>
          {props.mode === 'create' ? 'Nouvel article' : 'Modifier l’article'}
        </div>
        <form action={action} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {a && <input type="hidden" name="id" value={a.id} />}

          <Field label="Titre" name="titre" defaultValue={a?.titre} required />
          <Field label="Slug (URL) — laissé vide, il est dérivé du titre" name="slug"
                 defaultValue={a?.slug} placeholder="ex: prompt-professionnel" />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <label style={lbl}>Catégorie</label>
              <select className="f-in" name="categorie" defaultValue={a?.categorie ?? CATEGORIE_DEFAUT} style={{ width: '100%', fontSize: '13px' }}>
                {CATEGORIES_BLOG.map(c => <option key={c.slug} value={c.slug}>{c.libelle}</option>)}
              </select>
            </div>
            <div>
              <label style={lbl}>Statut</label>
              <select className="f-in" name="statut" defaultValue={a?.statut ?? 'brouillon'} style={{ width: '100%', fontSize: '13px' }}>
                <option value="brouillon">Brouillon (invisible du public)</option>
                <option value="publie">Publié</option>
              </select>
            </div>
          </div>

          <div>
            <label style={lbl}>Chapô (accroche courte, affichée dans les listes)</label>
            <textarea className="f-in" name="chapo" required rows={2} maxLength={300}
                      defaultValue={a?.chapo} style={{ width: '100%', fontSize: '13px' }} />
          </div>

          <div>
            <label style={lbl}>Contenu</label>
            <textarea className="f-in" name="contenu" required rows={18}
                      defaultValue={a?.contenu}
                      style={{ width: '100%', fontSize: '13px', fontFamily: 'ui-monospace, Menlo, monospace', lineHeight: 1.6 }} />
            <p style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '6px', lineHeight: 1.6 }}>
              Mise en forme : <code>## Titre de section</code> · <code>### Sous-titre</code> ·{' '}
              <code>- élément de liste</code> · <code>&gt; citation</code> · <code>```bloc de code```</code> ·{' '}
              <code>**gras**</code> · <code>`code`</code> · <code>[texte](https://…)</code>.
              Une ligne vide sépare les paragraphes.
            </p>
          </div>

          <Field label="Temps de lecture (min) — calculé si vide" name="tempsLecture"
                 type="number" defaultValue={a?.tempsLecture != null ? String(a.tempsLecture) : ''} />

          <div style={{ borderTop: '1px solid var(--border)', paddingTop: '16px', marginTop: '4px' }}>
            <div style={lbl}>Image (optionnelle — sinon un aplat de couleur est généré)</div>
            <ArticleImageUpload initialUrl={a?.imageUrl} />
          </div>

          {state?.error && <p style={{ color: 'var(--coral)', fontSize: '12px' }}>{state.error}</p>}
          {state?.ok && <p style={{ color: 'var(--coral)', fontSize: '12px' }}>✓ Enregistré</p>}

          <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
            <button type="submit" className="btn-done" disabled={pending} style={{ fontSize: '12px', padding: '8px 16px' }}>
              {pending ? '…' : props.mode === 'create' ? 'Créer' : 'Enregistrer'}
            </button>
            <Link href="/admin/blog" className="btn-ghost" style={{ fontSize: '12px', padding: '8px 16px' }}>
              {props.mode === 'create' ? 'Annuler' : 'Retour à la liste'}
            </Link>
            {a && a.statut === 'publie' && (
              <a href={`/blog/${a.slug}`} target="_blank" rel="noopener noreferrer" className="btn-ghost" style={{ fontSize: '12px', padding: '8px 16px' }}>
                Voir en ligne ↗
              </a>
            )}
          </div>
        </form>
      </div>

      {a && (
        <div className="sec-card" style={{ borderTop: '2px solid var(--coral)' }}>
          <div style={{ fontSize: '11px', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '12px' }}>Zone dangereuse</div>
          <form action={deleteArticle} onSubmit={e => { if (!confirm('Supprimer définitivement cet article ?')) e.preventDefault() }}>
            <input type="hidden" name="id" value={a.id} />
            <button type="submit" style={{ fontSize: '12px', padding: '7px 14px', background: 'none', border: '1px solid var(--coral)', color: 'var(--coral)', borderRadius: 'var(--r-sm)', cursor: 'pointer' }}>
              Supprimer l&apos;article
            </button>
          </form>
        </div>
      )}
    </div>
  )
}

const lbl: React.CSSProperties = { fontSize: '11px', color: 'var(--muted)', display: 'block', marginBottom: '5px' }

function Field({ label, name, defaultValue, required, placeholder, type = 'text' }: {
  label: string; name: string; defaultValue?: string; required?: boolean; placeholder?: string; type?: string
}) {
  return (
    <div>
      <label style={lbl}>{label}</label>
      <input className="f-in" name={name} type={type} defaultValue={defaultValue} required={required} placeholder={placeholder} style={{ width: '100%', fontSize: '13px' }} />
    </div>
  )
}
