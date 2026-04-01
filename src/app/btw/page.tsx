'use client';

import { formatEuro } from '@/lib/format';
import { useEffect, useState } from 'react';
import { Download, ChevronDown, ChevronUp, ArrowDownLeft, ArrowUpRight, Equal } from 'lucide-react';

interface BtwRegel {
  label: string;
  verkoopBedrag: number;
  verkoopBtw: number;
  inkoopBedrag: number;
  inkoopBtw: number;
}

interface BtwPeriode {
  periode: string;
  regels: BtwRegel[];
  totaalVerkoopBtw: number;
  totaalInkoopBtw: number;
  teBetalen: number;
}

interface BtwAangifte {
  rubriek1a_omzet: number;
  rubriek1a_btw: number;
  rubriek1b_omzet: number;
  rubriek1b_btw: number;
  rubriek1e_omzet: number;
  rubriek3b_omzet: number;
  rubriek4a_omzet: number;
  rubriek4b_omzet: number;
  rubriek5b: number;
  teBetalen: number;
}


const BTW_DEADLINES: Record<number, string> = { 1: '30 april', 2: '31 juli', 3: '31 oktober', 4: '31 januari' };

export default function BtwPage() {
  const [weergave, setWeergave] = useState<'kwartaal' | 'maand'>('kwartaal');
  const [periodes, setPeriodes] = useState<BtwPeriode[]>([]);
  const [aangifte, setAangifte] = useState<BtwAangifte | null>(null);
  const [jaar] = useState(new Date().getFullYear());
  const [aangifteKwartaal, setAangifteKwartaal] = useState(Math.floor(new Date().getMonth() / 3) + 1);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    fetch(`/api/btw?jaar=${jaar}&weergave=${weergave}`).then(r => r.json()).then(setPeriodes);
  }, [weergave, jaar]);

  useEffect(() => {
    fetch(`/api/btw?jaar=${jaar}&weergave=aangifte&kwartaal=${aangifteKwartaal}`)
      .then(r => r.json()).then(setAangifte);
  }, [aangifteKwartaal, jaar]);

  const btwOntvangen = aangifte ? aangifte.rubriek1a_btw + aangifte.rubriek1b_btw : 0;
  const btwBetaald = aangifte?.rubriek5b || 0;

  return (
    <div className="max-w-5xl mx-auto">
      <h2 className="text-2xl font-bold text-gray-900 tracking-tight mb-6">BTW</h2>

      {/* Simpele uitleg */}
      {aangifte && (
        <div className="bg-white rounded-xl shadow-card p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <h3 className="font-semibold text-gray-900">Kwartaal {aangifteKwartaal}</h3>
              <select value={aangifteKwartaal} onChange={e => setAangifteKwartaal(parseInt(e.target.value))}
                className="px-2 py-1 border rounded-lg text-sm">
                {[1, 2, 3, 4].map(q => <option key={q} value={q}>Q{q}</option>)}
              </select>
            </div>
            <a href={`/api/export/btw?jaar=${jaar}&kwartaal=${aangifteKwartaal}`} target="_blank"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 bg-white shadow-card rounded-lg hover:shadow-card-hover transition-shadow">
              <Download className="w-3.5 h-3.5" /> Downloaden
            </a>
          </div>

          {/* Groot bedrag */}
          <div className="text-center py-6">
            <p className="text-sm text-gray-500 mb-1">
              {aangifte.teBetalen >= 0 ? 'Dit kwartaal betaal je' : 'Dit kwartaal krijg je terug'}
            </p>
            <p className={`text-4xl font-bold tabular-nums ${aangifte.teBetalen >= 0 ? 'text-red-600' : 'text-green-600'}`}>
              {formatEuro(Math.abs(aangifte.teBetalen))}
            </p>
            <p className="text-sm text-gray-400 mt-2">
              Indienen vóór {BTW_DEADLINES[aangifteKwartaal]} {aangifteKwartaal === 4 ? jaar + 1 : jaar}
            </p>
          </div>

          {/* Simpele uitleg met iconen */}
          <div className="grid grid-cols-3 gap-4 py-4 border-t border-gray-100">
            <div className="text-center">
              <div className="flex items-center justify-center gap-1.5 mb-1">
                <ArrowDownLeft className="w-3.5 h-3.5 text-green-500" />
                <p className="text-xs text-gray-400">BTW ontvangen</p>
              </div>
              <p className="text-lg font-semibold text-gray-900 tabular-nums">{formatEuro(btwOntvangen)}</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1.5 mb-1">
                <ArrowUpRight className="w-3.5 h-3.5 text-red-500" />
                <p className="text-xs text-gray-400">BTW betaald</p>
              </div>
              <p className="text-lg font-semibold text-gray-900 tabular-nums">{formatEuro(btwBetaald)}</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1.5 mb-1">
                <Equal className="w-3.5 h-3.5 text-gray-400" />
                <p className="text-xs text-gray-400">{aangifte.teBetalen >= 0 ? 'Afdragen' : 'Terugvragen'}</p>
              </div>
              <p className={`text-lg font-semibold tabular-nums ${aangifte.teBetalen >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                {formatEuro(Math.abs(aangifte.teBetalen))}
              </p>
            </div>
          </div>

          {/* Details voor boekhouder (uitklapbaar) */}
          <button onClick={() => setShowDetails(!showDetails)}
            className="flex items-center gap-1 text-sm text-gray-400 hover:text-gray-600 mt-3 transition-colors">
            {showDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            Details voor boekhouder
          </button>

          {showDetails && (
            <div className="mt-3 pt-3 border-t border-gray-100 animate-fade-in-up">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs font-medium text-gray-500 border-b">
                    <th className="pb-2">Rubriek</th>
                    <th className="pb-2 text-right">Omzet</th>
                    <th className="pb-2 text-right">BTW</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  <tr>
                    <td className="py-2 text-gray-600">1a. Hoog tarief (21%)</td>
                    <td className="py-2 text-right tabular-nums">{formatEuro(aangifte.rubriek1a_omzet)}</td>
                    <td className="py-2 text-right tabular-nums">{formatEuro(aangifte.rubriek1a_btw)}</td>
                  </tr>
                  <tr>
                    <td className="py-2 text-gray-600">1b. Laag tarief (9%)</td>
                    <td className="py-2 text-right tabular-nums">{formatEuro(aangifte.rubriek1b_omzet)}</td>
                    <td className="py-2 text-right tabular-nums">{formatEuro(aangifte.rubriek1b_btw)}</td>
                  </tr>
                  <tr>
                    <td className="py-2 text-gray-600">1e. Vrijgesteld (0%)</td>
                    <td className="py-2 text-right tabular-nums">{formatEuro(aangifte.rubriek1e_omzet)}</td>
                    <td className="py-2 text-right">—</td>
                  </tr>
                  {aangifte.rubriek3b_omzet > 0 && (
                    <tr>
                      <td className="py-2 text-gray-600">3b. EU-diensten (verlegde BTW)</td>
                      <td className="py-2 text-right tabular-nums">{formatEuro(aangifte.rubriek3b_omzet)}</td>
                      <td className="py-2 text-right">—</td>
                    </tr>
                  )}
                  {aangifte.rubriek4b_omzet > 0 && (
                    <tr>
                      <td className="py-2 text-gray-600">4b. Buiten EU</td>
                      <td className="py-2 text-right tabular-nums">{formatEuro(aangifte.rubriek4b_omzet)}</td>
                      <td className="py-2 text-right">—</td>
                    </tr>
                  )}
                  <tr>
                    <td className="py-2 text-gray-600">5b. Voorbelasting</td>
                    <td className="py-2 text-right">—</td>
                    <td className="py-2 text-right tabular-nums">{formatEuro(aangifte.rubriek5b)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Per periode overzicht */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900">Overzicht {jaar}</h3>
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          {(['kwartaal', 'maand'] as const).map(w => (
            <button key={w} onClick={() => setWeergave(w)}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-all duration-200 ${weergave === w ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}>
              Per {w}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {periodes.map(p => (
          <div key={p.periode} className="bg-white rounded-xl shadow-card overflow-hidden">
            <div className="px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${p.teBetalen >= 0 ? 'bg-red-400' : 'bg-green-400'}`} />
                <span className="font-medium text-gray-900">{p.periode}</span>
              </div>
              <span className={`font-bold tabular-nums ${p.teBetalen >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                {p.teBetalen >= 0 ? 'Afdragen: ' : 'Terugvragen: '}{formatEuro(Math.abs(p.teBetalen))}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
