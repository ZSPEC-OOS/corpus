import { mkdirSync } from 'fs';
import { writeFile } from 'fs/promises';
import { resolve } from 'path';

export interface PageImage {
  pageNumber: number;
  storagePath: string;
  widthPx: number;
  heightPx: number;
  description?: string;
}

/** Returns true if the canvas native module is available in this environment. */
async function canvasAvailable(): Promise<boolean> {
  try {
    await import('@napi-rs/canvas');
    return true;
  } catch {
    return false;
  }
}

export async function renderPdfPages(
  pdfPath: string,
  dataDir: string,
  runId: string,
  scaleFactor = 1.5,
): Promise<PageImage[]> {
  if (!(await canvasAvailable())) {
    console.warn('[image-extractor] canvas module not available — skipping page rendering');
    return [];
  }

  const { createCanvas } = await import('@napi-rs/canvas');
  const { getDocument, GlobalWorkerOptions } = await import('pdfjs-dist/legacy/build/pdf.mjs');
  GlobalWorkerOptions.workerSrc = '';

  const { readFile } = await import('fs/promises');
  const data = new Uint8Array(await readFile(pdfPath));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const doc = await getDocument({ data, verbosity: 0 } as any).promise;

  const outDir = resolve(dataDir, 'images', runId);
  mkdirSync(outDir, { recursive: true });

  const results: PageImage[] = [];

  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const viewport = page.getViewport({ scale: scaleFactor });
    const canvas = createCanvas(Math.round(viewport.width), Math.round(viewport.height));

    await page.render({
      canvasContext: canvas.getContext('2d') as unknown as CanvasRenderingContext2D,
      viewport,
    }).promise;

    const filename = `page-${i}.png`;
    await writeFile(resolve(outDir, filename), canvas.toBuffer('image/png'));
    page.cleanup();

    results.push({
      pageNumber: i,
      storagePath: `images/${runId}/${filename}`,
      widthPx: canvas.width,
      heightPx: canvas.height,
    });
  }

  await doc.destroy();
  return results;
}

export async function describePageWithAI(imagePath: string, apiKey: string, pageNumber: number): Promise<string> {
  const { readFile } = await import('fs/promises');
  const { default: Anthropic } = await import('@anthropic-ai/sdk');

  const client = new Anthropic({ apiKey });
  const base64 = (await readFile(imagePath)).toString('base64');

  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    messages: [{
      role: 'user',
      content: [
        { type: 'image', source: { type: 'base64', media_type: 'image/png', data: base64 } },
        { type: 'text', text: `This is page ${pageNumber} of a PDF. Extract all text preserving paragraph structure. Describe any figures or diagrams concisely after the text. Plain text only.` },
      ],
    }],
  });

  const block = message.content[0];
  return block.type === 'text' ? block.text : '';
}
