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
