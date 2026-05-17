/**
 * Usage: npx tsx scripts/make-admin.ts <email>
 * Sets role='admin' for the given user email.
 */
import { PrismaClient } from '../src/generated/prisma'

const email = process.argv[2]
if (!email) { console.error('Usage: npx tsx scripts/make-admin.ts <email>'); process.exit(1) }

const prisma = new PrismaClient()

async function main() {
  const user = await prisma.user.findUnique({ where: { email } })
  if (!user) { console.error(`No user found with email: ${email}`); process.exit(1) }
  await prisma.user.update({ where: { email }, data: { role: 'admin' } })
  console.log(`✓ ${user.name} (${email}) is now admin.`)
}

main().catch(console.error).finally(() => prisma.$disconnect())
