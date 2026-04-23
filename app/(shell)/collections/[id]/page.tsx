'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { PageHeader, StateCard } from '@/app/components/page-header';
import { useFetchState } from '@/app/components/use-fetch-state';
import { CollectionRecord, DocumentRecord } from '@/lib/types';

export default function CollectionDetailPage() {
  const params = useParams<{ id: string }>();
  const collection = useFetchState<CollectionRecord | null>(`/api/collections/${params.id}`, null);
  const documents = useFetchState<DocumentRecord[]>('/api/documents', []);
  const [selectedDocumentId, setSelectedDocumentId] = useState('');

  const availableDocs = useMemo(() => {
    if (!collection.data) return [];
    return documents.data.filter((document) => !collection.data?.documentIds.includes(document.id));
  }, [documents.data, collection.data]);

  const addDocument = async () => {
    if (!selectedDocumentId) return;
    await fetch(`/api/collections/${params.id}/documents`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ documentId: selectedDocumentId }),
    });
    window.location.reload();
  };

  const removeDocument = async (documentId: string) => {
    await fetch(`/api/collections/${params.id}/documents/${documentId}`, { method: 'DELETE' });
    window.location.reload();
  };

  return (
    <>
      <PageHeader title="Collection detail" description="Review and manage sources attached to this collection." actions={<><select value={selectedDocumentId} onChange={(event) => setSelectedDocumentId(event.target.value)} className="rounded-lg border border-border bg-panelAlt px-3 py-2 text-sm"><option value="">Add document</option>{availableDocs.map((document) => <option key={document.id} value={document.id}>{document.filename}</option>)}</select><button onClick={addDocument} disabled={!selectedDocumentId} className="rounded-lg border border-border px-3 py-2 text-sm disabled:opacity-50">Add</button></>} />
      {collection.loading || documents.loading ? <StateCard message="Loading collection..." /> : collection.error || !collection.data ? <StateCard message="Collection not found." /> : (
        <section className="rounded-xl border border-border bg-panel p-4">
          <h3 className="mb-3 font-semibold">Documents</h3>
          {collection.data.documentIds.length === 0 ? <p className="text-sm text-muted">No documents added yet.</p> : (
            <div className="space-y-2">{collection.data.documentIds.map((documentId) => {
              const doc = documents.data.find((item) => item.id === documentId);
              return <div key={documentId} className="flex items-center justify-between rounded-lg border border-border bg-panelAlt p-3 text-sm"><Link href={`/sources/${documentId}`} className="font-medium">{doc?.filename ?? documentId}</Link><button onClick={() => removeDocument(documentId)} className="rounded border border-border px-2 py-1 text-xs">Remove</button></div>;
            })}</div>
          )}
        </section>
      )}
    </>
  );
}
