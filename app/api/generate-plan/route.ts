import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const data = await req.json();
    const apiKey = process.env.GEMINI_API_KEY;
    const genAI = new GoogleGenerativeAI(apiKey!);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    // Wochenberechnung (wie zuvor)
// Berechne die Wochen (wie gehabt)
  let weeksToGenerate = parseInt(data.planWeeks) || 8;
  if (data.planType === 'event' && data.eventDate) {
    const start = new Date();
    const end = new Date(data.eventDate);
    weeksToGenerate = Math.ceil(Math.abs(end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 7));
  }

  // Dynamische Logik für die Intensitäts-Vorgabe
  const intensityInstruction = data.useHeartRate && data.maxHR > 0
    ? `RECHNE EXAKT: Berechne für jede Einheit den Pulsbereich in BPM basierend auf dem Maximalpuls von ${data.maxHR}. (Beispiel: Statt 70% schreibe "133-140 BPM")`
    : `RPE-SKALA NUTZEN: Da keine Pulsuhr vorhanden ist, gib für jede Einheit eine Intensität auf der RPE-Skala von 0 bis 10 an (z.B. "Intensität: 7/10 - Harte Belastung").`;

  const prompt = `
    Du bist ein hochprofessioneller Lauftrainer. Erstelle einen Trainingsplan für ${weeksToGenerate} Wochen.
    
    NUTZERDATEN:
    - Ziel: ${data.distance} (${data.targetGoal})
    - Maximalpuls: ${data.maxHR} BPM
    - Trainingstage: ${data.daysPerWeek} pro Woche
    - Ausrüstung: ${data.useHeartRate ? 'Pulsuhr vorhanden' : 'KEINE Pulsuhr'}
    
    STRENGE REGELN FÜR DEN INHALT:
    1. SPORTARTEN: Erlaube NUR "Laufen" und "Krafttraining". Keine anderen Sportarten wie Radfahren, Schwimmen oder Yoga.
    2. PULS/INTENSITÄT: ${intensityInstruction}
    3. KRAFTTRAINING: Wenn "Krafttraining" gewählt wird, MÜSSEN im Feld "detail" konkret ausführbare Übungen stehen (z.B. "3x12 Kniebeugen, Ausfallschritte, Wadenheben, Planks").
    4. LAUFEN: Gib bei jeder Laufeinheit die exakte Pace (basierend auf ${data.currentPace}) UND entweder den BPM-Bereich oder den RPE-Wert an.
    
    ANTWORTE NUR ALS JSON IM FORMAT:
    {
      "target": "${data.distance}",
      "trainingPlan": [
        {
          "weekNumber": 1,
          "days": [
            { "day": "Montag", "activity": "Laufen", "detail": "...", "intensity": "..." }
          ]
        }
      ]
    }
  `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text().replace(/```json/g, "").replace(/```/g, "").trim();
    
    const planData = JSON.parse(text);

    // DEBUG IM TERMINAL: Hier siehst du, ob die Tage fehlen
    console.log("--- DEBUG START ---");
    console.log("Anzahl generierter Wochen:", planData.weeks?.length);
    if (planData.weeks && planData.weeks[0]) {
      console.log("Beispiel Woche 1 Tage:", planData.weeks[0].days?.length);
    }
    console.dir(planData, { depth: null }); // Zeigt das ganze Objekt im Terminal
    console.log("--- DEBUG ENDE ---");

    const debug = {
      inputTokens: response.usageMetadata?.promptTokenCount || 0,
      outputTokens: response.usageMetadata?.candidatesTokenCount || 0,
      model: "gemini-2.0-flash-lite"
    };

    return NextResponse.json({ ...planData, debug });
  } catch (error: any) {
    console.error("SERVER FEHLER:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}