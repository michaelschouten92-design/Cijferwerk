'use client';

import { useEffect, useState, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { Download, Upload, Save } from 'lucide-react';
import { useUnsavedWarning } from '@/lib/useUnsavedWarning';
import dynamic from 'next/dynamic';

const CategorieenContent = dynamic(() => import('@/app/categorieen/page'), { ssr: false });
const ActivaContent = dynamic(() => import('@/app/activa/page'), { ssr: false });

interface SyncLog {
  id: number;
  timestamp: string;
  aantalNieuw: number;
  aantalOvergeslagen: number;
  status: string;
  melding: string | null;
}

const tabs = [
  { id: 'algemeen', label: 'Algemeen' },
  { id: 'categorieen', label: 'Categorieën' },
  { id: 'bezittingen', label: 'Bezittingen' },
];

export default function SettingsPage() {
  const [syncLogs, setSyncLogs] = useState<SyncLog[]>([]);
  const [activeTab, setActiveTab] = useState('algemeen');

  useEffect(() => {
    fetch('/api/import').then(r => r.json()).then(setSyncLogs);
  }, []);

  return (
    <div className="max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold text-gray-900 tracking-tight mb-4">Instellingen</h2>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 mb-6">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === t.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === 'categorieen' && <CategorieenContent />}
      {activeTab === 'bezittingen' && <ActivaContent />}
      {activeTab !== 'algemeen' && activeTab !== 'categorieen' && activeTab !== 'bezittingen' ? null : null}
      {activeTab !== 'algemeen' ? null : (<div>

      {/* Bank Import instructies */}
      <div className="bg-white rounded-xl shadow-card p-6 mb-6">
        <h3 className="font-semibold text-gray-900 mb-4">Transacties importeren</h3>
        <div className="bg-brand-50 rounded-lg p-4 text-sm text-brand-800">
          <p className="font-medium mb-2">Hoe werkt het:</p>
          <ol className="list-decimal list-inside space-y-1 text-brand-700">
            <li>Ga naar je bank en open het transactie-overzicht</li>
            <li>Exporteer als <strong>CSV</strong> of <strong>MT940</strong></li>
            <li>Klik op <strong>Importeer</strong> op het Overzicht of de Transacties pagina</li>
          </ol>
          <p className="mt-3 text-xs text-brand-600">Ondersteunde banken: Revolut, ING, Rabobank, ABN AMRO, Bunq en andere banken met CSV of MT940 export. Duplicaten worden automatisch herkend.</p>
        </div>
      </div>

      {/* Import Geschiedenis */}
      {syncLogs.length > 0 && (
        <div className="bg-white rounded-xl shadow-card p-6 mb-6">
          <h3 className="font-semibold text-gray-900 mb-4">Import geschiedenis</h3>
          <div className="space-y-2">
            {syncLogs.slice(0, 10).map(log => (
              <div key={log.id} className="flex items-center justify-between text-sm py-2 border-b border-gray-50 last:border-0">
                <div className="flex items-center gap-3">
                  <span className={`w-2 h-2 rounded-full ${log.status === 'success' ? 'bg-green-500' : 'bg-red-500'}`} />
                  <span className="text-gray-500">{new Date(log.timestamp).toLocaleString('nl-NL')}</span>
                </div>
                <div className="flex items-center gap-4 text-gray-600">
                  {log.status === 'success' ? (
                    <><span className="text-green-600">+{log.aantalNieuw} nieuw</span><span className="text-gray-400">{log.aantalOvergeslagen} overgeslagen</span></>
                  ) : (
                    <span className="text-red-600 text-xs truncate max-w-xs">{log.melding}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bedrijfsgegevens + Factuurstijl */}
      <BedrijfsSection />

      {/* Back-up */}
      <BackupSection />

      {/* SMTP E-mail */}
      <SmtpSection />
      </div>)}
    </div>
  );
}

function BedrijfsSection() {
  const [form, setForm] = useState({
    bedrijfNaam: '', bedrijfContact: '', bedrijfAdres: '', bedrijfPostcode: '',
    bedrijfTelefoon: '', bedrijfEmail: '', bedrijfKvk: '', bedrijfBtw: '', bedrijfIban: '',
    factuurKleur: '#2563eb', factuurLogo: '' as string | null, factuurLogoGrootte: 60,
  });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [dirty, setDirty] = useState(false);
  useUnsavedWarning(dirty);

  useEffect(() => {
    fetch('/api/settings').then(r => r.json()).then(data => {
      setForm({
        bedrijfNaam: data.bedrijfNaam || '', bedrijfContact: data.bedrijfContact || '',
        bedrijfAdres: data.bedrijfAdres || '', bedrijfPostcode: data.bedrijfPostcode || '',
        bedrijfTelefoon: data.bedrijfTelefoon || '', bedrijfEmail: data.bedrijfEmail || '',
        bedrijfKvk: data.bedrijfKvk || '', bedrijfBtw: data.bedrijfBtw || '', bedrijfIban: data.bedrijfIban || '',
        factuurKleur: data.factuurKleur || '#2563eb', factuurLogo: data.factuurLogo || null, factuurLogoGrootte: data.factuurLogoGrootte || 60,
      });
      setLoaded(true);
    }).catch(() => setLoaded(true));
  }, []);

  function updateForm(updates: Partial<typeof form>) {
    setForm(f => ({ ...f, ...updates }));
    setDirty(true);
  }

  function handleLogo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => updateForm({ factuurLogo: reader.result as string });
    reader.readAsDataURL(file);
  }

  async function handleSave() {
    setSaving(true); setMsg(null);
    try {
      await fetch('/api/settings', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      setMsg({ type: 'success', text: 'Opgeslagen!' }); setDirty(false); setTimeout(() => setMsg(null), 3000);
    } catch (e: any) { setMsg({ type: 'error', text: e.message }); }
    setSaving(false);
  }

  if (!loaded) return null;

  return (
    <div className="bg-white rounded-xl shadow-card p-6 mb-6">
      <h3 className="font-semibold text-gray-900 mb-4">Bedrijfsgegevens & factuurstijl</h3>
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div><label className="block text-xs text-gray-500 mb-1">Bedrijfsnaam</label><input value={form.bedrijfNaam} onChange={e => updateForm({ bedrijfNaam: e.target.value })} className="w-full px-3 py-1.5 border rounded text-sm" placeholder="Jouw bedrijfsnaam" /></div>
        <div><label className="block text-xs text-gray-500 mb-1">Contactpersoon</label><input value={form.bedrijfContact} onChange={e => updateForm({ bedrijfContact: e.target.value })} className="w-full px-3 py-1.5 border rounded text-sm" /></div>
        <div><label className="block text-xs text-gray-500 mb-1">Adres</label><input value={form.bedrijfAdres} onChange={e => updateForm({ bedrijfAdres: e.target.value })} className="w-full px-3 py-1.5 border rounded text-sm" /></div>
        <div><label className="block text-xs text-gray-500 mb-1">Postcode + plaats</label><input value={form.bedrijfPostcode} onChange={e => updateForm({ bedrijfPostcode: e.target.value })} className="w-full px-3 py-1.5 border rounded text-sm" /></div>
        <div><label className="block text-xs text-gray-500 mb-1">Telefoon</label><input value={form.bedrijfTelefoon} onChange={e => updateForm({ bedrijfTelefoon: e.target.value })} className="w-full px-3 py-1.5 border rounded text-sm" /></div>
        <div><label className="block text-xs text-gray-500 mb-1">E-mail</label><input value={form.bedrijfEmail} onChange={e => updateForm({ bedrijfEmail: e.target.value })} className="w-full px-3 py-1.5 border rounded text-sm" /></div>
        <div><label className="block text-xs text-gray-500 mb-1">KVK-nummer</label><input value={form.bedrijfKvk} onChange={e => updateForm({ bedrijfKvk: e.target.value })} className="w-full px-3 py-1.5 border rounded text-sm" /></div>
        <div><label className="block text-xs text-gray-500 mb-1">BTW-nummer</label><input value={form.bedrijfBtw} onChange={e => updateForm({ bedrijfBtw: e.target.value })} className="w-full px-3 py-1.5 border rounded text-sm" /></div>
        <div className="col-span-2"><label className="block text-xs text-gray-500 mb-1">IBAN</label><input value={form.bedrijfIban} onChange={e => updateForm({ bedrijfIban: e.target.value })} className="w-full px-3 py-1.5 border rounded text-sm" /></div>
      </div>
      <div className="border-t border-gray-100 pt-4 mt-4">
        <h4 className="text-sm font-medium text-gray-700 mb-3">Factuurstijl</h4>
        <div className="flex items-start gap-6">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Logo</label>
            <div className="flex items-center gap-3">
              {form.factuurLogo && <div className="border rounded-lg p-2 bg-gray-50"><img src={form.factuurLogo} alt="Logo" className="h-10 max-w-[120px] object-contain" /></div>}
              <label className="cursor-pointer px-3 py-1.5 bg-gray-100 text-gray-700 rounded text-sm hover:bg-gray-200">{form.factuurLogo ? 'Wijzigen' : 'Upload logo'}<input type="file" accept="image/*" onChange={handleLogo} className="hidden" /></label>
              {form.factuurLogo && <button onClick={() => updateForm({ factuurLogo: null })} className="text-xs text-red-500 hover:text-red-700">Verwijderen</button>}
            </div>
            {form.factuurLogo && (
              <div className="mt-3">
                <label className="block text-xs text-gray-500 mb-1">Logogrootte</label>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400">Klein</span>
                  <input type="range" min={20} max={120} step={5} value={form.factuurLogoGrootte} onChange={e => updateForm({ factuurLogoGrootte: parseInt(e.target.value) })} className="flex-1 accent-brand-600" />
                  <span className="text-xs text-gray-400">Groot</span>
                </div>
              </div>
            )}
            {form.factuurLogo && (
              <div className="mt-3 border rounded-lg p-4 bg-gray-50" style={{ maxWidth: 420 }}>
                <p className="text-[10px] text-gray-400 mb-2">Voorbeeld factuurkop</p>
                <div className="flex justify-between items-start">
                  <img src={form.factuurLogo} alt="Logo" style={{ maxHeight: form.factuurLogoGrootte, maxWidth: Math.round(form.factuurLogoGrootte * 3.33) }} className="object-contain" />
                  <div className="text-right text-[11px] text-gray-500 leading-relaxed">
                    <strong className="text-gray-700">{form.bedrijfNaam || 'Bedrijfsnaam'}</strong><br />
                    {form.bedrijfAdres || 'Adres'}<br />
                    {form.bedrijfPostcode || 'Postcode + plaats'}
                  </div>
                </div>
              </div>
            )}
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Accentkleur</label>
            <div className="flex items-center gap-2">
              <input type="color" value={form.factuurKleur} onChange={e => updateForm({ factuurKleur: e.target.value })} className="w-10 h-8 border rounded cursor-pointer" />
              <input value={form.factuurKleur} onChange={e => updateForm({ factuurKleur: e.target.value })} className="w-24 px-2 py-1.5 border rounded text-sm font-mono" />
            </div>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-3 mt-4">
        <button onClick={handleSave} disabled={saving} className="inline-flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors disabled:opacity-50"><Save className="w-4 h-4" /> {saving ? 'Opslaan...' : 'Opslaan'}</button>
        {msg && <span className={`text-sm ${msg.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>{msg.text}</span>}
      </div>
    </div>
  );
}

function BackupSection() {
  const [restoring, setRestoring] = useState(false);
  const [result, setResult] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  async function handleRestore(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setRestoring(true); setResult(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/backup', { method: 'POST', body: formData });
      const data = await res.json();
      setResult(data.success ? { type: 'success', text: data.message } : { type: 'error', text: data.error });
    } catch (err: any) { setResult({ type: 'error', text: err.message }); }
    setRestoring(false); e.target.value = '';
  }

  return (
    <div className="bg-white rounded-xl shadow-card p-6 mb-6">
      <h3 className="font-semibold text-gray-900 mb-4">Back-up</h3>
      <p className="text-sm text-gray-500 mb-4">Download regelmatig een back-up van je administratie.</p>
      <div className="flex items-center gap-3">
        <a href="/api/backup" className="inline-flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors"><Download className="w-4 h-4" /> Download back-up</a>
        <label className={`inline-flex items-center gap-2 px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 cursor-pointer ${restoring ? 'opacity-50' : ''}`}><Upload className="w-4 h-4" /> Herstel back-up<input type="file" accept=".db,.zip" onChange={handleRestore} className="hidden" disabled={restoring} /></label>
      </div>
      {result && <div className={`mt-3 p-3 rounded-lg text-sm ${result.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>{result.text}</div>}
    </div>
  );
}

function SmtpSection() {
  const [form, setForm] = useState({ smtpHost: '', smtpPort: '587', smtpUser: '', smtpPass: '', smtpFrom: '' });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch('/api/settings').then(r => r.json()).then(data => {
      setForm({ smtpHost: data.smtpHost || '', smtpPort: (data.smtpPort || 587).toString(), smtpUser: data.smtpUser || '', smtpPass: '', smtpFrom: data.smtpFrom || '' });
      setLoaded(true);
    }).catch(() => setLoaded(true));
  }, []);

  async function handleSave() {
    setSaving(true); setMsg(null);
    const body: any = { smtpHost: form.smtpHost || null, smtpPort: parseInt(form.smtpPort) || 587, smtpUser: form.smtpUser || null, smtpFrom: form.smtpFrom || null };
    if (form.smtpPass) body.smtpPass = form.smtpPass;
    try {
      await fetch('/api/settings', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      setMsg({ type: 'success', text: 'SMTP opgeslagen' }); setTimeout(() => setMsg(null), 3000);
    } catch (e: any) { setMsg({ type: 'error', text: e.message }); }
    setSaving(false);
  }

  if (!loaded) return null;

  return (
    <div className="bg-white rounded-xl shadow-card p-6 mb-6">
      <h3 className="font-semibold text-gray-900 mb-4">E-mail (SMTP)</h3>
      <p className="text-sm text-gray-500 mb-3">Configureer SMTP om facturen direct per e-mail te verzenden.</p>
      <div className="mb-3">
        <label className="block text-xs text-gray-500 mb-1">Snelle setup</label>
        <select onChange={e => {
          const presets: Record<string, { host: string; port: string }> = {
            gmail: { host: 'smtp.gmail.com', port: '587' },
            outlook: { host: 'smtp.office365.com', port: '587' },
            yahoo: { host: 'smtp.mail.yahoo.com', port: '587' },
          };
          const p = presets[e.target.value];
          if (p) setForm({ ...form, smtpHost: p.host, smtpPort: p.port });
        }} className="w-full px-3 py-1.5 border rounded text-sm" defaultValue="">
          <option value="">Kies je e-mailprovider...</option>
          <option value="gmail">Gmail (App-wachtwoord nodig)</option>
          <option value="outlook">Outlook / Hotmail</option>
          <option value="yahoo">Yahoo</option>
        </select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div><label className="block text-xs text-gray-500 mb-1">SMTP Host</label><input value={form.smtpHost} onChange={e => setForm({ ...form, smtpHost: e.target.value })} className="w-full px-3 py-1.5 border rounded text-sm" placeholder="bijv. smtp.gmail.com" /></div>
        <div><label className="block text-xs text-gray-500 mb-1">Poort</label><input value={form.smtpPort} onChange={e => setForm({ ...form, smtpPort: e.target.value })} className="w-full px-3 py-1.5 border rounded text-sm" placeholder="587" /></div>
        <div><label className="block text-xs text-gray-500 mb-1">Gebruikersnaam</label><input value={form.smtpUser} onChange={e => setForm({ ...form, smtpUser: e.target.value })} className="w-full px-3 py-1.5 border rounded text-sm" placeholder="email@domain.nl" /></div>
        <div><label className="block text-xs text-gray-500 mb-1">Wachtwoord</label><input type="password" value={form.smtpPass} onChange={e => setForm({ ...form, smtpPass: e.target.value })} className="w-full px-3 py-1.5 border rounded text-sm" placeholder="App-wachtwoord" /></div>
        <div className="col-span-2"><label className="block text-xs text-gray-500 mb-1">Afzender</label><input value={form.smtpFrom} onChange={e => setForm({ ...form, smtpFrom: e.target.value })} className="w-full px-3 py-1.5 border rounded text-sm" placeholder="Algo Studio <email@domain.nl>" /></div>
      </div>
      <button onClick={handleSave} disabled={saving} className="inline-flex items-center gap-2 mt-3 px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors disabled:opacity-50"><Save className="w-4 h-4" /> {saving ? 'Opslaan...' : 'Opslaan'}</button>
      {msg && <div className={`mt-3 p-3 rounded-lg text-sm ${msg.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>{msg.text}</div>}
    </div>
  );
}
