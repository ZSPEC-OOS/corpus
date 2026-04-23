import { mkdirSync, existsSync } from 'fs';
import { writeFile } from 'fs/promises';
import { resolve } from 'path';

export interface PageImage {
  pageNumber: number;
  /** Path relative to DATA_DIR, e.g. "images/run-abc/page-3.png" */
  storagePath: string;
  widthPx: number;
  heightPx: number;
  /** Claude vision description — populated only when AI enhancement runs */
  description?: string;
}

/**
 * Render every page of a PDF to a PNG file using pdfjs-dist + canvas.
 * Saved under dataDir/images/runId/page-{n}.png.
 */
export async function renderPdfPages(
  pdfPath: string,
  dataDir: string,
  runId: string,
  scaleFactor = 1.5,
): Promise<PageImage[]> {
  const { createCanvas } = await import('canvas');
  const { getDocument, GlobalWorkerOptions } = await import('pdfjs-dist/legacy/build/pdf.mjs');
  GlobalWorkerOptions.workerSrc = '';

  const { readFile } = await import('fs/promises');
  const data = new Uint8Array(await readFile(pdfPath));

  const doc = await getDocument({
    data,
    verbosity: 0,
    // Provide a canvas factory so pdfjs can render in Node.js
    canvasFactory: {
      create(width: number, height: number) {
        const canvas = createCanvas(width, height);
        return { canvas, context: canvas.getContext('2d') };
      },
      reset(canvasAndCtx: { canvas: ReturnType<typeof createCanvas>; context: unknown }, width: number, height: number) {
        canvasAndCtx.canvas.width = width;
        canvasAndCtx.canvas.height = height;
      },
      destroy(canvasAndCtx: { canvas: ReturnType<typeof createCanvas> }) {
        canvasAndCtx.canvas.width = 0;
        canvasAndCtx.canvas.height = 0;
      },
    },
  }).promise;

  const outDir = resolve(dataDir, 'images', runId);
  mkdirSync(outDir, { recursive: true });

  const results: PageImage[] = [];

  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const viewport = page.getViewport({ scale: scaleFactor });

    const canvas = createCanvas(Math.round(viewport.width), Math.round(viewport.height));
    const context = canvas.getContext('2d');

    await page.render({
      canvasContext: context as unknown as CanvasRenderingContext2D,
      viewport,
    }).promise;

    const filename = `page-${i}.png`;
    const absPath = resolve(outDir, filename);
    const relPath = `images/${runId}/${filename}`;

    await writeFile(absPath, canvas.toBuffer('image/png'));
    page.cleanup();

    results.push({
      pageNumber: i,
      storagePath: relPath,
      widthPx: canvas.width,
      heightPx: canvas.height,
    });
  }

  await doc.destroy();
  return results;
}

/**
 * Send a rendered page PNG to Claude Vision and return a plain-text description.
 * Only called when aiEnhancement is on and the page's extracted text is poor quality.
 */
export async function describePageWithAI(
  imagePath: string,
  apiKey: string,
  pageNumber: number,
): Promise<string> {
  const { readFile } = await import('fs/promises');
  const imageData = await readFile(imagePath);
  const base64 = imageData.toString('base64');

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: 'image/png', data: base64 },
            },
            {
              type: 'text',
              text: `This is page ${pageNumber} of a PDF document. Extract all text content exactly as it appears, preserving paragraph structure. If the page contains figures, charts, or diagrams, describe them concisely after the text. Output plain text only — no markdown, no commentary.`,
            },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Anthropic API request failed (${response.status}): ${message}`);
  }

  const message = (await response.json()) as {
    content?: Array<{ type?: string; text?: string }>;
  };

  const block = message.content?.[0];
  return block.type === 'text' ? block.text : '';
}
