'use client';

import { useRef, useState } from 'react';
import { Upload } from 'lucide-react';

interface ImportResult {
  success: boolean;
  nieuw?: number;
  overgeslagen?: number;
  totaal?: number;
  error?: string;
}

export default function SyncButton({ onSync }: { onSync?: () => void }) {
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/revolut', {
        method: 'POST',
        body: formData,
      });
      const data: ImportResult = await res.json();
      setResult(data);
      if (data.success) onSync?.();
      setTimeout(() => setResult(null), 6000);
    } catch (e: any) {
      setResult({ success: false, error: e.message });
      setTimeout(() => setResult(null), 6000);
    }

    setImporting(false);
    // Reset file input zodat hetzelfde bestand opnieuw gekozen kan worden
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  return (
    <div className="relative">
      <label className={`inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors cursor-pointer ${importing ? 'opacity-50 pointer-events-none' : ''}`}>
        <Upload className={`w-4 h-4 ${importing ? 'animate-pulse' : ''}`} />
        {importing ? 'Importeren...' : 'Importeer CSV'}
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          onChange={handleFileUpload}
          className="hidden"
          disabled={importing}
        />
      </label>

      {/* Resultaat banner */}
      {result && (
        <div className={`absolute right-0 top-12 px-4 py-3 rounded-lg text-sm shadow-lg z-10 whitespace-nowrap ${
          result.success ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
        }`}>
          {result.success
            ? `${result.nieuw} nieuw, ${result.overgeslagen} al aanwezig (${result.totaal} totaal)`
            : `Fout: ${result.error}`}
        </div>
      )}
    </div>
  );
}
