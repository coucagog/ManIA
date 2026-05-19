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
