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


export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [jaar, setJaar] = useState(new Date().getFullYear());
  const [checked, setChecked] = useState(false);
  const router = useRouter();

  // Check of onboarding nodig is
  useEffect(() => {
    fetch('/api/settings').then(r => r.json()).then(s => {
      if (!s.bedrijfNaam) {
        router.replace('/onboarding');
      } else {
        setChecked(true);
      }
    }).catch(() => setChecked(true));
  }, [router]);

  const load = useCallback(() => {
    fetch(`/api/dashboard?jaar=${jaar}`).then(r => r.json()).then(setData);
  }, [jaar]);

  useEffect(() => { if (checked) load(); }, [load, checked]);

  if (!checked || !data) return <div className="flex items-center justify-center h-64 text-gray-400">Laden...</div>;

  const maxOmzet = Math.max(...data.omzetPerMaand, 1);
  const btwOpzij = Math.max(0, data.btwAangifte.teBetalen);

  // Notificaties samenstellen
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
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-bold text-gray-900">Overzicht</h2>
          <select value={jaar} onChange={e => setJaar(parseInt(e.target.value))}
            className="px-2 py-1 border border-gray-200 rounded-lg text-sm text-gray-600">
            {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <a href={`/api/export/jaarafsluiting?jaar=${data.jaar}`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-white bg-blue-600 rounded-lg hover:bg-blue-700">
            <Download className="w-3 h-3" /> Jaarafsluiting
          </a>
          <a href={`/api/export/balans?jaar=${data.jaar}`} target="_blank"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-500 bg-white border border-gray-200 rounded-lg hover:bg-gray-50">
            <Download className="w-3 h-3" /> Balans
          </a>
          <a href={`/api/export/winst-verlies?jaar=${data.jaar}`} target="_blank"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-500 bg-white border border-gray-200 rounded-lg hover:bg-gray-50">
            <Download className="w-3 h-3" /> Winst & verlies
          </a>
          <SyncButton onSync={load} />
        </div>
      </div>

      {/* Notificaties */}
      {alerts.length > 0 && (
        <div className="space-y-2 mb-6">
          {alerts.map((a, i) => (
            <Link key={i} href={a.href}
              className={`flex items-center justify-between p-3 rounded-lg text-sm transition-colors ${
                a.type === 'danger' ? 'bg-red-50 text-red-700 hover:bg-red-100' :
                a.type === 'warn' ? 'bg-amber-50 text-amber-700 hover:bg-amber-100' :
                'bg-blue-50 text-blue-700 hover:bg-blue-100'
              }`}>
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
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl p-6 mb-4 text-white">
          <p className="text-sm text-blue-200">Rekeningsaldo</p>
          <p className="text-3xl font-bold mt-1">{formatEuro(data.rekeningBalans)}</p>
          {data.balansUpdatedAt && (
            <p className="text-xs text-blue-300 mt-1">
              Bijgewerkt {new Date(data.balansUpdatedAt).toLocaleDateString('nl-NL')}
            </p>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-sm text-gray-500">Verdiend deze maand</p>
          <p className="text-2xl font-bold text-green-600 mt-1">{formatEuro(data.inkomstenDezeMaand)}</p>
          <p className="text-xs text-gray-400 mt-1">Totaal dit jaar: {formatEuro(data.omzet)}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-sm text-gray-500">Uitgegeven deze maand</p>
          <p className="text-2xl font-bold text-red-600 mt-1">{formatEuro(data.uitgavenDezeMaand)}</p>
          <p className="text-xs text-gray-400 mt-1">Totaal dit jaar: {formatEuro(data.kosten)}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-sm text-gray-500">BTW opzij zetten</p>
          <p className="text-2xl font-bold text-blue-600 mt-1">{formatEuro(btwOpzij)}</p>
          <p className="text-xs text-gray-400 mt-1">Q{data.btwAangifte.kwartaal} — {data.winst >= 0 ? `winst ${formatEuro(data.winst)}` : `verlies ${formatEuro(Math.abs(data.winst))}`}</p>
        </div>
      </div>

      {/* Grafieken */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Inkomsten per maand</h3>
          <div className="flex items-end gap-2 h-36">
            {data.omzetPerMaand.map((val, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full bg-blue-500 rounded-t transition-all"
                  style={{ height: `${(val / maxOmzet) * 100}%`, minHeight: val > 0 ? '4px' : '0' }} />
                <span className="text-xs text-gray-400">{maandNamen[i]}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Uitgaven per categorie</h3>
          <div className="space-y-2.5">
            {Object.entries(data.kostenPerCategorie)
              .sort(([, a], [, b]) => b - a)
              .slice(0, 6)
              .map(([naam, bedrag]) => (
                <div key={naam}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600 truncate">{naam}</span>
                    <span className="font-medium">{formatEuro(bedrag)}</span>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full">
                    <div className="h-1.5 bg-red-400 rounded-full" style={{ width: `${(bedrag / data.kosten) * 100}%` }} />
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>

      {data.laatsteSync && (
        <p className="text-xs text-gray-400">
          Laatste import: {new Date(data.laatsteSync.timestamp).toLocaleString('nl-NL')} — {data.laatsteSync.melding}
        </p>
      )}
    </div>
  );
}
