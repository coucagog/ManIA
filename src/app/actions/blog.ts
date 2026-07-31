// src/app/actions/blog.ts
//
// CRUD des articles de blog — admin uniquement. Mêmes conventions que les
// cours (actions/admin.ts). Le public ne voit JAMAIS un brouillon : les pages
// publiques filtrent sur statut = 'publie'.
'use server'

import { prisma } from '@/lib/db'
import { verifySession } from '@/lib/session'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { CATEGORIE_SLUGS, CATEGORIE_DEFAUT } from '@/lib/categories-blog'

async function requireAdmin() {
  const session = await verifySession()
  if (session.role !== 'admin') redirect('/dashboard')
  return session
}

// « Sécurité & IA » → « securite-ia » : slug d'URL propre, sans accents.
function slugifier(s: string) {
  return s
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function lireChamps(formData: FormData) {
  const titre = ((formData.get('titre') as string) || '').trim()
  const slugSaisi = ((formData.get('slug') as string) || '').trim()
  const slug = slugifier(slugSaisi || titre)
  const chapo = ((formData.get('chapo') as string) || '').trim()
  const contenu = ((formData.get('contenu') as string) || '').trim()
  let categorie = ((formData.get('categorie') as string) || '').trim()
  if (!CATEGORIE_SLUGS.includes(categorie)) categorie = CATEGORIE_DEFAUT
  const imageUrl = ((formData.get('imageUrl') as string) || '').trim() || null
  const tempsLecture = parseInt(formData.get('tempsLecture') as string) || null
  const statut = formData.get('statut') === 'publie' ? 'publie' : 'brouillon'
  return { titre, slug, chapo, contenu, categorie, imageUrl, tempsLecture, statut }
}

export async function createArticle(
  _state: { error?: string; ok?: boolean } | undefined,
  formData: FormData,
): Promise<{ error?: string; ok?: boolean }> {
  await requireAdmin()
  const c = lireChamps(formData)

  if (!c.titre || !c.slug || !c.chapo || !c.contenu) {
    return { error: 'Titre, slug, chapô et contenu sont requis.' }
  }
  const existing = await prisma.article.findUnique({ where: { slug: c.slug } })
  if (existing) return { error: 'Ce slug est déjà utilisé.' }

  const article = await prisma.article.create({
    data: { ...c, publieAt: c.statut === 'publie' ? new Date() : null },
  })
  revalidatePath('/admin/blog')
  revalidatePath('/blog')
  revalidatePath('/') // l'aperçu blog de la landing
  redirect(`/admin/blog/${article.id}`)
}

export async function updateArticle(
  _state: { error?: string; ok?: boolean } | undefined,
  formData: FormData,
): Promise<{ error?: string; ok?: boolean }> {
  await requireAdmin()
  const id = formData.get('id') as string
  const c = lireChamps(formData)

  if (!id) return { error: 'Article introuvable.' }
  if (!c.titre || !c.slug || !c.chapo || !c.contenu) {
    return { error: 'Titre, slug, chapô et contenu sont requis.' }
  }
  const conflict = await prisma.article.findFirst({ where: { slug: c.slug, NOT: { id } } })
  if (conflict) return { error: 'Ce slug est déjà utilisé.' }

  const existant = await prisma.article.findUnique({ where: { id } })
  if (!existant) return { error: 'Article introuvable.' }

  // publieAt : posé à la PREMIÈRE publication, conservé ensuite (la date
  // affichée ne doit pas bouger à chaque retouche).
  const publieAt =
    c.statut === 'publie' ? (existant.publieAt ?? new Date()) : existant.publieAt

  await prisma.article.update({ where: { id }, data: { ...c, publieAt } })
  revalidatePath('/admin/blog')
  revalidatePath(`/admin/blog/${id}`)
  revalidatePath('/blog')
  revalidatePath(`/blog/${c.slug}`)
  revalidatePath('/')
  return { ok: true }
}

export async function deleteArticle(formData: FormData) {
  await requireAdmin()
  const id = formData.get('id') as string
  if (!id) return
  await prisma.article.delete({ where: { id } })
  revalidatePath('/admin/blog')
  revalidatePath('/blog')
  revalidatePath('/')
  redirect('/admin/blog')
}
