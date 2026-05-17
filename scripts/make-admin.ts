/**
 * Usage: npx tsx scripts/make-admin.ts <email>
 * Sets role='admin' for the given user email.
 */
import { PrismaClient } from '../src/generated/prisma/client'
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'
import path from 'path'

const email = process.argv[2]
if (!email) { console.error('Usage: npx tsx scripts/make-admin.ts <email>'); process.exit(1) }

const adapter = new PrismaBetterSqlite3({ url: `file:${path.resolve(process.cwd(), 'dev.db')}` })
const prisma = new PrismaClient({ adapter })

async function main() {
  const user = await prisma.user.findUnique({ where: { email } })
  if (!user) { console.error(`No user found with email: ${email}`); process.exit(1) }
  await prisma.user.update({ where: { email }, data: { role: 'admin' } })
  console.log(`✓ ${user.name} (${email}) is now admin.`)
}

main().catch(console.error).finally(() => prisma.$disconnect())
