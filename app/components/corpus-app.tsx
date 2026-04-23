'use client';

import { useMemo, useState } from 'react';
import { CircleAlert, CircleCheck, CircleDashed, CirclePause, CircleX, Copy, FileJson, FileText, Play, Plus, SearchX, Upload, ZoomIn, ZoomOut } from 'lucide-react';
import { Document, Page, pdfjs } from 'react-pdf';
import { SidebarNav } from './sidebar-nav';
import { StatusBadge } from './status-badge';
import { DocumentRecord, PipelineRun, PipelineStatus } from '@/lib/types';
import { formatBytes, formatDateTime } from '@/lib/utils';

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

const iconMap: Record<PipelineStatus, React.ReactNode> = {
  idle: <CircleDashed className="h-4 w-4" />,
  waiting: <CirclePause className="h-4 w-4" />,
  running: <Play className="h-4 w-4" />,
  completed: <CircleCheck className="h-4 w-4" />,
  failed: <CircleX className="h-4 w-4" />,
  skipped: <SearchX className="h-4 w-4" />,
  canceled: <CircleAlert className="h-4 w-4" />,
};

export function CorpusApp() {
  const [file, setFile] = useState<File | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [documentMeta, setDocumentMeta] = useState<DocumentRecord | null>(null);
  const [pipeline, setPipeline] = useState<PipelineRun | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageCount, setPageCount] = useState<number>();
  const [zoom, setZoom] = useState(1);
  const [tab, setTab] = useState<'preview' | 'statistics' | 'schema' | 'shards'>('preview');

  const onFileSelect = async (selected: File) => {
    if (selected.type !== 'application/pdf') return;
    const nextUrl = URL.createObjectURL(selected);
    setFile(selected);
    setPdfUrl(nextUrl);
    setPipeline(null);
    setDocumentMeta(null);
  };

  const onPdfLoaded = async ({ numPages }: { numPages: number }) => {
    setPageCount(numPages);
    const formData = new FormData();
    if (!file) return;
    formData.append('file', file);
    formData.append('pageCount', String(numPages));
    const documentRes = await fetch('/api/documents', { method: 'POST', body: formData });
    if (!documentRes.ok) return;
    const documentRecord: DocumentRecord = await documentRes.json();
    setDocumentMeta(documentRecord);

    const pipelineRes = await fetch('/api/pipelines', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ documentId: documentRecord.id }),
    });
    if (!pipelineRes.ok) return;
    setPipeline(await pipelineRes.json());
  };

  const canStart = Boolean(pipeline && (pipeline.status === 'idle' || pipeline.status === 'waiting'));
  const canCancel = pipeline?.status === 'running';
  const canRetry = pipeline?.status === 'failed' || pipeline?.status === 'canceled';
  const canExport = Boolean(pipeline?.status === 'completed' && pipeline.outputArtifacts?.length);

  const callPipelineAction = async (suffix: 'start' | 'cancel' | 'retry') => {
    if (!pipeline) return;
    const res = await fetch(`/api/pipelines/${pipeline.id}/${suffix}`, { method: 'POST' });
    if (!res.ok) return;
    const next = await res.json();
    setPipeline(next);
  };

  const metadataRows = useMemo(() => {
    if (!documentMeta) return [];
    return [
      ['Original filename', documentMeta.filename],
      ['File size', formatBytes(documentMeta.sizeBytes)],
      ['Page count', documentMeta.pageCount],
      ['MIME type', documentMeta.mimeType],
      ['SHA-256 hash', documentMeta.sha256],
      ['Upload timestamp', formatDateTime(documentMeta.uploadedAt)],
      ['Language', documentMeta.detectedLanguage],
      ['Document type', documentMeta.docType],
      ['Source URL', documentMeta.sourceUrl],
    ].filter((entry) => entry[1]);
  }, [documentMeta]);

  return (
    <main className="flex min-h-screen">
      <SidebarNav runStatus={pipeline?.status} />
      <section className="flex-1 p-6">
        <header className="mb-4 flex items-center justify-between rounded-xl border border-border bg-panel p-4">
          <div>
            <h2 className="text-2xl font-semibold">Ingestion Pipeline</h2>
            <p className="text-sm text-muted">Transform raw documents into high-quality training data</p>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge status={pipeline?.status ?? 'idle'} />
            <button disabled className="rounded-lg border border-border px-3 py-2 text-sm disabled:opacity-40">View Logs</button>
            <button disabled={!canExport} className="rounded-lg border border-border px-3 py-2 text-sm disabled:opacity-40">Export</button>
            <button onClick={() => callPipelineAction('retry')} disabled={!canRetry} className="rounded-lg border border-border px-3 py-2 text-sm disabled:opacity-40">Retry</button>
            <button onClick={() => callPipelineAction('cancel')} disabled={!canCancel} className="rounded-lg border border-border px-3 py-2 text-sm disabled:opacity-40">Cancel</button>
          </div>
        </header>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          <section className="rounded-xl border border-border bg-panel p-4">
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">Source Document</h3>
            {!file && (
              <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-border bg-panelAlt px-4 py-14 text-center">
                <Upload className="mb-3 h-8 w-8 text-muted" />
                <span className="font-medium">Upload a PDF to begin ingestion</span>
                <span className="mt-1 text-xs text-muted">Supported format: PDF</span>
                <input aria-label="Upload PDF" type="file" accept="application/pdf" className="hidden" onChange={(e) => e.target.files?.[0] && onFileSelect(e.target.files[0])} />
              </label>
            )}
            {file && (
              <>
                <div className="mb-3 rounded-lg border border-border bg-panelAlt p-3 text-sm">
                  <div className="font-medium">{file.name}</div>
                  <div className="text-muted">{formatBytes(file.size)} • {pageCount ? `${pageCount} pages` : 'Loading page count...'}</div>
                </div>
                <div className="mb-2 flex items-center gap-2 text-xs">
                  <button aria-label="Previous page" className="rounded border border-border p-1" onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}>-</button>
                  <span>{currentPage} / {pageCount ?? '—'}</span>
                  <button aria-label="Next page" className="rounded border border-border p-1" onClick={() => pageCount && setCurrentPage((p) => Math.min(pageCount, p + 1))}>+</button>
                  <button aria-label="Zoom out" className="rounded border border-border p-1" onClick={() => setZoom((z) => Math.max(0.5, z - 0.1))}><ZoomOut className="h-3 w-3" /></button>
                  <span>{Math.round(zoom * 100)}%</span>
                  <button aria-label="Zoom in" className="rounded border border-border p-1" onClick={() => setZoom((z) => Math.min(2, z + 0.1))}><ZoomIn className="h-3 w-3" /></button>
                </div>
                <div className="max-h-[450px] overflow-auto rounded border border-border bg-[#0a101b] p-2">
                  <Document file={pdfUrl} onLoadSuccess={onPdfLoaded} loading={<p className="p-4 text-sm text-muted">Loading PDF...</p>} error={<p className="p-4 text-sm text-danger">Invalid PDF file.</p>}>
                    <Page pageNumber={currentPage} scale={zoom} renderTextLayer={false} renderAnnotationLayer={false} />
                  </Document>
                </div>
                <div className="mt-3 rounded-lg border border-border bg-panelAlt p-3 text-sm">
                  <h4 className="mb-2 font-medium">Document Metadata</h4>
                  {metadataRows.length === 0 ? (
                    <p className="text-muted">Metadata will appear after upload processing.</p>
                  ) : (
                    <dl className="space-y-1">
                      {metadataRows.map(([label, value]) => (
                        <div key={String(label)} className="flex justify-between gap-4">
                          <dt className="text-muted">{label}</dt>
                          <dd className="text-right">{String(value)}</dd>
                        </div>
                      ))}
                    </dl>
                  )}
                </div>
              </>
            )}
          </section>

          <section className="rounded-xl border border-border bg-panel p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-muted">Pipeline Steps</h3>
              <button onClick={() => callPipelineAction('start')} disabled={!canStart} className="rounded-lg bg-accent px-3 py-2 text-sm font-medium disabled:opacity-40">Start Process</button>
            </div>
            {!pipeline ? (
              <div className="rounded-lg border border-dashed border-border bg-panelAlt p-8 text-center text-sm text-muted">Pipeline stages will appear after document upload.</div>
            ) : (
              <div className="space-y-2">
                {pipeline.steps.map((step) => (
                  <article key={step.key} className="rounded-lg border border-border bg-panelAlt p-3">
                    <div className="mb-1 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {iconMap[step.status]}
                        <h4 className="font-medium">{step.title}</h4>
                      </div>
                      <StatusBadge status={step.status} />
                    </div>
                    <p className="text-sm text-muted">{step.description}</p>
                    {step.metrics && Object.keys(step.metrics).length > 0 ? (
                      <ul className="mt-2 text-xs text-slate-300">
                        {Object.entries(step.metrics).map(([k, v]) => <li key={k}>{k}: {String(v)}</li>)}
                      </ul>
                    ) : (
                      <p className="mt-2 text-xs text-muted">No metrics yet.</p>
                    )}
                    {step.error && <p className="mt-2 text-xs text-danger">{step.error}</p>}
                  </article>
                ))}
                <div className="mt-3 grid grid-cols-4 gap-2 rounded-lg border border-border bg-[#0b1220] p-2 text-xs">
                  <div><div className="text-muted">Source</div><div>{documentMeta ? 'Ready' : 'Empty'}</div></div>
                  <div><div className="text-muted">Processing</div><div>{pipeline.status}</div></div>
                  <div><div className="text-muted">Validation</div><div>{pipeline.steps.find((s) => s.key === 'schema_validation')?.status ?? 'idle'}</div></div>
                  <div><div className="text-muted">Output</div><div>{pipeline.steps.find((s) => s.key === 'output_generation')?.status ?? 'idle'}</div></div>
                </div>
              </div>
            )}
          </section>

          <section className="rounded-xl border border-border bg-panel p-4">
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">Final Output</h3>
            <div className="mb-3 flex gap-2 border-b border-border pb-2 text-sm">
              {(['preview', 'statistics', 'schema', 'shards'] as const).map((t) => (
                <button key={t} onClick={() => setTab(t)} className={`rounded px-2 py-1 capitalize ${tab === t ? 'bg-accent/20 text-blue-300' : 'text-muted'}`}>
                  {t}
                </button>
              ))}
            </div>
            {tab === 'preview' && (
              <div className="rounded-lg border border-border bg-panelAlt p-3">
                {pipeline?.outputArtifacts?.[0]?.contentPreview ? (
                  <>
                    <div className="mb-2 flex justify-end">
                      <button className="rounded border border-border p-1"><Copy className="h-3 w-3" /></button>
                    </div>
                    <pre className="code-view max-h-[500px] overflow-auto text-xs">{pipeline.outputArtifacts[0].contentPreview}</pre>
                  </>
                ) : (
                  <div className="flex flex-col items-center gap-2 py-12 text-center text-muted">
                    <FileText className="h-8 w-8" />
                    <p>Final output will appear here after processing completes.</p>
                  </div>
                )}
              </div>
            )}
            {tab === 'statistics' && (
              <div className="rounded-lg border border-border bg-panelAlt p-3 text-sm">
                {pipeline?.statistics ? Object.entries(pipeline.statistics).map(([k, v]) => <div key={k} className="flex justify-between py-1"><span className="text-muted">{k}</span><span>{String(v)}</span></div>) : <p className="py-12 text-center text-muted">No statistics available.</p>}
              </div>
            )}
            {tab === 'schema' && (
              <div className="rounded-lg border border-border bg-panelAlt p-3">
                {pipeline?.schema ? <pre className="code-view max-h-[500px] overflow-auto text-xs">{pipeline.schema}</pre> : <div className="flex flex-col items-center gap-2 py-12 text-muted"><FileJson className="h-8 w-8" />No schema loaded.</div>}
              </div>
            )}
            {tab === 'shards' && (
              <div className="rounded-lg border border-border bg-panelAlt p-3 text-sm">
                {pipeline?.outputArtifacts?.length ? (
                  pipeline.outputArtifacts.map((artifact) => <div key={artifact.id} className="flex justify-between border-b border-border py-2 last:border-0"><span>{artifact.filename}</span><span>{formatBytes(artifact.sizeBytes)}</span></div>)
                ) : (
                  <p className="py-12 text-center text-muted">Output shards will appear when generated.</p>
                )}
              </div>
            )}
          </section>
        </div>
      </section>
    </main>
  );
}
