import React, { useState, useEffect } from 'react';
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
  TrendingDown,
  Info,
  Users,
  Calendar,
  ArrowRightLeft,
  Clock,
  AlertCircle,
  Database,
  Send,
  RefreshCw,
  ExternalLink,
  Code
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
  fhirId?: string;
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
  const [activeTab, setActiveTab] = useState<'ward' | 'num' | 'fhir'>('ward');

  // FHIR State
  const [fhirJsonModal, setFhirJsonModal] = useState<any | null>(null);
  const [fhirSyncLoading, setFhirSyncLoading] = useState<boolean>(false);
  const [fhirSyncStatus, setFhirSyncStatus] = useState<string | null>(null);
  const [hapiResponse, setHapiResponse] = useState<any | null>(null);

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

  // Generate FHIR R4 RiskAssessment Resource
  const generateFhirPayload = (p: Patient) => {
    return {
      resourceType: "RiskAssessment",
      status: "final",
      subject: {
        reference: `Patient/${p.mrn}`,
        display: p.name
      },
      occurrenceDateTime: new Date().toISOString(),
      code: {
        coding: [
          {
            system: "http://snomed.info/sct",
            code: "129839007",
            display: "At risk for falls"
          }
        ]
      },
      prediction: [
        {
          outcome: { text: "In-Hospital Fall" },
          probabilityDecimal: p.risks.fall.score / 100,
          qualitativeRisk: {
            coding: [
              {
                system: "http://terminology.hl7.org/CodeSystem/risk-probability",
                code: p.risks.fall.score >= 65 ? "high" : p.risks.fall.score >= 33 ? "moderate" : "low"
              }
            ]
          },
          rationale: p.risks.fall.drivers.join("; ")
        },
        {
          outcome: { text: "Medication Administration Safety Error" },
          probabilityDecimal: p.risks.meds.score / 100,
          qualitativeRisk: {
            coding: [
              {
                system: "http://terminology.hl7.org/CodeSystem/risk-probability",
                code: p.risks.meds.score >= 65 ? "high" : p.risks.meds.score >= 33 ? "moderate" : "low"
              }
            ]
          },
          rationale: p.risks.meds.drivers.join("; ")
        }
      ],
      mitigation: p.activeActions.join(", "),
      note: p.override ? [{ text: `Clinician Override: ${p.override.reason} (Adjusted to ${p.override.score}%)` }] : []
    };
  };

  // Transmit directly to Live HAPI FHIR R4 Public Server
  const transmitToHapiFhir = async (p: Patient) => {
    setFhirSyncLoading(true);
    setFhirSyncStatus(`Submitting ${p.name} RiskAssessment to HAPI FHIR R4...`);
    try {
      const payload = generateFhirPayload(p);
      const res = await fetch('https://hapi.fhir.org/baseR4/RiskAssessment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/fhir+json',
          'Accept': 'application/fhir+json'
        },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      setHapiResponse(data);
      setFhirSyncStatus(`Success! Resource stored with HAPI FHIR ID: ${data.id}`);
      setPatients(prev => prev.map(pt => pt.id === p.id ? { ...pt, fhirId: data.id } : pt));
    } catch (err: any) {
      console.error(err);
      setFhirSyncStatus(`Failed to connect to HAPI FHIR: ${err.message}`);
    } finally {
      setFhirSyncLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans flex flex-col">
      {/* Top Header */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur px-6 py-4 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-indigo-600 flex items-center justify-center font-black text-white shadow-lg shadow-indigo-600/30">
            AU
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
              PreHaRM Clinical Surveillance Dashboard
              <span className="text-[10px] uppercase font-semibold bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded border border-indigo-500/30">
                v0.1 FHIR R4
              </span>
            </h1>
            <p className="text-xs text-slate-400">Real-Time In-Hospital Harm Analytics</p>
          </div>
        </div>

        {/* View Switchers */}
        <div className="flex items-center gap-2 bg-slate-800/80 p-1 rounded-lg border border-slate-700">
          <button 
            onClick={() => setActiveTab('ward')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition cursor-pointer ${
              activeTab === 'ward' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Ward Display
          </button>
          <button 
            onClick={() => setActiveTab('num')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition cursor-pointer ${
              activeTab === 'num' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            NUM Overview
          </button>
          <button 
            onClick={() => setActiveTab('fhir')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'fhir' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Database className="w-3.5 h-3.5 text-emerald-400" />
            HAPI FHIR Live API
          </button>
        </div>
      </header>

      {/* View 1: Ward Display */}
      {activeTab === 'ward' && (
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

            {/* Mean Acuity Summary */}
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
                  <p className="text-xs text-slate-400">Click badges for XAI drivers or &lt;FHIR&gt; to generate HL7 payloads.</p>
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
                      <th className="py-3 px-4">FHIR R4</th>
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
                              className={`px-2.5 py-1 rounded font-bold border cursor-pointer ${fallColor.bg} ${fallColor.text} ${fallColor.border} transition hover:scale-105`}
                            >
                              {p.risks.fall.score}%
                            </button>
                          </td>

                          <td className="py-3 px-3 text-center">
                            <button
                              onClick={() => { setSelectedPatient(p); setActiveModalRisk('meds'); }}
                              className={`px-2.5 py-1 rounded font-bold border cursor-pointer ${medsColor.bg} ${medsColor.text} ${medsColor.border} transition hover:scale-105`}
                            >
                              {p.risks.meds.score}%
                            </button>
                          </td>

                          <td className="py-3 px-3 text-center">
                            <button
                              onClick={() => { setSelectedPatient(p); setActiveModalRisk('violence'); }}
                              className={`px-2.5 py-1 rounded font-bold border cursor-pointer ${violColor.bg} ${violColor.text} ${violColor.border} transition hover:scale-105`}
                            >
                              {p.risks.violence.score}%
                            </button>
                          </td>

                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => setFhirJsonModal(generateFhirPayload(p))}
                                className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-indigo-300 border border-indigo-500/30 rounded text-[10px] font-mono font-bold flex items-center gap-1 transition cursor-pointer"
                              >
                                <Code className="w-3 h-3" /> JSON
                              </button>
                              <button
                                onClick={() => transmitToHapiFhir(p)}
                                className="px-2 py-1 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 rounded text-[10px] font-medium flex items-center gap-1 transition cursor-pointer"
                              >
                                <Send className="w-3 h-3" /> Sync HAPI
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

            {/* Action Bundles Panel */}
            {selectedPatient && !activeModalRisk && (
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl">
                <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-3">
                  <div>
                    <h3 className="text-sm font-bold text-slate-200">
                      Clinical Action Bundles for Bed {selectedPatient.bed} ({selectedPatient.name})
                    </h3>
                    <p className="text-xs text-slate-400">Selecting mitigations dynamically recalculates in-hospital risk scores.</p>
                  </div>
                  <button onClick={() => setSelectedPatient(null)} className="text-slate-400 hover:text-slate-200 cursor-pointer">
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
                        className={`p-2.5 rounded-lg border text-left text-xs font-medium flex items-center justify-between transition cursor-pointer ${
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
      )}

      {/* View 2: NUM Overview */}
      {activeTab === 'num' && (
        <main className="flex-1 p-6 max-w-7xl mx-auto w-full space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                <Bed className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-slate-400 uppercase font-semibold">Ward Occupancy</p>
                <p className="text-xl font-black text-white">4 / 4 (100%)</p>
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-slate-400 uppercase font-semibold">Roster Ratio</p>
                <p className="text-xl font-black text-white">1:2 <span className="text-xs font-normal text-emerald-400">Optimal</span></p>
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-slate-400 uppercase font-semibold">Est. Discharges &lt;24h</p>
                <p className="text-xl font-black text-white">2 Patients</p>
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-slate-400 uppercase font-semibold">High Acuity Beds</p>
                <p className="text-xl font-black text-red-400">3 Beds</p>
              </div>
            </div>
          </div>

          {/* 7-Day Matrix */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl">
            <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
              <div>
                <h2 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-indigo-400" />
                  7-Day Forward Risk Forecast by Shift
                </h2>
                <p className="text-xs text-slate-400">Projected risk scores per shift based on planned admissions and staffing skill-mix.</p>
              </div>
              <span className="text-[10px] bg-slate-800 text-slate-300 border border-slate-700 px-2 py-1 rounded font-medium">
                Traffic Light Matrix
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-center border-collapse">
                <thead>
                  <tr className="bg-slate-950/60 text-[11px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-800">
                    <th className="py-2.5 px-3 text-left">Risk Domain</th>
                    <th className="py-2.5 px-2">Mon (AM)</th>
                    <th className="py-2.5 px-2">Mon (PM)</th>
                    <th className="py-2.5 px-2">Mon (Night)</th>
                    <th className="py-2.5 px-2">Tue (AM)</th>
                    <th className="py-2.5 px-2">Tue (PM)</th>
                    <th className="py-2.5 px-2">Tue (Night)</th>
                    <th className="py-2.5 px-2">Wed (AM)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-xs">
                  <tr>
                    <td className="py-3 px-3 text-left font-bold text-slate-300 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-amber-400" /> Falls
                    </td>
                    <td className="py-2 px-2"><span className="px-2 py-1 rounded font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">55%</span></td>
                    <td className="py-2 px-2"><span className="px-2 py-1 rounded font-bold bg-red-500/20 text-red-400 border border-red-500/30">72%</span></td>
                    <td className="py-2 px-2"><span className="px-2 py-1 rounded font-bold bg-red-500/20 text-red-400 border border-red-500/30">80%</span></td>
                    <td className="py-2 px-2"><span className="px-2 py-1 rounded font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">48%</span></td>
                    <td className="py-2 px-2"><span className="px-2 py-1 rounded font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">52%</span></td>
                    <td className="py-2 px-2"><span className="px-2 py-1 rounded font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">30%</span></td>
                    <td className="py-2 px-2"><span className="px-2 py-1 rounded font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">25%</span></td>
                  </tr>
                  <tr>
                    <td className="py-3 px-3 text-left font-bold text-slate-300 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-400" /> Medication Safety
                    </td>
                    <td className="py-2 px-2"><span className="px-2 py-1 rounded font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">28%</span></td>
                    <td className="py-2 px-2"><span className="px-2 py-1 rounded font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">42%</span></td>
                    <td className="py-2 px-2"><span className="px-2 py-1 rounded font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">45%</span></td>
                    <td className="py-2 px-2"><span className="px-2 py-1 rounded font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">20%</span></td>
                    <td className="py-2 px-2"><span className="px-2 py-1 rounded font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">24%</span></td>
                    <td className="py-2 px-2"><span className="px-2 py-1 rounded font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">18%</span></td>
                    <td className="py-2 px-2"><span className="px-2 py-1 rounded font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">15%</span></td>
                  </tr>
                  <tr>
                    <td className="py-3 px-3 text-left font-bold text-slate-300 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-red-400" /> Violence / Code Black
                    </td>
                    <td className="py-2 px-2"><span className="px-2 py-1 rounded font-bold bg-red-500/20 text-red-400 border border-red-500/30">65%</span></td>
                    <td className="py-2 px-2"><span className="px-2 py-1 rounded font-bold bg-red-500/20 text-red-400 border border-red-500/30">78%</span></td>
                    <td className="py-2 px-2"><span className="px-2 py-1 rounded font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">50%</span></td>
                    <td className="py-2 px-2"><span className="px-2 py-1 rounded font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">35%</span></td>
                    <td className="py-2 px-2"><span className="px-2 py-1 rounded font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">20%</span></td>
                    <td className="py-2 px-2"><span className="px-2 py-1 rounded font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">15%</span></td>
                    <td className="py-2 px-2"><span className="px-2 py-1 rounded font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">10%</span></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </main>
      )}

      {/* View 3: Live HAPI FHIR Server Explorer */}
      {activeTab === 'fhir' && (
        <main className="flex-1 p-6 max-w-7xl mx-auto w-full space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <Database className="w-5 h-5 text-emerald-400" />
                  Live HL7 FHIR R4 Public Server Integration
                </h2>
                <p className="text-xs text-slate-400">
                  Direct RESTful transactions with public test endpoint: <code className="text-indigo-300 font-mono">https://hapi.fhir.org/baseR4/RiskAssessment</code>
                </p>
              </div>
              <a 
                href="https://hapi.fhir.org/baseR4/RiskAssessment?_pretty=true" 
                target="_blank" 
                rel="noreferrer"
                className="flex items-center gap-1.5 text-xs bg-slate-800 text-indigo-300 px-3 py-1.5 rounded-lg border border-slate-700 hover:bg-slate-700 transition"
              >
                Open HAPI Server <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>

            {fhirSyncStatus && (
              <div className="mb-4 p-3 bg-slate-950 border border-emerald-500/30 text-emerald-300 rounded-lg text-xs font-mono flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                {fhirSyncStatus}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-6">
              {patients.map(p => (
                <button
                  key={p.id}
                  disabled={fhirSyncLoading}
                  onClick={() => transmitToHapiFhir(p)}
                  className="p-3 bg-slate-950 border border-slate-800 hover:border-indigo-500/50 rounded-lg text-left transition cursor-pointer"
                >
                  <p className="font-bold text-xs text-slate-200">Bed {p.bed}: {p.name}</p>
                  <p className="text-[10px] text-slate-400 mt-1">Falls: {p.risks.fall.score}% • Meds: {p.risks.meds.score}%</p>
                  <div className="mt-2 text-[10px] font-mono text-indigo-400 flex items-center gap-1">
                    <Send className="w-3 h-3" /> Transmit to HAPI
                  </div>
                </button>
              ))}
            </div>

            {hapiResponse && (
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                  Server Response Payload (Received from HAPI FHIR R4):
                </h3>
                <pre className="text-xs font-mono text-emerald-400 bg-slate-950 p-4 rounded-lg border border-slate-800 overflow-x-auto max-h-96">
                  {JSON.stringify(hapiResponse, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </main>
      )}

      {/* Modal: View Generated FHIR JSON */}
      {fhirJsonModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-2xl w-full p-6 shadow-2xl flex flex-col max-h-[85vh]">
            <div className="flex justify-between items-center mb-3 border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                  <Code className="w-4 h-4 text-indigo-400" />
                  HL7 FHIR R4 RiskAssessment Resource
                </h3>
                <p className="text-xs text-slate-400">Validated against SNOMED CT & HL7 Risk-Probability terminology.</p>
              </div>
              <button onClick={() => setFhirJsonModal(null)} className="text-slate-400 hover:text-slate-200 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <pre className="flex-1 text-xs font-mono text-emerald-400 bg-slate-950 p-4 rounded-lg border border-slate-800 overflow-auto">
              {JSON.stringify(fhirJsonModal, null, 2)}
            </pre>

            <div className="flex justify-end mt-4">
              <button 
                onClick={() => setFhirJsonModal(null)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium rounded-lg cursor-pointer"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}

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
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded font-medium transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleOverrideSubmit}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs rounded font-medium transition shadow-lg shadow-indigo-600/30 cursor-pointer"
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
