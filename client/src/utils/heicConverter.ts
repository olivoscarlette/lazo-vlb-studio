import heic2any from 'heic2any';

/**
 * Detecta si un archivo es formato HEIC/HEIF (el formato nativo de fotos de iPhone)
 * y lo convierte automáticamente a un archivo JPEG estándar de alta calidad en el navegador
 * antes de subirlo al servidor o mostrarlo en pantalla.
 */
export async function convertHeicToJpeg(file: File): Promise<File> {
  const fileName = file.name.toLowerCase();
  const fileType = (file.type || '').toLowerCase();

  const isHeic =
    fileName.endsWith('.heic') ||
    fileName.endsWith('.heif') ||
    fileType === 'image/heic' ||
    fileType === 'image/heif';

  if (!isHeic) {
    return file;
  }

  try {
    const conversionResult = await heic2any({
      blob: file,
      toType: 'image/jpeg',
      quality: 0.85
    });

    const blob: Blob = Array.isArray(conversionResult) ? conversionResult[0] : conversionResult;
    const newName = file.name.replace(/\.(heic|heif)$/i, '.jpg') || 'foto_iphone.jpg';

    return new File([blob], newName, { type: 'image/jpeg' });
  } catch (err) {
    console.warn('No se pudo convertir HEIC localmente con heic2any:', err);
    return file;
  }
}
