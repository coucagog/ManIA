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
