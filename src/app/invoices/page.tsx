'use client';

import { formatEuro } from '@/lib/format';
import { useEffect, useState } from 'react';
import { FileText, Send, X, CheckCircle, Trash2, RotateCcw, RefreshCw, Link2, Search } from 'lucide-react';

interface Factuur {
  id: number;
  nummer: string;
  datum: string;
  vervaldatum: string;
  status: string;
  relatie: { id: number; naam: string; email?: string };
  regels: { aantal: number; beschrijving: string; stuksprijs: number; btwPercentage: number }[];
  transacties?: { id: number; datum: string; omschrijving: string; bedragExclBtw: number; btwBedrag: number }[];
}

interface Relatie {
  id: number;
  naam: string;
  type: string;
}


function totaal(f: Factuur) {
  return f.regels.reduce((s, r) => s + r.aantal * r.stuksprijs * (1 + r.btwPercentage), 0);
}

function dagenOver(f: Factuur): number {
  return Math.max(0, Math.floor((Date.now() - new Date(f.vervaldatum).getTime()) / 86400000));
}

interface Sjabloon {
  id: number;
  naam: string;
  interval: string;
  volgendeDatum: string;
  actief: boolean;
  relatie: { id: number; naam: string };
  regels: string;
}

export default function FacturenPage() {
  const [facturen, setFacturen] = useState<Factuur[]>([]);
  const [sjablonen, setSjablonen] = useState<Sjabloon[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [showSjabloonForm, setShowSjabloonForm] = useState(false);
  const [sendModal, setSendModal] = useState<Factuur | null>(null);
  const [markeerModal, setMarkeerModal] = useState<Factuur | null>(null);
  const [deleteModal, setDeleteModal] = useState<Factuur | null>(null);
  const [koppelModal, setKoppelModal] = useState<Factuur | null>(null);
  const [zoek, setZoek] = useState('');

  function load() {
    fetch('/api/invoices').then(r => r.json()).then(setFacturen);
    fetch('/api/sjablonen').then(r => r.json()).then(setSjablonen);
  }

  useEffect(() => { load(); }, []);

  async function genereerVanSjabloon(sjabloonId: number) {
    await fetch('/api/sjablonen/genereer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sjabloonId }),
    });
    load();
  }

  async function verwijderSjabloon(id: number) {
    await fetch(`/api/sjablonen?id=${id}`, { method: 'DELETE' });
    load();
  }

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

  const zoekFilter = (f: Factuur) => {
    if (!zoek) return true;
    const z = zoek.toLowerCase();
    return f.nummer.toLowerCase().includes(z) || f.relatie.naam.toLowerCase().includes(z);
  };
  const openstaand = facturen.filter(f => f.status === 'openstaand' && zoekFilter(f));
  const betaald = facturen.filter(f => f.status === 'betaald' && zoekFilter(f));
  const totaalOpenstaand = openstaand.reduce((s, f) => s + totaal(f), 0);
  const actieveSjablonen = sjablonen.filter(s => s.actief);

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Facturen</h2>
          {openstaand.length > 0 && (
            <p className="text-sm text-gray-500 mt-1">
              {openstaand.length} openstaand — {formatEuro(totaalOpenstaand)} te ontvangen
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-2 text-gray-400" />
            <input type="text" value={zoek} onChange={e => setZoek(e.target.value)}
              placeholder="Zoek factuur..." className="pl-9 pr-3 py-1.5 border border-gray-200 rounded-lg text-sm w-44" />
          </div>
          <button onClick={() => setShowSjabloonForm(!showSjabloonForm)}
            className="px-4 py-2 bg-white text-gray-700 shadow-card rounded-lg text-sm font-medium hover:shadow-card-hover transition-shadow">
            + Terugkerend
          </button>
          <button onClick={() => setShowForm(!showForm)}
            className="px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors">
            + Nieuwe factuur
          </button>
        </div>
      </div>

      {showForm && <NewInvoiceForm onSave={() => { setShowForm(false); load(); }} />}

      {/* Terugkerende facturen */}
      {(actieveSjablonen.length > 0 || showSjabloonForm) && (
        <div className="mb-6">
          <h3 className="text-sm font-medium text-gray-500 uppercase mb-3">Terugkerend</h3>

          {showSjabloonForm && <SjabloonForm onSave={() => { setShowSjabloonForm(false); load(); }} onCancel={() => setShowSjabloonForm(false)} />}

          {actieveSjablonen.map(s => {
            const isKlaar = new Date(s.volgendeDatum) <= new Date();
            return (
              <div key={s.id} className={`bg-white rounded-xl border p-4 mb-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${isKlaar ? 'border-blue-300' : 'border-gray-200'}`}>
                <div>
                  <span className="font-medium text-gray-900">{s.naam}</span>
                  <span className="text-gray-400 mx-2">·</span>
                  <span className="text-gray-500 text-sm">{s.relatie.naam}</span>
                  <span className="text-gray-400 mx-2">·</span>
                  <span className="text-xs text-gray-400">{s.interval}</span>
                  {isKlaar && <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">Klaar om aan te maken</span>}
                  {!isKlaar && <span className="ml-2 text-xs text-gray-400">Volgende: {new Date(s.volgendeDatum).toLocaleDateString('nl-NL')}</span>}
                </div>
                <div className="flex items-center gap-2">
                  {isKlaar && (
                    <button onClick={() => genereerVanSjabloon(s.id)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors">
                      <RefreshCw className="w-3.5 h-3.5" /> Factuur aanmaken
                    </button>
                  )}
                  <button onClick={() => verwijderSjabloon(s.id)}
                    className="p-1.5 text-gray-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Openstaand */}
      {openstaand.length > 0 && (
        <div className="mb-8">
          <h3 className="text-sm font-medium text-gray-500 uppercase mb-3">Openstaand</h3>
          <div className="space-y-2">
            {openstaand.map(f => {
              const over = dagenOver(f);
              return (
                <div key={f.id} className={`bg-white rounded-xl shadow-card p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${over > 0 ? 'border-l-4 border-red-400' : ''}`}>
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
                    {f.transacties && f.transacties.length > 0 && (
                      <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs">
                        {f.transacties.length} betaling gekoppeld
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold text-gray-900 mr-1">{formatEuro(totaal(f))}</span>
                    <a href={`/api/invoices/${f.id}/pdf`} target="_blank"
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">
                      <FileText className="w-3.5 h-3.5" /> PDF
                    </a>
                    <button onClick={() => setSendModal(f)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">
                      <Send className="w-3.5 h-3.5" /> Verzend
                    </button>
                    <button onClick={() => setKoppelModal(f)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">
                      <Link2 className="w-3.5 h-3.5" /> Koppel
                    </button>
                    <button onClick={() => setMarkeerModal(f)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs text-green-700 bg-green-50 rounded-lg hover:bg-green-100 transition-colors">
                      <CheckCircle className="w-3.5 h-3.5" /> Betaald
                    </button>
                    <button onClick={() => handleCreditnota(f)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs text-gray-400 hover:text-orange-600 transition-colors">
                      <RotateCcw className="w-3.5 h-3.5" /> Credit
                    </button>
                    <button onClick={() => setDeleteModal(f)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs text-gray-400 hover:text-red-600 transition-colors">
                      <Trash2 className="w-3.5 h-3.5" /> Verwijder
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {openstaand.length === 0 && betaald.length === 0 && (
        <div className="bg-white rounded-xl shadow-card p-12 text-center">
          <FileText className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-400">Nog geen facturen aangemaakt</p>
          <button onClick={() => setShowForm(true)}
            className="mt-3 text-sm text-brand-600 hover:text-brand-800 font-medium">Maak je eerste factuur</button>
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
          <div className="bg-white rounded-xl shadow-card overflow-x-auto opacity-75">
            <table className="w-full min-w-[500px]">
              <thead>
                <tr className="bg-gray-50 text-left text-xs font-medium text-gray-500">
                  <th className="px-4 py-3">Nummer</th>
                  <th className="px-4 py-3">Datum</th>
                  <th className="px-4 py-3">Klant</th>
                  <th className="px-4 py-3 text-right">Bedrag</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
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

      {koppelModal && <KoppelModal factuur={koppelModal} onClose={() => setKoppelModal(null)} onSave={load} />}
      {sendModal && <SendInvoiceModal factuur={sendModal} onClose={() => setSendModal(null)} />}
      {markeerModal && <MarkeerBetaaldModal factuur={markeerModal} onClose={() => setMarkeerModal(null)} onSave={load} />}
      {deleteModal && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setDeleteModal(null)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm mx-4 p-6 animate-fade-in-up" onClick={e => e.stopPropagation()}>
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
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm mx-4 p-6 animate-fade-in-up" onClick={e => e.stopPropagation()}>
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
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6 animate-fade-in-up" onClick={e => e.stopPropagation()}>
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
    <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-card p-6 mb-6 animate-fade-in-up">
      <h3 className="font-semibold mb-4">Nieuwe factuur</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        <div>
          <label className="block text-sm text-gray-600 mb-1">Factuur #</label>
          <input type="text" value={form.nummer} readOnly
            className="w-full px-3 py-2 border rounded-lg text-sm bg-gray-100 text-gray-500 cursor-not-allowed" />
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

function SjabloonForm({ onSave, onCancel }: { onSave: () => void; onCancel: () => void }) {
  const [relaties, setRelaties] = useState<Relatie[]>([]);
  const [form, setForm] = useState({
    naam: '',
    relatieId: '',
    interval: 'maandelijks',
    volgendeDatum: new Date().toISOString().split('T')[0],
    regels: [{ aantal: 1, beschrijving: '', stuksprijs: 0, btwPercentage: 0.21 }],
  });

  useEffect(() => {
    fetch('/api/relaties').then(r => r.json()).then(setRelaties);
  }, []);

  function updateRegel(i: number, field: string, value: any) {
    const regels = [...form.regels];
    (regels[i] as any)[field] = value;
    setForm({ ...form, regels });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await fetch('/api/sjablonen', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, relatieId: parseInt(form.relatieId) }),
    });
    onSave();
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-card p-5 mb-3 animate-fade-in-up">
      <h4 className="font-semibold text-gray-900 mb-3">Nieuw sjabloon</h4>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Naam</label>
          <input value={form.naam} onChange={e => setForm({ ...form, naam: e.target.value })}
            className="w-full px-3 py-1.5 border rounded text-sm" placeholder="bijv. Hosting" required />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Klant</label>
          <select value={form.relatieId} onChange={e => setForm({ ...form, relatieId: e.target.value })}
            className="w-full px-3 py-1.5 border rounded text-sm" required>
            <option value="">Selecteer</option>
            {relaties.filter(r => r.type === 'klant' || r.type === 'beide').map(r => (
              <option key={r.id} value={r.id}>{r.naam}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Interval</label>
          <select value={form.interval} onChange={e => setForm({ ...form, interval: e.target.value })}
            className="w-full px-3 py-1.5 border rounded text-sm">
            <option value="maandelijks">Maandelijks</option>
            <option value="kwartaal">Per kwartaal</option>
            <option value="jaarlijks">Jaarlijks</option>
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Eerste factuur</label>
          <input type="date" value={form.volgendeDatum} onChange={e => setForm({ ...form, volgendeDatum: e.target.value })}
            className="w-full px-3 py-1.5 border rounded text-sm" required />
        </div>
      </div>

      <label className="block text-xs text-gray-500 mb-1">Factuurregels</label>
      {form.regels.map((r, i) => (
        <div key={i} className="grid grid-cols-12 gap-2 mb-2">
          <input type="number" value={r.aantal} onChange={e => updateRegel(i, 'aantal', parseInt(e.target.value) || 1)}
            className="col-span-1 px-2 py-1.5 border rounded text-sm text-center" />
          <input value={r.beschrijving} onChange={e => updateRegel(i, 'beschrijving', e.target.value)}
            className="col-span-5 px-2 py-1.5 border rounded text-sm" placeholder="Omschrijving" />
          <input type="number" step="0.01" value={r.stuksprijs || ''} onChange={e => updateRegel(i, 'stuksprijs', parseFloat(e.target.value) || 0)}
            className="col-span-3 px-2 py-1.5 border rounded text-sm" placeholder="Prijs" />
          <select value={r.btwPercentage} onChange={e => updateRegel(i, 'btwPercentage', parseFloat(e.target.value))}
            className="col-span-3 px-2 py-1.5 border rounded text-sm">
            <option value={0.21}>21%</option>
            <option value={0.09}>9%</option>
            <option value={0}>0%</option>
          </select>
        </div>
      ))}
      <button type="button" onClick={() => setForm({ ...form, regels: [...form.regels, { aantal: 1, beschrijving: '', stuksprijs: 0, btwPercentage: 0.21 }] })}
        className="text-blue-600 text-sm hover:text-blue-800 mb-3">+ Regel</button>

      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="px-4 py-1.5 text-sm text-gray-600">Annuleer</button>
        <button type="submit" className="px-5 py-1.5 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors">Opslaan</button>
      </div>
    </form>
  );
}

function KoppelModal({ factuur, onClose, onSave }: { factuur: Factuur; onClose: () => void; onSave: () => void }) {
  const [transacties, setTransacties] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/transactions?jaar=${new Date().getFullYear()}`).then(r => r.json()).then(data => {
      // Toon alleen ongekoppelde transacties
      setTransacties(data.filter((t: any) => !t.factuurId));
      setLoading(false);
    });
  }, []);

  async function koppel(transactieId: number) {
    await fetch('/api/transactions', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: transactieId, factuurId: factuur.id }),
    });
    // Factuur als betaald markeren
    await fetch('/api/invoices', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: factuur.id, status: 'betaald' }),
    });
    onSave();
    onClose();
  }

  const factuurTotaal = totaal(factuur);

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 p-6 max-h-[80vh] flex flex-col animate-fade-in-up" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-semibold text-gray-900">Koppel betaling aan factuur {factuur.nummer}</h3>
            <p className="text-sm text-gray-500">Factuurbedrag: {formatEuro(factuurTotaal)}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>

        <div className="overflow-y-auto flex-1 space-y-2">
          {loading && <p className="text-gray-400 text-sm py-4 text-center">Laden...</p>}
          {!loading && transacties.length === 0 && (
            <p className="text-gray-400 text-sm py-4 text-center">Geen ongekoppelde transacties gevonden</p>
          )}
          {transacties.map((t: any) => {
            const bedrag = t.bedragExclBtw + t.btwBedrag;
            const match = Math.abs(bedrag - factuurTotaal) < 0.05;
            return (
              <button key={t.id} onClick={() => koppel(t.id)}
                className={`w-full text-left p-3 rounded-lg border transition-colors ${match ? 'border-green-300 bg-green-50 hover:bg-green-100' : 'border-gray-200 hover:bg-gray-50'}`}>
                <div className="flex justify-between items-center">
                  <div>
                    <span className="text-sm font-medium text-gray-900">{t.omschrijving}</span>
                    <span className="text-xs text-gray-400 ml-2">{new Date(t.datum).toLocaleDateString('nl-NL')}</span>
                  </div>
                  <span className={`font-medium ${t.richting === 'verkoop' ? 'text-green-600' : 'text-red-600'}`}>
                    {t.richting === 'verkoop' ? '+' : '-'}{formatEuro(bedrag)}
                  </span>
                </div>
                {match && <span className="text-xs text-green-600 mt-1 block">Bedrag komt overeen</span>}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
