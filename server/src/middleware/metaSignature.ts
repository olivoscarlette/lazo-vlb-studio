import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

export interface AuthenticatedMetaRequest extends Request {
  rawBody?: Buffer;
}

/**
 * Middleware to verify X-Hub-Signature-256 sent by Meta (WhatsApp Cloud API).
 *
 * Meta signs every webhook POST payload using HMAC-SHA256 with your Meta App Secret.
 * Format: "sha256=<hex_digest>"
 */
export function verifyMetaSignature(
  req: AuthenticatedMetaRequest,
  res: Response,
  next: NextFunction
) {
  const appSecret = process.env.META_APP_SECRET;

  // If no secret is configured, warn in logs and allow request in development/testing mode
  if (!appSecret) {
    if (process.env.NODE_ENV === 'production') {
      console.error(
        '[Meta Signature] ERROR CRÍTICO: META_APP_SECRET no está configurada en producción.'
      );
      return res.status(500).json({ error: 'Configuración de seguridad incompleta en el servidor.' });
    }
    console.warn(
      '[Meta Signature] AVISO: META_APP_SECRET no está definida. Omitiendo validación criptográfica (modo dev).'
    );
    return next();
  }

  const signatureHeader = req.headers['x-hub-signature-256'] as string | undefined;

  if (!signatureHeader) {
    console.warn('[Meta Signature] Rechazado: Falta el encabezado X-Hub-Signature-256.');
    return res.status(401).json({ error: 'Firma criptográfica ausente.' });
  }

  if (!signatureHeader.startsWith('sha256=')) {
    console.warn('[Meta Signature] Rechazado: Formato de firma inválido.');
    return res.status(401).json({ error: 'Formato de firma no soportado.' });
  }

  const signatureHex = signatureHeader.slice(7); // Remove 'sha256=' prefix

  // Ensure rawBody was captured by express.json({ verify: ... })
  if (!req.rawBody) {
    console.error(
      '[Meta Signature] ERROR: No se capturó el buffer original (rawBody). Verifica la configuración de express.json().'
    );
    return res.status(500).json({ error: 'Error interno en la verificación de firma.' });
  }

  try {
    const expectedSignatureHex = crypto
      .createHmac('sha256', appSecret)
      .update(req.rawBody)
      .digest('hex');

    const signatureBuffer = Buffer.from(signatureHex, 'hex');
    const expectedBuffer = Buffer.from(expectedSignatureHex, 'hex');

    // Use constant-time comparison to protect against timing attacks
    if (
      signatureBuffer.length !== expectedBuffer.length ||
      !crypto.timingSafeEqual(signatureBuffer, expectedBuffer)
    ) {
      console.warn('[Meta Signature] Rechazado: La firma no coincide con el App Secret.');
      return res.status(401).json({ error: 'Firma de webhook inválida.' });
    }

    // Signature verified successfully
    return next();
  } catch (err) {
    console.error('[Meta Signature Error]', err);
    return res.status(500).json({ error: 'Fallo al procesar la firma criptográfica.' });
  }
}
