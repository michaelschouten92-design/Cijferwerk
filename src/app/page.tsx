'use client';

import { formatEuro } from '@/lib/format';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import SyncButton from '@/components/SyncButton';
import { Download, AlertCircle, Clock, ArrowRight } from 'lucide-react';
import Link from 'next/link';

interface DashboardData {
  jaar: number;
  omzet: number;
  kosten: number;
  winst: number;
  rekeningBalans: number | null;
  balansUpdatedAt: string | null;
  aantalTransacties: number;
  ongecategoriseerd: number;
  inkomstenDezeMaand: number;
  uitgavenDezeMaand: number;
  kostenPerCategorie: Record<string, number>;
  omzetPerMaand: number[];
  btwAangifte: { kwartaal: number; teBetalen: number };
  btwDeadline: { kwartaal: number; deadline: string; dagenTot: number } | null;
  openstaandeFacturen: { id: number; nummer: string; klant: string; totaal: number; dagenOver: number }[];
  klaarstaandeSjablonen: { id: number; naam: string; klant: string; interval: string }[];
  laatsteSync: { timestamp: string; melding: string } | null;
}

const maandNamen = ['Jan', 'Feb', 'Mrt', 'Apr', 'Mei', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dec'];

function SkeletonDashboard() {
  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="skeleton h-8 w-40" />
        <div className="flex gap-2">
          <div className="skeleton h-8 w-24" />
          <div className="skeleton h-8 w-24" />
        </div>
      </div>
      <div className="skeleton h-28 w-full rounded-xl mb-4" />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="skeleton h-24 rounded-xl" />
        <div className="skeleton h-24 rounded-xl" />
        <div className="skeleton h-24 rounded-xl" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="skeleton h-52 rounded-xl" />
        <div className="skeleton h-52 rounded-xl" />
      </div>
    </div>
  );
}


export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [jaar, setJaar] = useState(new Date().getFullYear());
  const [checked, setChecked] = useState(false);
  const [showSetup, setShowSetup] = useState(false);
  const [hoveredMonth, setHoveredMonth] = useState<number | null>(null);
  const router = useRouter();

  useEffect(() => {
    fetch('/api/settings')
      .then(r => r.json())
      .then(s => {
        if (!s.bedrijfNaam) setShowSetup(true);
        setChecked(true);
      })
      .catch(() => setChecked(true));
  }, [router]);

  const load = useCallback(() => {
    fetch(`/api/dashboard?jaar=${jaar}`).then(r => r.json()).then(setData);
  }, [jaar]);

  useEffect(() => { if (checked) load(); }, [load, checked]);

  if (!checked || !data) return <SkeletonDashboard />;

  const maxOmzet = Math.max(...data.omzetPerMaand, 1);
  const btwOpzij = Math.max(0, data.btwAangifte.teBetalen);
  const huidigeMaand = new Date().getMonth();
  const gemiddelde = data.omzetPerMaand.reduce((a, b) => a + b, 0) / 12;

  // Voortgang berekenen
  const totaalTx = data.aantalTransacties;
  const verwerkt = totaalTx - data.ongecategoriseerd;
  const voortgangPct = totaalTx > 0 ? Math.round((verwerkt / totaalTx) * 100) : 100;

  // Notificaties
  const alerts: { text: string; href: string; type: 'warn' | 'info' | 'danger' }[] = [];
  if (data.ongecategoriseerd > 0) {
    alerts.push({
      text: `${data.ongecategoriseerd} transactie(s) moeten nog verwerkt worden`,
      href: '/transactions',
      type: 'warn',
    });
  }
  for (const f of data.openstaandeFacturen) {
    if (f.dagenOver > 0) {
      alerts.push({
        text: `Factuur ${f.nummer} aan ${f.klant} (${formatEuro(f.totaal)}) is ${f.dagenOver} dagen over de vervaldatum`,
        href: '/invoices',
        type: 'danger',
      });
    }
  }
  for (const s of data.klaarstaandeSjablonen) {
    alerts.push({
      text: `Factuur "${s.naam}" voor ${s.klant} staat klaar om aan te maken`,
      href: '/invoices',
      type: 'info',
    });
  }
  if (data.btwDeadline && data.btwDeadline.dagenTot <= 30 && data.btwDeadline.dagenTot > 0) {
    alerts.push({
      text: `BTW-aangifte Q${data.btwDeadline.kwartaal} indienen vóór ${new Date(data.btwDeadline.deadline).toLocaleDateString('nl-NL')} (nog ${data.btwDeadline.dagenTot} dagen)`,
      href: '/btw',
      type: data.btwDeadline.dagenTot <= 7 ? 'danger' : 'info',
    });
  }

  return (
    <div className="max-w-5xl mx-auto">
      {/* Welkomstbanner als bedrijfsgegevens nog niet ingevuld */}
      {showSetup && (
        <div className="bg-brand-50 border border-brand-200 rounded-xl p-6 mb-6 animate-fade-in-up">
          <h2 className="text-lg font-bold text-brand-900 mb-2">Welkom bij Cijferwerk!</h2>
          <p className="text-sm text-brand-700 mb-4">Vul eerst je bedrijfsgegevens in. Deze verschijnen op je facturen en exports.</p>
          <div className="flex gap-3">
            <Link href="/settings" className="px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors">
              Bedrijfsgegevens invullen
            </Link>
            <Link href="/onboarding" className="px-4 py-2 bg-white text-brand-700 border border-brand-200 rounded-lg text-sm font-medium hover:bg-brand-50 transition-colors">
              Onboarding starten
            </Link>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Overzicht</h2>
          <select value={jaar} onChange={e => setJaar(parseInt(e.target.value))}
            className="px-2 py-1 border border-gray-200 rounded-lg text-sm text-gray-600">
            {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <a href={`/api/export/jaarafsluiting?jaar=${data.jaar}`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-white bg-brand-600 rounded-lg hover:bg-brand-700 transition-colors">
            <Download className="w-3 h-3" /> Jaarafsluiting
          </a>
          <a href={`/api/export/balans?jaar=${data.jaar}`} target="_blank"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-500 bg-white shadow-card rounded-lg hover:shadow-card-hover transition-shadow">
            <Download className="w-3 h-3" /> Balans
          </a>
          <a href={`/api/export/winst-verlies?jaar=${data.jaar}`} target="_blank"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-500 bg-white shadow-card rounded-lg hover:shadow-card-hover transition-shadow">
            <Download className="w-3 h-3" /> Winst & verlies
          </a>
          <SyncButton onSync={load} />
        </div>
      </div>

      {/* Voortgangsbalk */}
      {data.ongecategoriseerd > 0 && (
        <div className="mb-4 animate-fade-in-up">
          <div className="flex items-center justify-between text-sm mb-1.5">
            <span className="text-gray-600 font-medium">{voortgangPct}% bijgewerkt</span>
            <span className="text-gray-400">{verwerkt} van {totaalTx} verwerkt</span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-brand-500 to-brand-400 rounded-full transition-all duration-500"
              style={{ width: `${voortgangPct}%` }} />
          </div>
        </div>
      )}

      {/* Notificaties */}
      {alerts.length > 0 && (
        <div className="space-y-2 mb-6">
          {alerts.map((a, i) => (
            <Link key={i} href={a.href}
              className={`flex items-center justify-between p-3 rounded-lg text-sm transition-all duration-200 animate-fade-in-up ${
                a.type === 'danger' ? 'bg-red-50 text-red-700 hover:bg-red-100' :
                a.type === 'warn' ? 'bg-amber-50 text-amber-700 hover:bg-amber-100' :
                'bg-brand-50 text-brand-700 hover:bg-brand-100'
              }`}
              style={{ animationDelay: `${i * 50}ms` }}>
              <div className="flex items-center gap-2">
                {a.type === 'danger' ? <AlertCircle className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                {a.text}
              </div>
              <ArrowRight className="w-4 h-4" />
            </Link>
          ))}
        </div>
      )}

      {/* Saldo + kaartjes */}
      {data.rekeningBalans !== null && (
        <div className="bg-gradient-to-r from-brand-700 via-brand-600 to-indigo-600 rounded-xl p-6 mb-4 text-white shadow-lg">
          <p className="text-sm text-brand-200">Rekeningsaldo</p>
          <p className="text-3xl font-bold mt-1 tabular-nums">{formatEuro(data.rekeningBalans)}</p>
          {data.balansUpdatedAt && (
            <p className="text-xs text-brand-300 mt-1">
              Bijgewerkt {new Date(data.balansUpdatedAt).toLocaleDateString('nl-NL')}
            </p>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow-card hover:shadow-card-hover transition-shadow p-5">
          <p className="text-sm text-gray-500">Verdiend deze maand</p>
          <p className="text-2xl font-bold text-green-600 mt-1 tabular-nums">{formatEuro(data.inkomstenDezeMaand)}</p>
          <p className="text-xs text-gray-400 mt-1">Totaal dit jaar: {formatEuro(data.omzet)}</p>
        </div>
        <div className="bg-white rounded-xl shadow-card hover:shadow-card-hover transition-shadow p-5">
          <p className="text-sm text-gray-500">Uitgegeven deze maand</p>
          <p className="text-2xl font-bold text-red-600 mt-1 tabular-nums">{formatEuro(data.uitgavenDezeMaand)}</p>
          <p className="text-xs text-gray-400 mt-1">Totaal dit jaar: {formatEuro(data.kosten)}</p>
        </div>
        <div className="bg-white rounded-xl shadow-card hover:shadow-card-hover transition-shadow p-5">
          <p className="text-sm text-gray-500">BTW opzij zetten</p>
          <p className="text-2xl font-bold text-brand-600 mt-1 tabular-nums">{formatEuro(btwOpzij)}</p>
          <p className="text-xs text-gray-400 mt-1">Q{data.btwAangifte.kwartaal} — {data.winst >= 0 ? `winst ${formatEuro(data.winst)}` : `verlies ${formatEuro(Math.abs(data.winst))}`}</p>
        </div>
      </div>

      {/* Grafieken */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-xl shadow-card p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Inkomsten per maand</h3>
          <div className="flex items-end gap-2 h-36 relative">
            {/* Gemiddelde lijn */}
            {gemiddelde > 0 && (
              <div className="absolute left-0 right-0 border-t border-dashed border-gray-200"
                style={{ bottom: `${(gemiddelde / maxOmzet) * 100}%` }}>
                <span className="absolute -top-4 right-0 text-[10px] text-gray-300">gem.</span>
              </div>
            )}
            {data.omzetPerMaand.map((val, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1 relative"
                onMouseEnter={() => setHoveredMonth(i)}
                onMouseLeave={() => setHoveredMonth(null)}>
                {/* Tooltip */}
                {hoveredMonth === i && val > 0 && (
                  <div className="absolute -top-8 bg-gray-900 text-white text-xs px-2 py-1 rounded shadow-lg whitespace-nowrap z-10">
                    {formatEuro(val)}
                  </div>
                )}
                <div className={`w-full rounded-t-md transition-all duration-500 cursor-default ${
                  i === huidigeMaand && jaar === new Date().getFullYear()
                    ? 'bg-brand-500'
                    : 'bg-brand-300'
                } ${hoveredMonth === i ? 'opacity-80' : ''}`}
                  style={{ height: `${(val / maxOmzet) * 100}%`, minHeight: val > 0 ? '4px' : '0' }} />
                <span className={`text-xs ${i === huidigeMaand && jaar === new Date().getFullYear() ? 'text-brand-600 font-medium' : 'text-gray-400'}`}>
                  {maandNamen[i]}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-card p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Uitgaven per categorie</h3>
          <div className="space-y-2.5">
            {Object.entries(data.kostenPerCategorie)
              .sort(([, a], [, b]) => b - a)
              .slice(0, 6)
              .map(([naam, bedrag]) => (
                <div key={naam}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600 truncate">{naam}</span>
                    <span className="font-medium tabular-nums">{formatEuro(bedrag)}</span>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full">
                    <div className="h-1.5 bg-red-400 rounded-full transition-all duration-500" style={{ width: `${(bedrag / data.kosten) * 100}%` }} />
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>

      {/* Jaarafsluiting checklist — toon alleen voor het huidige of vorige jaar */}
      {(jaar === new Date().getFullYear() || jaar === new Date().getFullYear() - 1) && (
        <div className="bg-white rounded-xl shadow-card p-6 mb-6">
          <h3 className="font-semibold text-gray-900 mb-3">Jaarafsluiting {jaar}</h3>
          <p className="text-xs text-gray-400 mb-4">Zorg dat alles klopt voordat je de jaarafsluiting downloadt.</p>
          <div className="space-y-2">
            {[
              { ok: data.ongecategoriseerd === 0, label: 'Alle transacties gecategoriseerd', link: '/transactions' },
              { ok: data.openstaandeFacturen.length === 0, label: 'Geen openstaande facturen', link: '/invoices' },
              { ok: data.aantalTransacties > 0, label: 'Transacties geïmporteerd', link: '/settings' },
            ].map((item, i) => (
              <Link key={i} href={item.link}
                className="flex items-center gap-3 text-sm p-2 rounded-lg hover:bg-gray-50 transition-colors">
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs ${
                  item.ok ? 'bg-green-100 text-green-600' : 'bg-amber-100 text-amber-600'
                }`}>
                  {item.ok ? '✓' : '!'}
                </span>
                <span className={item.ok ? 'text-gray-500' : 'text-gray-900 font-medium'}>{item.label}</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {data.laatsteSync && (
        <p className="text-xs text-gray-400">
          Laatste import: {new Date(data.laatsteSync.timestamp).toLocaleString('nl-NL')} — {data.laatsteSync.melding}
        </p>
      )}
    </div>
  );
}
