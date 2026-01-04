import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

export const runtime = 'edge'; // Optimierung für Cloudflare

export async function POST(req: Request) {
  try {
    const data = await req.json();
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json({ error: "API Key fehlt" }, { status: 500 });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    // Beibehaltung des spezifischen 2.0 Flash Lite Modells
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });

    // 1. Wochenberechnung
    let weeksToGenerate = parseInt(data.planWeeks) || 8;
    if (data.planType === 'event' && data.eventDate) {
      const start = new Date();
      const end = new Date(data.eventDate);
      weeksToGenerate = Math.ceil(Math.abs(end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 7));
    }

    // 2. Dynamische Intensitäts-Logik
    const intensityInstruction = data.useHeartRate && data.maxHR > 0
      ? `RECHNE EXAKT: Berechne für jede Einheit den Pulsbereich in BPM basierend auf dem Maximalpuls von ${data.maxHR}. (Beispiel: Statt 70% schreibe "133-140 BPM"). Verwende verschiedene Session-Typen: easy, long, tempo (Schwelle), intervals (Intervalle), recovery.`
      : `RPE-SKALA NUTZEN: Da keine Pulsuhr vorhanden ist, gib für jede Einheit eine Intensität auf der RPE-Skala von 0 bis 10 an (z.B. "Intensität: 7/10 - Harte Belastung"). Verwende verschiedene Session-Typen: easy, long, tempo (Schwelle), intervals (Intervalle), recovery.`;

    // 3. Verschärfter Prompt
    const prompt = `
      STRENGSTENS VERBOTEN: Gib keinen Einleitungstext, keine Erklärungen und keine Schlussworte aus. 
      Deine gesamte Antwort MUSS ein einziges, valides JSON-Objekt sein.
      Beginne deine Antwort direkt mit '{' und beende sie mit '}'.

      ROLLE: Du bist ein Elite-Lauftrainer. Erstelle einen Trainingsplan für exakt ${weeksToGenerate} Wochen.
      ZIEL: ${data.distance} mit angestrebter Zeit ${data.targetTime?.h || '00'}:${data.targetTime?.m || '00'}:${data.targetTime?.s || '00'}.
      
      STRUKTUR-VORGABEN:
      1. Jede Woche MUSS exakt 7 Tage (Montag bis Sonntag) enthalten.
      2. Nur die Aktivitäten "Laufen" und "Krafttraining" sind erlaubt. Keine anderen Sportarten.
      3. Der Longrun (längster Lauf der Woche) MUSS zwingend am ${data.longRunDay} stattfinden.
      4. Mindestens 1-2 Ruhetage pro Woche einplanen (Activity: "Ruhetag").
      5. Baue pro Woche mindestens eine Tempo-/Schwellen-Einheit ODER Intervalle ein (abwechselnd über die Wochen). Der Plan MUSS also nicht nur gleiches Tempo reproduzieren.
      6. Wenn der Nutzer Krafttraining aktiviert hat (data.includeStrength === true), füge 1-2 Krafttrainingseinheiten pro Woche hinzu (Activity: "Krafttraining") und liste konkrete Übungen im dem Detail-Feld (z.B. "3x12 Kniebeugen, 3x10 Ausfallschritte, 3xPlank 60s").
      
      INTENSITÄTS-LOGIK:
      - ${intensityInstruction}
      - Gib für JEDE Laufeinheit eine konkrete Pace-Empfehlung in min/km an (basierend auf aktueller Pace ${data.currentPace || '06:00'}). Verwende für Intervalle und Tempo klare Vorgaben (z.B. "6x800m @ 04:10/km" oder "20min Schwelle @ 04:30/km").
      - Bei Krafttraining: Liste konkrete Übungen im Detail-Feld auf (z.B. 3x12 Kniebeugen, Ausfallschritte, Planks).
      
      JSON-FORMAT:
      {
        "target": "${data.distance}",
        "targetPace": "${data.currentPace}",
        "targetTime": "${data.targetTime.h}:${data.targetTime.m}:${data.targetTime.s}",
        "weeks": [
          {
            "weekNumber": 1,
            "days": [
              { "day": "Montag", "activity": "Laufen", "intensity": "...", "detail": "..." }
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
        } catch (e) {}
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
        model: "gemini-2.0-flash-lite"
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