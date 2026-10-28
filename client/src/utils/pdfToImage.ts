import * as pdfjsLib from 'pdfjs-dist';

// Configure the worker for Vite
// In modern Vite, we can either set workerSrc to the worker URL or disable worker if not available
if (typeof window !== 'undefined') {
  try {
    // Vite ?url import for worker
    // @ts-ignore
    import('pdfjs-dist/build/pdf.worker.mjs?url').then((workerModule) => {
      pdfjsLib.GlobalWorkerOptions.workerSrc = workerModule.default;
    }).catch(() => {
      // Fallback: use unpkg CDN worker if dynamic import fails
      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;
    });
  } catch (e) {
    console.warn('PDF worker setup error:', e);
  }
}

export interface ConvertPdfResult {
  dataUrl: string;
  width: number;
  height: number;
  pageCount: number;
}

/**
 * Converts a PDF ArrayBuffer or File into a high-resolution PNG image data URL
 * of the specified page (defaults to page 1).
 */
export async function convertPdfPageToImage(
  pdfData: ArrayBuffer,
  pageNumber: number = 1,
  scale: number = 2.0 // 2x scale for crisp blueprints on retina displays
): Promise<ConvertPdfResult> {
  const loadingTask = pdfjsLib.getDocument({ data: pdfData });
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
    throw new Error('No se pudo inicializar el contexto 2D para renderizar el PDF.');
  }

  // Draw background white in case PDF has transparent background
  context.fillStyle = '#FFFFFF';
  context.fillRect(0, 0, canvas.width, canvas.height);

  const renderContext = {
    canvasContext: context,
    viewport: viewport,
  };

  await page.render(renderContext).promise;

  const dataUrl = canvas.toDataURL('image/png', 0.92);

  return {
    dataUrl,
    width: viewport.width,
    height: viewport.height,
    pageCount: numPages
  };
}
