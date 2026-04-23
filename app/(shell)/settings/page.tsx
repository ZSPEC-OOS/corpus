'use client';

import { useState } from 'react';
import { PageHeader, StateCard } from '@/app/components/page-header';
import { useFetchState } from '@/app/components/use-fetch-state';
import { AppSettings } from '@/lib/types';

function Row({ label, sublabel, children }: { label: string; sublabel?: string; children: React.ReactNode }) {
  return (
    <div className="rounded border border-border bg-panelAlt p-3">
      <div className="mb-1 font-medium">{label}</div>
      {sublabel && <div className="mb-2 text-xs text-muted">{sublabel}</div>}
      {children}
    </div>
  );
}

function Toggle({ value, onChange, disabled }: { value: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button
      disabled={disabled}
      onClick={() => onChange(!value)}
      className={`mt-1 rounded px-3 py-1 text-xs font-semibold ${value ? 'bg-accent text-white' : 'border border-border text-muted'} disabled:opacity-50`}
    >
      {value ? 'Enabled' : 'Disabled'}
    </button>
  );
}

export default function SettingsPage() {
  const { data, loading, error } = useFetchState<AppSettings | null>('/api/settings', null);
  const [saving, setSaving] = useState(false);

  const update = async (patch: Partial<AppSettings>) => {
    setSaving(true);
    await fetch('/api/settings', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(patch) });
    window.location.reload();
  };

  if (loading) return <><PageHeader title="Settings" description="Runtime configuration." /><StateCard message="Loading settings..." /></>;
  if (error || !data) return <><PageHeader title="Settings" description="Runtime configuration." /><StateCard message="Unable to load settings." /></>;

  return (
    <>
      <PageHeader title="Settings" description="Runtime configuration and output defaults." />

      <div className="space-y-6">

        {/* ── Output ── */}
        <section className="rounded-xl border border-border bg-panel p-4">
          <h2 className="mb-3 font-semibold text-sm uppercase tracking-wide text-muted">Output</h2>
          <div className="grid gap-2 lg:grid-cols-2">
            <Row label="Default export format" sublabel="JSONL is standard for LLM training pipelines.">
              <select
                value={data.defaultExportFormat ?? 'jsonl'}
                onChange={(e) => update({ defaultExportFormat: e.target.value as 'jsonl' | 'json' })}
                className="mt-1 block w-full rounded border border-border bg-panel px-2 py-1 text-sm"
              >
                <option value="jsonl">JSONL (recommended)</option>
                <option value="json">JSON</option>
              </select>
            </Row>
            <Row label="Shard size" sublabel="Target size for individual output shards.">
              <select
                value={data.targetShardSizeMb ?? 64}
                onChange={(e) => update({ targetShardSizeMb: Number(e.target.value) })}
                className="mt-1 block w-full rounded border border-border bg-panel px-2 py-1 text-sm"
              >
                {[16, 32, 64, 128, 256].map((v) => <option key={v} value={v}>{v} MB</option>)}
              </select>
            </Row>
          </div>
        </section>

        {/* ── Quality ── */}
        <section className="rounded-xl border border-border bg-panel p-4">
          <h2 className="mb-3 font-semibold text-sm uppercase tracking-wide text-muted">Quality</h2>
          <div className="grid gap-2 lg:grid-cols-2">
            <Row label="Deduplication sensitivity" sublabel="Higher = more aggressive near-duplicate removal.">
              <select
                value={data.dedupeSensitivity ?? 'medium'}
                onChange={(e) => update({ dedupeSensitivity: e.target.value as 'low' | 'medium' | 'high' })}
                className="mt-1 block w-full rounded border border-border bg-panel px-2 py-1 text-sm"
              >
                <option value="low">Low</option>
                <option value="medium">Medium (recommended)</option>
                <option value="high">High</option>
              </select>
            </Row>
            <Row label="Strict schema validation" sublabel="Reject chunks that fail the active schema. Disable to allow partial failures.">
              <Toggle value={!!data.strictSchemaValidation} onChange={(v) => update({ strictSchemaValidation: v })} disabled={saving} />
            </Row>
            <Row label="Include provenance" sublabel="Embed source file name and page number in every record.">
              <Toggle value={!!data.includeProvenance} onChange={(v) => update({ includeProvenance: v })} disabled={saving} />
            </Row>
            <Row label="Include token counts" sublabel="Add estimated token count to each record for training budget planning.">
              <Toggle value={!!data.includeTokenCounts} onChange={(v) => update({ includeTokenCounts: v })} disabled={saving} />
            </Row>
          </div>
        </section>

        {/* ── AI Enhancement ── */}
        <section className="rounded-xl border border-border bg-panel p-4">
          <h2 className="mb-3 font-semibold text-sm uppercase tracking-wide text-muted">AI Enhancement</h2>
          <p className="mb-3 text-xs text-muted">
            Uses Claude Vision to recover text from pages where OCR fails — scanned documents,
            complex layouts, math-heavy content. Requires <code className="rounded bg-panelAlt px-1">ANTHROPIC_API_KEY</code> in your environment.
            Each AI-enhanced page consumes API credits.
          </p>
          <div className="grid gap-2 lg:grid-cols-2">
            <Row label="AI enhancement" sublabel="Fall back to Claude Vision on low-quality pages (alpha ratio below threshold).">
              <Toggle value={!!data.aiEnhancement} onChange={(v) => update({ aiEnhancement: v })} disabled={saving} />
            </Row>
            <Row label="Extract &amp; attach page images" sublabel="Render each page to PNG, store it, and reference it in the JSONL record. Required for multimodal training.">
              <Toggle value={!!data.extractImages} onChange={(v) => update({ extractImages: v })} disabled={saving} />
            </Row>
            <Row label="AI quality threshold" sublabel="Pages scoring below this alpha-ratio trigger the AI fallback. 0.5 = half the characters are non-alphabetic.">
              <select
                value={data.aiQualityThreshold ?? 0.5}
                onChange={(e) => update({ aiQualityThreshold: Number(e.target.value) })}
                className="mt-1 block w-full rounded border border-border bg-panel px-2 py-1 text-sm"
              >
                <option value={0.3}>0.3 — only very bad pages</option>
                <option value={0.5}>0.5 — recommended</option>
                <option value={0.7}>0.7 — aggressive</option>
              </select>
            </Row>
          </div>
          <div className="mt-3 rounded border border-border bg-panelAlt p-3 text-xs text-muted">
            <strong className="text-slate-300">How to enable:</strong> add <code className="rounded bg-panel px-1">ANTHROPIC_API_KEY=sk-ant-...</code> to a <code className="rounded bg-panel px-1">.env.local</code> file in the project root and restart the dev server.
            The key is never stored on disk by this app.
          </div>
        </section>

      </div>
    </>
  );
}
