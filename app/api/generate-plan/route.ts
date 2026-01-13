import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

export const runtime = 'edge'; // Optimierung für Cloudflare

// ==========================================
// MODULAR PROMPT SYSTEM
// ==========================================

// Distanzspezifische System-Prompts
const distancePrompts: Record<string, string> = {
  '5km': `
    DISTANZ-FOKUS 5KM:
    - Schwerpunkt auf VO2max-Intervallen und schnellen Wiederholungen
    - Typische Intervalle: 400m, 800m, 1km Repeats
    - Tempo-Läufe im 5k-Renntempo
    - Kurze, explosive Einheiten bevorzugen
    - Maximale Longrun-Distanz: 12-15km
    - Höhere Intensität, kürzere Erholung zwischen Intervallen`,

  '10km': `
    DISTANZ-FOKUS 10KM:
    - Balance zwischen Ausdauer und Tempohärte
    - Schwellenläufe (Tempo Runs) im Laktatbereich
    - Intervalle: 800m-1600m Repeats
    - Progressionsläufe (letztes Drittel schneller)
    - Maximale Longrun-Distanz: 16-20km
    - Wöchentlich 1x Tempo + 1x Longrun`,

  'Halbmarathon': `
    DISTANZ-FOKUS HALBMARATHON:
    - Schwellentraining ist Kernstück der Vorbereitung
    - Lange Tempodauerläufe (Tempo Runs 8-12km)
    - Longrun-Progression bis 22-24km
    - Marathon-Pace-Einheiten einbauen
    - Letzte 2 Wochen: Tapering mit reduziertem Volumen
    - Fokus auf muskuläre Ausdauer im Krafttraining`,

  'Marathon': `
    DISTANZ-FOKUS MARATHON:
    - Periodisierung über 3-4 Blöcke: Aufbau → Spezifik → Wettkampf → Tapering
    - Block 1 (Wochen 1-4): Grundlagenausdauer aufbauen, Longrun von 18-24km
    - Block 2 (Wochen 5-8): Spezifisches Marathon-Tempo einführen, Longrun 26-32km
    - Block 3 (Wochen 9-11): Peak-Wochen, längste Longruns (32-35km), Marathon-Pace-Segmente
    - Block 4 (Wochen 12+): Tapering, Volumen um 40-60% reduzieren, Beine frisch halten
    - Schwellenläufe weniger intensiv als bei kürzeren Distanzen
    - TAPERING KRITISCH: Letzte 2-3 Wochen deutlich weniger km, keine Longuns >20km`
};

// Plyometrie-fokussiertes Krafttraining (skaliert nach Equipment und Umfang)
const getStrengthPrompt = (equipment: string, distance: string, weeklyKm: number): string => {
  if (!equipment) return '';

  // Basis-Plyometrie-Übungen (alle Levels)
  const plyoBasic = [
    "Box Jumps (3x8)",
    "Skipping (3x30 Sek.)",
    "Sprungkniebeugen (3x10)",
    "Ausfallschritt-Sprünge (3x8 pro Seite)",
    "Wadenheben einbeinig (3x15)",
    "Plank (3x45 Sek.)"
  ];

  // Fortgeschrittene Plyometrie (höherer Umfang)
  const plyoAdvanced = [
    "Depth Jumps (3x6)",
    "Bounding (3x10 Kontakte)",
    "Single-Leg Hops (3x10 pro Seite)",
    "Tuck Jumps (3x8)",
    "Bulgarian Split Squat Jumps (3x6 pro Seite)"
  ];

  // Equipment-spezifische Ergänzungen
  const equipmentExercises: Record<string, string[]> = {
    'Keines': [
      "Pistol Squats (3x5 pro Seite)",
      "Nordic Curls (3x6)",
      "Glute Bridge einbeinig (3x12)",
      "Mountain Climbers (3x30 Sek.)"
    ],
    'Gewichte': [
      "Kurzhantel-Kniebeugen (3x12)",
      "Romanian Deadlifts (3x10)",
      "Kurzhantel-Ausfallschritte (3x10 pro Seite)",
      "Kettlebell Swings (3x15)"
    ],
    'Gym': [
      "Langhantel-Kniebeugen (4x8)",
      "Kreuzheben (3x8)",
      "Beinpresse (3x12)",
      "Leg Curls (3x12)",
      "Hip Thrusts (3x10)"
    ]
  };

  const useAdvanced = weeklyKm > 40 || distance === 'Marathon' || distance === 'Halbmarathon';
  const plyoExercises = useAdvanced ? [...plyoBasic, ...plyoAdvanced.slice(0, 2)] : plyoBasic;
  const eqExercises = equipmentExercises[equipment] || equipmentExercises['Keines'];

  return `
    KRAFTTRAINING (Plyometrie-Fokus für Läufer):
    - Equipment: ${equipment === 'Keines' ? 'Bodyweight/Eigengewicht' : equipment === 'Gewichte' ? 'Kurzhanteln/Kettlebells Zuhause' : 'Fitnessstudio mit vollem Equipment'}
    - 1-2 Krafteinheiten pro Woche, NICHT an Tagen mit intensiven Laufeinheiten
    - Plyometrie-Übungen zur Verbesserung der Laufökonomie: ${plyoExercises.slice(0, 4).join(', ')}
    - Ergänzende Kräftigung: ${eqExercises.slice(0, 3).join(', ')}
    - Bei Marathon/HM: Krafttraining im Tapering um 50% reduzieren
    - WICHTIG: Im Detail-Feld konkrete Übungen mit Sets/Reps auflisten!`;
};

export async function POST(req: Request) {
  try {
    const data = await req.json();
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json({ error: "API Key fehlt" }, { status: 500 });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    // Upgrade auf Gemini 2.0 Flash (Full) für besseres Reasoning bei komplexen Trainingsplänen
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    // 1. Wochenberechnung
    let weeksToGenerate = parseInt(data.planWeeks) || 8;
    if (data.planType === 'event' && data.eventDate) {
      const start = new Date();
      const end = new Date(data.eventDate);
      weeksToGenerate = Math.ceil(Math.abs(end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 7));
    }

    // 2. Dynamische Intensitäts-Logik
    const intensityInstruction = data.useHeartRate && data.maxHR > 0
      ? `HERZFREQUENZ-BERECHNUNG: Berechne für jede Einheit den Pulsbereich in BPM basierend auf Max-HR ${data.maxHR} und Ruhe-HR ${data.restHR || 60}. Nutze Karvonen-Formel. Beispiel: Zone 2 = 60-70% HRR = konkrete BPM angeben.`
      : `RPE-SKALA: Da keine Pulsuhr vorhanden, gib für jede Einheit RPE von 1-10 an (z.B. "RPE 6 - moderate Belastung").`;

    // 3. Zone-2 Pace Integration
    const zone2Info = data.zone2Pace
      ? `Zone-2 Referenz-Pace: ${String(data.zone2Pace.m || '6').padStart(2, '0')}:${String(data.zone2Pace.s || '00').padStart(2, '0')} min/km (bei ${data.zone2Type === 'hr' ? '70% HF' : 'RPE ' + (data.zone2Value || '6') + '/10'}). Nutze dies als Basis für Easy Runs.`
      : '';

    // 4. Distanz-spezifischer Prompt
    const distanceSpecificPrompt = distancePrompts[data.distance] || distancePrompts['10km'];

    // 4b. Volumen-Progression berechnen (Linear + Tapering)
    const startKm = parseInt(data.currentWeeklyVolume) || 20;
    const endKm = parseInt(data.targetWeeklyKm) || 35;
    const volumeSchedule = [];

    // Tapering-Logik: Letzte 2 Wochen reduziert
    const taperWeeks = data.distance === 'Marathon' || data.distance === 'Halbmarathon' ? 2 : 1;
    const buildWeeks = Math.max(1, weeksToGenerate - taperWeeks);

    for (let i = 0; i < weeksToGenerate; i++) {
      let km = 0;
      if (i < buildWeeks) {
        // Linearer Aufbau bis zum Peak
        if (buildWeeks === 1) km = endKm;
        else km = startKm + ((endKm - startKm) / (buildWeeks - 1)) * i;
      } else {
        // Tapering: Reduktion auf 70% dann 50% vom Peak
        const taperStep = i - buildWeeks;
        const peak = endKm;
        km = taperStep === 0 ? peak * 0.7 : peak * 0.5;
      }
      volumeSchedule.push(`Woche ${i + 1}: ca. ${Math.round(km)} km`);
    }
    const volumeString = volumeSchedule.join('\n      ');

    // 5. Krafttraining-Subprompt
    const strengthPrompt = data.includeStrength
      ? getStrengthPrompt(data.equipment || 'Keines', data.distance, parseInt(data.targetWeeklyKm) || 30)
      : 'KEIN Krafttraining im Plan. Nur Laufeinheiten und Ruhetage.';

    // 6. Modularer Haupt-Prompt
    const prompt = `
      STRENGSTENS VERBOTEN: Gib keinen Einleitungstext, keine Erklärungen und keine Schlussworte aus. 
      Deine gesamte Antwort MUSS ein einziges, valides JSON-Objekt sein.
      Beginne deine Antwort direkt mit '{' und beende sie mit '}'.

      ROLLE: Du bist ein Elite-Lauftrainer mit 20+ Jahren Erfahrung.
      
      ATHLETEN-PROFIL:
      - Zieldistanz: ${data.distance}
      - Zielzeit: ${data.targetTime?.h || '00'}:${data.targetTime?.m || '00'}:${data.targetTime?.s || '00'}
      - Aktueller Wochenumfang: ${data.currentWeeklyVolume || '20'} km
      - Ziel-Wochenumfang (Peak): ${data.targetWeeklyKm || '35'} km
      - Trainingstage pro Woche: ${data.daysPerWeek || 3}
      - ${zone2Info}
      
      ${distanceSpecificPrompt}
      
      ${strengthPrompt}
      
      STRUKTUR-VORGABEN (Plan für ${weeksToGenerate} Wochen):
      1. Jede Woche MUSS exakt 7 Tage (Montag bis Sonntag) enthalten.
      2. Erlaubte Aktivitäten: "Laufen", "Krafttraining", "Ruhetag"
      3. Der Longrun MUSS am ${data.longRunDay || 'Sonntag'} stattfinden.
      4. Mindestens 1-2 Ruhetage pro Woche (Activity: "Ruhetag", Detail: "Aktive Erholung").
      5. Pro Woche: 1x Tempo/Schwelle ODER 1x Intervalle (abwechselnd).
      6. DISTANZ IMMER MIT "km" ANGEBEN (z.B. "10km", nicht "10 Kilometer").
      
      WOCHEN-PENSA (NICHT UNTERSCHREITEN!):
      Die Summe der einzelnen Laufeinheiten MUSS den folgenden Vorgaben entsprechen (+/- 10% Toleranz):
      ${volumeString}
      
      RECHEN-CHECK: Addiere VOR der Ausgabe jeder Woche die km der einzelnen Tage. Wenn Summe < Vorgabe, verlängere den Longrun oder den Easy Run!
      
      INTENSITÄTS-LOGIK (WICHTIG - PACE VARIATION):
      - ${intensityInstruction}
      - Gib für JEDE Laufeinheit konkrete Pace in min/km an.
      - **Easy Runs / Long Runs:** Basispace = ${data.zone2Pace ? `${data.zone2Pace.m}:${data.zone2Pace.s}` : (data.currentPace || '06:00')} min/km
      - **Qualitäts-Einheiten (MÜSSEN schneller als Renntempo sein):**
        * Ermittle zuerst das Renntempo (Race Pace) aus Zielzeit ${data.targetTime?.h || '00'}:${data.targetTime?.m || '00'}:${data.targetTime?.s || '00'} auf ${data.distance}.
        * *Tempoläufe (Threshold):* Renntempo MINUS 10-20 Sekunden/km
        * *Intervalle (1km+):* Renntempo MINUS 30-45 Sekunden/km
        * *Kurze Intervalle (400m):* Renntempo MINUS 45-60 Sekunden/km
      - FEHLER-PRÜFUNG: Wenn Intervalle langsamer sind als das Renntempo, ist der Plan FALSCH!
      
      JSON-FORMAT (EXAKT so strukturieren):
      {
        "target": "${data.distance}",
        "targetPace": "${data.currentPace || '06:00'}",
        "targetTime": "${data.targetTime?.h || '00'}:${data.targetTime?.m || '00'}:${data.targetTime?.s || '00'}",
        "weeks": [
          {
            "weekNumber": 1,
            "weeklyKm": 25,
            "days": [
              { "day": "Montag", "activity": "Laufen", "intensity": "Zone 2 / 140-150 BPM", "detail": "8km Easy @ 06:00/km" },
              { "day": "Dienstag", "activity": "Krafttraining", "intensity": "Mittel", "detail": "Box Jumps 3x8, Kniebeugen 3x12, Plank 3x45s" },
              { "day": "Mittwoch", "activity": "Ruhetag", "intensity": "leicht", "detail": "Aktive Erholung" }
            ]
          }
        ]
      }
    `;


    const result = await model.generateContent(prompt);
    const response = await result.response;
    let text = response.text();

    // 4. JSON-STAUBSAUGER (Entfernt KI-Plauderei)
    try {
      const startJson = text.indexOf('{');
      const endJson = text.lastIndexOf('}') + 1;

      if (startJson === -1 || endJson === -1) {
        throw new Error("Kein gültiges JSON im Text gefunden");
      }

      const jsonContent = text.substring(startJson, endJson);
      const planData = JSON.parse(jsonContent);

      // Post-process: ensure weeks have weeklyKm and normalize ruhetag details
      const extractKm = (str: any) => {
        if (!str) return 0;
        try {
          const s = String(str);
          const m = s.match(/([0-9]+(?:\.[0-9]+)?)\s?km/i);
          if (m && m[1]) return parseFloat(m[1]);
          const m2 = s.match(/([0-9]+(?:\.[0-9]+)?)\s?k\b/i);
          if (m2 && m2[1]) return parseFloat(m2[1]);
        } catch (e) { }
        return 0;
      };

      if (Array.isArray(planData.weeks)) {
        planData.weeks.forEach((w: any) => {
          let sum = 0;
          if (Array.isArray(w.days)) {
            w.days.forEach((d: any) => {
              if (d.activity && /ruhetag/i.test(d.activity) && (!d.detail || d.detail.trim() === '' || /N\/A/i.test(String(d.detail)))) {
                d.detail = 'Ruhetag - aktive Erholung';
                d.intensity = d.intensity || 'leicht';
              }
              let km = 0;
              if (d.distance) km = parseFloat(d.distance) || 0;
              if (!km) km = extractKm(d.detail);
              if (!km) km = extractKm(d.activity);
              sum += km;
            });
          }
          w.weeklyKm = sum > 0 ? Math.round(sum * 10) / 10 : undefined;
        });
      }

      // 5. DEBUG-SCHLEIFE IM TERMINAL
      console.log("--- DEBUG START ---");
      console.log("Anzahl generierter Wochen:", planData.weeks?.length);
      console.dir(planData, { depth: null });
      console.log("--- DEBUG ENDE ---");

      // Debug-Info für das PDF
      const debug = {
        inputTokens: response.usageMetadata?.promptTokenCount || 0,
        outputTokens: response.usageMetadata?.candidatesTokenCount || 0,
        model: "gemini-2.0-flash"
      };

      return NextResponse.json({ ...planData, debug });

    } catch (parseError) {
      console.error("ROHTEXT DER KI WAR:", text);
      console.error("JSON-PARSE-FEHLER:", parseError);
      return NextResponse.json({ error: "KI-Formatierungsfehler" }, { status: 500 });
    }

  } catch (error: any) {
    console.error("KRITISCHER SERVER-FEHLER:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}