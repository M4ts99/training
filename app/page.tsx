"use client";

import { useState, useEffect } from "react";
import { PDFDownloadLink } from "@react-pdf/renderer";
import { PlanPDF } from "../components/PlanPDF";
import { Activity, ChevronRight, ChevronLeft, AlertTriangle, Loader2, Download } from "lucide-react";

export default function PacePilot() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [plan, setPlan] = useState<any>(null);
  const [isClient, setIsClient] = useState(false);

  // Alle Werte sind mit Standardwerten initialisiert, um "Uncontrolled" Fehler zu vermeiden
  const [form, setForm] = useState({
    distance: "10km",
    goalType: "finish", 
    targetTime: { h: "00", m: "50", s: "00" },
    planType: "weeks", 
    eventDate: "",
    planWeeks: "12",
    currentPace: "06:00",
    weeklyVolume: "20",
    experience: "2",
    useHeartRate: true,
    maxHR: "185",
    restHR: "60",
    daysPerWeek: 3,
    longRunDay: "Sonntag",
    injuryHistory: "Keine",
    terrain: "Straße",
    intensityStyle: "Pace",
    notes: ""
  });

  useEffect(() => { setIsClient(true); }, []);

  const handleGenerate = async () => {
    setLoading(true);
    setPlan(null); // Alten Plan zurücksetzen
    try {
      const res = await fetch("/api/generate-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        // Fängt den 500er Fehler ab
        throw new Error(`Server-Fehler: ${res.status}`);
      }

      const data = await res.json();
      setPlan(data);
      setStep(10); 
    } catch (e: any) {
      console.error("API Fehler:", e);
      alert("Der Server antwortet nicht (Fehler 500). Prüfe deinen API-Key in der .env.local!");
    } finally {
      setLoading(false);
    }
  };

  const getWarning = () => {
    if (form.distance === "Marathon" && form.daysPerWeek < 3) {
      return "Kritisch: Ein Marathon-Training benötigt i.d.R. mindestens 3-4 Tage pro Woche.";
    }
    if (form.distance === "5km" && parseInt(form.weeklyVolume) > 60) {
      return "Hinweis: Für 5km ist Qualität wichtiger als Quantität.";
    }
    return null;
  };

  if (!isClient) return null;

  return (
    <div className="min-h-screen bg-[#050505] text-white p-6 font-sans antialiased">
      <div className="max-w-xl mx-auto py-10">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-12">
          <div className="flex items-center gap-3">
            <Activity className="text-orange-600" size={32} />
            <h1 className="text-2xl font-black uppercase italic tracking-tighter">PacePilot</h1>
          </div>
          <div className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest bg-zinc-900 px-3 py-1 rounded-full">
            {step <= 5 ? `Schritt ${step} / 5` : "Fertig"}
          </div>
        </div>

        {/* STEP 1: VISION */}
        {step === 1 && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
            <h2 className="text-4xl font-black uppercase italic text-orange-600">1. Die Vision</h2>
            <div className="space-y-6">
              <label className="block text-xs font-bold text-zinc-500 uppercase">Hauptziel</label>
              <select 
                className="w-full bg-zinc-900 p-5 rounded-2xl border border-zinc-800 font-bold outline-none focus:border-orange-600"
                value={form.distance || "10km"}
                onChange={(e) => setForm({...form, distance: e.target.value})}
              >
                <option value="5km">5km</option>
                <option value="10km">10km</option>
                <option value="Halbmarathon">Halbmarathon</option>
                <option value="Marathon">Marathon</option>
                <option value="Ultra">Ultra</option>
                <option value="Allgemeine Fitness">Allgemeine Fitness</option>
              </select>

              <div className="flex gap-4">
                <button onClick={() => setForm({...form, goalType: 'finish'})} className={`flex-1 p-5 rounded-2xl font-bold border-2 transition-all ${form.goalType === 'finish' ? 'border-orange-600 bg-orange-600/10' : 'border-zinc-900 bg-zinc-900/50'}`}>Finisher</button>
                <button onClick={() => setForm({...form, goalType: 'time'})} className={`flex-1 p-5 rounded-2xl font-bold border-2 transition-all ${form.goalType === 'time' ? 'border-orange-600 bg-orange-600/10' : 'border-zinc-900 bg-zinc-900/50'}`}>Zielzeit</button>
              </div>

              {form.goalType === "time" && (
                <div className="bg-zinc-900 p-6 rounded-3xl border border-zinc-800">
                   <p className="text-center text-[10px] font-bold text-zinc-500 uppercase mb-4 tracking-widest text-orange-600">Angestrebte Zeit (HH:MM:SS)</p>
                   <div className="flex justify-center items-center gap-3">
                      <input type="number" className="w-16 bg-black p-3 text-center rounded-xl text-xl font-bold border border-zinc-800" value={form.targetTime.h || "00"} onChange={(e) => setForm({...form, targetTime: {...form.targetTime, h: e.target.value}})} />
                      <span className="text-orange-600 font-bold">:</span>
                      <input type="number" className="w-16 bg-black p-3 text-center rounded-xl text-xl font-bold border border-zinc-800" value={form.targetTime.m || "00"} onChange={(e) => setForm({...form, targetTime: {...form.targetTime, m: e.target.value}})} />
                      <span className="text-orange-600 font-bold">:</span>
                      <input type="number" className="w-16 bg-black p-3 text-center rounded-xl text-xl font-bold border border-zinc-800" value={form.targetTime.s || "00"} onChange={(e) => setForm({...form, targetTime: {...form.targetTime, s: e.target.value}})} />
                   </div>
                </div>
              )}
            </div>
            <button onClick={() => setStep(2)} className="w-full bg-white text-black py-6 rounded-2xl font-black uppercase italic flex justify-center items-center gap-2">Weiter <ChevronRight/></button>
          </div>
        )}

        {/* STEP 2: BASIS */}
        {step === 2 && (
          <div className="space-y-8 animate-in slide-in-from-right-4">
            <h2 className="text-4xl font-black uppercase italic text-orange-600">2. Die Basis</h2>
            <div className="space-y-6">
              <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase mb-3">Aktuelle Pace (Zone 2) - min/km</label>
                <input type="text" className="w-full bg-zinc-900 p-5 rounded-2xl border border-zinc-800 font-bold" value={form.currentPace || ""} onChange={(e) => setForm({...form, currentPace: e.target.value})} placeholder="z.B. 06:15" />
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase mb-3">Wochen-KM</label>
                <input type="number" className="w-full bg-zinc-900 p-5 rounded-2xl border border-zinc-800 font-bold" value={form.weeklyVolume || ""} onChange={(e) => setForm({...form, weeklyVolume: e.target.value})} />
              </div>
            </div>
            <div className="flex gap-4">
              <button onClick={() => setStep(1)} className="p-5 bg-zinc-900 rounded-2xl border border-zinc-800 text-white hover:text-orange-600"><ChevronLeft/></button>
              <button onClick={() => setStep(3)} className="flex-1 bg-white text-black py-5 rounded-2xl font-black uppercase italic flex justify-center items-center gap-2">Weiter <ChevronRight/></button>
            </div>
          </div>
        )}

        {/* STEP 3: BIOMETRIE */}
        {step === 3 && (
          <div className="space-y-8 animate-in slide-in-from-right-4">
            <h2 className="text-4xl font-black uppercase italic text-orange-600">3. Biometrie</h2>
            <div className="bg-zinc-900 p-6 rounded-3xl border border-zinc-800 space-y-6">
              <div className="flex justify-between items-center">
                <span className="font-bold">Pulsmessung vorhanden?</span>
                <button onClick={() => setForm({...form, useHeartRate: !form.useHeartRate})} className={`w-14 h-8 rounded-full transition-all relative ${form.useHeartRate ? 'bg-orange-600' : 'bg-zinc-700'}`}>
                  <div className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-all ${form.useHeartRate ? 'left-7' : 'left-1'}`} />
                </button>
              </div>
              {form.useHeartRate && (
                <div className="grid grid-cols-2 gap-4 animate-in fade-in">
                  <div>
                    <label className="text-[10px] font-bold text-zinc-500 block mb-2 uppercase text-center">HF Max</label>
                    <input type="number" className="w-full bg-black p-4 rounded-xl border border-zinc-800 text-center font-bold" value={form.maxHR || ""} onChange={(e) => setForm({...form, maxHR: e.target.value})} />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-zinc-500 block mb-2 uppercase text-center">Ruhepuls</label>
                    <input type="number" className="w-full bg-black p-4 rounded-xl border border-zinc-800 text-center font-bold" value={form.restHR || ""} onChange={(e) => setForm({...form, restHR: e.target.value})} />
                  </div>
                </div>
              )}
            </div>
            <div className="flex gap-4">
              <button onClick={() => setStep(2)} className="p-5 bg-zinc-900 rounded-2xl border border-zinc-800"><ChevronLeft/></button>
              <button onClick={() => setStep(4)} className="flex-1 bg-white text-black py-5 rounded-2xl font-black uppercase italic flex justify-center items-center gap-2">Weiter <ChevronRight/></button>
            </div>
          </div>
        )}

        {/* STEP 4: LOGISTIK */}
        {step === 4 && (
          <div className="space-y-8 animate-in slide-in-from-right-4">
            <h2 className="text-4xl font-black uppercase italic text-orange-600">4. Logistik</h2>
            <div className="space-y-6">
              <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase mb-3 text-center">Longrun Wochentag</label>
                <select className="w-full bg-zinc-900 p-5 rounded-2xl border border-zinc-800 font-bold outline-none" value={form.longRunDay || "Sonntag"} onChange={(e) => setForm({...form, longRunDay: e.target.value})}>
                  {["Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag", "Sonntag"].map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase mb-3 text-center">Tage pro Woche</label>
                <div className="flex gap-2">
                  {[2, 3, 4, 5, 6].map(n => (
                    <button key={n} onClick={() => setForm({...form, daysPerWeek: n})} className={`flex-1 py-4 rounded-xl font-bold transition-all ${form.daysPerWeek === n ? 'bg-orange-600 text-black shadow-lg shadow-orange-600/20' : 'bg-zinc-900 text-zinc-500'}`}>{n}</button>
                  ))}
                </div>
              </div>
            </div>
            {getWarning() && (
              <div className="p-4 bg-orange-600/10 border border-orange-600/30 rounded-2xl flex items-start gap-3 text-orange-500 text-xs italic leading-relaxed">
                <AlertTriangle size={18} className="shrink-0" />
                <p>{getWarning()}</p>
              </div>
            )}
            <div className="flex gap-4">
              <button onClick={() => setStep(3)} className="p-5 bg-zinc-900 rounded-2xl border border-zinc-800"><ChevronLeft/></button>
              <button onClick={() => setStep(5)} className="flex-1 bg-white text-black py-5 rounded-2xl font-black uppercase italic flex justify-center items-center gap-2">Weiter <ChevronRight/></button>
            </div>
          </div>
        )}

        {/* STEP 5: FINALE */}
        {step === 5 && (
          <div className="space-y-8 animate-in slide-in-from-right-4">
            <h2 className="text-4xl font-black uppercase italic text-orange-600">5. Finale</h2>
            <div className="space-y-6">
               <div className="flex gap-4">
                  <button onClick={() => setForm({...form, planType: 'weeks'})} className={`flex-1 p-4 rounded-xl border-2 font-bold ${form.planType === 'weeks' ? 'border-orange-600 bg-orange-600/5' : 'border-zinc-800'}`}>Wochenanzahl</button>
                  <button onClick={() => setForm({...form, planType: 'event'})} className={`flex-1 p-4 rounded-xl border-2 font-bold ${form.planType === 'event' ? 'border-orange-600 bg-orange-600/5' : 'border-zinc-800'}`}>Event-Datum</button>
               </div>
               {form.planType === 'weeks' ? (
                 <input type="number" className="w-full bg-zinc-900 p-5 rounded-2xl border border-zinc-800 font-bold" value={form.planWeeks || ""} onChange={(e) => setForm({...form, planWeeks: e.target.value})} placeholder="Wochen (z.B. 12)" />
               ) : (
                 <input type="date" className="w-full bg-zinc-900 p-5 rounded-2xl border border-zinc-800 font-bold text-white invert" value={form.eventDate || ""} onChange={(e) => setForm({...form, eventDate: e.target.value})} />
               )}
               <textarea className="w-full bg-zinc-900 p-5 rounded-2xl border border-zinc-800 h-32 outline-none focus:border-orange-600" placeholder="Anmerkungen..." value={form.notes || ""} onChange={(e) => setForm({...form, notes: e.target.value})} />
            </div>
            <button 
              onClick={handleGenerate} 
              disabled={loading}
              className="w-full bg-orange-600 text-black py-6 rounded-3xl font-black text-2xl uppercase italic flex justify-center items-center gap-4 shadow-[0_0_40px_rgba(234,88,12,0.4)] disabled:opacity-50"
            >
              {loading ? <Loader2 className="animate-spin" /> : "PLAN GENERIEREN"}
            </button>
          </div>
        )}

        {/* STEP 10: ERFOLG */}
        {step === 10 && plan && (
          <div className="text-center space-y-10 animate-in zoom-in-95 duration-500">
            <div className="p-12 bg-zinc-900 border-2 border-orange-600/30 rounded-[3rem] shadow-2xl relative">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-orange-600 text-black px-6 py-1 rounded-full text-xs font-black uppercase shadow-lg">System Ready</div>
              <h2 className="text-4xl font-black uppercase italic mb-8 italic text-orange-600 leading-tight">Plan erfolgreich <br/> erstellt</h2>
              <PDFDownloadLink 
                document={<PlanPDF data={plan} />} 
                fileName={`PacePilot_${form.distance}.pdf`}
                className="w-full bg-white text-black py-7 rounded-2xl font-black text-2xl flex justify-center items-center gap-4 shadow-xl hover:scale-[1.02] transition-transform"
              >
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