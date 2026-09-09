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
  TrendingDown,
  Info,
  Users,
  Calendar,
  Clock,
  AlertCircle,
  Database,
  Send,
  ExternalLink,
  Code,
  Building2,
  ChevronDown
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
  const [selectedHospital, setSelectedHospital] = useState('Royal Adelaide Hospital (CALHN)');

  // FHIR State
  const [fhirJsonModal, setFhirJsonModal] = useState<any | null>(null);
  const [fhirSyncLoading, setFhirSyncLoading] = useState<boolean>(false);
  const [fhirSyncStatus, setFhirSyncStatus] = useState<string | null>(null);
  const [hapiResponse, setHapiResponse] = useState<any | null>(null);

  // SA Health Accessible Status Tiers
  const getBadgeStyle = (score: number) => {
    if (score >= 65) {
      return { 
        bg: 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100', 
        badgeBg: 'bg-red-600', 
        tier: 'High', 
        hex: '#DC2626' 
      };
    }
    if (score >= 33) {
      return { 
        bg: 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100', 
        badgeBg: 'bg-amber-500', 
        tier: 'Medium', 
        hex: '#D97706' 
      };
    }
    return { 
      bg: 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100', 
      badgeBg: 'bg-emerald-600', 
      tier: 'Low', 
      hex: '#16A34A' 
    };
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
        display: p.name,
        identifier: {
          system: "http://hospital.health.sa.gov.au/mrn",
          value: p.mrn
        }
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

  const fallAvg = Math.round(patients.reduce((a, b) => a + b.risks.fall.score, 0) / patients.length);
  const medsAvg = Math.round(patients.reduce((a, b) => a + b.risks.meds.score, 0) / patients.length);
  const violAvg = Math.round(patients.reduce((a, b) => a + b.risks.violence.score, 0) / patients.length);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col">
      {/* SA Health Corporate Brand Header */}
      <div className="bg-[#002B49] text-white px-6 py-2.5 text-xs flex justify-between items-center border-b border-[#003865]">
        <div className="flex items-center gap-2">
          <span className="font-bold tracking-wider uppercase text-[11px] text-blue-200">Government of South Australia</span>
          <span className="text-slate-400">|</span>
          <span className="font-semibold text-slate-200">SA Health Clinical Prediction & Safety</span>
        </div>
        <div className="flex items-center gap-4 text-[11px] text-slate-300">
          <span className="hidden sm:inline">EMR Realtime Feed</span>
          <span className="inline-flex items-center gap-1.5 text-emerald-300 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span> Systems Active
          </span>
        </div>
      </div>

      {/* Main Clinical Navigation Bar */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 shadow-xs sticky top-0 z-30">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#0072CE] flex items-center justify-center font-bold text-white shadow-xs">
              AU
            </div>
            <div>
              <h1 className="text-lg font-bold text-[#002B49] flex items-center gap-2">
                PreHaRM Patient Safety & Risk Surveillance
                <span className="text-[10px] font-semibold bg-blue-50 text-[#0072CE] border border-blue-200 px-2 py-0.5 rounded">
                  v0.1 FHIR R4
                </span>
              </h1>
              <p className="text-xs text-slate-500">Continuous In-Hospital Risk Detection for Falls, Medication Safety & Aggression</p>
            </div>
          </div>

          {/* Facility Dropdown and Navigation Switchers */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-300 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-700">
              <Building2 className="w-3.5 h-3.5 text-[#0072CE]" />
              <select 
                value={selectedHospital} 
                onChange={(e) => setSelectedHospital(e.target.value)}
                className="bg-transparent border-none outline-none font-semibold text-slate-800 cursor-pointer"
              >
                <option>Royal Adelaide Hospital (CALHN)</option>
                <option>Queen Elizabeth Hospital (CALHN)</option>
                <option>Flinders Medical Centre (SALHN)</option>
                <option>Lyell McEwin Hospital (NALHN)</option>
              </select>
            </div>

            <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs">
              <button
                onClick={() => setActiveTab('ward')}
                className={`px-3 py-1.5 rounded-md font-semibold transition cursor-pointer ${
                  activeTab === 'ward' ? 'bg-[#002B49] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Ward View
              </button>
              <button
                onClick={() => setActiveTab('num')}
                className={`px-3 py-1.5 rounded-md font-semibold transition cursor-pointer ${
                  activeTab === 'num' ? 'bg-[#002B49] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                NUM Overview
              </button>
              <button
                onClick={() => setActiveTab('fhir')}
                className={`px-3 py-1.5 rounded-md font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'fhir' ? 'bg-[#0072CE] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Database className="w-3.5 h-3.5" /> HAPI FHIR
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* SA Health Operational Capacity & Context Strip */}
      <section className="bg-white border-b border-slate-200 py-3 px-6 shadow-xs">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4 text-xs">
          <div className="flex flex-wrap items-center gap-6">
            <div>
              <span className="text-slate-500 uppercase font-semibold text-[10px]">Location:</span>
              <span className="font-bold text-slate-900 ml-1.5">Ward 4G (General Medicine / Cardiology)</span>
            </div>
            <div>
              <span className="text-slate-500 uppercase font-semibold text-[10px]">Bed Capacity:</span>
              <span className="font-bold text-slate-900 ml-1.5">4 Inpatient Beds</span>
            </div>
            <div>
              <span className="text-slate-500 uppercase font-semibold text-[10px]">Occupancy Status:</span>
              <span className="font-bold text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded ml-1.5">
                4 / 4 (100% - Fully Occupied)
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-slate-500 uppercase font-semibold text-[10px]">Last EMR Sync:</span>
            <span className="font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">Real-time Stream</span>
          </div>
        </div>
      </section>

      {/* View 1: Ward View */}
      {activeTab === 'ward' && (
        <main className="flex-1 p-6 max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Floorplan Map and Acuity Overview */}
          <div className="lg:col-span-5 flex flex-col gap-6">
            {/* Spatial Bed Map */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                <h2 className="text-sm font-bold text-[#002B49] flex items-center gap-2">
                  <Navigation className="w-4 h-4 text-[#0072CE]" />
                  Ward Spatial Bed Status
                </h2>
                <span className="text-[11px] text-slate-500 font-medium">Floor Level 4</span>
              </div>

              <svg viewBox="0 0 400 280" className="w-full h-auto bg-slate-50 rounded-lg p-2 border border-slate-200">
                <rect x="20" y="120" width="360" height="40" fill="#e2e8f0" rx="4" />
                <text x="200" y="145" textAnchor="middle" fill="#475569" fontSize="10" fontWeight="bold" letterSpacing="1">
                  CENTRAL WARD CORRIDOR
                </text>

                {[
                  { bed: 1, x: 30, y: 20 },
                  { bed: 2, x: 230, y: 20 },
                  { bed: 3, x: 30, y: 180 },
                  { bed: 4, x: 230, y: 180 }
                ].map(coord => {
                  const p = patients.find(pt => pt.bed === coord.bed);
                  const isHigh = p ? p.risks.fall.score >= 65 : false;
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
                        fill="#ffffff" 
                        stroke={isHigh ? '#dc2626' : '#cbd5e1'} 
                        strokeWidth={isHigh ? '2.5' : '1.5'} 
                        rx="6"
                      />
                      <text x={coord.x + 10} y={coord.y + 20} fill="#64748b" fontSize="11" fontWeight="bold">
                        Bed {coord.bed}
                      </text>
                      {p ? (
                        <>
                          <text x={coord.x + 10} y={coord.y + 38} fill="#0f172a" fontSize="11" fontWeight="bold">
                            {p.name}
                          </text>
                          <text x={coord.x + 10} y={coord.y + 54} fill={p.status === 'In Transit' ? '#0284c7' : '#64748b'} fontSize="9" fontWeight="600">
                            {p.status === 'In Transit' ? `Transit: ${p.transitDestination}` : 'Status: In Bed'}
                          </text>
                          <circle cx={coord.x + 120} cy={coord.y + 68} r="5" fill={getBadgeStyle(p.risks.fall.score).hex} />
                          <circle cx={coord.x + 106} cy={coord.y + 68} r="5" fill={getBadgeStyle(p.risks.meds.score).hex} />
                          <circle cx={coord.x + 92} cy={coord.y + 68} r="5" fill={getBadgeStyle(p.risks.violence.score).hex} />
                        </>
                      ) : (
                        <text x={coord.x + 70} y={coord.y + 45} textAnchor="middle" fill="#94a3b8" fontSize="10">Available</text>
                      )}
                    </g>
                  );
                })}
              </svg>
            </div>

            {/* Mean Acuity Overview */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
              <h3 className="text-sm font-bold text-[#002B49] mb-3 flex items-center gap-2">
                <Activity className="w-4 h-4 text-[#0072CE]" />
                Ward Average Acuity Overview
              </h3>
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-slate-50 border border-slate-200 p-3 rounded-lg text-center">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase">Falls Risk</span>
                  <div className="text-xl font-black text-amber-700 mt-1">{fallAvg}%</div>
                  <span className="text-[10px] text-amber-600 font-medium">Moderate</span>
                </div>
                <div className="bg-slate-50 border border-slate-200 p-3 rounded-lg text-center">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase">Medication</span>
                  <div className="text-xl font-black text-emerald-700 mt-1">{medsAvg}%</div>
                  <span className="text-[10px] text-emerald-600 font-medium">Low Burden</span>
                </div>
                <div className="bg-slate-50 border border-slate-200 p-3 rounded-lg text-center">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase">Aggression</span>
                  <div className="text-xl font-black text-red-700 mt-1">{violAvg}%</div>
                  <span className="text-[10px] text-red-600 font-medium">Elevated</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Patient Grid Table */}
          <div className="lg:col-span-7 flex flex-col gap-6">
            <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
              <div className="p-4 border-b border-slate-200 bg-slate-50/70 flex justify-between items-center">
                <div>
                  <h2 className="text-sm font-bold text-[#002B49]">Current Inpatient Safety Grid</h2>
                  <p className="text-xs text-slate-500">Real-time risk scoring. Click badges for clinical drivers or &lt;JSON&gt; for FHIR.</p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-100/80 text-[11px] font-bold text-slate-600 uppercase border-b border-slate-200">
                      <th className="py-3 px-4">Bed & Patient</th>
                      <th className="py-3 px-3 text-center">Fall Risk</th>
                      <th className="py-3 px-3 text-center">Med Safety</th>
                      <th className="py-3 px-3 text-center">Aggression</th>
                      <th className="py-3 px-4">FHIR R4</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {patients.map(p => {
                      const fall = getBadgeStyle(p.risks.fall.score);
                      const meds = getBadgeStyle(p.risks.meds.score);
                      const viol = getBadgeStyle(p.risks.violence.score);

                      return (
                        <tr key={p.id} className="hover:bg-slate-50/80 transition">
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-slate-900 flex items-center gap-2">
                              <span className="w-5 h-5 rounded bg-slate-100 border border-slate-300 flex items-center justify-center text-[10px] text-slate-700 font-bold">
                                {p.bed}
                              </span>
                              {p.name}
                            </div>
                            <div className="text-[11px] text-slate-500 mt-0.5">
                              {p.age}y {p.gender} • {p.diagnosis}
                            </div>
                          </td>

                          <td className="py-3.5 px-3 text-center">
                            <button
                              onClick={() => { setSelectedPatient(p); setActiveModalRisk('fall'); }}
                              className={`px-2.5 py-1 rounded font-bold border transition cursor-pointer ${fall.bg}`}
                            >
                              {p.risks.fall.score}%
                            </button>
                          </td>

                          <td className="py-3.5 px-3 text-center">
                            <button
                              onClick={() => { setSelectedPatient(p); setActiveModalRisk('meds'); }}
                              className={`px-2.5 py-1 rounded font-bold border transition cursor-pointer ${meds.bg}`}
                            >
                              {p.risks.meds.score}%
                            </button>
                          </td>

                          <td className="py-3.5 px-3 text-center">
                            <button
                              onClick={() => { setSelectedPatient(p); setActiveModalRisk('violence'); }}
                              className={`px-2.5 py-1 rounded font-bold border transition cursor-pointer ${viol.bg}`}
                            >
                              {p.risks.violence.score}%
                            </button>
                          </td>

                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => setFhirJsonModal(generateFhirPayload(p))}
                                className="px-2 py-1 bg-white border border-slate-300 hover:border-slate-400 rounded text-[10px] font-mono font-bold text-slate-700 flex items-center gap-1 cursor-pointer transition"
                              >
                                <Code className="w-3 h-3 text-[#0072CE]" /> JSON
                              </button>
                              <button
                                disabled={fhirSyncLoading}
                                onClick={() => transmitToHapiFhir(p)}
                                className="px-2 py-1 bg-[#0072CE] hover:bg-blue-600 text-white rounded text-[10px] font-semibold flex items-center gap-1 cursor-pointer shadow-xs transition"
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
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
                <div className="flex justify-between items-center pb-3 border-b border-slate-200 mb-3">
                  <div>
                    <h3 className="text-sm font-bold text-[#002B49]">
                      Clinical Safety Actions: Bed {selectedPatient.bed} ({selectedPatient.name})
                    </h3>
                    <p className="text-xs text-slate-500">Selecting mitigations dynamically adjusts the active fall risk probability.</p>
                  </div>
                  <button onClick={() => setSelectedPatient(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
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
                        className={`p-2.5 rounded-lg border text-left text-xs font-semibold flex items-center justify-between transition cursor-pointer ${
                          isActive 
                            ? 'bg-blue-50 border-[#0072CE] text-[#0072CE] shadow-xs' 
                            : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                        }`}
                      >
                        <span>{action}</span>
                        {isActive && <CheckCircle2 className="w-3.5 h-3.5 text-[#0072CE]" />}
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
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
              <span className="text-[11px] font-bold text-slate-500 uppercase">Current Ward Acuity</span>
              <div className="text-2xl font-black text-[#002B49] mt-1">High (Level 3)</div>
              <p className="text-[11px] text-amber-600 mt-1 font-medium">3 of 4 patients with high risk alerts</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
              <span className="text-[11px] font-bold text-slate-500 uppercase">Roster Staffing Ratio</span>
              <div className="text-2xl font-black text-emerald-700 mt-1">1:2</div>
              <p className="text-[11px] text-emerald-600 mt-1 font-medium">Within SA Health clinical award benchmark</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
              <span className="text-[11px] font-bold text-slate-500 uppercase">Discharges Planned &lt;24h</span>
              <div className="text-2xl font-black text-[#0072CE] mt-1">2 Beds</div>
              <p className="text-[11px] text-slate-500 mt-1 font-medium">Bed 1 (18h) & Bed 4 (8h)</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
              <span className="text-[11px] font-bold text-slate-500 uppercase">Active Transit Multipliers</span>
              <div className="text-2xl font-black text-red-600 mt-1">1 Active</div>
              <p className="text-[11px] text-red-600 mt-1 font-medium">Eleanor Vance (Bed 2) in CT Imaging</p>
            </div>
          </div>

          {/* 7-Day Forward Forecast Table */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
              <div>
                <h2 className="text-sm font-bold text-[#002B49]">7-Day Forward Risk Forecast by Shift (Morning, Evening, Night)</h2>
                <p className="text-xs text-slate-500">Projected unit risk based on scheduled procedures, planned admissions, and roster mix.</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-center border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100/70 text-[11px] font-bold text-slate-600 uppercase border-b border-slate-200">
                    <th className="py-3 px-4 text-left">Clinical Domain</th>
                    <th className="py-3 px-2">Mon (AM)</th>
                    <th className="py-3 px-2">Mon (PM)</th>
                    <th className="py-3 px-2">Mon (Night)</th>
                    <th className="py-3 px-2">Tue (AM)</th>
                    <th className="py-3 px-2">Tue (PM)</th>
                    <th className="py-3 px-2">Tue (Night)</th>
                    <th className="py-3 px-2">Wed (AM)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  <tr>
                    <td className="py-3 px-4 text-left font-bold text-slate-800">In-Hospital Falls</td>
                    <td className="py-2.5 px-2"><span className="px-2 py-0.5 rounded font-bold bg-amber-50 text-amber-800 border border-amber-200">55%</span></td>
                    <td className="py-2.5 px-2"><span className="px-2 py-0.5 rounded font-bold bg-red-50 text-red-700 border border-red-200">72%</span></td>
                    <td className="py-2.5 px-2"><span className="px-2 py-0.5 rounded font-bold bg-red-50 text-red-700 border border-red-200">80%</span></td>
                    <td className="py-2.5 px-2"><span className="px-2 py-0.5 rounded font-bold bg-amber-50 text-amber-800 border border-amber-200">48%</span></td>
                    <td className="py-2.5 px-2"><span className="px-2 py-0.5 rounded font-bold bg-amber-50 text-amber-800 border border-amber-200">52%</span></td>
                    <td className="py-2.5 px-2"><span className="px-2 py-0.5 rounded font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">30%</span></td>
                    <td className="py-2.5 px-2"><span className="px-2 py-0.5 rounded font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">25%</span></td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4 text-left font-bold text-slate-800">Medication Safety</td>
                    <td className="py-2.5 px-2"><span className="px-2 py-0.5 rounded font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">28%</span></td>
                    <td className="py-2.5 px-2"><span className="px-2 py-0.5 rounded font-bold bg-amber-50 text-amber-800 border border-amber-200">42%</span></td>
                    <td className="py-2.5 px-2"><span className="px-2 py-0.5 rounded font-bold bg-amber-50 text-amber-800 border border-amber-200">45%</span></td>
                    <td className="py-2.5 px-2"><span className="px-2 py-0.5 rounded font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">20%</span></td>
                    <td className="py-2.5 px-2"><span className="px-2 py-0.5 rounded font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">24%</span></td>
                    <td className="py-2.5 px-2"><span className="px-2 py-0.5 rounded font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">18%</span></td>
                    <td className="py-2.5 px-2"><span className="px-2 py-0.5 rounded font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">15%</span></td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4 text-left font-bold text-slate-800">Code Black / Violence</td>
                    <td className="py-2.5 px-2"><span className="px-2 py-0.5 rounded font-bold bg-red-50 text-red-700 border border-red-200">65%</span></td>
                    <td className="py-2.5 px-2"><span className="px-2 py-0.5 rounded font-bold bg-red-50 text-red-700 border border-red-200">78%</span></td>
                    <td className="py-2.5 px-2"><span className="px-2 py-0.5 rounded font-bold bg-amber-50 text-amber-800 border border-amber-200">50%</span></td>
                    <td className="py-2.5 px-2"><span className="px-2 py-0.5 rounded font-bold bg-amber-50 text-amber-800 border border-amber-200">35%</span></td>
                    <td className="py-2.5 px-2"><span className="px-2 py-0.5 rounded font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">20%</span></td>
                    <td className="py-2.5 px-2"><span className="px-2 py-0.5 rounded font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">15%</span></td>
                    <td className="py-2.5 px-2"><span className="px-2 py-0.5 rounded font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">10%</span></td>
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
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
            <div className="flex justify-between items-center pb-4 border-b border-slate-200 mb-4">
              <div>
                <h2 className="text-base font-bold text-[#002B49] flex items-center gap-2">
                  <Database className="w-5 h-5 text-[#0072CE]" />
                  HL7 FHIR R4 Interoperability Gateway
                </h2>
                <p className="text-xs text-slate-500">Live data exchange with the official HAPI FHIR R4 test sandbox.</p>
              </div>
              <a 
                href="https://hapi.fhir.org/baseR4/RiskAssessment?_pretty=true" 
                target="_blank" 
                rel="noreferrer"
                className="flex items-center gap-1.5 text-xs bg-slate-100 text-[#0072CE] px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-200 transition font-semibold"
              >
                Inspect Public HAPI Server <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>

            {fhirSyncStatus && (
              <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs font-mono flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                {fhirSyncStatus}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-6">
              {patients.map(p => (
                <div key={p.id} className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs">
                  <p className="font-bold text-slate-900">Bed {p.bed}: {p.name}</p>
                  <p className="text-slate-500 text-[11px] mt-0.5">{p.mrn}</p>
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={() => setFhirJsonModal(generateFhirPayload(p))}
                      className="px-2 py-1 bg-white border border-slate-300 hover:border-slate-400 rounded text-[11px] font-semibold text-slate-700 flex items-center gap-1 cursor-pointer"
                    >
                      <Code className="w-3 h-3" /> JSON
                    </button>
                    <button
                      disabled={fhirSyncLoading}
                      onClick={() => transmitToHapiFhir(p)}
                      className="px-2 py-1 bg-[#0072CE] hover:bg-blue-600 text-white rounded text-[11px] font-semibold flex items-center gap-1 cursor-pointer shadow-xs"
                    >
                      <Send className="w-3 h-3" /> Transmit
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {hapiResponse && (
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                  Server Response Payload (Received from HAPI FHIR R4):
                </h3>
                <pre className="text-xs font-mono text-emerald-400 bg-slate-900 p-4 rounded-lg border border-slate-800 overflow-x-auto max-h-96">
                  {JSON.stringify(hapiResponse, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </main>
      )}

      {/* Modal: View Generated FHIR JSON */}
      {fhirJsonModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-slate-200 rounded-xl max-w-2xl w-full p-6 shadow-xl flex flex-col max-h-[85vh]">
            <div className="flex justify-between items-center mb-3 border-b border-slate-200 pb-3">
              <div>
                <h3 className="text-sm font-bold text-[#002B49]">
                  HL7 FHIR R4 Standard RiskAssessment Payload
                </h3>
                <p className="text-xs text-slate-500">Encoded with SNOMED CT and LOINC clinical coding standards.</p>
              </div>
              <button onClick={() => setFhirJsonModal(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <pre className="flex-1 text-xs font-mono bg-slate-900 text-emerald-400 p-4 rounded-lg border border-slate-800 overflow-auto">
              {JSON.stringify(fhirJsonModal, null, 2)}
            </pre>

            <div className="flex justify-end mt-4">
              <button 
                onClick={() => setFhirJsonModal(null)}
                className="px-4 py-2 bg-[#002B49] text-white text-xs font-semibold rounded-lg hover:bg-[#003865] cursor-pointer"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}

      {/* XAI Contributing Drivers & Clinician Override Modal */}
      {selectedPatient && activeModalRisk && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-slate-200 rounded-xl max-w-lg w-full p-6 shadow-xl">
            <div className="flex justify-between items-center pb-3 border-b border-slate-200 mb-4">
              <div>
                <h3 className="text-base font-bold text-[#002B49]">
                  {activeModalRisk === 'fall' ? 'In-Hospital Fall Risk' : activeModalRisk === 'meds' ? 'Medication Safety Assessment' : 'Patient Aggression / Code Black'}
                </h3>
                <p className="text-xs text-slate-500">
                  Bed {selectedPatient.bed} • {selectedPatient.name} ({selectedPatient.mrn})
                </p>
              </div>
              <div className="text-2xl font-black text-slate-900">
                {selectedPatient.risks[activeModalRisk].score}%
              </div>
            </div>

            {/* Contributing Drivers */}
            <div className="mb-5">
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 text-[#0072CE]" />
                Identified Clinical Risk Factors (Sunrise EMR)
              </h4>
              <div className="space-y-1.5">
                {selectedPatient.risks[activeModalRisk].drivers.length > 0 ? (
                  selectedPatient.risks[activeModalRisk].drivers.map((driver, idx) => (
                    <div key={idx} className="text-xs bg-slate-50 p-2.5 rounded border border-slate-200 text-slate-700 flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-amber-500 rounded-full" />
                      {driver}
                    </div>
                  ))
                ) : (
                  <div className="text-xs text-slate-500 italic bg-slate-50 p-2.5 rounded border border-slate-200">
                    No elevated empirical risk indicators identified.
                  </div>
                )}
              </div>
            </div>

            {/* Override Controls */}
            <div className="border-t border-slate-200 pt-4">
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2">
                Clinician Risk Override
              </h4>
              <div className="grid grid-cols-3 gap-2 mb-3">
                <div>
                  <label className="text-[10px] text-slate-500 font-semibold block mb-1">Adjusted Score (%)</label>
                  <input
                    type="number"
                    placeholder="0-100"
                    value={overrideScore}
                    onChange={e => setOverrideScore(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-[#0072CE]"
                  />
                </div>
                <div className="col-span-2">
                  <label className="text-[10px] text-slate-500 font-semibold block mb-1">Clinical Justification</label>
                  <input
                    type="text"
                    placeholder="e.g. Constant 1:1 supervision active"
                    value={overrideReason}
                    onChange={e => setOverrideReason(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-[#0072CE]"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 mt-4">
                <button
                  onClick={() => setActiveModalRisk(null)}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs rounded font-medium transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleOverrideSubmit}
                  className="px-3 py-1.5 bg-[#002B49] hover:bg-[#003865] text-white text-xs rounded font-medium transition cursor-pointer"
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
