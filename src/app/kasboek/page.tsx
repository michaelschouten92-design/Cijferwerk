'use client';

import { formatEuro } from '@/lib/format';
import { useEffect, useState } from 'react';
import { Plus, Trash2, X, Wallet } from 'lucide-react';

interface KasTransactie {
  id: number;
  datum: string;
  omschrijving: string;
  bedragExclBtw: number;
  btwPercentage: number;
  btwBedrag: number;
  richting: string;
  categorie: { id: number; naam: string } | null;
}

interface Categorie {
  id: number;
  code: string;
  naam: string;
  btwTarief: number;
}

export default function KasboekPage() {
  const [transacties, setTransacties] = useState<KasTransactie[]>([]);
  const [categorieen, setCategorieen] = useState<Categorie[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [jaar, setJaar] = useState(new Date().getFullYear());

  function load() {
    fetch(`/api/transactions?jaar=${jaar}`).then(r => r.json()).then((all: any[]) => {
      setTransacties(all.filter(t => t.status === 'Contant'));
    }).catch(() => {});
    fetch('/api/categories').then(r => r.json()).then(d => setCategorieen(d.categorieen)).catch(() => {});
  }

  useEffect(() => { load(); }, [jaar]);

  const totaalIn = Math.round(transacties.filter(t => t.richting === 'verkoop').reduce((s, t) => s + t.bedragExclBtw + t.btwBedrag, 0) * 100) / 100;
  const totaalUit = Math.round(transacties.filter(t => t.richting === 'inkoop').reduce((s, t) => s + t.bedragExclBtw + t.btwBedrag, 0) * 100) / 100;

  async function handleDelete(id: number) {
    await fetch(`/api/transactions?id=${id}`, { method: 'DELETE' });
    setDeleteId(null);
    load();
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Kasboek</h2>
          <select value={jaar} onChange={e => setJaar(parseInt(e.target.value))}
            className="px-2 py-1 border border-gray-200 rounded-lg text-sm text-gray-600">
            {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
        <button onClick={() => setShowAdd(true)}
          className="px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors">
          + Toevoegen
        </button>
      </div>

      {/* Samenvatting */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow-card hover:shadow-card-hover transition-shadow p-5">
          <p className="text-sm text-gray-500">Contant ontvangen</p>
          <p className="text-xl font-bold text-green-600 mt-1 tabular-nums">{formatEuro(totaalIn)}</p>
        </div>
        <div className="bg-white rounded-xl shadow-card hover:shadow-card-hover transition-shadow p-5">
          <p className="text-sm text-gray-500">Contant uitgegeven</p>
          <p className="text-xl font-bold text-red-600 mt-1 tabular-nums">{formatEuro(totaalUit)}</p>
        </div>
        <div className="bg-white rounded-xl shadow-card hover:shadow-card-hover transition-shadow p-5">
          <p className="text-sm text-gray-500">Kassaldo</p>
          <p className="text-xl font-bold text-gray-900 mt-1 tabular-nums">{formatEuro(totaalIn - totaalUit)}</p>
        </div>
      </div>

      {showAdd && (
        <AddKasForm
          categorieen={categorieen}
          onSave={() => { setShowAdd(false); load(); }}
          onCancel={() => setShowAdd(false)}
        />
      )}

      {/* Transacties lijst */}
      <div className="bg-white rounded-xl shadow-card overflow-x-auto">
        <table className="w-full min-w-[500px]">
          <thead>
            <tr className="bg-gray-50 text-left text-xs font-medium text-gray-500">
              <th className="px-4 py-3">Datum</th>
              <th className="px-4 py-3">Omschrijving</th>
              <th className="px-4 py-3">Categorie</th>
              <th className="px-4 py-3 text-right">Bedrag</th>
              <th className="px-4 py-3 w-12"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {transacties.map(tx => (
              <tr key={tx.id} className="text-sm hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 text-gray-500 tabular-nums">{new Date(tx.datum).toLocaleDateString('nl-NL')}</td>
                <td className="px-4 py-3 font-medium text-gray-900">{tx.omschrijving}</td>
                <td className="px-4 py-3">
                  {tx.categorie ? (
                    <span className="px-2 py-1 bg-gray-100 rounded-md text-xs text-gray-600">{tx.categorie.naam}</span>
                  ) : '-'}
                </td>
                <td className={`px-4 py-3 text-right font-medium tabular-nums ${tx.richting === 'verkoop' ? 'text-green-600' : 'text-red-600'}`}>
                  {tx.richting === 'verkoop' ? '+' : '-'}{formatEuro(tx.bedragExclBtw + tx.btwBedrag)}
                </td>
                <td className="px-4 py-3">
                  {deleteId === tx.id ? (
                    <div className="flex gap-1">
                      <button onClick={() => handleDelete(tx.id)} className="text-xs text-red-600 font-medium">Ja</button>
                      <button onClick={() => setDeleteId(null)} className="text-xs text-gray-400">Nee</button>
                    </div>
                  ) : (
                    <button onClick={() => setDeleteId(tx.id)} className="p-1 text-gray-400 hover:text-red-600 transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {transacties.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-12 text-center text-gray-400">
                <Wallet className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                Nog geen contante transacties. Voeg je eerste toe met de knop hierboven.
              </td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AddKasForm({ categorieen, onSave, onCancel }: {
  categorieen: Categorie[];
  onSave: () => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState({
    datum: new Date().toISOString().split('T')[0],
    omschrijving: '',
    bedrag: '',
    richting: 'inkoop' as 'inkoop' | 'verkoop',
    categorieId: '',
    btwPercentage: '0.21',
    inclBtw: true,
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const bruto = Math.abs(parseFloat(form.bedrag) || 0);
    const btw = parseFloat(form.btwPercentage);
    const bedragExclBtw = form.inclBtw ? Math.round((bruto / (1 + btw)) * 100) / 100 : bruto;
    const btwBedrag = form.inclBtw ? Math.round((bruto - bedragExclBtw) * 100) / 100 : Math.round(bruto * btw * 100) / 100;

    await fetch('/api/transactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        datum: form.datum,
        omschrijving: form.omschrijving,
        bedragExclBtw,
        btwPercentage: btw,
        btwBedrag,
        richting: form.richting,
        status: 'Contant',
        categorieId: form.categorieId ? parseInt(form.categorieId) : undefined,
      }),
    });
    onSave();
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-card p-6 mb-6 animate-fade-in-up">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900">Contante transactie</h3>
        <button type="button" onClick={onCancel} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-gray-600 mb-1">Datum</label>
          <input type="date" value={form.datum} onChange={e => setForm({ ...form, datum: e.target.value })}
            className="w-full px-3 py-2 border rounded-lg text-sm" required />
        </div>
        <div>
          <label className="block text-sm text-gray-600 mb-1">Type</label>
          <select value={form.richting} onChange={e => setForm({ ...form, richting: e.target.value as any })}
            className="w-full px-3 py-2 border rounded-lg text-sm">
            <option value="inkoop">Uitgave (contant betaald)</option>
            <option value="verkoop">Inkomst (contant ontvangen)</option>
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className="block text-sm text-gray-600 mb-1">Omschrijving</label>
          <input type="text" value={form.omschrijving} onChange={e => setForm({ ...form, omschrijving: e.target.value })}
            className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="bijv. Parkeerkosten" required />
        </div>
        <div>
          <label className="block text-sm text-gray-600 mb-1">Bedrag</label>
          <div className="flex gap-2">
            <input type="number" step="0.01" min="0.01" value={form.bedrag} onChange={e => setForm({ ...form, bedrag: e.target.value })}
              className="flex-1 px-3 py-2 border rounded-lg text-sm" placeholder="0,00" required />
            <select value={form.inclBtw ? 'incl' : 'excl'} onChange={e => setForm({ ...form, inclBtw: e.target.value === 'incl' })}
              className="px-2 py-2 border rounded-lg text-xs text-gray-600">
              <option value="incl">Incl. BTW</option>
              <option value="excl">Excl. BTW</option>
            </select>
          </div>
        </div>
        <div>
          <label className="block text-sm text-gray-600 mb-1">BTW</label>
          <select value={form.btwPercentage} onChange={e => setForm({ ...form, btwPercentage: e.target.value })}
            className="w-full px-3 py-2 border rounded-lg text-sm">
            <option value="0.21">21%</option>
            <option value="0.09">9%</option>
            <option value="0">Geen BTW (0%)</option>
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className="block text-sm text-gray-600 mb-1">Categorie</label>
          <select value={form.categorieId} onChange={e => setForm({ ...form, categorieId: e.target.value })}
            className="w-full px-3 py-2 border rounded-lg text-sm">
            <option value="">Selecteer categorie</option>
            {categorieen.filter(c => c.code !== '9100' && c.code !== '9200').map(c => (
              <option key={c.id} value={c.id}>{c.naam}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="flex justify-end mt-4">
        <button type="submit" className="px-6 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors">
          Opslaan
        </button>
      </div>
    </form>
  );
}
