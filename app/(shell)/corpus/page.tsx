'use client';

import { useRef, useState } from 'react';
import { FileJson, FileText, X, Download, Loader2 } from 'lucide-react';
import { formatBytes } from '@/lib/utils';

type BuildStats = {
  totalRecords: number;
  newRecords: number;
  duplicatesRemoved: number;
  pagesProcessed: number;
  avgQuality: number;
};

type OutputState = { url: string; filename: string; stats: BuildStats } | null;

export default function CorpusBuilderPage() {
  const [baseFile, setBaseFile] = useState<File | null>(null);
  const [pdfs, setPdfs] = useState<File[]>([]);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [output, setOutput] = useState<OutputState>(null);

  const baseInputRef = useRef<HTMLInputElement>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);

  const addPdfs = (files: FileList | null) => {
    if (!files) return;
    const newFiles = Array.from(files).filter(
      (f) => f.type === 'application/pdf' && !pdfs.some((p) => p.name === f.name && p.size === f.size),
    );
    setPdfs((prev) => [...prev, ...newFiles]);
  };

  const removePdf = (index: number) => setPdfs((prev) => prev.filter((_, i) => i !== index));

  const build = async () => {
    if (pdfs.length === 0) { setError('Add at least one PDF.'); return; }
    setError(null);
    setOutput(null);
    setProcessing(true);

    const formData = new FormData();
    if (baseFile) formData.append('base', baseFile);
    for (const pdf of pdfs) formData.append('pdf', pdf);

    try {
      const res = await fetch('/api/corpus/build', { method: 'POST', body: formData });
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: 'Unknown error' }));
        setError((body as { error: string }).error);
        return;
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      setOutput({
        url,
        filename: 'master_corpus.jsonl',
        stats: {
          totalRecords: Number(res.headers.get('X-Corpus-Total-Records') ?? 0),
          newRecords: Number(res.headers.get('X-Corpus-New-Records') ?? 0),
          duplicatesRemoved: Number(res.headers.get('X-Corpus-Duplicates-Removed') ?? 0),
          pagesProcessed: Number(res.headers.get('X-Corpus-Pages-Processed') ?? 0),
          avgQuality: Number(res.headers.get('X-Corpus-Avg-Quality') ?? 0),
        },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Request failed');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6 py-4">
      <div>
        <h1 className="text-2xl font-semibold">Corpus Builder</h1>
        <p className="mt-1 text-sm text-muted">
          Combine PDFs into a high-quality training JSONL. Optionally attach an existing dataset — new content is deduplicated against it automatically.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* ── Base JSON (optional) ── */}
        <section className="rounded-xl border border-border bg-panel p-4">
          <h2 className="mb-3 font-semibold">Base dataset <span className="ml-1 text-xs font-normal text-muted">(optional)</span></h2>
          <p className="mb-3 text-xs text-muted">Attach an existing .jsonl to merge into. New chunks will be deduplicated against it.</p>
          {baseFile ? (
            <div className="flex items-center justify-between rounded-lg border border-border bg-panelAlt p-3 text-sm">
              <div className="flex items-center gap-2">
                <FileJson className="h-4 w-4 text-accent" />
                <div>
                  <div className="font-medium">{baseFile.name}</div>
                  <div className="text-xs text-muted">{formatBytes(baseFile.size)}</div>
                </div>
              </div>
              <button onClick={() => setBaseFile(null)} className="text-muted hover:text-white"><X className="h-4 w-4" /></button>
            </div>
          ) : (
            <label className="flex cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-border bg-panelAlt p-6 text-sm text-muted hover:border-accent hover:text-white">
              <FileJson className="mb-2 h-6 w-6" />
              Click to attach .jsonl
              <input ref={baseInputRef} type="file" hidden accept=".jsonl,.json,application/json,application/x-ndjson"
                onChange={(e) => setBaseFile(e.target.files?.[0] ?? null)} />
            </label>
          )}
        </section>

        {/* ── PDFs ── */}
        <section className="rounded-xl border border-border bg-panel p-4">
          <h2 className="mb-3 font-semibold">PDFs to process</h2>
          <p className="mb-3 text-xs text-muted">Add one or more PDFs. All will be processed and merged into one output file.</p>

          <label
            className="mb-3 flex cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-border bg-panelAlt p-4 text-sm text-muted hover:border-accent hover:text-white"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => { e.preventDefault(); addPdfs(e.dataTransfer.files); }}
          >
            <FileText className="mb-1 h-5 w-5" />
            Drop PDFs here or click to browse
            <input ref={pdfInputRef} type="file" hidden accept="application/pdf" multiple
              onChange={(e) => addPdfs(e.target.files)} />
          </label>

          {pdfs.length > 0 && (
            <ul className="space-y-1">
              {pdfs.map((pdf, i) => (
                <li key={i} className="flex items-center justify-between rounded border border-border bg-panelAlt px-3 py-2 text-sm">
                  <span className="truncate">{pdf.name} <span className="text-xs text-muted">· {formatBytes(pdf.size)}</span></span>
                  <button onClick={() => removePdf(i)} className="ml-2 shrink-0 text-muted hover:text-white"><X className="h-3 w-3" /></button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {error && <p className="rounded-lg border border-red-800 bg-red-950/40 px-4 py-2 text-sm text-red-400">{error}</p>}

      <button
        onClick={build}
        disabled={processing || pdfs.length === 0}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-accent py-3 font-semibold text-white disabled:opacity-50"
      >
        {processing ? <><Loader2 className="h-4 w-4 animate-spin" /> Processing…</> : `Build corpus from ${pdfs.length} PDF${pdfs.length !== 1 ? 's' : ''}${baseFile ? ' + base dataset' : ''}`}
      </button>

      {/* ── Output ── */}
      {output && (
        <section className="rounded-xl border border-border bg-panel p-4">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold">Output ready</h2>
            <a
              href={output.url}
              download={output.filename}
              className="flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white"
            >
              <Download className="h-4 w-4" /> Download master_corpus.jsonl
            </a>
          </div>

          <dl className="grid grid-cols-2 gap-3 text-sm lg:grid-cols-4">
            <div className="rounded-lg border border-border bg-panelAlt p-3">
              <dt className="text-xs text-muted">Total records</dt>
              <dd className="mt-1 text-xl font-semibold">{output.stats.totalRecords.toLocaleString()}</dd>
            </div>
            <div className="rounded-lg border border-border bg-panelAlt p-3">
              <dt className="text-xs text-muted">New records added</dt>
              <dd className="mt-1 text-xl font-semibold">{output.stats.newRecords.toLocaleString()}</dd>
            </div>
            <div className="rounded-lg border border-border bg-panelAlt p-3">
              <dt className="text-xs text-muted">Duplicates removed</dt>
              <dd className="mt-1 text-xl font-semibold">{output.stats.duplicatesRemoved.toLocaleString()}</dd>
            </div>
            <div className="rounded-lg border border-border bg-panelAlt p-3">
              <dt className="text-xs text-muted">Avg quality score</dt>
              <dd className="mt-1 text-xl font-semibold">{(output.stats.avgQuality * 100).toFixed(1)}%</dd>
            </div>
          </dl>

          <p className="mt-3 text-xs text-muted">
            {output.stats.pagesProcessed} pages processed across {pdfs.length} PDF{pdfs.length !== 1 ? 's' : ''}.
            {baseFile ? ` Merged with ${baseFile.name}.` : ''}
          </p>
        </section>
      )}
    </div>
  );
}
