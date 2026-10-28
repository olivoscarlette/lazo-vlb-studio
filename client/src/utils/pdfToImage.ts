import * as pdfjsLib from 'pdfjs-dist';
// @ts-ignore
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

// Configure worker immediately
if (typeof window !== 'undefined') {
  try {
    pdfjsLib.GlobalWorkerOptions.workerSrc =
      pdfWorkerUrl ||
      `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;
  } catch (e) {
    console.warn('PDF worker initialization:', e);
  }
}

export interface ConvertPdfResult {
  dataUrl: string;
  width: number;
  height: number;
  pageCount: number;
}

/**
 * Converts a PDF ArrayBuffer into a high-resolution PNG image data URL
 * of the specified page (defaults to page 1).
 */
export async function convertPdfPageToImage(
  pdfData: ArrayBuffer,
  pageNumber: number = 1,
  scale: number = 2.0 // 2x scale for crisp blueprints on retina displays
): Promise<ConvertPdfResult> {
  // Ensure workerSrc is always assigned before getDocument
  if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
    pdfjsLib.GlobalWorkerOptions.workerSrc =
      pdfWorkerUrl ||
      `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;
  }

  const loadingTask = pdfjsLib.getDocument({
    data: new Uint8Array(pdfData),
    cMapUrl: `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/cmaps/`,
    cMapPacked: true,
    standardFontDataUrl: `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/standard_fonts/`,
  });

  const pdfDoc = await loadingTask.promise;
  const numPages = pdfDoc.numPages;

  const validPageNum = Math.min(Math.max(1, pageNumber), numPages);
  const page = await pdfDoc.getPage(validPageNum);

  const viewport = page.getViewport({ scale });

  const canvas = document.createElement('canvas');
  canvas.width = viewport.width;
  canvas.height = viewport.height;

  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('No se pudo inicializar el contexto 2D para renderizar el plano.');
  }

  // Draw background white in case PDF has transparent background
  context.fillStyle = '#FFFFFF';
  context.fillRect(0, 0, canvas.width, canvas.height);

  const renderContext = {
    canvasContext: context,
    viewport: viewport,
  };

  await page.render(renderContext).promise;

  const dataUrl = canvas.toDataURL('image/png', 0.95);

  return {
    dataUrl,
    width: viewport.width,
    height: viewport.height,
    pageCount: numPages
  };
}
