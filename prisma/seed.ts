import { PrismaClient } from '../src/generated/prisma/client'
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'
import bcrypt from 'bcryptjs'
import path from 'path'

const dbPath = path.resolve(process.cwd(), 'dev.db')
const adapter = new PrismaBetterSqlite3({ url: `file:${dbPath}` })
const prisma = new PrismaClient({ adapter })

async function main() {
  // Create demo user
  const hash = await bcrypt.hash('mania2025', 12)
  const user = await prisma.user.upsert({
    where: { email: 'apprenant@diplomatie.fr' },
    update: {},
    create: {
      email: 'apprenant@diplomatie.fr',
      name: 'Ambassadrice Claire Dumont',
      initials: 'CA',
      password: hash,
      role: 'learner',
    },
  })

  // Courses
  const courses = [
    {
      slug: 'fondements-llm',
      title: 'Comprendre les grands modèles de langage',
      speaker: 'Dr. Sophie Marchand',
      parcours: 'Fondations IA',
      format: 'Vidéo',
      duration: 38,
      level: 'Initiation',
      thumbClass: 't1',
      chapters: [
        { title: 'Introduction aux LLM', duration: 12, format: 'Vidéo', order: 1 },
        { title: 'Architecture Transformer', duration: 14, format: 'Vidéo', order: 2 },
        { title: 'Entraînement et fine-tuning', duration: 12, format: 'Vidéo', order: 3 },
      ],
    },
    {
      slug: 'architecture-agentique',
      title: 'Architecture agentique et décision souveraine',
      speaker: 'Pr. Ibrahim Al-Mansouri',
      parcours: 'Agents Autonomes',
      format: 'Vidéo',
      duration: 41,
      level: 'Maîtrise',
      thumbClass: 't2',
      chapters: [
        { title: 'Introduction aux architectures agentiques', duration: 28, format: 'Vidéo', order: 1 },
        { title: 'Mémoire, planification et outillage', duration: 34, format: 'Vidéo', order: 2 },
        { title: 'Orchestration multi-agents en contexte fermé', duration: 41, format: 'Vidéo', order: 3 },
        { title: 'Évaluation et robustesse des agents', duration: 38, format: 'Vidéo', order: 4 },
        { title: 'Déploiement souverain', duration: 52, format: 'Vidéo', order: 5 },
        { title: 'Cas d\'usage institutionnels', duration: 44, format: 'Texte + Vidéo', order: 6 },
        { title: 'Gouvernance et audit des systèmes agentiques', duration: 36, format: 'Texte', order: 7 },
      ],
    },
    {
      slug: 'evaluation-risques-ia',
      title: 'Évaluation des risques dans les systèmes d\'IA autonomes',
      speaker: 'Dr. Amara Ndiaye',
      parcours: 'Agents Autonomes',
      format: 'Vidéo',
      duration: 42,
      level: 'Maîtrise',
      thumbClass: 't3',
      chapters: [
        { title: 'Cartographie des risques', duration: 20, format: 'Vidéo', order: 1 },
        { title: 'Méthodes d\'évaluation', duration: 22, format: 'Vidéo', order: 2 },
      ],
    },
    {
      slug: 'rag-institutions',
      title: 'Retrieval-Augmented Generation pour institutions',
      speaker: 'Pr. Jean-Luc Fontaine',
      parcours: 'RAG & Souveraineté',
      format: 'Texte',
      duration: 55,
      level: 'Maîtrise',
      thumbClass: 't4',
      chapters: [
        { title: 'Principes du RAG', duration: 18, format: 'Texte', order: 1 },
        { title: 'Indexation et retrieval', duration: 20, format: 'Texte', order: 2 },
        { title: 'Déploiement en contexte souverain', duration: 17, format: 'Texte', order: 3 },
      ],
    },
    {
      slug: 'ia-souveraine',
      title: 'IA souveraine : contraintes juridiques et techniques',
      speaker: 'Me. Claire Verdoux',
      parcours: 'RAG & Souveraineté',
      format: 'Vidéo',
      duration: 48,
      level: 'Expertise',
      thumbClass: 't5',
      chapters: [
        { title: 'Cadre juridique européen', duration: 24, format: 'Vidéo', order: 1 },
        { title: 'Architectures souveraines', duration: 24, format: 'Vidéo', order: 2 },
      ],
    },
    {
      slug: 'gouvernance-audit',
      title: 'Gouvernance et audit des systèmes agentiques en production',
      speaker: 'Pr. Ibrahim Al-Mansouri',
      parcours: 'Production & Gouvernance',
      format: 'Vidéo',
      duration: 36,
      level: 'Expertise',
      thumbClass: 't6',
      chapters: [
        { title: 'Audit des systèmes IA', duration: 18, format: 'Vidéo', order: 1 },
        { title: 'Gouvernance opérationnelle', duration: 18, format: 'Vidéo', order: 2 },
      ],
    },
  ]

  for (const c of courses) {
    const { chapters, ...courseData } = c
    const course = await prisma.course.upsert({
      where: { slug: c.slug },
      update: {},
      create: courseData,
    })

    for (const ch of chapters) {
      await prisma.chapter.upsert({
        where: { id: `${course.id}-${ch.order}` },
        update: {},
        create: { id: `${course.id}-${ch.order}`, courseId: course.id, ...ch },
      })
    }

    // Set progress: first course 100%, second 58%
    if (c.slug === 'fondements-llm') {
      await prisma.progress.upsert({
        where: { userId_courseId: { userId: user.id, courseId: course.id } },
        update: { percentage: 100 },
        create: { userId: user.id, courseId: course.id, percentage: 100 },
      })
    } else if (c.slug === 'architecture-agentique') {
      const ch3 = await prisma.chapter.findFirst({ where: { courseId: course.id, order: 3 } })
      await prisma.progress.upsert({
        where: { userId_courseId: { userId: user.id, courseId: course.id } },
        update: { percentage: 58, lastChapterId: ch3?.id },
        create: { userId: user.id, courseId: course.id, percentage: 58, lastChapterId: ch3?.id },
      })
    } else if (c.slug === 'rag-institutions') {
      await prisma.progress.upsert({
        where: { userId_courseId: { userId: user.id, courseId: course.id } },
        update: { percentage: 12 },
        create: { userId: user.id, courseId: course.id, percentage: 12 },
      })
    }
  }

  console.log('Seed terminé ✓')
  console.log('Email: apprenant@diplomatie.fr')
  console.log('Mot de passe: mania2025')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
