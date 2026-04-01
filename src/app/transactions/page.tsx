'use client';

import { formatEuro } from '@/lib/format';
import { useEffect, useState } from 'react';
import SyncButton from '@/components/SyncButton';
import { useToast } from '@/components/Toast';
import { Download, X, Trash2, Search, Check, Paperclip, ArrowLeftRight } from 'lucide-react';
import Link from 'next/link';

interface Transactie {
  id: number;
  datum: string;
  omschrijving: string;
  bedragExclBtw: number;
  btwPercentage: number;
  btwBedrag: number;
  status: string;
  richting: string;
  gecategoriseerd: boolean;
  relatie: { id: number; naam: string } | null;
  categorie: { id: number; code: string; naam: string } | null;
  factuur: { id: number; nummer: string } | null;
  bijlageNaam: string | null;
}

interface Categorie {
  id: number;
  code: string;
  naam: string;
  type: string;
  btwTarief: number;
}

interface Relatie {
  id: number;
  naam: string;
  type: string;
}


export default function TransactiesPage() {
  const [transacties, setTransacties] = useState<Transactie[]>([]);
  const [tab, setTab] = useState<'actie' | 'alle'>('actie');
  const [filter, setFilter] = useState<'alle' | 'inkoop' | 'verkoop'>('alle');
  const [zoek, setZoek] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [editTx, setEditTx] = useState<Transactie | null>(null);
  const [categorieen, setCategorieen] = useState<Categorie[]>([]);
  const [relaties, setRelaties] = useState<Relatie[]>([]);
  const [removingId, setRemovingId] = useState<number | null>(null);
  const [processingId, setProcessingId] = useState<number | null>(null);

  const [jaar, setJaar] = useState(new Date().getFullYear());
  const { toast } = useToast();

  useEffect(() => {
    loadTransacties();
    fetch('/api/categories').then(r => r.json()).then(d => setCategorieen(d.categorieen));
    fetch('/api/relaties').then(r => r.json()).then(setRelaties);
  }, []);

  useEffect(() => { loadTransacties(); }, [filter, jaar]);

  function loadTransacties() {
    const params = filter !== 'alle' ? `?richting=${filter}&jaar=${jaar}` : `?jaar=${jaar}`;
    fetch(`/api/transactions${params}`).then(r => r.json()).then(setTransacties);
  }

  const filtered = transacties.filter(tx => {
    if (zoek) {
      const z = zoek.toLowerCase();
      if (!tx.omschrijving.toLowerCase().includes(z) &&
          !(tx.relatie?.naam || '').toLowerCase().includes(z)) return false;
    }
    if (tab === 'actie') return !tx.gecategoriseerd;
    return true;
  });

  const ongecategoriseerd = transacties.filter(t => !t.gecategoriseerd).length;
  const totaal = transacties.length;
  const verwerkt = totaal - ongecategoriseerd;
  const voortgangPct = totaal > 0 ? Math.round((verwerkt / totaal) * 100) : 100;

  async function quickCategorize(txId: number, categorieId: number, btwTarief: number) {
    if (processingId === txId) return; // Dubbelklik bescherming
    const tx = transacties.find(t => t.id === txId);
    if (!tx) return;

    setProcessingId(txId);
    setRemovingId(txId);

    const btwBedrag = Math.round(tx.bedragExclBtw * btwTarief * 100) / 100;
    await fetch('/api/transactions', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: txId, categorieId, btwPercentage: btwTarief, btwBedrag }),
    });

    // Auto-regel aanmaken
    const cat = categorieen.find(c => c.id === categorieId);
    const tegenpartij = tx.omschrijving.split(' — ')[0];
    if (cat && tegenpartij.length > 2 && tegenpartij.length < 50) {
      const bestaandeRegels = await fetch('/api/categories').then(r => r.json());
      const bestaand = bestaandeRegels.regels?.find((r: any) => tegenpartij.toLowerCase().includes(r.zoekterm));
      if (!bestaand) {
        await fetch('/api/categories/regels', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            zoekterm: tegenpartij.toLowerCase(),
            zoekVeld: 'tegenpartij',
            categorieCode: cat.code,
            btwTarief,
            prioriteit: 10,
          }),
        });
        toast(`Regel aangemaakt: "${tegenpartij}" → ${cat.naam}`);
      }
    }

    // Wacht op animatie, dan reload
    setTimeout(() => {
      setRemovingId(null);
      setProcessingId(null);
      toast('Transactie verwerkt');
      loadTransacties();
    }, 300);
  }

  const topCategorieen = [...categorieen]
    .filter(c => c.type !== 'prive')
    .slice(0, 6);

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Transacties</h2>
          <select value={jaar} onChange={e => setJaar(parseInt(e.target.value))}
            className="px-2 py-1 border border-gray-200 rounded-lg text-sm text-gray-600">
            {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <a href={`/api/export/transactions?jaar=${jaar}${filter !== 'alle' ? `&richting=${filter}` : ''}`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-500 bg-white shadow-card rounded-lg hover:shadow-card-hover transition-shadow">
            <Download className="w-3 h-3" /> CSV
          </a>
          <SyncButton onSync={loadTransacties} />
          <button onClick={() => setShowAdd(!showAdd)}
            className="px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors">
            + Toevoegen
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          <button onClick={() => setTab('actie')}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200 ${tab === 'actie' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}>
            Actie nodig {ongecategoriseerd > 0 && <span className="ml-1 px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded-full text-xs">{ongecategoriseerd}</span>}
          </button>
          <button onClick={() => setTab('alle')}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200 ${tab === 'alle' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}>
            Alle transacties
          </button>
        </div>

        <div className="flex gap-2 items-center">
          {tab === 'alle' && (
            <div className="flex bg-gray-100 rounded-lg p-1">
              {(['alle', 'verkoop', 'inkoop'] as const).map(f => (
                <button key={f} onClick={() => setFilter(f)}
                  className={`px-3 py-1 rounded-md text-sm font-medium transition-all duration-200 ${filter === f ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}>
                  {f === 'alle' ? 'Alles' : f === 'verkoop' ? 'Inkomsten' : 'Uitgaven'}
                </button>
              ))}
            </div>
          )}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-2 text-gray-400" />
            <input type="text" value={zoek} onChange={e => setZoek(e.target.value)}
              placeholder="Zoeken..."
              className="pl-9 pr-3 py-1.5 border border-gray-200 rounded-lg text-sm w-48" />
          </div>
        </div>
      </div>

      {showAdd && <AddTransactionForm onSave={() => { setShowAdd(false); loadTransacties(); }} />}

      {/* Actie nodig: voortgangsbalk + snelle categorisatie */}
      {tab === 'actie' && ongecategoriseerd > 0 && (
        <>
          <p className="text-xs text-gray-400 mb-3">Kies per transactie de juiste categorie. Dit bepaalt je BTW-aangifte en winstberekening. Klik op een categorie om direct te verwerken.</p>
          <div className="mb-4">
            <div className="flex items-center justify-between text-sm mb-1.5">
              <span className="text-gray-600 font-medium">{voortgangPct}% verwerkt</span>
              <span className="text-gray-400">{verwerkt} van {totaal}</span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-brand-500 to-emerald-400 rounded-full transition-all duration-500"
                style={{ width: `${voortgangPct}%` }} />
            </div>
          </div>

          <div className="space-y-3 mb-6">
            {filtered.map(tx => (
              <div key={tx.id}
                className={`bg-white rounded-xl shadow-card p-4 border-l-4 border-amber-300 transition-all duration-300 ${
                  removingId === tx.id ? 'animate-slide-out-right' : 'animate-fade-in-up'
                }`}>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <span className="text-sm text-gray-400">{new Date(tx.datum).toLocaleDateString('nl-NL')}</span>
                    <span className="mx-2 text-gray-300">&middot;</span>
                    <span className="font-medium text-gray-900">{tx.omschrijving}</span>
                  </div>
                  <span className={`text-lg font-bold tabular-nums ${tx.richting === 'verkoop' ? 'text-green-600' : 'text-red-600'}`}>
                    {tx.richting === 'verkoop' ? '+' : '-'}{formatEuro(tx.bedragExclBtw + tx.btwBedrag)}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {topCategorieen.map(c => (
                    <button key={c.id}
                      onClick={() => quickCategorize(tx.id, c.id, c.btwTarief)}
                      className="px-3 py-1.5 text-sm bg-gray-50 text-gray-700 rounded-lg hover:bg-brand-50 hover:text-brand-700 hover:shadow-sm transition-all duration-150 hover:scale-[1.02]">
                      {c.naam}
                    </button>
                  ))}
                  <button onClick={() => setEditTx(tx)}
                    className="px-3 py-1.5 text-sm text-gray-400 border border-dashed border-gray-200 rounded-lg hover:border-gray-400 hover:text-gray-600 transition-colors">
                    Andere...
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {tab === 'actie' && filtered.length === 0 && (
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-12 text-center mb-6 shadow-card">
          <div className="animate-checkmark inline-block">
            <Check className="w-12 h-12 text-green-500 mx-auto" />
          </div>
          <p className="font-semibold text-green-800 text-lg mt-3">Alles verwerkt!</p>
          <p className="text-sm text-green-600 mt-1">Lekker bezig. Er zijn geen transacties die actie nodig hebben.</p>
        </div>
      )}

      {/* Alle transacties tabel */}
      {tab === 'alle' && (
        <>
          <div className="bg-white rounded-xl shadow-card overflow-x-auto">
            <table className="w-full min-w-[600px]">
              <thead>
                <tr className="bg-gray-50 text-left text-xs font-medium text-gray-500">
                  <th className="px-4 py-3">Datum</th>
                  <th className="px-4 py-3">Omschrijving</th>
                  <th className="px-4 py-3">Categorie</th>
                  <th className="px-4 py-3 text-right">Bedrag</th>
                  <th className="px-4 py-3 text-right">BTW</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(tx => (
                  <tr key={tx.id} onClick={() => setEditTx(tx)}
                    className={`text-sm hover:bg-gray-50 cursor-pointer transition-colors ${!tx.gecategoriseerd ? 'bg-amber-50/50' : ''}`}>
                    <td className="px-4 py-3 text-gray-500 tabular-nums">{new Date(tx.datum).toLocaleDateString('nl-NL')}</td>
                    <td className="px-4 py-3">
                      <span className="font-medium text-gray-900">{tx.omschrijving}</span>
                      {tx.bijlageNaam && <Paperclip className="w-3 h-3 text-gray-400 inline ml-1" />}
                      {tx.relatie && <span className="text-gray-400 ml-2 text-xs">{tx.relatie.naam}</span>}
                    </td>
                    <td className="px-4 py-3">
                      {tx.categorie ? (
                        <span className="px-2 py-1 bg-gray-100 rounded-md text-xs text-gray-600">{tx.categorie.naam}</span>
                      ) : (
                        <span className="px-2 py-1 bg-amber-100 rounded-md text-xs text-amber-700">Actie nodig</span>
                      )}
                    </td>
                    <td className={`px-4 py-3 text-right font-medium tabular-nums ${tx.richting === 'verkoop' ? 'text-green-600' : 'text-red-600'}`}>
                      {tx.richting === 'verkoop' ? '+' : '-'}{formatEuro(tx.bedragExclBtw + tx.btwBedrag)}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-500 tabular-nums">
                      {tx.btwBedrag > 0 ? formatEuro(tx.btwBedrag) : '-'}
                    </td>
                    <td className="px-4 py-3">
                      {tx.factuur && <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-md text-xs mr-1">{tx.factuur.nummer}</span>}
                      <span className={`px-2 py-1 rounded-md text-xs ${tx.gecategoriseerd ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                        {tx.gecategoriseerd ? 'Verwerkt' : 'Actie nodig'}
                      </span>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={6} className="px-4 py-12 text-center text-gray-400">
                    <ArrowLeftRight className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                    Geen transacties gevonden
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-sm text-gray-400">{filtered.length} transactie(s)</p>
        </>
      )}

      {editTx && (
        <EditTransactionModal
          tx={editTx} categorieen={categorieen} relaties={relaties}
          onClose={() => setEditTx(null)}
          onSave={() => { setEditTx(null); loadTransacties(); }}
          onDelete={() => { setEditTx(null); loadTransacties(); }}
        />
      )}
    </div>
  );
}

function EditTransactionModal({ tx, categorieen, relaties, onClose, onSave, onDelete }: {
  tx: Transactie; categorieen: Categorie[]; relaties: Relatie[];
  onClose: () => void; onSave: () => void; onDelete: () => void;
}) {
  const [form, setForm] = useState({
    omschrijving: tx.omschrijving,
    btwPercentage: tx.btwPercentage.toString(),
    categorieId: tx.categorie?.id?.toString() || '',
    relatieId: tx.relatie?.id?.toString() || '',
  });
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  async function handleSave() {
    setSaving(true);
    const btwPercentage = parseFloat(form.btwPercentage);
    const btwBedrag = Math.round(tx.bedragExclBtw * btwPercentage * 100) / 100;
    await fetch('/api/transactions', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: tx.id,
        omschrijving: form.omschrijving,
        btwPercentage, btwBedrag,
        categorieId: form.categorieId ? parseInt(form.categorieId) : null,
        relatieId: form.relatieId ? parseInt(form.relatieId) : null,
      }),
    });
    setSaving(false);
    onSave();
  }

  async function handleDelete() {
    await fetch(`/api/transactions?id=${tx.id}`, { method: 'DELETE' });
    onDelete();
  }

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 p-6 animate-fade-in-up" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900">Transactie bewerken</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>

        <div className="space-y-4">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">{new Date(tx.datum).toLocaleDateString('nl-NL')}</span>
            <span className={`font-medium tabular-nums ${tx.richting === 'verkoop' ? 'text-green-600' : 'text-red-600'}`}>
              {tx.richting === 'verkoop' ? '+' : '-'}{formatEuro(tx.bedragExclBtw + tx.btwBedrag)}
            </span>
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1">Omschrijving</label>
            <input type="text" value={form.omschrijving} onChange={e => setForm({ ...form, omschrijving: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg text-sm" />
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1">BTW tarief</label>
            <select value={form.btwPercentage} onChange={e => setForm({ ...form, btwPercentage: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg text-sm">
              <option value="0.21">21%</option>
              <option value="0.09">9%</option>
              <option value="0">Geen BTW (0%)</option>
            </select>
            <p className="text-xs text-gray-400 mt-1">
              BTW bedrag: {formatEuro(tx.bedragExclBtw * parseFloat(form.btwPercentage))}
            </p>
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1">Categorie</label>
            <select value={form.categorieId} onChange={e => setForm({ ...form, categorieId: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg text-sm">
              <option value="">Geen categorie</option>
              {categorieen.map(c => <option key={c.id} value={c.id}>{c.naam}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1">Klant / leverancier</label>
            <select value={form.relatieId} onChange={e => setForm({ ...form, relatieId: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg text-sm">
              <option value="">Geen</option>
              {relaties.map(r => <option key={r.id} value={r.id}>{r.naam}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1">Gekoppeld aan factuur</label>
            {tx.factuur ? (
              <div className="flex items-center gap-2 text-sm">
                <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-md">{tx.factuur.nummer}</span>
                <button type="button" onClick={() => {
                  fetch('/api/transactions', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id: tx.id, factuurId: null }),
                  }).then(() => onSave());
                }} className="text-xs text-red-500 hover:text-red-700">Ontkoppelen</button>
              </div>
            ) : (
              <p className="text-xs text-gray-400">Niet gekoppeld — koppel vanuit de Facturen pagina</p>
            )}
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1">Bijlage</label>
            <BijlageUpload transactieId={tx.id} bijlageNaam={tx.bijlageNaam} onUpdate={onSave} />
          </div>
        </div>

        <div className="flex items-center justify-between mt-6 pt-4 border-t">
          {!confirmDelete ? (
            <button onClick={() => setConfirmDelete(true)}
              className="inline-flex items-center gap-1.5 text-sm text-red-600 hover:text-red-700">
              <Trash2 className="w-4 h-4" /> Verwijderen
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-sm text-red-600">Weet je het zeker?</span>
              <button onClick={handleDelete} className="px-3 py-1 bg-red-600 text-white rounded-lg text-sm">Ja</button>
              <button onClick={() => setConfirmDelete(false)} className="px-3 py-1 bg-gray-100 rounded-lg text-sm">Nee</button>
            </div>
          )}
          <div className="flex gap-2">
            <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600">Annuleer</button>
            <button onClick={handleSave} disabled={saving}
              className="px-5 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50 transition-colors">
              {saving ? 'Opslaan...' : 'Opslaan'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function AddTransactionForm({ onSave }: { onSave: () => void }) {
  const [form, setForm] = useState({
    datum: new Date().toISOString().split('T')[0],
    omschrijving: '',
    bedragExclBtw: '',
    btwPercentage: '0.21',
    richting: 'inkoop',
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const bedrag = parseFloat(form.bedragExclBtw);
    const btw = parseFloat(form.btwPercentage);
    await fetch('/api/transactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form, bedragExclBtw: bedrag, btwPercentage: btw,
        btwBedrag: Math.round(bedrag * btw * 100) / 100,
      }),
    });
    onSave();
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-card p-6 mb-6 animate-fade-in-up">
      <h3 className="font-semibold mb-4">Transactie toevoegen</h3>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm text-gray-600 mb-1">Datum</label>
          <input type="date" value={form.datum} onChange={e => setForm({ ...form, datum: e.target.value })}
            className="w-full px-3 py-2 border rounded-lg text-sm" required />
        </div>
        <div>
          <label className="block text-sm text-gray-600 mb-1">Omschrijving</label>
          <input type="text" value={form.omschrijving} onChange={e => setForm({ ...form, omschrijving: e.target.value })}
            className="w-full px-3 py-2 border rounded-lg text-sm" required />
        </div>
        <div>
          <label className="block text-sm text-gray-600 mb-1">Type</label>
          <select value={form.richting} onChange={e => setForm({ ...form, richting: e.target.value })}
            className="w-full px-3 py-2 border rounded-lg text-sm">
            <option value="inkoop">Uitgave</option>
            <option value="verkoop">Inkomst</option>
          </select>
        </div>
        <div>
          <label className="block text-sm text-gray-600 mb-1">Bedrag excl. BTW</label>
          <input type="number" step="0.01" value={form.bedragExclBtw} onChange={e => setForm({ ...form, bedragExclBtw: e.target.value })}
            className="w-full px-3 py-2 border rounded-lg text-sm" required />
        </div>
        <div>
          <label className="block text-sm text-gray-600 mb-1">BTW tarief</label>
          <select value={form.btwPercentage} onChange={e => setForm({ ...form, btwPercentage: e.target.value })}
            className="w-full px-3 py-2 border rounded-lg text-sm">
            <option value="0.21">21%</option>
            <option value="0.09">9%</option>
            <option value="0">Geen BTW</option>
          </select>
        </div>
        <div className="flex items-end">
          <button type="submit" className="px-6 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors">Opslaan</button>
        </div>
      </div>
    </form>
  );
}

function BijlageUpload({ transactieId, bijlageNaam, onUpdate }: { transactieId: number; bijlageNaam: string | null; onUpdate: () => void }) {
  const [uploading, setUploading] = useState(false);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('transactieId', transactieId.toString());
    await fetch('/api/transactions/bijlage', { method: 'POST', body: formData });
    setUploading(false);
    onUpdate();
  }

  async function handleDelete() {
    await fetch(`/api/transactions/bijlage?id=${transactieId}`, { method: 'DELETE' });
    onUpdate();
  }

  if (bijlageNaam) {
    return (
      <div className="flex items-center gap-2">
        <a href={`/api/transactions/bijlage?id=${transactieId}`} target="_blank"
          className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800">
          <Paperclip className="w-3.5 h-3.5" /> {bijlageNaam}
        </a>
        <button onClick={handleDelete} className="text-xs text-red-500 hover:text-red-700">Verwijderen</button>
      </div>
    );
  }

  return (
    <label className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 cursor-pointer transition-colors ${uploading ? 'opacity-50' : ''}`}>
      <Paperclip className="w-3.5 h-3.5" /> {uploading ? 'Uploaden...' : 'Bestand toevoegen'}
      <input type="file" accept=".pdf,.jpg,.jpeg,.png,.gif,.doc,.docx,.xls,.xlsx" onChange={handleUpload} className="hidden" disabled={uploading} />
    </label>
  );
}
