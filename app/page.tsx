"use client";

import { useState, useEffect } from "react";
import { PDFDownloadLink } from "@react-pdf/renderer";
import { PlanPDF } from "../components/PlanPDF";
import { Activity, ChevronRight, ChevronLeft, AlertTriangle, Loader2, Download, Trophy, Dumbbell, Zap } from "lucide-react";

export default function PacePilot() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [plan, setPlan] = useState<any>(null);
  const [isClient, setIsClient] = useState(false);

  const [form, setForm] = useState({
    // Schritt 1: Vision
    distance: "10km",
    goalType: "finish",
    hasRunBefore: "Nein",
    targetTime: { h: "00", m: "50", s: "00" },
    
    // Schritt 2: Status & Rekorde
    pr5k: { h: "", m: "", s: "" },
    pr10k: { h: "", m: "", s: "" },
    prHalf: { h: "", m: "", s: "" },
    prMarathon: { h: "", m: "", s: "" },
    currentPace: "06:00",
    currentWeeklyVolume: "20",
    
    // Schritt 3: Biometrie
    useHeartRate: true,
    maxHR: "185",
    restHR: "60",
    
    // Schritt 4: Logistik & Volumen
    daysPerWeek: 3,
    targetWeeklyKm: "35",
    longRunDay: "Sonntag",
    planWeeks: "12",
    planType: "weeks",
    eventDate: "",

    // Schritt 5: Ergänzung & Equipment
    includeStrength: true,
    includeStretching: true,
    equipment: "Keines", // Gym, Gewichte Zuhause, Keines
    
    // Schritt 6: Finale
    notes: ""
  });

  useEffect(() => { setIsClient(true); }, []);

  const clampAndPad = (n: number, max: number) => {
    if (isNaN(n)) n = 0;
    if (n < 0) n = 0;
    if (n > max) n = max;
    return String(n).padStart(2, "0");
  };

  const makeKeyHandler = (field: 'h' | 'm' | 's', max: number) => (e: any) => {
    const key = e.key;
    if (/^[0-9]$/.test(key)) {
      e.preventDefault();
      const curr = (form.targetTime[field] || "").replace(/\D/g, "");
      const next = (curr + key).slice(-2);
      const num = parseInt(next, 10);
      setForm({ ...form, targetTime: { ...form.targetTime, [field]: clampAndPad(num, max) } });
      return;
    }
    if (key === 'Backspace') {
      e.preventDefault();
      const curr = (form.targetTime[field] || "").replace(/\D/g, "");
      const next = curr.slice(0, -1);
      if (next === '') {
        setForm({ ...form, targetTime: { ...form.targetTime, [field]: '00' } });
      } else {
        const num = parseInt(next.slice(-2), 10);
        setForm({ ...form, targetTime: { ...form.targetTime, [field]: clampAndPad(num, max) } });
      }
      return;
    }
    // allow navigation keys
  };

  const makePasteHandler = (field: 'h' | 'm' | 's', max: number) => (e: any) => {
    e.preventDefault();
    const text = (e.clipboardData?.getData('text') || '').replace(/\D/g, '');
    if (!text) return;
    const next = text.slice(-2);
    const num = parseInt(next, 10);
    setForm({ ...form, targetTime: { ...form.targetTime, [field]: clampAndPad(num, max) } });
  };

  const formatPR = (pr: any) => {
    if (!pr) return "";
    const anySet = (pr.h || pr.m || pr.s) && (pr.h !== "" || pr.m !== "" || pr.s !== "");
    if (!anySet) return "";
    const pad = (v: any) => String(v || "0").padStart(2, "0");
    return `${pad(pr.h)}:${pad(pr.m)}:${pad(pr.s)}`;
  };

  const hasPR = (pr: any) => {
    return pr && ((pr.h && pr.h !== "") || (pr.m && pr.m !== "") || (pr.s && pr.s !== ""));
  };

  const makePRKeyHandler = (prKey: string, field: 'h' | 'm' | 's', max: number) => (e: any) => {
    const key = e.key;
    if (/^[0-9]$/.test(key)) {
      e.preventDefault();
      const curr = ((form as any)[prKey][field] || "").replace(/\D/g, "");
      const next = (curr + key).slice(-2);
      const num = parseInt(next, 10);
      setForm({ ...form, [prKey]: { ...(form as any)[prKey], [field]: clampAndPad(num, max) } });
      return;
    }
    if (key === 'Backspace') {
      e.preventDefault();
      const curr = ((form as any)[prKey][field] || "").replace(/\D/g, "");
      const next = curr.slice(0, -1);
      if (next === '') {
        setForm({ ...form, [prKey]: { ...(form as any)[prKey], [field]: '00' } });
      } else {
        const num = parseInt(next.slice(-2), 10);
        setForm({ ...form, [prKey]: { ...(form as any)[prKey], [field]: clampAndPad(num, max) } });
      }
      return;
    }
  };

  const makePRPasteHandler = (prKey: string, field: 'h' | 'm' | 's', max: number) => (e: any) => {
    e.preventDefault();
    const text = (e.clipboardData?.getData('text') || '').replace(/\D/g, '');
    if (!text) return;
    const next = text.slice(-2);
    const num = parseInt(next, 10);
    setForm({ ...form, [prKey]: { ...(form as any)[prKey], [field]: clampAndPad(num, max) } });
  };

  const weekPresets: Record<string, number[]> = {
    '5km': [4, 6, 8],
    '10km': [6, 8, 12],
    'Halbmarathon': [8, 12, 16],
    'Marathon': [12, 16, 20],
  };

  const minWeeksMap: Record<string, number> = {
    '5km': 4,
    '10km': 6,
    'Halbmarathon': 8,
    'Marathon': 12,
  };

  const [computedWeeks, setComputedWeeks] = useState<number | null>(null);

  const handleEventDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setForm({ ...form, eventDate: val, planType: 'event' });
    if (!val) {
      setComputedWeeks(null);
      return;
    }
    const today = new Date();
    const eventD = new Date(val + 'T00:00:00');
    const diffMs = eventD.getTime() - today.setHours(0,0,0,0);
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    const weeks = diffDays > 0 ? Math.ceil(diffDays / 7) : 0;
    setComputedWeeks(weeks);
    setForm({ ...form, eventDate: val, planWeeks: String(weeks) });
  };

  // Coach-Logik für Empfehlungen
  const getCoachAdvice = () => {
    const d = form.distance;
    if (d === "Marathon") return { weeks: "16-20", km: "50-80", days: "min. 4", tip: "Marathon erfordert hohe muskuläre Ausdauer. Krafttraining ist hier Pflicht!" };
    if (d === "Halbmarathon") return { weeks: "12-14", km: "35-50", days: "min. 3", tip: "Fokus auf Tempohärte und einen soliden Longrun pro Woche." };
    if (d === "10km") return { weeks: "8-12", km: "25-40", days: "3", tip: "Perfekt für Intervall-Fokus und Tempo-Steigerung." };
    return null;
  };

  const handleGenerate = async () => {
    setLoading(true);
    setPlan(null);
    try {
      const pad = (v: any) => String(v).padStart(2, "0");
      const formattedTime = `${pad(form.targetTime.h)}:${pad(form.targetTime.m)}:${pad(form.targetTime.s)}`;
      const payload = {
        ...form,
        targetTimeFormatted: formattedTime,
        pr5k: formatPR((form as any).pr5k),
        pr10k: formatPR((form as any).pr10k),
        prHalf: formatPR((form as any).prHalf),
        prMarathon: formatPR((form as any).prMarathon),
      };
      const res = await fetch("/api/generate-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(`Server-Fehler: ${res.status}`);
      const data = await res.json();
      setPlan({ ...data, targetPace: form.currentPace, targetTime: formattedTime });
      setStep(10);
    } catch (e: any) {
      alert("Fehler bei der Generierung.");
    } finally {
      setLoading(false);
    }
  };

  if (!isClient) return null;

  return (
    <div className="min-h-screen bg-[#050505] text-white p-6 font-sans antialiased">
      <div className="max-w-xl mx-auto py-10">
        
        {/* Header Navigation */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Activity className="text-orange-600" size={32} />
            <h1 className="text-2xl font-black uppercase italic tracking-tighter">PacePilot</h1>
          </div>
          <div className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest bg-zinc-900 px-3 py-1 rounded-full">
            {step <= 7 ? `Schritt ${step} / 7` : "Ready"}
          </div>
        </div>

        {/* COACH ADVICE BOX */}
        {step === 4 && getCoachAdvice() && (
          <div className="mb-8 p-4 bg-orange-600/10 border-l-4 border-orange-600 rounded-r-xl animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-2 mb-2 text-orange-600 font-black uppercase text-[10px] tracking-widest">
              <Zap size={14} /> Coach Empfehlung
            </div>
            <div className="grid grid-cols-3 gap-3 mb-3">
              <div className="bg-zinc-900 p-2 rounded-xl">
                <div className="text-[10px] font-bold text-zinc-500 uppercase">Wochen</div>
                <div className="text-sm font-black text-orange-600">{getCoachAdvice()?.weeks}</div>
              </div>
              <div className="bg-zinc-900 p-2 rounded-xl">
                <div className="text-[10px] font-bold text-zinc-500 uppercase">KM</div>
                <div className="text-sm font-black text-orange-600">{getCoachAdvice()?.km}</div>
              </div>
              <div className="bg-zinc-900 p-2 rounded-xl">
                <div className="text-[10px] font-bold text-zinc-500 uppercase">Tage</div>
                <div className="text-sm font-black text-orange-600">{getCoachAdvice()?.days}</div>
              </div>
            </div>
            <p className="text-xs text-zinc-400 italic leading-relaxed">{getCoachAdvice()?.tip}</p>
          </div>
        )}

        {/* STEP 1: VISION */}
        {step === 1 && (
          <div className="space-y-8 animate-in slide-in-from-bottom-4">
            <h2 className="text-3xl font-black uppercase italic text-orange-600">1. Das Ziel</h2>
            <div className="space-y-6">
              <select className="w-full bg-zinc-900 p-5 rounded-2xl border border-zinc-800 font-bold" value={form.distance} onChange={(e) => setForm({...form, distance: e.target.value})}>
                <option value="5km">5km</option><option value="10km">10km</option><option value="Halbmarathon">Halbmarathon</option><option value="Marathon">Marathon</option>
              </select>
              <div className="flex gap-4">
                <button onClick={() => setForm({...form, goalType: 'finish'})} className={`flex-1 p-4 rounded-xl font-bold border-2 ${form.goalType === 'finish' ? 'border-orange-600 bg-orange-600/10' : 'border-zinc-900'}`}>Finish</button>
                <button onClick={() => setForm({...form, goalType: 'time'})} className={`flex-1 p-4 rounded-xl font-bold border-2 ${form.goalType === 'time' ? 'border-orange-600 bg-orange-600/10' : 'border-zinc-900'}`}>Zeit</button>
              </div>
              <div className="bg-zinc-900 p-4 rounded-xl border border-zinc-800 flex justify-between items-center">
                <span className="text-sm font-bold">Distanz schon mal gelaufen?</span>
                <button onClick={() => setForm({...form, hasRunBefore: form.hasRunBefore === "Ja" ? "Nein" : "Ja"})} className={`px-4 py-2 rounded-lg font-bold ${form.hasRunBefore === "Ja" ? "bg-orange-600" : "bg-zinc-800"}`}>{form.hasRunBefore}</button>
              </div>
              {form.goalType === 'time' && (
                <div className="bg-zinc-900 p-4 rounded-xl border border-zinc-800 flex items-center gap-3">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase block">Zielzeit (hh:mm:ss)</label>
                  <div className="flex gap-2 ml-auto">
                    <input type="text" inputMode="numeric" className="w-20 bg-black p-2 rounded text-center font-bold" value={form.targetTime.h} onKeyDown={makeKeyHandler('h', 99)} onPaste={makePasteHandler('h', 99)} />
                    <span className="text-zinc-500">:</span>
                    <input type="text" inputMode="numeric" className="w-16 bg-black p-2 rounded text-center font-bold" value={form.targetTime.m} onKeyDown={makeKeyHandler('m', 59)} onPaste={makePasteHandler('m', 59)} />
                    <span className="text-zinc-500">:</span>
                    <input type="text" inputMode="numeric" className="w-16 bg-black p-2 rounded text-center font-bold" value={form.targetTime.s} onKeyDown={makeKeyHandler('s', 59)} onPaste={makePasteHandler('s', 59)} />
                  </div>
                </div>
              )}
            </div>
            <button onClick={() => setStep(2)} className="w-full bg-white text-black py-5 rounded-2xl font-black uppercase italic flex justify-center items-center gap-2">Leistungsstand <ChevronRight/></button>
          </div>
        )}

        {/* STEP 2: PERFORMANCE */}
        {step === 2 && (
          <div className="space-y-8 animate-in slide-in-from-right-4">
            <h2 className="text-3xl font-black uppercase italic text-orange-600">2. Dein Stand</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-zinc-900 p-4 rounded-xl border border-zinc-800">
                <label className="text-[10px] font-bold text-zinc-500 uppercase mb-2 block">PB 5km</label>
                <div className="flex justify-center items-center gap-2">
                  <input type="text" inputMode="numeric" placeholder="hh" className="w-14 bg-black p-2 rounded text-center font-bold" value={form.pr5k.h} onKeyDown={makePRKeyHandler('pr5k','h',99)} onPaste={makePRPasteHandler('pr5k','h',99)} />
                  <span className="text-zinc-500">:</span>
                  <input type="text" inputMode="numeric" placeholder="mm" className="w-14 bg-black p-2 rounded text-center font-bold" value={form.pr5k.m} onKeyDown={makePRKeyHandler('pr5k','m',59)} onPaste={makePRPasteHandler('pr5k','m',59)} />
                  <span className="text-zinc-500">:</span>
                  <input type="text" inputMode="numeric" placeholder="ss" className="w-14 bg-black p-2 rounded text-center font-bold" value={form.pr5k.s} onKeyDown={makePRKeyHandler('pr5k','s',59)} onPaste={makePRPasteHandler('pr5k','s',59)} />
                </div>
              </div>
              <div className="bg-zinc-900 p-4 rounded-xl border border-zinc-800">
                <label className="text-[10px] font-bold text-zinc-500 uppercase mb-2 block">PB 10km</label>
                <div className="flex justify-center items-center gap-2">
                  <input type="text" inputMode="numeric" placeholder="hh" className="w-14 bg-black p-2 rounded text-center font-bold" value={form.pr10k.h} onKeyDown={makePRKeyHandler('pr10k','h',99)} onPaste={makePRPasteHandler('pr10k','h',99)} />
                  <span className="text-zinc-500">:</span>
                  <input type="text" inputMode="numeric" placeholder="mm" className="w-14 bg-black p-2 rounded text-center font-bold" value={form.pr10k.m} onKeyDown={makePRKeyHandler('pr10k','m',59)} onPaste={makePRPasteHandler('pr10k','m',59)} />
                  <span className="text-zinc-500">:</span>
                  <input type="text" inputMode="numeric" placeholder="ss" className="w-14 bg-black p-2 rounded text-center font-bold" value={form.pr10k.s} onKeyDown={makePRKeyHandler('pr10k','s',59)} onPaste={makePRPasteHandler('pr10k','s',59)} />
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-zinc-900 p-4 rounded-xl border border-zinc-800">
                <label className="text-[10px] font-bold text-zinc-500 uppercase mb-2 block">PB Halbmarathon</label>
                <div className="flex justify-center items-center gap-2">
                  <input type="text" inputMode="numeric" placeholder="hh" className="w-14 bg-black p-2 rounded text-center font-bold" value={form.prHalf.h} onKeyDown={makePRKeyHandler('prHalf','h',99)} onPaste={makePRPasteHandler('prHalf','h',99)} />
                  <span className="text-zinc-500">:</span>
                  <input type="text" inputMode="numeric" placeholder="mm" className="w-14 bg-black p-2 rounded text-center font-bold" value={form.prHalf.m} onKeyDown={makePRKeyHandler('prHalf','m',59)} onPaste={makePRPasteHandler('prHalf','m',59)} />
                  <span className="text-zinc-500">:</span>
                  <input type="text" inputMode="numeric" placeholder="ss" className="w-14 bg-black p-2 rounded text-center font-bold" value={form.prHalf.s} onKeyDown={makePRKeyHandler('prHalf','s',59)} onPaste={makePRPasteHandler('prHalf','s',59)} />
                </div>
              </div>
              <div className="bg-zinc-900 p-4 rounded-xl border border-zinc-800">
                <label className="text-[10px] font-bold text-zinc-500 uppercase mb-2 block">PB Marathon</label>
                <div className="flex justify-center items-center gap-2">
                  <input type="text" inputMode="numeric" placeholder="hh" className="w-14 bg-black p-2 rounded text-center font-bold" value={form.prMarathon.h} onKeyDown={makePRKeyHandler('prMarathon','h',99)} onPaste={makePRPasteHandler('prMarathon','h',99)} />
                  <span className="text-zinc-500">:</span>
                  <input type="text" inputMode="numeric" placeholder="mm" className="w-14 bg-black p-2 rounded text-center font-bold" value={form.prMarathon.m} onKeyDown={makePRKeyHandler('prMarathon','m',59)} onPaste={makePRPasteHandler('prMarathon','m',59)} />
                  <span className="text-zinc-500">:</span>
                  <input type="text" inputMode="numeric" placeholder="ss" className="w-14 bg-black p-2 rounded text-center font-bold" value={form.prMarathon.s} onKeyDown={makePRKeyHandler('prMarathon','s',59)} onPaste={makePRPasteHandler('prMarathon','s',59)} />
                </div>
              </div>
            </div>
            <div className="space-y-4">
              <label className="block text-xs font-bold text-zinc-500 uppercase">Aktuelles Wochen-Pensum (km)</label>
              <input type="number" className="w-full bg-zinc-900 p-5 rounded-2xl border border-zinc-800 font-bold" value={form.currentWeeklyVolume} onChange={(e) => setForm({...form, currentWeeklyVolume: e.target.value})} />
            </div>
            <div className="flex gap-4">
              <button onClick={() => setStep(1)} className="p-5 bg-zinc-900 rounded-2xl border border-zinc-800"><ChevronLeft/></button>
              <button onClick={() => setStep(3)} className="flex-1 bg-white text-black py-5 rounded-2xl font-black uppercase italic flex justify-center items-center gap-2">Biometrie <ChevronRight/></button>
            </div>
          </div>
        )}

        {/* STEP 3: BIOMETRIE (Heart Rate) */}
        {step === 3 && (
          <div className="space-y-8 animate-in slide-in-from-right-4">
            <h2 className="text-3xl font-black uppercase italic text-orange-600">3. Biometrie</h2>
            <div className="bg-zinc-900 p-6 rounded-3xl border border-zinc-800 space-y-6">
              <div className="flex justify-between items-center">
                <span className="font-bold">Pulsuhr vorhanden?</span>
                <button onClick={() => setForm({...form, useHeartRate: !form.useHeartRate})} className={`w-14 h-8 rounded-full relative transition-colors ${form.useHeartRate ? 'bg-orange-600' : 'bg-zinc-700'}`}>
                  <div className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-all ${form.useHeartRate ? 'left-7' : 'left-1'}`} />
                </button>
              </div>
              {form.useHeartRate && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-bold text-zinc-500 uppercase mb-2 block">Max HR</label>
                    <input type="number" placeholder="Max HR" className="bg-black p-4 rounded-xl text-center font-bold" value={form.maxHR} onChange={(e) => setForm({...form, maxHR: e.target.value})} />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-zinc-500 uppercase mb-2 block">Ruhepuls</label>
                    <input type="number" placeholder="Ruhepuls" className="bg-black p-4 rounded-xl text-center font-bold" value={form.restHR} onChange={(e) => setForm({...form, restHR: e.target.value})} />
                  </div>
                </div>
              )}
            </div>
            <div className="flex gap-4">
              <button onClick={() => setStep(2)} className="p-5 bg-zinc-900 rounded-2xl border border-zinc-800"><ChevronLeft/></button>
              <button onClick={() => setStep(4)} className="flex-1 bg-white text-black py-5 rounded-2xl font-black uppercase italic flex justify-center items-center gap-2">Logistik <ChevronRight/></button>
            </div>
          </div>
        )}

        {/* STEP 4: LOGISTIK & TARGET KM */}
        {step === 4 && (
          <div className="space-y-8 animate-in slide-in-from-right-4">
            <h2 className="text-3xl font-black uppercase italic text-orange-600">4. Logistik</h2>
            <div className="space-y-6">
              <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase mb-3">Geplante Wochen-KM (Ziel)</label>
                <div className="flex items-center gap-4">
                  <input type="range" min="10" max="120" step="5" className="flex-1 accent-orange-600" value={form.targetWeeklyKm} onChange={(e) => setForm({...form, targetWeeklyKm: e.target.value})} />
                  <span className="text-2xl font-black text-orange-600 w-16">{form.targetWeeklyKm}</span>
                </div>
                <p className="text-[10px] text-zinc-500 mt-2 italic">Empfehlung: {getCoachAdvice()?.km} km</p>
              </div>
              <div className="flex gap-2">
                <div className="w-full">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase mb-2 block">Trainingstage pro Woche</label>
                  <div className="flex gap-2">
                    {[3, 4, 5, 6].map(n => (
                      <button key={n} onClick={() => setForm({...form, daysPerWeek: n})} className={`flex-1 py-4 rounded-xl font-bold ${form.daysPerWeek === n ? 'bg-orange-600' : 'bg-zinc-900 text-zinc-500'}`}>{n} Tage</button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <div className="flex gap-4">
              <button onClick={() => setStep(3)} className="p-5 bg-zinc-900 rounded-2xl border border-zinc-800"><ChevronLeft/></button>
              <button onClick={() => setStep(5)} className="flex-1 bg-white text-black py-5 rounded-2xl font-black uppercase italic flex justify-center items-center gap-2">Equipment <ChevronRight/></button>
            </div>
          </div>
        )}

        {/* STEP 5: EQUIPMENT & SUPPLEMENTARY */}
        {step === 5 && (
          <div className="space-y-8 animate-in slide-in-from-right-4">
            <h2 className="text-3xl font-black uppercase italic text-orange-600">5. Training</h2>
            <div className="space-y-4">
              <div className="bg-zinc-900 p-5 rounded-2xl border border-zinc-800 space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-bold">Krafttraining einbauen?</span>
                  <input type="checkbox" checked={form.includeStrength} onChange={(e) => setForm({...form, includeStrength: e.target.checked})} className="w-5 h-5 accent-orange-600" />
                </div>
                {form.includeStrength && (
                  <select className="w-full bg-black p-3 rounded-xl text-sm font-bold border border-zinc-800" value={form.equipment} onChange={(e) => setForm({...form, equipment: e.target.value})}>
                    <option value="Keines">Kein Equipment (Bodyweight)</option>
                    <option value="Gewichte">Gewichte Zuhause</option>
                    <option value="Gym">Fitnessstudio / Gym</option>
                  </select>
                )}
              </div>
              <div className="bg-zinc-900 p-5 rounded-2xl border border-zinc-800 flex justify-between items-center">
                <span className="text-sm font-bold">Mobility & Dehnen (täglich)?</span>
                <input type="checkbox" checked={form.includeStretching} onChange={(e) => setForm({...form, includeStretching: e.target.checked})} className="w-5 h-5 accent-orange-600" />
              </div>
            </div>
            <div className="flex gap-4">
              <button onClick={() => setStep(4)} className="p-5 bg-zinc-900 rounded-2xl border border-zinc-800"><ChevronLeft/></button>
              <button onClick={() => setStep(6)} className="flex-1 bg-white text-black py-5 rounded-2xl font-black uppercase italic flex justify-center items-center gap-2">Finale <ChevronRight/></button>
            </div>
          </div>
        )}

        {/* STEP 6: TRAININGSDAUER */}
        {step === 6 && (
          <div className="space-y-8 animate-in slide-in-from-right-4">
            <h2 className="text-3xl font-black uppercase italic text-orange-600">6. Trainingsdauer</h2>
            <div className="space-y-6">
               <div className="flex gap-4">
                  <button onClick={() => setForm({...form, planType: 'weeks'})} className={`flex-1 p-4 rounded-xl border-2 font-bold ${form.planType === 'weeks' ? 'border-orange-600 bg-orange-600/5' : 'border-zinc-800'}`}>Wochen</button>
                  <button onClick={() => setForm({...form, planType: 'event'})} className={`flex-1 p-4 rounded-xl border-2 font-bold ${form.planType === 'event' ? 'border-orange-600 bg-orange-600/5' : 'border-zinc-800'}`}>Event</button>
               </div>
               {form.planType === 'weeks' && (
                 <div className="space-y-4">
                   <div className="flex gap-2">
                     {(weekPresets[form.distance] || []).map(w => (
                       <button key={w} onClick={() => setForm({...form, planWeeks: String(w)})} className={`px-4 py-2 rounded-xl font-bold ${String(form.planWeeks) === String(w) ? 'bg-orange-600' : 'bg-zinc-900 text-zinc-500'}`}>{w} Wochen</button>
                     ))}
                   </div>
                   <input type="number" placeholder="Wochen (Empfehlung)" className="w-full bg-zinc-900 p-5 rounded-2xl border border-zinc-800 font-bold" value={form.planWeeks} onChange={(e) => setForm({...form, planWeeks: e.target.value})} />
                 </div>
               )}
               {form.planType === 'event' && (
                 <div className="space-y-3">
                   <label className="text-[10px] font-bold text-zinc-500 uppercase">Event-Datum</label>
                   <input type="date" className="w-full bg-zinc-900 p-3 rounded-xl border border-zinc-800 font-bold" value={form.eventDate} onChange={handleEventDateChange} />
                   <div className="flex items-center gap-4">
                     <div className="text-[10px] text-zinc-400">Berechnete Wochen bis Event:</div>
                     <div className="text-xl font-black text-orange-600">{computedWeeks ?? '-'}</div>
                   </div>
                   {computedWeeks !== null && (() => {
                     const min = minWeeksMap[form.distance] || 0;
                     if (computedWeeks < min) {
                       return <div className="text-xs text-yellow-400">Warnung: Nur {computedWeeks} Wochen bis zum Event (empfohlen mindestens {min}). Du kannst trotzdem fortfahren.</div>;
                     }
                     return null;
                   })()}
                 </div>
               )}
               <textarea className="w-full bg-zinc-900 p-5 rounded-2xl border border-zinc-800 h-32" placeholder="Besonderheiten (Verletzungen, Vorlieben...)" value={form.notes} onChange={(e) => setForm({...form, notes: e.target.value})} />
            </div>
              <div className="flex gap-4">
              <button onClick={() => setStep(5)} className="p-5 bg-zinc-900 rounded-2xl border border-zinc-800"><ChevronLeft/></button>
              <button onClick={() => setStep(7)} disabled={loading} className="flex-1 bg-orange-600 text-black py-6 rounded-3xl font-black text-xl uppercase italic shadow-[0_0_30px_rgba(234,88,12,0.3)]">
                {loading ? <Loader2 className="animate-spin mx-auto" /> : "ZUSAMMENFASSUNG"}
              </button>
            </div>
          </div>
        )}

        {/* STEP 7: ZUSAMMENFASSUNG */}
        {step === 7 && (
          <div className="space-y-8 animate-in slide-in-from-right-4">
            <h2 className="text-3xl font-black uppercase italic text-orange-600">7. Zusammenfassung</h2>
            <div className="space-y-4 bg-zinc-900 p-6 rounded-2xl border border-zinc-800">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-black uppercase text-orange-500">Aktueller Stand</h3>
                  <button onClick={() => setStep(2)} className="text-[10px] font-bold uppercase text-zinc-400 hover:text-orange-500">Bearbeiten</button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="text-zinc-400 text-sm">Aktuelles Wochen-Pensum (km)</div><div className="font-black">{form.currentWeeklyVolume}</div>
                  <div className="text-zinc-400 text-sm">Aktuelles Wochen-Pensum (km)</div><div className="font-black">{form.currentWeeklyVolume}</div>
                  {hasPR((form as any).pr5k) && <div className="text-zinc-400 text-sm">PB 5km</div>}
                  {hasPR((form as any).pr5k) && <div className="font-black">{formatPR((form as any).pr5k)}</div>}
                  {hasPR((form as any).pr10k) && <div className="text-zinc-400 text-sm">PB 10km</div>}
                  {hasPR((form as any).pr10k) && <div className="font-black">{formatPR((form as any).pr10k)}</div>}
                  {hasPR((form as any).prHalf) && <div className="text-zinc-400 text-sm">PB Halbmarathon</div>}
                  {hasPR((form as any).prHalf) && <div className="font-black">{formatPR((form as any).prHalf)}</div>}
                  {hasPR((form as any).prMarathon) && <div className="text-zinc-400 text-sm">PB Marathon</div>}
                  {hasPR((form as any).prMarathon) && <div className="font-black">{formatPR((form as any).prMarathon)}</div>}
                  {form.useHeartRate && <div className="text-zinc-400 text-sm">Max HR / Ruhepuls</div>}
                  {form.useHeartRate && <div className="font-black">{form.maxHR} / {form.restHR}</div>}
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-black uppercase text-orange-500">Trainingsziel</h3>
                  <button onClick={() => setStep(4)} className="text-[10px] font-bold uppercase text-zinc-400 hover:text-orange-500">Bearbeiten</button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="text-zinc-400 text-sm">Ziel Wochen (Plan)</div><div className="font-black">{form.planWeeks}</div>
                  <div className="text-zinc-400 text-sm">Geplante Wochen-KM</div><div className="font-black">{form.targetWeeklyKm}</div>
                  <div className="text-zinc-400 text-sm">Trainingstage / Woche</div><div className="font-black">{form.daysPerWeek} Tage</div>
                  {form.includeStrength && <div className="text-zinc-400 text-sm">Krafttraining</div>}
                  {form.includeStrength && (
                    <div className="font-black">
                      {(() => {
                        const eq = form.equipment;
                        if (!eq || eq === 'Keines') return 'Ja, ohne Gym';
                        if (eq === 'Gewichte') return 'Ja, mit Eigengewicht';
                        if (eq === 'Gym') return 'Ja, mit Fitnessstudio';
                        return `Ja (${eq})`;
                      })()}
                    </div>
                  )}
                  {form.includeStretching && <div className="text-zinc-400 text-sm">Dehnen / Mobility</div>}
                  {form.includeStretching && <div className="font-black">Ja</div>}
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-black uppercase text-orange-500">Gesamtziel</h3>
                  <button onClick={() => setStep(1)} className="text-[10px] font-bold uppercase text-zinc-400 hover:text-orange-500">Bearbeiten</button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="text-zinc-400 text-sm">Distanz</div><div className="font-black">{form.distance}</div>
                  {form.goalType === 'time' && (
                    <>
                      <div className="text-zinc-400 text-sm">Zielzeit</div>
                      <div className="font-black">{`${String(form.targetTime.h).padStart(2,'0')}:${String(form.targetTime.m).padStart(2,'0')}:${String(form.targetTime.s).padStart(2,'0')}`}</div>
                    </>
                  )}
                  <div className="text-zinc-400 text-sm">Notizen</div><div className="font-black">{form.notes || '-'}</div>
                </div>
              </div>
            </div>
            <div className="flex gap-4">
              <button onClick={() => setStep(6)} className="p-5 bg-zinc-900 rounded-2xl border border-zinc-800"><ChevronLeft/></button>
              <button onClick={handleGenerate} disabled={loading} className="flex-1 bg-orange-600 text-black py-6 rounded-3xl font-black text-xl uppercase italic shadow-[0_0_30px_rgba(234,88,12,0.3)]">
                {loading ? <Loader2 className="animate-spin mx-auto" /> : "PLAN GENERIEREN"}
              </button>
            </div>
          </div>
        )}

        {/* SUCCESS SCREEN */}
        {step === 10 && plan && (
          <div className="text-center space-y-10 animate-in zoom-in-95 duration-500">
            <div className="p-12 bg-zinc-900 border-2 border-orange-600/30 rounded-[3rem] shadow-2xl relative">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-orange-600 text-black px-6 py-1 rounded-full text-xs font-black uppercase shadow-lg">System Ready</div>
              <h2 className="text-4xl font-black uppercase italic mb-8 italic text-orange-600 leading-tight">Plan erfolgreich <br/> erstellt</h2>
              <PDFDownloadLink document={<PlanPDF data={plan} />} fileName={`PacePilot_${form.distance}.pdf`} className="w-full bg-white text-black py-7 rounded-2xl font-black text-2xl flex justify-center items-center gap-4 shadow-xl hover:scale-[1.02] transition-transform">
                {({ loading }) => loading ? "Lade..." : <><Download /> DOWNLOAD PDF</>}
              </PDFDownloadLink>
            </div>
            <button onClick={() => setStep(1)} className="text-zinc-600 font-bold uppercase text-[10px] tracking-[0.3em] hover:text-orange-600 transition-colors">Neuen Plan konfigurieren</button>
          </div>
        )}
      </div>
    </div>
  );
}