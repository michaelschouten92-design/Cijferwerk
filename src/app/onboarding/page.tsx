'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Upload, CheckCircle } from 'lucide-react';

export default function OnboardingPage() {
  const router = useRouter();
  const [stap, setStap] = useState(0);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    bedrijfNaam: '', bedrijfContact: '', bedrijfAdres: '', bedrijfPostcode: '',
    bedrijfKvk: '', bedrijfBtw: '', bedrijfIban: '', bedrijfEmail: '', bedrijfTelefoon: '',
    factuurLogo: null as string | null,
  });
  const [importResult, setImportResult] = useState<{ nieuw: number; overgeslagen: number } | null>(null);

  function handleLogo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setForm({ ...form, factuurLogo: reader.result as string });
    reader.readAsDataURL(file);
  }

  async function saveBedrijf() {
    setSaving(true);
    await fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    setSaving(false);
    setStap(2);
  }

  async function handleCSV(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch('/api/import', { method: 'POST', body: formData });
    const data = await res.json();
    if (data.success) setImportResult({ nieuw: data.nieuw, overgeslagen: data.overgeslagen });
  }

  async function finish() {
    router.push('/');
  }

  // Welkomstscherm
  if (stap === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-lg w-full text-center">
          <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <span className="text-white font-bold text-2xl">C</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-3">Welkom bij Cijferwerk</h1>
          <p className="text-gray-500 mb-2">De simpelste manier om je boekhouding bij te houden.</p>
          <ul className="text-left text-sm text-gray-600 space-y-2 my-8 max-w-xs mx-auto">
            <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-green-500 mt-0.5 shrink-0" /> Importeer transacties vanuit je bank</li>
            <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-green-500 mt-0.5 shrink-0" /> Maak en verstuur professionele facturen</li>
            <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-green-500 mt-0.5 shrink-0" /> BTW-aangifte automatisch berekend</li>
            <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-green-500 mt-0.5 shrink-0" /> Jaarafsluiting voor je boekhouder</li>
          </ul>
          <button onClick={() => setStap(1)}
            className="inline-flex items-center gap-2 px-8 py-3 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors">
            Aan de slag <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  // Stap 1: Bedrijfsgegevens
  if (stap === 1) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-lg w-full">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">1</div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Je bedrijfsgegevens</h2>
              <p className="text-sm text-gray-500">Deze verschijnen op je facturen</p>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="col-span-2">
                <label className="block text-xs text-gray-500 mb-1">Bedrijfsnaam *</label>
                <input value={form.bedrijfNaam} onChange={e => setForm({ ...form, bedrijfNaam: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="Jouw Bedrijf" autoFocus />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Contactpersoon</label>
                <input value={form.bedrijfContact} onChange={e => setForm({ ...form, bedrijfContact: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">E-mail</label>
                <input value={form.bedrijfEmail} onChange={e => setForm({ ...form, bedrijfEmail: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Adres</label>
                <input value={form.bedrijfAdres} onChange={e => setForm({ ...form, bedrijfAdres: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Postcode + plaats</label>
                <input value={form.bedrijfPostcode} onChange={e => setForm({ ...form, bedrijfPostcode: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">KVK-nummer</label>
                <input value={form.bedrijfKvk} onChange={e => setForm({ ...form, bedrijfKvk: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">BTW-nummer</label>
                <input value={form.bedrijfBtw} onChange={e => setForm({ ...form, bedrijfBtw: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm" />
              </div>
              <div className="col-span-2">
                <label className="block text-xs text-gray-500 mb-1">IBAN</label>
                <input value={form.bedrijfIban} onChange={e => setForm({ ...form, bedrijfIban: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm" />
              </div>
            </div>

            <div className="border-t pt-4 mt-2">
              <label className="block text-xs text-gray-500 mb-2">Logo (optioneel)</label>
              <div className="flex items-center gap-3">
                {form.factuurLogo && <img src={form.factuurLogo} alt="Logo" className="h-10 max-w-[120px] object-contain border rounded-lg p-1" />}
                <label className="cursor-pointer px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200">
                  {form.factuurLogo ? 'Wijzigen' : 'Upload logo'}
                  <input type="file" accept="image/*" onChange={handleLogo} className="hidden" />
                </label>
              </div>
            </div>
          </div>

          <div className="flex justify-end mt-4">
            <button onClick={saveBedrijf} disabled={!form.bedrijfNaam || saving}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors">
              {saving ? 'Opslaan...' : 'Volgende'} <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Stap 2: CSV importeren
  if (stap === 2) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-lg w-full">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">2</div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Transacties importeren</h2>
              <p className="text-sm text-gray-500">Exporteer een CSV vanuit je bank</p>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="bg-blue-50 rounded-lg p-4 text-sm text-blue-800 mb-4">
              <p className="font-medium mb-1">Ondersteunde banken:</p>
              <p className="text-blue-700">Revolut, ING, Rabobank, ABN AMRO, Bunq en andere banken die CSV exporteren.</p>
              <p className="text-blue-600 text-xs mt-2">Ga naar je bank → Transactie-overzicht → Export → CSV</p>
            </div>

            <label className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-xl p-8 cursor-pointer hover:border-blue-400 hover:bg-blue-50/50 transition-colors">
              <Upload className="w-8 h-8 text-gray-400 mb-2" />
              <span className="text-sm text-gray-600">Klik om je CSV te selecteren</span>
              <input type="file" accept=".csv" onChange={handleCSV} className="hidden" />
            </label>

            {importResult && (
              <div className="mt-4 p-3 bg-green-50 text-green-700 rounded-lg text-sm">
                <CheckCircle className="w-4 h-4 inline mr-1" />
                {importResult.nieuw} transacties geïmporteerd, {importResult.overgeslagen} al aanwezig
              </div>
            )}
          </div>

          <div className="flex justify-between mt-4">
            <button onClick={() => setStap(3)} className="text-sm text-gray-400 hover:text-gray-600">
              Overslaan
            </button>
            <button onClick={() => setStap(3)}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors">
              {importResult ? 'Volgende' : 'Overslaan'} <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Stap 3: Klaar
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-lg w-full text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="w-8 h-8 text-green-600" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Alles is ingesteld!</h1>
        <p className="text-gray-500 mb-8">Je cijferwerk is klaar voor gebruik.</p>

        <div className="bg-white rounded-xl border border-gray-200 p-6 text-left mb-6">
          <h3 className="font-medium text-gray-900 mb-3">Wat je nu kunt doen:</h3>
          <ul className="text-sm text-gray-600 space-y-2">
            <li>• Transacties verwerken via de <strong>Transacties</strong> pagina</li>
            <li>• Facturen aanmaken via de <strong>Facturen</strong> pagina</li>
            <li>• BTW-overzicht bekijken via <strong>BTW</strong></li>
            <li>• Instellingen aanpassen wanneer je wilt</li>
          </ul>
        </div>

        <button onClick={finish}
          className="inline-flex items-center gap-2 px-8 py-3 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors">
          Naar het overzicht <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
