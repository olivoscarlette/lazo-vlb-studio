import nodemailer from 'nodemailer';

interface SendPasswordResetOptions {
  to: string;
  name: string;
  resetLink: string;
}

export interface SendWelcomeEmailOptions {
  to: string;
  name: string;
  email: string;
  password?: string;
  role?: string;
  weddingName?: string;
  loginUrl?: string;
}

export class EmailService {
  private static getTransporter() {
    const user = (process.env.GMAIL_USER || process.env.SMTP_USER || 'vivalabride.mex@gmail.com').trim();
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
    const replyTo = process.env.REPLY_TO_EMAIL || 'vivalabride.mex@gmail.com';
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
        <p class="footer-text">&copy; ${new Date().getFullYear()} Lazo Studio &middot; Monterrey, N.L.</p>
        <p class="footer-text">Wedding Planning &amp; Experience</p>
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

© ${new Date().getFullYear()} Lazo Studio · Monterrey, N.L.
Wedding Planning & Experience
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
            reply_to: replyTo,
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
        replyTo,
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

  /**
   * Envia correo de bienvenida con credenciales de acceso y copia de respaldo (BCC) a Lazo Studio
   */
  static async sendWelcomeEmail({
    to,
    name,
    email,
    password,
    role,
    weddingName,
    loginUrl
  }: SendWelcomeEmailOptions): Promise<{ success: boolean; simulated?: boolean; messageId?: string }> {
    const transporter = this.getTransporter();
    const senderEmail = process.env.EMAIL_FROM_ADDRESS || 'hola@lazostudio.mx';
    const senderName = process.env.EMAIL_FROM_NAME || 'Lazo Studio';
    const from = `"${senderName}" <${senderEmail}>`;
    const replyTo = process.env.REPLY_TO_EMAIL || 'vivalabride.mex@gmail.com';
    const appUrl = loginUrl || process.env.APP_URL || 'https://www.lazostudio.mx';
    const logoUrl = `${appUrl}/lazo-logo.png?v=4`;
    const backupEmail = (process.env.STUDIO_BACKUP_EMAIL || process.env.GMAIL_USER || 'vivalabride.mex@gmail.com').trim();

    const isNovios = role === 'NOVIOS';
    const subject = isNovios
      ? `¡Bienvenida a tu portal de boda, ${name}! — Lazo Studio`
      : `Tus accesos a la plataforma — Lazo Studio`;

    const roleLabel = isNovios
      ? 'Novios (Acceso Exclusivo)'
      : role === 'COORDINADOR'
      ? 'Coordinadora de Bodas'
      : role === 'STAFF'
      ? 'Staff Operativo'
      : 'Administrador del Estudio';

    const html = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
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
      max-width: 540px;
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
    .greeting {
      font-size: 13px;
      font-weight: 700;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      color: #C48B81;
      margin: 0 0 8px 0;
    }
    .title {
      font-family: 'Playfair Display', Georgia, serif;
      font-size: 24px;
      font-weight: 600;
      color: #2B2826;
      margin: 0 0 16px 0;
      line-height: 1.3;
    }
    .text {
      font-size: 14px;
      line-height: 1.65;
      color: #5C5550;
      margin: 0 0 20px 0;
    }
    .credentials-box {
      background-color: #FAF7F4;
      border: 1px solid #EFE8E1;
      border-radius: 14px;
      padding: 22px 24px;
      margin: 26px 0;
    }
    .credentials-title {
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: #8A7E72;
      margin-bottom: 14px;
      border-bottom: 1px solid #ECE3DA;
      padding-bottom: 8px;
    }
    .cred-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
    }
    .cred-label {
      padding: 6px 0;
      color: #8A7E72;
      width: 115px;
      font-weight: 500;
    }
    .cred-value {
      padding: 6px 0;
      color: #2B2826;
      font-weight: 600;
      word-break: break-all;
    }
    .cred-pass {
      font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
      font-size: 14px;
      color: #A86B60;
      background-color: #FFFFFF;
      padding: 3px 8px;
      border-radius: 6px;
      border: 1px solid #EFE8E1;
      display: inline-block;
    }
    .cta-container {
      text-align: center;
      margin: 30px 0 32px 0;
    }
    .cta-button {
      display: inline-block;
      background-color: #C48B81;
      color: #FFFFFF !important;
      font-size: 14px;
      font-weight: 600;
      letter-spacing: 0.04em;
      text-decoration: none;
      padding: 14px 38px;
      border-radius: 9999px;
      box-shadow: 0 2px 8px rgba(196, 139, 129, 0.25);
    }
    .notice {
      background-color: #FAF7F4;
      border-left: 3px solid #C48B81;
      padding: 14px 16px;
      border-radius: 6px;
      font-size: 12px;
      line-height: 1.55;
      color: #7D736A;
      margin-bottom: 22px;
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
    .backup-tag {
      font-size: 10px;
      color: #B5ACA4;
      text-align: center;
      margin-top: 16px;
      font-style: italic;
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
        <div class="greeting">${isNovios ? 'Portal de Novios' : 'Acceso a Plataforma'}</div>
        <h2 class="title">¡Bienvenida a tu portal, ${name}!</h2>
        <p class="text">
          ${isNovios
            ? 'Nos llena de emoción acompañarte en cada paso hacia el gran día. Hemos preparado tu espacio exclusivo en <strong>Lazo Studio</strong> para que puedas consultar y gestionar tu lista de invitados, itinerario, confirmaciones y detalles de tu boda en tiempo real.'
            : 'Te damos la bienvenida al equipo de <strong>Lazo Studio</strong>. A continuación encontrarás tus credenciales de acceso para la coordinación y gestión operativa de eventos.'}
        </p>

        <div class="credentials-box">
          <div class="credentials-title">Datos de Acceso al Portal</div>
          <table class="cred-table">
            <tr>
              <td class="cred-label">Enlace:</td>
              <td class="cred-value">
                <a href="${appUrl}" style="color: #C48B81; text-decoration: none;" target="_blank" rel="noopener noreferrer">
                  ${appUrl}
                </a>
              </td>
            </tr>
            <tr>
              <td class="cred-label">Usuario:</td>
              <td class="cred-value">${email}</td>
            </tr>
            ${password ? `
            <tr>
              <td class="cred-label">Contraseña:</td>
              <td class="cred-value"><span class="cred-pass">${password}</span></td>
            </tr>
            ` : ''}
            <tr>
              <td class="cred-label">Rol:</td>
              <td class="cred-value">${roleLabel}</td>
            </tr>
            ${weddingName ? `
            <tr>
              <td class="cred-label">Boda:</td>
              <td class="cred-value">${weddingName}</td>
            </tr>
            ` : ''}
          </table>
        </div>

        <div class="cta-container">
          <a href="${appUrl}" class="cta-button" target="_blank" rel="noopener noreferrer">
            Ingresar a mi portal
          </a>
        </div>

        <div class="notice">
          💡 <strong>Recomendación:</strong> Te sugerimos guardar este correo en tus favoritos para tener siempre a la mano tus credenciales. Si más adelante deseas cambiar tu contraseña, podrás hacerlo directamente desde tu perfil dentro del portal.
        </div>

        <div class="backup-tag">
          Copia de respaldo registrada en el sistema de Lazo Studio.
        </div>
      </div>

      <div class="footer">
        <p class="footer-text">&copy; ${new Date().getFullYear()} Lazo Studio &middot; Monterrey, N.L.</p>
        <p class="footer-text">Wedding Planning &amp; Experience</p>
      </div>
    </div>
  </div>
</body>
</html>
    `;

    const text = `
Lazo Studio
${subject}

¡Bienvenida a tu portal, ${name}!

${isNovios
  ? 'Nos llena de emoción acompañarte en cada paso hacia el gran día. Hemos preparado tu espacio exclusivo en Lazo Studio para que puedas consultar tu lista de invitados, itinerario, proveedores y confirmaciones en tiempo real.'
  : 'Te damos la bienvenida a Lazo Studio. Aquí tienes tus credenciales de acceso:'}

DATOS DE ACCESO:
• Enlace: ${appUrl}
• Usuario: ${email}
${password ? `• Contraseña: ${password}\n` : ''}• Rol: ${roleLabel}
${weddingName ? `• Boda: ${weddingName}\n` : ''}
Puedes ingresar directamente desde tu navegador en: ${appUrl}

Recomendación: Te sugerimos guardar este correo para tener siempre a la mano tus credenciales. Si deseas cambiar tu contraseña, podrás realizarlo desde tu perfil dentro de la plataforma.

© ${new Date().getFullYear()} Lazo Studio · Monterrey, N.L.
Wedding Planning & Experience
    `.trim();

    // Enviar vía Resend si está configurada la API Key
    if (process.env.RESEND_API_KEY) {
      try {
        const fromAddress = process.env.EMAIL_FROM || 'Lazo Studio <hola@lazostudio.mx>';
        const bccList = backupEmail && backupEmail !== to ? [backupEmail] : undefined;
        const response = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            from: fromAddress,
            to: [to],
            reply_to: replyTo,
            bcc: bccList,
            subject,
            html,
            text
          })
        });
        const resData: any = await response.json();
        if (!response.ok) {
          throw new Error(resData.message || JSON.stringify(resData));
        }
        console.log(`[EmailService - Resend] Correo de bienvenida enviado a ${to} con respaldo a ${backupEmail} (ID: ${resData.id})`);
        return { success: true, messageId: resData.id };
      } catch (err: any) {
        console.error('[EmailService - Resend] Error enviando correo de bienvenida:', err);
        throw err;
      }
    }

    if (!transporter) {
      console.warn('[EmailService] Ni RESEND_API_KEY ni credenciales SMTP configuradas.');
      console.log(`[EmailService - Modo Simulado] Bienvenida generada para ${to} con clave: ${password} (Respaldo: ${backupEmail})`);
      return { success: true, simulated: true };
    }

    try {
      const info = await transporter.sendMail({
        from,
        to,
        replyTo,
        bcc: backupEmail && backupEmail !== to ? backupEmail : undefined,
        subject,
        text,
        html
      });
      console.log(`[EmailService] Correo de bienvenida enviado a ${to} con respaldo a ${backupEmail} (ID: ${info.messageId})`);
      return { success: true, messageId: info.messageId };
    } catch (error: any) {
      console.error('[EmailService] Error enviando correo de bienvenida vía SMTP/Gmail:', error);
      throw error;
    }
  }
}
