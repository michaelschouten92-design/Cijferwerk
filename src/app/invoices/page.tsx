'use client';

import { useEffect, useState } from 'react';
import { FileText, Send, X, CheckCircle, Trash2, RotateCcw } from 'lucide-react';

interface Factuur {
  id: number;
  nummer: string;
  datum: string;
  vervaldatum: string;
  status: string;
  relatie: { id: number; naam: string; email?: string };
  regels: { aantal: number; beschrijving: string; stuksprijs: number; btwPercentage: number }[];
}

interface Relatie {
  id: number;
  naam: string;
  type: string;
}

function formatEuro(n: number) {
  return new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(n);
}

function totaal(f: Factuur) {
  return f.regels.reduce((s, r) => s + r.aantal * r.stuksprijs * (1 + r.btwPercentage), 0);
}

function dagenOver(f: Factuur): number {
  return Math.max(0, Math.floor((Date.now() - new Date(f.vervaldatum).getTime()) / 86400000));
}

export default function FacturenPage() {
  const [facturen, setFacturen] = useState<Factuur[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [sendModal, setSendModal] = useState<Factuur | null>(null);
  const [markeerModal, setMarkeerModal] = useState<Factuur | null>(null);
  const [deleteModal, setDeleteModal] = useState<Factuur | null>(null);

  function load() {
    fetch('/api/invoices').then(r => r.json()).then(setFacturen);
  }

  useEffect(() => { load(); }, []);

  async function handleCreditnota(f: Factuur) {
    if (!confirm(`Creditnota aanmaken voor factuur ${f.nummer}?\n\nDit maakt een nieuwe factuur aan met negatieve bedragen.`)) return;
    const creditNummer = `C-${f.nummer}`;
    await fetch('/api/invoices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nummer: creditNummer,
        datum: new Date().toISOString().split('T')[0],
        vervaldatum: new Date().toISOString().split('T')[0],
        relatieId: f.relatie.id,
        regels: f.regels.map(r => ({
          aantal: r.aantal,
          beschrijving: `CREDIT: ${r.beschrijving}`,
          stuksprijs: -r.stuksprijs,
          btwPercentage: r.btwPercentage,
        })),
      }),
    });
    // Originele factuur als betaald markeren
    await fetch('/api/invoices', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: f.id, status: 'betaald' }),
    });
    load();
  }

  async function handleDelete(id: number) {
    await fetch(`/api/invoices?id=${id}`, { method: 'DELETE' });
    setDeleteModal(null);
    load();
  }

  const openstaand = facturen.filter(f => f.status === 'openstaand');
  const betaald = facturen.filter(f => f.status === 'betaald');
  const totaalOpenstaand = openstaand.reduce((s, f) => s + totaal(f), 0);

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Facturen</h2>
          {openstaand.length > 0 && (
            <p className="text-sm text-gray-500 mt-1">
              {openstaand.length} openstaand — {formatEuro(totaalOpenstaand)} te ontvangen
            </p>
          )}
        </div>
        <button onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
          + Nieuwe factuur
        </button>
      </div>

      {showForm && <NewInvoiceForm onSave={() => { setShowForm(false); load(); }} />}

      {/* Openstaand */}
      {openstaand.length > 0 && (
        <div className="mb-8">
          <h3 className="text-sm font-medium text-gray-500 uppercase mb-3">Openstaand</h3>
          <div className="space-y-2">
            {openstaand.map(f => {
              const over = dagenOver(f);
              return (
                <div key={f.id} className={`bg-white rounded-xl border p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${over > 0 ? 'border-red-200' : 'border-gray-200'}`}>
                  <div className="flex flex-wrap items-center gap-2 sm:gap-4">
                    <div>
                      <span className="font-medium text-gray-900">{f.nummer}</span>
                      <span className="text-gray-400 mx-2">·</span>
                      <span className="text-gray-600">{f.relatie.naam}</span>
                    </div>
                    {over > 0 && (
                      <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded text-xs font-medium">
                        {over} dagen te laat
                      </span>
                    )}
                    {over === 0 && (
                      <span className="text-xs text-gray-400">
                        Betaal vóór {new Date(f.vervaldatum).toLocaleDateString('nl-NL')}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-gray-900">{formatEuro(totaal(f))}</span>
                    <a href={`/api/invoices/${f.id}/pdf`} target="_blank"
                      className="p-2 text-gray-400 hover:text-blue-600 transition-colors" title="PDF bekijken">
                      <FileText className="w-4 h-4" />
                    </a>
                    <button onClick={() => setSendModal(f)}
                      className="p-2 text-gray-400 hover:text-green-600 transition-colors" title="Verzenden">
                      <Send className="w-4 h-4" />
                    </button>
                    <button onClick={() => setMarkeerModal(f)}
                      className="px-3 py-1.5 text-sm text-green-700 bg-green-50 rounded-lg hover:bg-green-100 transition-colors">
                      Betaald
                    </button>
                    <button onClick={() => handleCreditnota(f)}
                      className="p-2 text-gray-400 hover:text-orange-600 transition-colors" title="Creditnota aanmaken">
                      <RotateCcw className="w-4 h-4" />
                    </button>
                    <button onClick={() => setDeleteModal(f)}
                      className="p-2 text-gray-400 hover:text-red-600 transition-colors" title="Verwijderen">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {openstaand.length === 0 && betaald.length === 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <p className="text-gray-400">Nog geen facturen aangemaakt</p>
          <button onClick={() => setShowForm(true)}
            className="mt-3 text-sm text-blue-600 hover:text-blue-800">Maak je eerste factuur</button>
        </div>
      )}

      {openstaand.length === 0 && betaald.length > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center mb-8">
          <CheckCircle className="w-6 h-6 text-green-500 mx-auto mb-2" />
          <p className="font-medium text-green-800">Alle facturen zijn betaald</p>
        </div>
      )}

      {/* Betaald */}
      {betaald.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-gray-500 uppercase mb-3">Betaald</h3>
          <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
            <table className="w-full min-w-[500px]">
              <thead>
                <tr className="bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase">
                  <th className="px-4 py-3">Nummer</th>
                  <th className="px-4 py-3">Datum</th>
                  <th className="px-4 py-3">Klant</th>
                  <th className="px-4 py-3 text-right">Bedrag</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {betaald.map(f => (
                  <tr key={f.id} className="text-sm text-gray-500">
                    <td className="px-4 py-3">{f.nummer}</td>
                    <td className="px-4 py-3">{new Date(f.datum).toLocaleDateString('nl-NL')}</td>
                    <td className="px-4 py-3">{f.relatie.naam}</td>
                    <td className="px-4 py-3 text-right">{formatEuro(totaal(f))}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                      <a href={`/api/invoices/${f.id}/pdf`} target="_blank"
                        className="text-blue-600 hover:text-blue-800 text-sm">PDF</a>
                      <button onClick={() => handleCreditnota(f)}
                        className="text-orange-500 hover:text-orange-700 text-sm">Credit</button>
                      <button onClick={() => setDeleteModal(f)}
                        className="text-gray-400 hover:text-red-600"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {sendModal && <SendInvoiceModal factuur={sendModal} onClose={() => setSendModal(null)} />}
      {markeerModal && <MarkeerBetaaldModal factuur={markeerModal} onClose={() => setMarkeerModal(null)} onSave={load} />}
      {deleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setDeleteModal(null)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm mx-4 p-6" onClick={e => e.stopPropagation()}>
            <h3 className="font-semibold text-gray-900 mb-3">Factuur {deleteModal.nummer} verwijderen?</h3>
            <p className="text-sm text-gray-500 mb-4">
              Dit verwijdert de factuur permanent. Overweeg een creditnota als de factuur al verstuurd is.
            </p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setDeleteModal(null)} className="px-4 py-2 text-sm text-gray-600">Annuleer</button>
              <button onClick={() => handleDelete(deleteModal.id)}
                className="px-5 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700">
                Verwijderen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MarkeerBetaaldModal({ factuur, onClose, onSave }: { factuur: Factuur; onClose: () => void; onSave: () => void }) {
  const [saving, setSaving] = useState(false);

  async function handleMarkeer() {
    setSaving(true);
    await fetch('/api/invoices', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: factuur.id, status: 'betaald' }),
    });
    setSaving(false);
    onSave();
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm mx-4 p-6" onClick={e => e.stopPropagation()}>
        <h3 className="font-semibold text-gray-900 mb-3">Factuur {factuur.nummer} als betaald markeren?</h3>
        <p className="text-sm text-gray-500 mb-4">
          {factuur.relatie.naam} — {formatEuro(totaal(factuur))}
        </p>
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600">Annuleer</button>
          <button onClick={handleMarkeer} disabled={saving}
            className="px-5 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50">
            {saving ? 'Opslaan...' : 'Markeer als betaald'}
          </button>
        </div>
      </div>
    </div>
  );
}

function SendInvoiceModal({ factuur, onClose }: { factuur: Factuur; onClose: () => void }) {
  const [to, setTo] = useState(factuur.relatie.email || '');
  const [bericht, setBericht] = useState('');
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message?: string; error?: string } | null>(null);

  async function handleSend() {
    setSending(true);
    setResult(null);
    try {
      const res = await fetch(`/api/invoices/${factuur.id}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to, bericht: bericht || undefined }),
      });
      const data = await res.json();
      setResult(data);
      if (data.success) setTimeout(onClose, 2000);
    } catch (e: any) {
      setResult({ success: false, error: e.message });
    }
    setSending(false);
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900">Factuur {factuur.nummer} verzenden</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="block text-sm text-gray-600 mb-1">Aan</label>
            <input type="email" value={to} onChange={e => setTo(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="klant@email.nl" required />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Bericht (optioneel)</label>
            <textarea value={bericht} onChange={e => setBericht(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg text-sm h-20 resize-none" />
          </div>
        </div>
        {result && (
          <div className={`mt-3 p-3 rounded-lg text-sm ${result.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
            {result.success ? result.message : result.error}
          </div>
        )}
        <div className="flex justify-end gap-2 mt-4">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600">Annuleer</button>
          <button onClick={handleSend} disabled={sending || !to}
            className="inline-flex items-center gap-2 px-5 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50">
            <Send className="w-4 h-4" /> {sending ? 'Verzenden...' : 'Verzend'}
          </button>
        </div>
      </div>
    </div>
  );
}

function NewInvoiceForm({ onSave }: { onSave: () => void }) {
  const [form, setForm] = useState({
    nummer: '',
    datum: new Date().toISOString().split('T')[0],
    vervaldatum: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
    relatieId: '',
    regels: [{ aantal: 1, beschrijving: '', stuksprijs: 0, btwPercentage: 0.21 }],
  });
  const [relaties, setRelaties] = useState<Relatie[]>([]);

  useEffect(() => {
    // Auto factuurnummer ophogen
    fetch('/api/invoices').then(r => r.json()).then((facturen: Factuur[]) => {
      const jaar = new Date().getFullYear();
      const prefix = `${jaar}-`;
      const bestaande = facturen
        .filter((f: Factuur) => f.nummer.startsWith(prefix))
        .map((f: Factuur) => parseInt(f.nummer.replace(prefix, '')) || 0);
      const volgende = bestaande.length > 0 ? Math.max(...bestaande) + 1 : 1;
      setForm(prev => ({ ...prev, nummer: `${prefix}${String(volgende).padStart(2, '0')}` }));
    });
    fetch('/api/relaties').then(r => r.json()).then(setRelaties);
  }, []);

  function addRegel() {
    setForm({ ...form, regels: [...form.regels, { aantal: 1, beschrijving: '', stuksprijs: 0, btwPercentage: 0.21 }] });
  }

  function removeRegel(i: number) {
    if (form.regels.length <= 1) return;
    setForm({ ...form, regels: form.regels.filter((_, idx) => idx !== i) });
  }

  function updateRegel(i: number, field: string, value: any) {
    const regels = [...form.regels];
    (regels[i] as any)[field] = value;
    setForm({ ...form, regels });
  }

  const subtotaal = form.regels.reduce((s, r) => s + r.aantal * (r.stuksprijs || 0), 0);
  const btwTotaal = form.regels.reduce((s, r) => s + r.aantal * (r.stuksprijs || 0) * r.btwPercentage, 0);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await fetch('/api/invoices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, relatieId: parseInt(form.relatieId) }),
    });
    onSave();
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
      <h3 className="font-semibold mb-4">Nieuwe factuur</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        <div>
          <label className="block text-sm text-gray-600 mb-1">Factuur #</label>
          <input type="text" value={form.nummer} onChange={e => setForm({ ...form, nummer: e.target.value })}
            className="w-full px-3 py-2 border rounded-lg text-sm bg-gray-50" required />
        </div>
        <div>
          <label className="block text-sm text-gray-600 mb-1">Datum</label>
          <input type="date" value={form.datum} onChange={e => setForm({ ...form, datum: e.target.value })}
            className="w-full px-3 py-2 border rounded-lg text-sm" required />
        </div>
        <div>
          <label className="block text-sm text-gray-600 mb-1">Betaal vóór</label>
          <input type="date" value={form.vervaldatum} onChange={e => setForm({ ...form, vervaldatum: e.target.value })}
            className="w-full px-3 py-2 border rounded-lg text-sm" required />
        </div>
        <div>
          <label className="block text-sm text-gray-600 mb-1">Klant</label>
          <select value={form.relatieId} onChange={e => setForm({ ...form, relatieId: e.target.value })}
            className="w-full px-3 py-2 border rounded-lg text-sm" required>
            <option value="">Selecteer klant</option>
            {relaties.filter(r => r.type === 'klant' || r.type === 'beide').map(r => (
              <option key={r.id} value={r.id}>{r.naam}</option>
            ))}
          </select>
        </div>
      </div>

      <h4 className="text-sm font-medium text-gray-700 mb-2">Regels</h4>
      {form.regels.map((r, i) => (
        <div key={i} className="grid grid-cols-12 gap-2 mb-2 items-center">
          <input type="number" value={r.aantal} onChange={e => updateRegel(i, 'aantal', parseInt(e.target.value) || 1)}
            className="col-span-1 px-2 py-2 border rounded-lg text-sm text-center" placeholder="#" />
          <input type="text" value={r.beschrijving} onChange={e => updateRegel(i, 'beschrijving', e.target.value)}
            className="col-span-5 px-3 py-2 border rounded-lg text-sm" placeholder="Omschrijving" />
          <input type="number" step="0.01" value={r.stuksprijs || ''} onChange={e => updateRegel(i, 'stuksprijs', parseFloat(e.target.value) || 0)}
            className="col-span-2 px-3 py-2 border rounded-lg text-sm" placeholder="Prijs" />
          <select value={r.btwPercentage} onChange={e => updateRegel(i, 'btwPercentage', parseFloat(e.target.value))}
            className="col-span-2 px-2 py-2 border rounded-lg text-sm">
            <option value={0.21}>21%</option>
            <option value={0.09}>9%</option>
            <option value={0}>0%</option>
          </select>
          <div className="col-span-1 text-right text-sm text-gray-500">
            {formatEuro(r.aantal * (r.stuksprijs || 0))}
          </div>
          <button type="button" onClick={() => removeRegel(i)}
            className="col-span-1 text-gray-300 hover:text-red-500 text-center">
            <X className="w-4 h-4 mx-auto" />
          </button>
        </div>
      ))}

      <div className="flex items-center justify-between mt-4">
        <button type="button" onClick={addRegel} className="text-blue-600 text-sm hover:text-blue-800">+ Regel toevoegen</button>
        <div className="text-right text-sm space-y-1">
          <div className="text-gray-500">Subtotaal: {formatEuro(subtotaal)}</div>
          <div className="text-gray-500">BTW: {formatEuro(btwTotaal)}</div>
          <div className="font-bold text-gray-900 text-base">Totaal: {formatEuro(subtotaal + btwTotaal)}</div>
        </div>
      </div>

      <div className="flex justify-end mt-4 pt-4 border-t">
        <button type="submit"
          className="px-6 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700">
          Factuur aanmaken
        </button>
      </div>
    </form>
  );
}
