import nodemailer from 'nodemailer'

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT ?? 587),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
})

export async function sendWelcomeEmail(to: string, name: string, setPasswordUrl: string) {
  await transporter.sendMail({
    from: `"MANIA" <${process.env.SMTP_FROM ?? process.env.SMTP_USER}>`,
    to,
    subject: 'Bienvenue sur MANIA — Activez votre compte',
    text: `Bonjour ${name},\n\nVotre compte a été créé sur la plateforme MANIA.\n\nCliquez sur ce lien pour définir votre mot de passe et accéder à la plateforme :\n${setPasswordUrl}\n\nCe lien est valable 48 heures.\n\nÀ bientôt sur MANIA.`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:32px">
        <h2 style="color:#1a1a1a;font-size:28px;font-weight:400;margin-bottom:4px">
          <span>MAN</span><span style="color:#F08C6A">IA</span>
        </h2>
        <p style="color:#888;font-size:13px;margin-bottom:28px">Plateforme d'apprentissage</p>
        <p style="color:#2C3440;font-size:16px;margin-bottom:8px">Bonjour <strong>${name}</strong>,</p>
        <p style="color:#444;margin-bottom:24px">Votre compte a été créé sur la plateforme MANIA. Cliquez ci-dessous pour définir votre mot de passe et commencer.</p>
        <div style="margin:28px 0">
          <a href="${setPasswordUrl}" style="background:#F08C6A;color:#fff;text-decoration:none;padding:14px 28px;border-radius:10px;font-size:15px;font-weight:500">
            Activer mon compte
          </a>
        </div>
        <p style="color:#888;font-size:13px">Ce lien est valable 48 heures. Si vous n'attendiez pas cet email, ignorez-le.</p>
      </div>
    `,
  })
}

export async function sendPasswordResetEmail(to: string, resetUrl: string) {
  await transporter.sendMail({
    from: `"MANIA" <${process.env.SMTP_FROM ?? process.env.SMTP_USER}>`,
    to,
    subject: 'Réinitialisation de votre mot de passe MANIA',
    text: `Cliquez sur ce lien pour réinitialiser votre mot de passe : ${resetUrl}\n\nCe lien expire dans 1 heure. Si vous n'avez pas fait cette demande, ignorez cet email.`,
    html: `
      <div style="font-family:sans-serif;max-width:400px;margin:auto;padding:32px">
        <h2 style="color:#1a1a1a">MANIA</h2>
        <p style="color:#444">Vous avez demandé la réinitialisation de votre mot de passe.</p>
        <div style="margin:28px 0">
          <a href="${resetUrl}" style="background:#F08C6A;color:#fff;text-decoration:none;padding:14px 28px;border-radius:10px;font-size:15px;font-weight:500">
            Réinitialiser mon mot de passe
          </a>
        </div>
        <p style="color:#888;font-size:13px">Ce lien expire dans 1 heure. Si vous n'avez pas fait cette demande, ignorez cet email.</p>
      </div>
    `,
  })
}

type SessionInfo = {
  title: string
  date: Date | string
  endDate?: Date | string | null
  location: string
  address?: string | null
  instructor: string
}

function fmtDate(d: Date | string) {
  return new Date(d as string).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}
function fmtTime(d: Date | string) {
  return new Date(d as string).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

function sessionBlock(s: SessionInfo) {
  const timeRange = s.endDate ? `${fmtTime(s.date)} – ${fmtTime(s.endDate)}` : fmtTime(s.date)
  return `
    <div style="background:#F7F4F0;border-radius:10px;padding:20px 24px;margin:24px 0">
      <div style="font-size:17px;font-weight:600;color:#2C3440;margin-bottom:8px">${s.title}</div>
      <div style="font-size:13px;color:#7A776F;margin-bottom:4px">📅 ${fmtDate(s.date)}</div>
      <div style="font-size:13px;color:#7A776F;margin-bottom:4px">🕐 ${timeRange}</div>
      <div style="font-size:13px;color:#7A776F;margin-bottom:4px">📍 ${s.location}${s.address ? ` — ${s.address}` : ''}</div>
      <div style="font-size:13px;color:#7A776F">🎓 ${s.instructor}</div>
    </div>
  `
}

function mailWrapper(content: string) {
  return `
    <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:32px">
      <h2 style="color:#1a1a1a;font-size:28px;font-weight:400;margin-bottom:4px">
        <span>MAN</span><span style="color:#F08C6A">IA</span>
      </h2>
      <p style="color:#888;font-size:13px;margin-bottom:28px">Plateforme d'apprentissage</p>
      ${content}
      <hr style="border:none;border-top:1px solid #e8e4df;margin:28px 0">
      <p style="color:#bbb;font-size:11px">Vous recevez cet email car vous êtes inscrit sur la plateforme MANIA.</p>
    </div>
  `
}

export async function sendSessionReminder24h(to: string, name: string, session: SessionInfo) {
  await transporter.sendMail({
    from: `"MANIA" <${process.env.SMTP_FROM ?? process.env.SMTP_USER}>`,
    to,
    subject: `Rappel — ${session.title} demain`,
    text: `Bonjour ${name},\n\nRappel : votre session "${session.title}" a lieu demain, ${fmtDate(session.date)} à ${fmtTime(session.date)} au ${session.location}.\n\nÀ demain sur MANIA.`,
    html: mailWrapper(`
      <p style="color:#2C3440;font-size:16px;margin-bottom:4px">Bonjour <strong>${name}</strong>,</p>
      <p style="color:#444;margin-bottom:0">Votre session est <strong>demain</strong>. Voici un rappel :</p>
      ${sessionBlock(session)}
      <p style="color:#444">Pensez à confirmer votre présence si ce n'est pas encore fait. À demain !</p>
    `),
  })
}

export async function sendSessionReminder2h(to: string, name: string, session: SessionInfo) {
  await transporter.sendMail({
    from: `"MANIA" <${process.env.SMTP_FROM ?? process.env.SMTP_USER}>`,
    to,
    subject: `Rappel — ${session.title} dans 2 heures`,
    text: `Bonjour ${name},\n\nRappel : votre session "${session.title}" commence dans 2 heures, à ${fmtTime(session.date)} au ${session.location}.\n\nBonne session !`,
    html: mailWrapper(`
      <p style="color:#2C3440;font-size:16px;margin-bottom:4px">Bonjour <strong>${name}</strong>,</p>
      <p style="color:#444;margin-bottom:0">Votre session commence <strong>dans 2 heures</strong> :</p>
      ${sessionBlock(session)}
      <p style="color:#444">Bonne session !</p>
    `),
  })
}

export async function sendNewCourseNotification(to: string, name: string, course: { title: string; speaker: string; parcours: string; level: string; url: string }) {
  await transporter.sendMail({
    from: `"MANIA" <${process.env.SMTP_FROM ?? process.env.SMTP_USER}>`,
    to,
    subject: `Nouveau cours disponible — ${course.title}`,
    text: `Bonjour ${name},\n\nUn nouveau cours est disponible sur MANIA : "${course.title}" par ${course.speaker}.\n\nAccédez-y ici : ${course.url}`,
    html: mailWrapper(`
      <p style="color:#2C3440;font-size:16px;margin-bottom:4px">Bonjour <strong>${name}</strong>,</p>
      <p style="color:#444;margin-bottom:0">Un nouveau cours vient d'être ajouté à votre catalogue :</p>
      <div style="background:#F7F4F0;border-radius:10px;padding:20px 24px;margin:24px 0">
        <div style="font-size:17px;font-weight:600;color:#2C3440;margin-bottom:8px">${course.title}</div>
        <div style="font-size:13px;color:#7A776F;margin-bottom:4px">🎓 ${course.speaker}</div>
        <div style="font-size:13px;color:#7A776F;margin-bottom:4px">📚 ${course.parcours}</div>
        <div style="font-size:13px;color:#7A776F">📊 ${course.level}</div>
      </div>
      <div style="margin:20px 0">
        <a href="${course.url}" style="background:#F08C6A;color:#fff;text-decoration:none;padding:12px 24px;border-radius:10px;font-size:14px;font-weight:500">
          Accéder au cours →
        </a>
      </div>
    `),
  })
}

export async function sendTwoFactorCode(to: string, code: string) {
  await transporter.sendMail({
    from: `"MANIA" <${process.env.SMTP_FROM ?? process.env.SMTP_USER}>`,
    to,
    subject: 'Votre code de connexion MANIA',
    text: `Votre code de vérification : ${code}\n\nCe code expire dans 10 minutes.`,
    html: `
      <div style="font-family:sans-serif;max-width:400px;margin:auto;padding:32px">
        <h2 style="color:#1a1a1a">MANIA</h2>
        <p style="color:#444">Votre code de connexion :</p>
        <div style="font-size:36px;font-weight:bold;letter-spacing:8px;color:#e07b4a;margin:24px 0">${code}</div>
        <p style="color:#888;font-size:13px">Ce code expire dans 10 minutes. Ne le partagez pas.</p>
      </div>
    `,
  })
}
