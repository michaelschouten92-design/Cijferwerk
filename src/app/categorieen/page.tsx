'use client';

import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, X, Check } from 'lucide-react';

interface Categorie {
  id: number;
  code: string;
  naam: string;
  type: string;
  btwTarief: number;
}

interface CategorieRegel {
  id: number;
  zoekterm: string;
  zoekVeld: string;
  categorieCode: string;
  relatieNaam: string | null;
  btwTarief: number | null;
  prioriteit: number;
}

export default function CategorieenPage() {
  const [categorieen, setCategorieen] = useState<Categorie[]>([]);
  const [regels, setRegels] = useState<CategorieRegel[]>([]);
  const [showAddCat, setShowAddCat] = useState(false);
  const [editCat, setEditCat] = useState<number | null>(null);
  const [showAddRegel, setShowAddRegel] = useState(false);
  const [editRegel, setEditRegel] = useState<number | null>(null);

  function loadData() {
    fetch('/api/categories').then(r => r.json()).then(data => {
      setCategorieen(data.categorieen);
      setRegels(data.regels);
    });
  }

  useEffect(() => { loadData(); }, []);

  return (
    <div className="max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Categorieën</h2>

      {/* Categorieën */}
      <div className="bg-white rounded-xl shadow-card p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-semibold text-gray-900">Categorieën</h3>
            <p className="text-sm text-gray-500 mt-1">Groepeer je transacties per soort uitgave of inkomst.</p>
          </div>
          <button onClick={() => setShowAddCat(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-brand-600 bg-brand-50 rounded-lg hover:bg-brand-100">
            <Plus className="w-3.5 h-3.5" /> Toevoegen
          </button>
        </div>

        {showAddCat && (
          <CategorieForm onSave={async (data) => {
            await fetch('/api/categories', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
            setShowAddCat(false); loadData();
          }} onCancel={() => setShowAddCat(false)} />
        )}

        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs font-medium text-gray-500 uppercase border-b">
              <th className="pb-2">Code</th><th className="pb-2">Naam</th><th className="pb-2">Type</th><th className="pb-2">BTW</th><th className="pb-2 w-20"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {categorieen.map(c => editCat === c.id ? (
              <tr key={c.id}><td colSpan={5} className="py-2">
                <CategorieForm initial={c} onSave={async (data) => {
                  await fetch('/api/categories', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: c.id, ...data }) });
                  setEditCat(null); loadData();
                }} onCancel={() => setEditCat(null)} />
              </td></tr>
            ) : (
              <tr key={c.id}>
                <td className="py-2 font-mono text-brand-600">{c.code}</td>
                <td className="py-2">{c.naam}</td>
                <td className="py-2"><span className={`px-2 py-0.5 rounded text-xs ${c.type === 'omzet' ? 'bg-green-100 text-green-700' : c.type === 'kosten' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'}`}>{c.type}</span></td>
                <td className="py-2">{(c.btwTarief * 100).toFixed(0)}%</td>
                <td className="py-2">
                  <div className="flex gap-1">
                    <button onClick={() => setEditCat(c.id)} className="p-1 text-gray-400 hover:text-brand-600"><Pencil className="w-3.5 h-3.5" /></button>
                    <DeleteButton onDelete={async () => {
                      const res = await fetch(`/api/categories?id=${c.id}`, { method: 'DELETE' });
                      const data = await res.json();
                      if (data.error) alert(data.error); else loadData();
                    }} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Automatisch verwerken */}
      <div className="bg-white rounded-xl shadow-card p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-semibold text-gray-900">Automatisch verwerken</h3>
            <p className="text-sm text-gray-500 mt-1">Transacties worden automatisch gecategoriseerd als de naam of omschrijving overeenkomt. Hogere prioriteit wint.</p>
          </div>
          <button onClick={() => setShowAddRegel(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-brand-600 bg-brand-50 rounded-lg hover:bg-brand-100">
            <Plus className="w-3.5 h-3.5" /> Toevoegen
          </button>
        </div>

        {showAddRegel && (
          <RegelForm categorieen={categorieen} onSave={async (data) => {
            await fetch('/api/categories/regels', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
            setShowAddRegel(false); loadData();
          }} onCancel={() => setShowAddRegel(false)} />
        )}

        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs font-medium text-gray-500 uppercase border-b">
              <th className="pb-2">Zoekterm</th><th className="pb-2">Zoekt in</th><th className="pb-2">Categorie</th><th className="pb-2">BTW</th><th className="pb-2">Prio</th><th className="pb-2 w-20"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {regels.map(r => editRegel === r.id ? (
              <tr key={r.id}><td colSpan={6} className="py-2">
                <RegelForm categorieen={categorieen} initial={r} onSave={async (data) => {
                  await fetch('/api/categories/regels', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: r.id, ...data }) });
                  setEditRegel(null); loadData();
                }} onCancel={() => setEditRegel(null)} />
              </td></tr>
            ) : (
              <tr key={r.id}>
                <td className="py-2 font-mono text-brand-600">{r.zoekterm}</td>
                <td className="py-2 text-gray-500">{r.zoekVeld === 'tegenpartij' ? 'Naam' : 'Omschrijving'}</td>
                <td className="py-2"><span className="px-2 py-1 bg-gray-100 rounded text-xs">{categorieen.find(c => c.code === r.categorieCode)?.naam || r.categorieCode}</span></td>
                <td className="py-2">{r.btwTarief !== null ? `${(r.btwTarief * 100).toFixed(0)}%` : 'auto'}</td>
                <td className="py-2 text-gray-400">{r.prioriteit}</td>
                <td className="py-2">
                  <div className="flex gap-1">
                    <button onClick={() => setEditRegel(r.id)} className="p-1 text-gray-400 hover:text-brand-600"><Pencil className="w-3.5 h-3.5" /></button>
                    <DeleteButton onDelete={async () => { await fetch(`/api/categories/regels?id=${r.id}`, { method: 'DELETE' }); loadData(); }} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CategorieForm({ initial, onSave, onCancel }: { initial?: Categorie; onSave: (data: any) => void; onCancel: () => void }) {
  const [form, setForm] = useState({ code: initial?.code || '', naam: initial?.naam || '', type: initial?.type || 'kosten', btwTarief: initial?.btwTarief?.toString() || '0.21' });
  return (
    <div className="flex gap-2 items-end mb-3 p-3 bg-gray-50 rounded-lg">
      <div><label className="block text-xs text-gray-500 mb-1">Code</label><input value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} className="w-20 px-2 py-1.5 border rounded text-sm" placeholder="4500" /></div>
      <div className="flex-1"><label className="block text-xs text-gray-500 mb-1">Naam</label><input value={form.naam} onChange={e => setForm({ ...form, naam: e.target.value })} className="w-full px-2 py-1.5 border rounded text-sm" /></div>
      <div><label className="block text-xs text-gray-500 mb-1">Type</label><select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} className="px-2 py-1.5 border rounded text-sm"><option value="kosten">Kosten</option><option value="omzet">Omzet</option><option value="balans">Balans</option></select></div>
      <div><label className="block text-xs text-gray-500 mb-1">BTW</label><select value={form.btwTarief} onChange={e => setForm({ ...form, btwTarief: e.target.value })} className="px-2 py-1.5 border rounded text-sm"><option value="0.21">21%</option><option value="0.09">9%</option><option value="0">0%</option></select></div>
      <button onClick={() => onSave({ ...form, btwTarief: parseFloat(form.btwTarief) })} className="p-1.5 text-green-600 hover:text-green-700"><Check className="w-4 h-4" /></button>
      <button onClick={onCancel} className="p-1.5 text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
    </div>
  );
}

function RegelForm({ categorieen, initial, onSave, onCancel }: { categorieen: Categorie[]; initial?: CategorieRegel; onSave: (data: any) => void; onCancel: () => void }) {
  const [form, setForm] = useState({
    zoekterm: initial?.zoekterm || '', zoekVeld: initial?.zoekVeld || 'tegenpartij',
    categorieCode: initial?.categorieCode || categorieen[0]?.code || '', relatieNaam: initial?.relatieNaam || '',
    btwTarief: initial?.btwTarief?.toString() || '', prioriteit: initial?.prioriteit?.toString() || '0',
  });
  return (
    <div className="flex gap-2 items-end mb-3 p-3 bg-gray-50 rounded-lg flex-wrap">
      <div><label className="block text-xs text-gray-500 mb-1">Zoekterm</label><input value={form.zoekterm} onChange={e => setForm({ ...form, zoekterm: e.target.value })} className="w-36 px-2 py-1.5 border rounded text-sm" placeholder="bijv. Spotify" /></div>
      <div><label className="block text-xs text-gray-500 mb-1">Zoekt in</label><select value={form.zoekVeld} onChange={e => setForm({ ...form, zoekVeld: e.target.value })} className="px-2 py-1.5 border rounded text-sm"><option value="tegenpartij">Naam</option><option value="omschrijving">Omschrijving</option></select></div>
      <div><label className="block text-xs text-gray-500 mb-1">Categorie</label><select value={form.categorieCode} onChange={e => setForm({ ...form, categorieCode: e.target.value })} className="px-2 py-1.5 border rounded text-sm">{categorieen.map(c => <option key={c.code} value={c.code}>{c.naam}</option>)}</select></div>
      <div><label className="block text-xs text-gray-500 mb-1">BTW</label><select value={form.btwTarief} onChange={e => setForm({ ...form, btwTarief: e.target.value })} className="px-2 py-1.5 border rounded text-sm"><option value="">Auto</option><option value="0.21">21%</option><option value="0.09">9%</option><option value="0">0%</option></select></div>
      <div><label className="block text-xs text-gray-500 mb-1">Prio</label><input type="number" value={form.prioriteit} onChange={e => setForm({ ...form, prioriteit: e.target.value })} className="w-16 px-2 py-1.5 border rounded text-sm" /></div>
      <button onClick={() => onSave({ ...form, btwTarief: form.btwTarief ? parseFloat(form.btwTarief) : null, prioriteit: parseInt(form.prioriteit) || 0, relatieNaam: form.relatieNaam || null })} className="p-1.5 text-green-600 hover:text-green-700"><Check className="w-4 h-4" /></button>
      <button onClick={onCancel} className="p-1.5 text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
    </div>
  );
}

function DeleteButton({ onDelete }: { onDelete: () => void }) {
  const [confirm, setConfirm] = useState(false);
  if (confirm) return (<div className="flex items-center gap-1"><button onClick={onDelete} className="text-xs text-red-600 font-medium">Ja</button><button onClick={() => setConfirm(false)} className="text-xs text-gray-400">Nee</button></div>);
  return <button onClick={() => setConfirm(true)} className="p-1 text-gray-400 hover:text-red-600"><Trash2 className="w-3.5 h-3.5" /></button>;
}
