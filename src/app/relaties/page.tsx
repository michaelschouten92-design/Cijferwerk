'use client';

import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, X, Check, Users } from 'lucide-react';

interface Relatie {
  id: number;
  naam: string;
  adres: string | null;
  postcode: string | null;
  plaats: string | null;
  land: string | null;
  telefoon: string | null;
  email: string | null;
  btwNummer: string | null;
  type: string;
}

export default function RelatiesPage() {
  const [relaties, setRelaties] = useState<Relatie[]>([]);
  const [filter, setFilter] = useState<'alle' | 'klant' | 'leverancier'>('alle');
  const [showAdd, setShowAdd] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [zoek, setZoek] = useState('');

  function load() {
    fetch('/api/relaties').then(r => r.json()).then(setRelaties);
  }

  useEffect(() => { load(); }, []);

  const filtered = relaties.filter(r => {
    if (filter !== 'alle' && r.type !== filter && r.type !== 'beide') return false;
    if (zoek && !r.naam.toLowerCase().includes(zoek.toLowerCase())) return false;
    return true;
  });

  const klanten = relaties.filter(r => r.type === 'klant' || r.type === 'beide').length;
  const leveranciers = relaties.filter(r => r.type === 'leverancier' || r.type === 'beide').length;

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Klanten & leveranciers</h2>
          <p className="text-sm text-gray-500 mt-1">{klanten} klant(en), {leveranciers} leverancier(s)</p>
        </div>
        <button onClick={() => setShowAdd(true)}
          className="px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors">
          + Toevoegen
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          {(['alle', 'klant', 'leverancier'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200 ${filter === f ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}>
              {f === 'alle' ? 'Alle' : f === 'klant' ? 'Klanten' : 'Leveranciers'}
            </button>
          ))}
        </div>
        <input type="text" value={zoek} onChange={e => setZoek(e.target.value)}
          placeholder="Zoeken..." className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm w-full sm:w-48" />
      </div>

      {showAdd && (
        <RelatieForm
          onSave={async (data) => {
            await fetch('/api/relaties', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
            setShowAdd(false); load();
          }}
          onCancel={() => setShowAdd(false)}
        />
      )}

      {/* Relaties lijst */}
      <div className="space-y-2">
        {filtered.map(r => editId === r.id ? (
          <RelatieForm
            key={r.id}
            initial={r}
            onSave={async (data) => {
              await fetch('/api/relaties', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: r.id, ...data }) });
              setEditId(null); load();
            }}
            onCancel={() => setEditId(null)}
          />
        ) : (
          <div key={r.id} className="bg-white rounded-xl shadow-card hover:shadow-card-hover transition-shadow p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium text-gray-900">{r.naam}</span>
                <span className={`px-2 py-0.5 rounded-md text-xs ${
                  r.type === 'klant' ? 'bg-green-100 text-green-700' :
                  r.type === 'leverancier' ? 'bg-blue-100 text-blue-700' :
                  'bg-purple-100 text-purple-700'
                }`}>{r.type}</span>
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-sm text-gray-500">
                {r.email && <span>{r.email}</span>}
                {r.telefoon && <span>{r.telefoon}</span>}
                {r.plaats && <span>{r.postcode} {r.plaats}</span>}
                {r.btwNummer && <span className="font-mono text-xs">BTW: {r.btwNummer}</span>}
              </div>
            </div>
            <div className="flex gap-1">
              <button onClick={() => setEditId(r.id)} className="p-2 text-gray-400 hover:text-brand-600 transition-colors">
                <Pencil className="w-4 h-4" />
              </button>
              <DeleteButton onDelete={async () => {
                const res = await fetch(`/api/relaties?id=${r.id}`, { method: 'DELETE' });
                const data = await res.json();
                if (data.error) alert(data.error); else load();
              }} />
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="bg-white rounded-xl shadow-card p-12 text-center text-gray-400">
            <Users className="w-8 h-8 mx-auto mb-2 text-gray-300" />
            {zoek ? 'Geen resultaten gevonden' : 'Nog geen klanten of leveranciers. Voeg je eerste toe met de knop hierboven.'}
          </div>
        )}
      </div>
    </div>
  );
}

function RelatieForm({ initial, onSave, onCancel }: {
  initial?: Relatie;
  onSave: (data: any) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState({
    naam: initial?.naam || '',
    type: initial?.type || 'klant',
    adres: initial?.adres || '',
    postcode: initial?.postcode || '',
    plaats: initial?.plaats || '',
    land: initial?.land || 'NL',
    telefoon: initial?.telefoon || '',
    email: initial?.email || '',
    btwNummer: initial?.btwNummer || '',
  });

  return (
    <div className="bg-white rounded-xl shadow-card p-5 mb-3 animate-fade-in-up">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="sm:col-span-2">
          <label className="block text-xs text-gray-500 mb-1">Naam</label>
          <input value={form.naam} onChange={e => setForm({ ...form, naam: e.target.value })}
            className="w-full px-3 py-1.5 border rounded-lg text-sm" placeholder="Bedrijfsnaam of persoon" />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Type</label>
          <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}
            className="w-full px-3 py-1.5 border rounded-lg text-sm">
            <option value="klant">Klant</option>
            <option value="leverancier">Leverancier</option>
            <option value="beide">Beide</option>
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">E-mail</label>
          <input value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
            className="w-full px-3 py-1.5 border rounded-lg text-sm" placeholder="email@bedrijf.nl" />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Telefoon</label>
          <input value={form.telefoon} onChange={e => setForm({ ...form, telefoon: e.target.value })}
            className="w-full px-3 py-1.5 border rounded-lg text-sm" />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">BTW-nummer</label>
          <input value={form.btwNummer} onChange={e => setForm({ ...form, btwNummer: e.target.value })}
            className="w-full px-3 py-1.5 border rounded-lg text-sm" placeholder="NL123456789B01" />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Adres</label>
          <input value={form.adres} onChange={e => setForm({ ...form, adres: e.target.value })}
            className="w-full px-3 py-1.5 border rounded-lg text-sm" />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Postcode</label>
          <input value={form.postcode} onChange={e => setForm({ ...form, postcode: e.target.value })}
            className="w-full px-3 py-1.5 border rounded-lg text-sm" />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Plaats</label>
          <input value={form.plaats} onChange={e => setForm({ ...form, plaats: e.target.value })}
            className="w-full px-3 py-1.5 border rounded-lg text-sm" />
        </div>
      </div>
      <div className="flex justify-end gap-2 mt-4">
        <button onClick={onCancel} className="px-4 py-2 text-sm text-gray-600">Annuleer</button>
        <button onClick={() => onSave(form)}
          className="px-5 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors">
          Opslaan
        </button>
      </div>
    </div>
  );
}

function DeleteButton({ onDelete }: { onDelete: () => void }) {
  const [confirm, setConfirm] = useState(false);
  if (confirm) return (
    <div className="flex items-center gap-1">
      <button onClick={onDelete} className="text-xs text-red-600 font-medium">Ja</button>
      <button onClick={() => setConfirm(false)} className="text-xs text-gray-400">Nee</button>
    </div>
  );
  return <button onClick={() => setConfirm(true)} className="p-2 text-gray-400 hover:text-red-600 transition-colors"><Trash2 className="w-4 h-4" /></button>;
}
