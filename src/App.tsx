import React, { useState } from 'react';
import { 
  AlertTriangle, 
  ShieldAlert, 
  Pill, 
  Activity, 
  Bed, 
  Navigation, 
  UserCheck, 
  CheckCircle2, 
  X, 
  ChevronRight,
  TrendingDown,
  Info
} from 'lucide-react';

interface Patient {
  id: number;
  mrn: string;
  name: string;
  age: number;
  gender: string;
  diagnosis: string;
  bed: number;
  status: 'In Bed' | 'In Transit';
  transitDestination?: string;
  losDays: number;
  estDischargeHours: number;
  risks: {
    fall: { score: number; drivers: string[] };
    meds: { score: number; drivers: string[] };
    violence: { score: number; drivers: string[] };
  };
  activeActions: string[];
  override?: { type: string; score: number; reason: string };
}

const INITIAL_PATIENTS: Patient[] = [
  {
    id: 1,
    mrn: 'MRN-44912',
    name: 'Arthur Dent',
    age: 78,
    gender: 'M',
    diagnosis: 'Congestive Heart Failure',
    bed: 1,
    status: 'In Bed',
    losDays: 4,
    estDischargeHours: 18,
    risks: {
      fall: { score: 74, drivers: ['Advanced Age (78y)', 'High-Risk FRID: Benzodiazepine', 'Prior Fall History'] },
      meds: { score: 38, drivers: ['Polypharmacy (>5 concurrent Rx)'] },
      violence: { score: 12, drivers: [] }
    },
    activeActions: ['Bed Guards']
  },
  {
    id: 2,
    mrn: 'MRN-88201',
    name: 'Eleanor Vance',
    age: 82,
    gender: 'F',
    diagnosis: 'Acute Delirium / Sepsis',
    bed: 2,
    status: 'In Transit',
    transitDestination: 'CT Imaging Suite',
    losDays: 1,
    estDischargeHours: 64,
    risks: {
      fall: { score: 86, drivers: ['Transient Ward Departure', 'Acute Delirium', 'STRATIFY Score >= 3'] },
      meds: { score: 55, drivers: ['Admission Reconciliation Phase (<24h)', 'Renal Impairment Adjustment Required'] },
      violence: { score: 68, drivers: ['Acute Delirium Agitation', 'BVC Hostility Score >= 2'] }
    },
    activeActions: ['Assist Toilet', '1:1 Special']
  },
  {
    id: 3,
    mrn: 'MRN-19033',
    name: 'Walter Kovacs',
    age: 64,
    gender: 'M',
    diagnosis: 'Alcohol Withdrawal State',
    bed: 3,
    status: 'In Bed',
    losDays: 2,
    estDischargeHours: 42,
    risks: {
      fall: { score: 45, drivers: ['Tremor / Unsteady Gait'] },
      meds: { score: 40, drivers: ['High-Dose Sedative Protocol'] },
      violence: { score: 78, drivers: ['Alcohol Withdrawal Agitation', 'Prior Code Black Flag'] }
    },
    activeActions: ['Police/Security Flag']
  },
  {
    id: 4,
    mrn: 'MRN-55120',
    name: 'Clara Oswald',
    age: 34,
    gender: 'F',
    diagnosis: 'Post-Op Appendectomy',
    bed: 4,
    status: 'In Bed',
    losDays: 2,
    estDischargeHours: 8,
    risks: {
      fall: { score: 15, drivers: [] },
      meds: { score: 18, drivers: [] },
      violence: { score: 5, drivers: [] }
    },
    activeActions: []
  }
];

const AVAILABLE_ACTIONS = [
  'Bed Guards',
  'Assist Toilet',
  'Walking Frame',
  '1:1 Special',
  'Low Bed Mode',
  'Police/Security Flag'
];

export default function App() {
  const [patients, setPatients] = useState<Patient[]>(INITIAL_PATIENTS);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [activeModalRisk, setActiveModalRisk] = useState<'fall' | 'meds' | 'violence' | null>(null);
  const [overrideScore, setOverrideScore] = useState<string>('');
  const [overrideReason, setOverrideReason] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'ward' | 'num'>('ward');

  const getTierColor = (score: number) => {
    if (score >= 65) return { bg: 'bg-red-500/15', text: 'text-red-400', border: 'border-red-500/30', hex: '#EF4444' };
    if (score >= 33) return { bg: 'bg-amber-500/15', text: 'text-amber-400', border: 'border-amber-500/30', hex: '#F59E0B' };
    return { bg: 'bg-emerald-500/15', text: 'text-emerald-400', border: 'border-emerald-500/30', hex: '#10B981' };
  };

  const toggleAction = (patientId: number, actionName: string) => {
    setPatients(prev => prev.map(p => {
      if (p.id !== patientId) return p;
      const exists = p.activeActions.includes(actionName);
      const newActions = exists 
        ? p.activeActions.filter(a => a !== actionName)
        : [...p.activeActions, actionName];
      
      // Dynamic closed-loop risk impact
      let fallDelta = 0;
      if (actionName === 'Bed Guards' || actionName === 'Low Bed Mode') fallDelta = exists ? 12 : -12;
      if (actionName === 'Assist Toilet') fallDelta = exists ? 8 : -8;

      const newFallScore = Math.max(5, Math.min(95, p.risks.fall.score + fallDelta));
      return {
        ...p,
        activeActions: newActions,
        risks: {
          ...p.risks,
          fall: { ...p.risks.fall, score: newFallScore }
        }
      };
    }));
  };

  const handleOverrideSubmit = () => {
    if (!selectedPatient || !activeModalRisk || !overrideScore) return;
    const numericScore = parseFloat(overrideScore);
    setPatients(prev => prev.map(p => {
      if (p.id !== selectedPatient.id) return p;
      return {
        ...p,
        risks: {
          ...p.risks,
          [activeModalRisk]: {
            ...p.risks[activeModalRisk],
            score: numericScore
          }
        },
        override: {
          type: activeModalRisk,
          score: numericScore,
          reason: overrideReason || 'Clinical judgment adjustment'
        }
      };
    }));
    setActiveModalRisk(null);
    setOverrideScore('');
    setOverrideReason('');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans flex flex-col">
      {/* Top Header */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur px-6 py-4 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-indigo-600 flex items-center justify-center font-black text-white shadow-lg shadow-indigo-600/30">
            PH
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
              PreHaRM Clinical Surveillance Platform
              <span className="text-[10px] uppercase font-semibold bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded border border-indigo-500/30">
                v3.0 Web CDS
              </span>
            </h1>
            <p className="text-xs text-slate-400">Sunrise EMR Real-Time In-Hospital Harm Analytics</p>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-slate-800/80 p-1 rounded-lg border border-slate-700">
          <button 
            onClick={() => setActiveTab('ward')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition ${activeTab === 'ward' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'}`}
          >
            Ward Display
          </button>
          <button 
            onClick={() => setActiveTab('num')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition ${activeTab === 'num' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'}`}
          >
            NUM Overview
          </button>
        </div>
      </header>

      {/* Main Grid Workspace */}
      <main className="flex-1 p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 max-w-7xl mx-auto w-full">
        {/* Spatial Floorplan Map */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                <Navigation className="w-4 h-4 text-indigo-400" />
                Ward 4G — Spatial Bed & Transit Map
              </h2>
              <span className="text-[11px] text-slate-500">Live Spatial Status</span>
            </div>

            <svg viewBox="0 0 400 280" className="w-full h-auto bg-slate-950 rounded-lg p-2 border border-slate-800/80">
              <rect x="20" y="120" width="360" height="40" fill="#1e293b" rx="4" />
              <text x="200" y="145" textAnchor="middle" fill="#64748b" fontSize="10" fontWeight="bold" letterSpacing="1">
                CENTRAL NURSING CORRIDOR
              </text>

              {[
                { bed: 1, x: 30, y: 20 },
                { bed: 2, x: 230, y: 20 },
                { bed: 3, x: 30, y: 180 },
                { bed: 4, x: 230, y: 180 }
              ].map(coord => {
                const p = patients.find(pt => pt.bed === coord.bed);
                const colors = p ? getTierColor(p.risks.fall.score) : { hex: '#334155' };
                return (
                  <g 
                    key={coord.bed} 
                    onClick={() => p && setSelectedPatient(p)}
                    className="cursor-pointer transition hover:opacity-90"
                  >
                    <rect 
                      x={coord.x} 
                      y={coord.y} 
                      width="140" 
                      height="80" 
                      fill="#0f172a" 
                      stroke={colors.hex} 
                      strokeWidth="2" 
                      rx="6"
                    />
                    <text x={coord.x + 10} y={coord.y + 20} fill="#94a3b8" fontSize="11" fontWeight="bold">
                      Bed {coord.bed}
                    </text>
                    {p ? (
                      <>
                        <text x={coord.x + 10} y={coord.y + 38} fill="#f8fafc" fontSize="11" fontWeight="600">
                          {p.name}
                        </text>
                        <text x={coord.x + 10} y={coord.y + 54} fill={p.status === 'In Transit' ? '#38bdf8' : '#64748b'} fontSize="9">
                          {p.status === 'In Transit' ? `Transit: ${p.transitDestination}` : 'Status: In Bed'}
                        </text>
                        <circle cx={coord.x + 120} cy={coord.y + 68} r="5" fill={getTierColor(p.risks.fall.score).hex} />
                        <circle cx={coord.x + 106} cy={coord.y + 68} r="5" fill={getTierColor(p.risks.meds.score).hex} />
                        <circle cx={coord.x + 92} cy={coord.y + 68} r="5" fill={getTierColor(p.risks.violence.score).hex} />
                      </>
                    ) : (
                      <text x={coord.x + 70} y={coord.y + 45} textAnchor="middle" fill="#475569" fontSize="10">Vacant</text>
                    )}
                  </g>
                );
              })}
            </svg>
          </div>

          {/* Unit Aggregate Risk Gauge Panel */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl">
            <h3 className="text-sm font-bold text-slate-200 mb-3 flex items-center gap-2">
              <Activity className="w-4 h-4 text-indigo-400" />
              Ward Mean Acuity Summary
            </h3>
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Falls Avg', val: Math.round(patients.reduce((a, b) => a + b.risks.fall.score, 0) / patients.length), color: 'text-amber-400' },
                { label: 'Meds Avg', val: Math.round(patients.reduce((a, b) => a + b.risks.meds.score, 0) / patients.length), color: 'text-emerald-400' },
                { label: 'Violence Avg', val: Math.round(patients.reduce((a, b) => a + b.risks.violence.score, 0) / patients.length), color: 'text-red-400' }
              ].map((metric, i) => (
                <div key={i} className="bg-slate-950 p-3 rounded-lg border border-slate-800/80 text-center">
                  <div className="text-[11px] text-slate-400 uppercase font-semibold">{metric.label}</div>
                  <div className={`text-xl font-black mt-1 ${metric.color}`}>{metric.val}%</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Patient Interactive Grid */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          <div className="bg-slate-900 border border-slate-800 rounded-xl shadow-xl overflow-hidden">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-slate-200">Patient Risk & Surveillance Grid</h2>
                <p className="text-xs text-slate-400">Click any risk badge to inspect contributing XAI drivers or record an override.</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-950/60 text-[11px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-800">
                    <th className="py-3 px-4">Bed & Patient</th>
                    <th className="py-3 px-3 text-center">Fall Risk</th>
                    <th className="py-3 px-3 text-center">Med Error</th>
                    <th className="py-3 px-3 text-center">Violence</th>
                    <th className="py-3 px-4">Active Mitigations</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-xs">
                  {patients.map(p => {
                    const fallColor = getTierColor(p.risks.fall.score);
                    const medsColor = getTierColor(p.risks.meds.score);
                    const violColor = getTierColor(p.risks.violence.score);

                    return (
                      <tr key={p.id} className="hover:bg-slate-800/40 transition">
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-200 flex items-center gap-1.5">
                            <span className="w-5 h-5 rounded bg-slate-800 flex items-center justify-center text-[10px] text-indigo-300 font-bold border border-slate-700">
                              {p.bed}
                            </span>
                            {p.name}
                          </div>
                          <div className="text-[11px] text-slate-400 mt-0.5">
                            {p.age}y {p.gender} • {p.diagnosis}
                          </div>
                        </td>

                        <td className="py-3 px-3 text-center">
                          <button
                            onClick={() => { setSelectedPatient(p); setActiveModalRisk('fall'); }}
                            className={`px-2.5 py-1 rounded font-bold border ${fallColor.bg} ${fallColor.text} ${fallColor.border} transition hover:scale-105`}
                          >
                            {p.risks.fall.score}%
                          </button>
                        </td>

                        <td className="py-3 px-3 text-center">
                          <button
                            onClick={() => { setSelectedPatient(p); setActiveModalRisk('meds'); }}
                            className={`px-2.5 py-1 rounded font-bold border ${medsColor.bg} ${medsColor.text} ${medsColor.border} transition hover:scale-105`}
                          >
                            {p.risks.meds.score}%
                          </button>
                        </td>

                        <td className="py-3 px-3 text-center">
                          <button
                            onClick={() => { setSelectedPatient(p); setActiveModalRisk('violence'); }}
                            className={`px-2.5 py-1 rounded font-bold border ${violColor.bg} ${violColor.text} ${violColor.border} transition hover:scale-105`}
                          >
                            {p.risks.violence.score}%
                          </button>
                        </td>

                        <td className="py-3 px-4">
                          <div className="flex flex-wrap gap-1">
                            {p.activeActions.map((act, i) => (
                              <span key={i} className="bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 px-2 py-0.5 rounded text-[10px] font-medium">
                                {act}
                              </span>
                            ))}
                            <button
                              onClick={() => setSelectedPatient(p)}
                              className="text-[10px] text-slate-400 hover:text-indigo-400 underline ml-1"
                            >
                              Edit
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Intervention Bundles Panel */}
          {selectedPatient && !activeModalRisk && (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl">
              <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-200">
                    Clinical Action Bundles for Bed {selectedPatient.bed} ({selectedPatient.name})
                  </h3>
                  <p className="text-xs text-slate-400">Selecting mitigations dynamically recalculates in-hospital risk scores.</p>
                </div>
                <button onClick={() => setSelectedPatient(null)} className="text-slate-400 hover:text-slate-200">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {AVAILABLE_ACTIONS.map(action => {
                  const isActive = selectedPatient.activeActions.includes(action);
                  return (
                    <button
                      key={action}
                      onClick={() => toggleAction(selectedPatient.id, action)}
                      className={`p-2.5 rounded-lg border text-left text-xs font-medium flex items-center justify-between transition ${
                        isActive 
                          ? 'bg-indigo-600/20 border-indigo-500 text-indigo-200 shadow' 
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <span>{action}</span>
                      {isActive && <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* XAI Contributing Drivers & Clinician Override Modal */}
      {selectedPatient && activeModalRisk && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-lg w-full p-6 shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-100 uppercase tracking-tight">
                  {activeModalRisk === 'fall' ? 'In-Hospital Fall Prediction' : activeModalRisk === 'meds' ? 'Medication Error Risk' : 'Patient Aggression / Code Black'}
                </h3>
                <p className="text-xs text-slate-400">
                  Bed {selectedPatient.bed} • {selectedPatient.name} ({selectedPatient.mrn})
                </p>
              </div>
              <div className={`text-2xl font-black ${getTierColor(selectedPatient.risks[activeModalRisk].score).text}`}>
                {selectedPatient.risks[activeModalRisk].score}%
              </div>
            </div>

            {/* XAI Drivers */}
            <div className="mb-5">
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 text-indigo-400" />
                Contributing Sunrise EMR Clinical Drivers
              </h4>
              <div className="space-y-1.5">
                {selectedPatient.risks[activeModalRisk].drivers.length > 0 ? (
                  selectedPatient.risks[activeModalRisk].drivers.map((driver, idx) => (
                    <div key={idx} className="text-xs bg-slate-950 p-2.5 rounded border border-slate-800 text-slate-200 flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-amber-400 rounded-full" />
                      {driver}
                    </div>
                  ))
                ) : (
                  <div className="text-xs text-slate-500 italic bg-slate-950 p-2.5 rounded border border-slate-800">
                    No elevated empirical risk indicators identified.
                  </div>
                )}
              </div>
            </div>

            {/* Override Controls */}
            <div className="border-t border-slate-800 pt-4">
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                Clinician Risk Override
              </h4>
              <div className="grid grid-cols-3 gap-2 mb-3">
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">Adjusted %</label>
                  <input
                    type="number"
                    placeholder="0-100"
                    value={overrideScore}
                    onChange={e => setOverrideScore(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div className="col-span-2">
                  <label className="text-[10px] text-slate-400 block mb-1">Clinical Justification</label>
                  <input
                    type="text"
                    placeholder="e.g. Constant visual surveillance arranged"
                    value={overrideReason}
                    onChange={e => setOverrideReason(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 mt-4">
                <button
                  onClick={() => setActiveModalRisk(null)}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded font-medium transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleOverrideSubmit}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs rounded font-medium transition shadow-lg shadow-indigo-600/30"
                >
                  Save Override Log
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
