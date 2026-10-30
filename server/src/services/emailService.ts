import nodemailer from 'nodemailer';

interface SendPasswordResetOptions {
  to: string;
  name: string;
  resetLink: string;
}

export class EmailService {
  private static getTransporter() {
    const user = (process.env.GMAIL_USER || process.env.SMTP_USER || '').trim();
    const pass = (process.env.GMAIL_APP_PASSWORD || process.env.SMTP_PASS || '').replace(/\s+/g, '');

    if (!user || !pass) {
      return null;
    }

    if (process.env.SMTP_HOST) {
      return nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT) || 587,
        secure: process.env.SMTP_SECURE === 'true' || Number(process.env.SMTP_PORT) === 465,
        connectionTimeout: 6000,
        greetingTimeout: 6000,
        socketTimeout: 6000,
        auth: { user, pass }
      });
    }

    return nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      connectionTimeout: 6000,
      greetingTimeout: 6000,
      socketTimeout: 6000,
      auth: { user, pass }
    });
  }

  /**
   * Envia correo con diseño editorial y enlace seguro para restablecer contraseña
   */
  static async sendPasswordResetEmail({ to, name, resetLink }: SendPasswordResetOptions): Promise<{ success: boolean; simulated?: boolean; messageId?: string }> {
    const transporter = this.getTransporter();
    const senderEmail = process.env.EMAIL_FROM_ADDRESS || 'hola@lazostudio.mx';
    const senderName = process.env.EMAIL_FROM_NAME || 'Lazo Studio';
    const from = `"${senderName}" <${senderEmail}>`;
    const appUrl = process.env.APP_URL || 'https://www.lazostudio.mx';
    const logoUrl = `${appUrl}/lazo-logo.png?v=4`;

    const html = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Restablecer contraseña — Lazo Studio</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #FAF8F5;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #2B2826;
      -webkit-font-smoothing: antialiased;
    }
    .wrapper {
      width: 100%;
      background-color: #FAF8F5;
      padding: 40px 16px;
    }
    .card {
      max-width: 520px;
      margin: 0 auto;
      background-color: #FFFFFF;
      border: 1px solid #EFE8E1;
      border-radius: 20px;
      overflow: hidden;
      box-shadow: 0 4px 24px rgba(43, 40, 38, 0.04);
    }
    .header {
      padding: 36px 32px 28px 32px;
      text-align: center;
      background-color: #FFFFFF;
      border-bottom: 1px solid #F7F3EF;
    }
    .brand-logo {
      width: 200px;
      max-width: 200px;
      height: auto;
      display: block;
      margin: 0 auto;
      border: 0;
      outline: none;
    }
    .content {
      padding: 36px 32px;
    }
    .title {
      font-family: 'Playfair Display', Georgia, serif;
      font-size: 22px;
      font-weight: 600;
      color: #2B2826;
      margin: 0 0 16px 0;
    }
    .text {
      font-size: 14px;
      line-height: 1.65;
      color: #5C5550;
      margin: 0 0 20px 0;
    }
    .cta-container {
      text-align: center;
      margin: 32px 0 36px 0;
    }
    .cta-button {
      display: inline-block;
      background-color: #C48B81;
      color: #FFFFFF !important;
      font-size: 14px;
      font-weight: 600;
      letter-spacing: 0.04em;
      text-decoration: none;
      padding: 14px 36px;
      border-radius: 9999px;
    }
    .notice {
      background-color: #FAF7F4;
      border-left: 3px solid #C48B81;
      padding: 14px 16px;
      border-radius: 6px;
      font-size: 12px;
      line-height: 1.5;
      color: #7D736A;
      margin-bottom: 24px;
    }
    .fallback {
      font-size: 12px;
      color: #9E9389;
      line-height: 1.6;
      word-break: normal;
      overflow-wrap: break-word;
    }
    .fallback-link {
      color: #C48B81;
      text-decoration: underline;
      word-break: break-all;
    }
    .no-reply-box {
      margin-top: 24px;
      padding-top: 18px;
      border-top: 1px dashed #EFE8E1;
      font-size: 11px;
      color: #A39B93;
      line-height: 1.5;
      text-align: center;
    }
    .footer {
      padding: 24px 32px 32px 32px;
      text-align: center;
      border-top: 1px solid #F7F3EF;
      background-color: #FCFBFA;
    }
    .footer-text {
      font-size: 11px;
      color: #A39B93;
      margin: 4px 0;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="card">
      <div class="header">
        <img src="${logoUrl}" alt="Lazo Studio" class="brand-logo" width="200">
      </div>

      <div class="content">
        <h2 class="title">Restablecer tu contrase&ntilde;a</h2>
        <p class="text">Hola ${name || 'bienvenido'},</p>
        <p class="text">
          Hemos recibido una solicitud para restablecer el acceso a tu cuenta en <strong>Lazo Studio</strong>.
          Haz clic en el siguiente bot&oacute;n para ingresar tu nueva contrase&ntilde;a:
        </p>

        <div class="cta-container">
          <a href="${resetLink}" class="cta-button" target="_blank" rel="noopener noreferrer">
            Restablecer mi contrase&ntilde;a
          </a>
        </div>

        <div class="notice">
          Este enlace es confidencial, de uso &uacute;nico y expira autom&aacute;ticamente en <strong>60 minutos</strong>. Si t&uacute; no solicitaste este cambio, puedes ignorar este correo de forma segura. Tu contrase&ntilde;a actual no ha sido modificada.
        </div>

        <div class="fallback">
          Si el bot&oacute;n no responde en tu dispositivo, copia y pega este enlace directo en tu navegador web:<br>
          <a href="${resetLink}" class="fallback-link" target="_blank" rel="noopener noreferrer">${resetLink}</a>
        </div>

        <div class="no-reply-box">
          Por favor no respondas a este correo electr&oacute;nico. Este mensaje fue generado autom&aacute;ticamente y esta casilla no es monitoreada.
        </div>
      </div>

      <div class="footer">
        <p class="footer-text">&copy; ${new Date().getFullYear()} Lazo Studio. Todos los derechos reservados.</p>
        <p class="footer-text">Plataforma de Planificaci&oacute;n Nupcial.</p>
      </div>
    </div>
  </div>
</body>
</html>
    `;

    const text = `
Lazo Studio
Restablecer tu contraseña

Hola ${name || 'bienvenido'},

Hemos recibido una solicitud para restablecer el acceso a tu cuenta en Lazo Studio.
Puedes ingresar tu nueva contraseña accediendo al siguiente enlace seguro:

${resetLink}

(Este enlace es confidencial, de uso único y expira en 60 minutos. Si tú no realizaste esta solicitud, puedes ignorar este mensaje de forma segura).

Por favor no respondas a este correo. Este mensaje fue generado automáticamente.

© ${new Date().getFullYear()} Lazo Studio. Todos los derechos reservados.
    `.trim();

    if (process.env.RESEND_API_KEY) {
      try {
        const fromAddress = process.env.EMAIL_FROM || 'Lazo Studio <hola@lazostudio.mx>';
        const response = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            from: fromAddress,
            to: [to],
            subject: 'Restablecer tu contraseña — Lazo Studio',
            html,
            text
          })
        });
        const resData: any = await response.json();
        if (!response.ok) {
          throw new Error(resData.message || JSON.stringify(resData));
        }
        console.log(`[EmailService - Resend] Correo enviado a ${to} (ID: ${resData.id})`);
        return { success: true, messageId: resData.id };
      } catch (err: any) {
        console.error('[EmailService - Resend] Error enviando correo:', err);
        throw err;
      }
    }

    if (!transporter) {
      console.warn('[EmailService] Ni RESEND_API_KEY ni credenciales de Gmail/SMTP configuradas.');
      console.log(`[EmailService - Modo Simulado] Enlace generado para ${to}: ${resetLink}`);
      return { success: true, simulated: true };
    }

    try {
      const info = await transporter.sendMail({
        from,
        to,
        subject: 'Restablecer tu contraseña — Lazo Studio',
        text,
        html
      });
      console.log(`[EmailService] Correo de recuperación enviado a ${to} (ID: ${info.messageId})`);
      return { success: true, messageId: info.messageId };
    } catch (error: any) {
      console.error('[EmailService] Error enviando correo vía Gmail:', error);
      throw error;
    }
  }
}
