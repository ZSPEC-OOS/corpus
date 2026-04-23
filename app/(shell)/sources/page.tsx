'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { PageHeader, StateCard } from '@/app/components/page-header';
import { useFetchState } from '@/app/components/use-fetch-state';
import { DocumentRecord } from '@/lib/types';
import { formatBytes, formatDateTime } from '@/lib/utils';

export default function SourcesPage() {
  const { data, loading, error } = useFetchState<DocumentRecord[]>('/api/documents', []);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await fetch('/api/documents', { method: 'POST', body: formData });
      if (res.ok) {
        const doc: DocumentRecord = await res.json();
        window.location.href = `/sources/${doc.id}`;
      }
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <>
      <PageHeader title="Sources" description="Manage uploaded raw documents and launch processing pipelines from source files." actions={<label className="cursor-pointer rounded-lg bg-accent px-3 py-2 text-sm font-medium">{uploading ? 'Uploading…' : 'Upload source'}<input ref={inputRef} hidden type="file" accept="application/pdf" onChange={handleUpload} /></label>} />
      {loading ? <StateCard message="Loading source library..." /> : error ? <StateCard message={`Unable to load sources: ${error}`} /> : data.length === 0 ? <StateCard message="No sources uploaded yet. Upload your first PDF to begin." cta={<Link href="/pipelines" className="rounded-lg bg-accent px-3 py-2 text-sm font-medium">Upload PDF</Link>} /> : (
        <div className="rounded-xl border border-border bg-panel p-2">{data.map((source) => <Link href={`/sources/${source.id}`} key={source.id} className="grid grid-cols-1 gap-1 rounded-lg border border-border bg-panelAlt p-3 text-sm lg:grid-cols-6"><div className="font-medium">{source.filename}</div><div>{source.mimeType}</div><div>{formatDateTime(source.uploadedAt)}</div><div>{formatBytes(source.sizeBytes)}</div><div>{source.pageCount ?? '—'} pages</div><div className="text-muted">{source.pageCount ? 'Uploaded' : 'Unprocessed'}</div></Link>)}</div>
      )}
    </>
  );
}
