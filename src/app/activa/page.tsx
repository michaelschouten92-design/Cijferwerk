'use client';

import { formatEuro } from '@/lib/format';
import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, X, Check } from 'lucide-react';

interface Actief {
  id: number;
  naam: string;
  aanschafDatum: string;
  aanschafWaarde: number;
  restwaarde: number;
  levensduurJaren: number;
  notitie: string | null;
  jaarAfschrijving: number;
  totaalAfgeschreven: number;
  boekwaarde: number;
}


export default function ActivaPage() {
  const [activa, setActiva] = useState<Actief[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);

  function loadData() {
    fetch('/api/activa').then(r => r.json()).then(setActiva);
  }

  useEffect(() => { loadData(); }, []);

  const totaalBoekwaarde = activa.reduce((s, a) => s + a.boekwaarde, 0);
  const totaalJaarAfschrijving = activa.reduce((s, a) => s + a.jaarAfschrijving, 0);

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Vaste Activa</h2>
          <p className="text-sm text-gray-500">Bedrijfsmiddelen en afschrijvingen</p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-brand-600 rounded-lg hover:bg-brand-700 transition-colors"
        >
          <Plus className="w-4 h-4" /> Toevoegen
        </button>
      </div>

      {/* Samenvatting */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow-card p-5">
          <p className="text-sm text-gray-500">Totale boekwaarde</p>
          <p className="text-xl font-bold text-gray-900 mt-1">{formatEuro(totaalBoekwaarde)}</p>
        </div>
        <div className="bg-white rounded-xl shadow-card p-5">
          <p className="text-sm text-gray-500">Jaarlijkse afschrijving</p>
          <p className="text-xl font-bold text-red-600 mt-1">{formatEuro(totaalJaarAfschrijving)}</p>
        </div>
      </div>

      {showAdd && (
        <ActivaForm
          onSave={async (data) => {
            await fetch('/api/activa', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(data),
            });
            setShowAdd(false);
            loadData();
          }}
          onCancel={() => setShowAdd(false)}
        />
      )}

      {/* Activa lijst */}
      <div className="bg-white rounded-xl shadow-card overflow-x-auto">
        <table className="w-full text-sm min-w-[700px]">
          <thead>
            <tr className="bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase">
              <th className="px-4 py-3">Naam</th>
              <th className="px-4 py-3">Aanschafdatum</th>
              <th className="px-4 py-3 text-right">Aanschafwaarde</th>
              <th className="px-4 py-3 text-right">Afschr./jaar</th>
              <th className="px-4 py-3 text-right">Boekwaarde</th>
              <th className="px-4 py-3 text-center">Levensduur</th>
              <th className="px-4 py-3 w-20"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {activa.map(a => (
              editId === a.id ? (
                <tr key={a.id}>
                  <td colSpan={7} className="p-2">
                    <ActivaForm
                      initial={a}
                      onSave={async (data) => {
                        await fetch('/api/activa', {
                          method: 'PUT',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ id: a.id, ...data }),
                        });
                        setEditId(null);
                        loadData();
                      }}
                      onCancel={() => setEditId(null)}
                    />
                  </td>
                </tr>
              ) : (
                <tr key={a.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <span className="font-medium text-gray-900">{a.naam}</span>
                    {a.notitie && <p className="text-xs text-gray-400 mt-0.5">{a.notitie}</p>}
                  </td>
                  <td className="px-4 py-3 text-gray-500">{new Date(a.aanschafDatum).toLocaleDateString('nl-NL')}</td>
                  <td className="px-4 py-3 text-right">{formatEuro(a.aanschafWaarde)}</td>
                  <td className="px-4 py-3 text-right text-red-600">{formatEuro(a.jaarAfschrijving)}</td>
                  <td className="px-4 py-3 text-right font-medium">{formatEuro(a.boekwaarde)}</td>
                  <td className="px-4 py-3 text-center text-gray-500">{a.levensduurJaren} jr</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <button onClick={() => setEditId(a.id)} className="p-1 text-gray-400 hover:text-brand-600">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <DeleteButton onDelete={async () => {
                        await fetch(`/api/activa?id=${a.id}`, { method: 'DELETE' });
                        loadData();
                      }} />
                    </div>
                  </td>
                </tr>
              )
            ))}
            {activa.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">Geen vaste activa geregistreerd</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ActivaForm({ initial, onSave, onCancel }: {
  initial?: Actief;
  onSave: (data: any) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState({
    naam: initial?.naam || '',
    aanschafDatum: initial?.aanschafDatum ? initial.aanschafDatum.split('T')[0] : new Date().toISOString().split('T')[0],
    aanschafWaarde: initial?.aanschafWaarde?.toString() || '',
    restwaarde: initial?.restwaarde?.toString() || '0',
    levensduurJaren: initial?.levensduurJaren?.toString() || '5',
    notitie: initial?.notitie || '',
  });

  return (
    <div className="bg-gray-50 rounded-lg p-4 mb-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="col-span-2">
          <label className="block text-xs text-gray-500 mb-1">Naam</label>
          <input value={form.naam} onChange={e => setForm({ ...form, naam: e.target.value })}
            className="w-full px-3 py-1.5 border rounded text-sm" placeholder="bijv. MacBook Pro" />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Aanschafdatum</label>
          <input type="date" value={form.aanschafDatum} onChange={e => setForm({ ...form, aanschafDatum: e.target.value })}
            className="w-full px-3 py-1.5 border rounded text-sm" />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Aanschafwaarde (excl. BTW)</label>
          <input type="number" step="0.01" value={form.aanschafWaarde} onChange={e => setForm({ ...form, aanschafWaarde: e.target.value })}
            className="w-full px-3 py-1.5 border rounded text-sm" />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Restwaarde</label>
          <input type="number" step="0.01" value={form.restwaarde} onChange={e => setForm({ ...form, restwaarde: e.target.value })}
            className="w-full px-3 py-1.5 border rounded text-sm" />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Levensduur (jaren)</label>
          <input type="number" min="1" value={form.levensduurJaren} onChange={e => setForm({ ...form, levensduurJaren: e.target.value })}
            className="w-full px-3 py-1.5 border rounded text-sm" />
        </div>
        <div className="col-span-2">
          <label className="block text-xs text-gray-500 mb-1">Notitie (optioneel)</label>
          <input value={form.notitie} onChange={e => setForm({ ...form, notitie: e.target.value })}
            className="w-full px-3 py-1.5 border rounded text-sm" placeholder="bijv. serienummer" />
        </div>
        <div className="flex items-end gap-2">
          <button onClick={() => onSave({
            ...form,
            aanschafWaarde: parseFloat(form.aanschafWaarde) || 0,
            restwaarde: parseFloat(form.restwaarde) || 0,
            levensduurJaren: parseInt(form.levensduurJaren) || 5,
            notitie: form.notitie || null,
          })} className="p-1.5 text-green-600 hover:text-green-700"><Check className="w-5 h-5" /></button>
          <button onClick={onCancel} className="p-1.5 text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>
      </div>
    </div>
  );
}

function DeleteButton({ onDelete }: { onDelete: () => void }) {
  const [confirm, setConfirm] = useState(false);
  if (confirm) {
    return (
      <div className="flex items-center gap-1">
        <button onClick={onDelete} className="text-xs text-red-600 font-medium">Ja</button>
        <button onClick={() => setConfirm(false)} className="text-xs text-gray-400">Nee</button>
      </div>
    );
  }
  return (
    <button onClick={() => setConfirm(true)} className="p-1 text-gray-400 hover:text-red-600">
      <Trash2 className="w-3.5 h-3.5" />
    </button>
  );
}
