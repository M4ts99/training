import React from 'react';
import { Page, Text, View, Document, StyleSheet } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: {
    padding: 30,
    backgroundColor: '#050505',
    color: '#fff',
    fontFamily: 'Helvetica'
  },
  debugBox: {
    position: 'absolute',
    top: 15,
    right: 15,
    padding: 5,
    backgroundColor: '#111',
    borderWidth: 1,
    borderColor: '#333',
    fontSize: 7,
    color: '#555'
  },
  assessmentBox: {
    padding: 10,
    marginTop: 10,
    marginBottom: 20,
    backgroundColor: '#111',
    borderLeftWidth: 3,
    borderLeftColor: '#EA580C'
  },
  assessmentTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#EA580C',
    marginBottom: 5,
    textTransform: 'uppercase'
  },
  assessmentText: {
    fontSize: 9,
    color: '#ddd',
    lineHeight: 1.4,
    fontStyle: 'italic'
  },
  header: {
    marginBottom: 20,
    borderBottomWidth: 2,
    borderColor: '#EA580C',
    paddingBottom: 10
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#EA580C',
    letterSpacing: 1
  },
  subtitle: {
    fontSize: 10,
    color: '#aaa',
    marginTop: 5,
    textTransform: 'uppercase'
  },
  weekTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#000',
    backgroundColor: '#EA580C',
    padding: 5,
    marginBottom: 10,
    borderRadius: 2,
    textTransform: 'uppercase'
  },
  // Tabellen-Header
  tableHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderColor: '#EA580C',
    paddingBottom: 5,
    marginBottom: 5
  },
  headerCol: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#EA580C',
    textTransform: 'uppercase'
  },
  // Zeilen-Struktur
  dayRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderColor: '#222',
    paddingVertical: 8,
    minHeight: 40,
    alignItems: 'flex-start'
  },
  colDay: { width: '12%' },
  colType: { width: '18%' },
  colInt: { width: '15%' }, // NEUE SPALTE für Intensität/HF/RPE
  colDet: { width: '55%' },

  text: { fontSize: 9, color: '#ccc' },
  bold: { fontWeight: 'bold', color: '#fff' },

  footer: {
    position: 'absolute',
    bottom: 20,
    left: 30,
    right: 30,
    fontSize: 7,
    textAlign: 'center',
    color: '#444',
    borderTopWidth: 1,
    borderColor: '#222',
    paddingTop: 8
  }
});

export function PlanPDF({ data }: { data: any }) {
  // Unterstützung für verschiedene Key-Namen der KI
  const weeksArray = data?.trainingPlan || data?.trainingsplan || data?.weeks || data?.plan;

  // Hilfsfunktion: KM aus Detail-Text extrahieren (robuster)
  const extractKmFromText = (text: any): number => {
    if (!text) return 0;
    const s = String(text).toLowerCase();
    // Match patterns like "10km", "10 km", "10k"
    const patterns = [
      /(\d+(?:\.\d+)?)\s*km/i,
      /(\d+(?:\.\d+)?)\s*k\b/i,
      /(\d+(?:\.\d+)?)\s*kilometer/i
    ];
    for (const p of patterns) {
      const m = s.match(p);
      if (m && m[1]) return parseFloat(m[1]);
    }
    return 0;
  };

  // Wöchentliche KM berechnen aus Tageseinheiten
  const calculateWeeklyKm = (week: any): number => {
    if (!week?.days || !Array.isArray(week.days)) return 0;
    let total = 0;
    for (const day of week.days) {
      if (day.activity && /laufen|run/i.test(String(day.activity))) {
        let km = 0;
        if (day.distance) km = parseFloat(String(day.distance).replace(/[^0-9.]/g, '')) || 0;
        if (!km && day.detail) km = extractKmFromText(day.detail);
        total += km;
      }
    }
    return Math.round(total * 10) / 10;
  };

  // Wöchentliche KM ermitteln (API-Wert oder berechnet)
  const getWeeklyKm = (week: any): string => {
    const apiValue = week.weeklyKm || week.weekly_km || week.weeklyKilometers;
    if (apiValue && apiValue !== '-') return String(apiValue);
    const calculated = calculateWeeklyKm(week);
    if (calculated > 0) return String(calculated);
    return data.targetWeeklyKm || '-';
  };

  const parseTimeToSeconds = (t: any) => {
    if (!t) return null;
    const s = String(t).trim();
    if (!s) return null;
    const parts = s.split(':').map((p) => parseInt(p, 10));
    if (parts.length === 3) return (parts[0] || 0) * 3600 + (parts[1] || 0) * 60 + (parts[2] || 0);
    if (parts.length === 2) return (parts[0] || 0) * 60 + (parts[1] || 0);
    if (parts.length === 1) return parts[0] || 0;
    return null;
  };

  const computePace = (d: any) => {
    if (!d) return null;
    if (d.targetPace) return d.targetPace;
    const timeStr = d.targetTimeFormatted || d.targetTime || d.target_time;
    const secs = parseTimeToSeconds(timeStr);
    if (!secs) return null;
    const distMap: Record<string, number> = { '5km': 5, '10km': 10, 'Halbmarathon': 21.0975, 'Marathon': 42.195 };
    let dist = distMap[d.target] || distMap[d.distance] || null;
    if (!dist && d.distance && typeof d.distance === 'string') {
      const num = parseFloat(d.distance.replace(/[a-zA-Z]/g, ''));
      if (!isNaN(num) && num > 0) dist = num;
    }
    if (!dist) return null;
    const paceSec = Math.round(secs / dist);
    const mm = Math.floor(paceSec / 60);
    const ss = paceSec % 60;
    return `${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
  };

  const renderStrengthLabel = (d: any) => {
    if (!d || !d.includeStrength) return 'Nein';
    const eq = d.equipment || d.equipmentType || '';
    if (!eq || eq === 'Keines' || /keine|keines|bodyweight/i.test(String(eq))) return 'Ja, ohne Gym';
    if (/gewichte|eigengewicht/i.test(String(eq))) return 'Ja, mit Eigengewicht';
    if (/gym|fitnessstudio/i.test(String(eq))) return 'Ja, mit Fitnessstudio';
    return `Ja (${eq})`;
  };

  const formatPace = (p: any) => {
    if (!p) return '--:--';
    if (typeof p === 'string') return p;
    if (p.m !== undefined || p.s !== undefined) return `${String(p.m || '0').padStart(2, '0')}:${String(p.s || '0').padStart(2, '0')}`;
    if (p.min !== undefined || p.sec !== undefined) return `${String(p.min || '0').padStart(2, '0')}:${String(p.sec || '0').padStart(2, '0')}`;
    if (p.minutes !== undefined || p.seconds !== undefined) return `${String(p.minutes || '0').padStart(2, '0')}:${String(p.seconds || '0').padStart(2, '0')}`;
    return '--:--';
  };

  if (!data || !weeksArray || !Array.isArray(weeksArray)) {
    return (
      <Document>
        <Page size="A4" style={styles.page}>
          <Text>Daten werden verarbeitet oder sind fehlerhaft...</Text>
        </Page>
      </Document>
    );
  }

  return (
    <Document title="PacePilot Trainingsplan">
      {weeksArray.map((week: any, i: number) => (
        <Page key={i} size="A4" style={styles.page}>

          {/* DEBUG INFO (Tokens) - Nur auf der ersten Seite */}
          {i === 0 && data.debug && (
            <View style={styles.debugBox}>
              <Text>MOD: {data.debug.model} | IN: {data.debug.inputTokens} | OUT: {data.debug.outputTokens}</Text>
            </View>
          )}

          {/* Header mit Ziel-Vision */}
          <View style={styles.header}>
            <Text style={styles.title}>PACEPILOT PRO</Text>
            {i === 0 ? (
              <>
                <Text style={styles.subtitle}>Ziel Distanz: {data.target || data.distance || '-'}</Text>
                <Text style={styles.subtitle}>Ziel Zeit: {data.targetTime || data.targetTimeFormatted || '--:--:--'}</Text>
                <Text style={styles.subtitle}>Ziel Pace: {data.targetPace || computePace(data) || '--:--'} min/km</Text>

                {data.assessment && (
                  <View style={styles.assessmentBox}>
                    <Text style={styles.assessmentTitle}>REALITY CHECK</Text>
                    <Text style={styles.assessmentText}>{data.assessment}</Text>
                  </View>
                )}
              </>
            ) : (
              <Text style={styles.subtitle}>{data.target || data.distance || ''}</Text>
            )}
          </View>

          <Text style={styles.weekTitle}>Trainingswoche {week.weekNumber || i + 1} — Wochenkilometer: {getWeeklyKm(week)} km</Text>

          {/* Tabellen-Kopf */}
          <View style={styles.tableHeader}>
            <Text style={[styles.headerCol, styles.colDay]}>Tag</Text>
            <Text style={[styles.headerCol, styles.colType]}>Art</Text>
            <Text style={[styles.headerCol, styles.colInt]}>Intensität</Text>
            <Text style={[styles.headerCol, styles.colDet]}>Details & Vorgaben</Text>
          </View>

          {/* Extra: Auf der ersten Seite Zusammenfassung (PRs, Kraft, Dehnen) */}
          {i === 0 && (
            <View style={{ marginBottom: 10 }}>
              <Text style={[styles.text, { marginBottom: 4 }]}>Zusammenfassung</Text>
              <Text style={styles.text}>Krafttraining: {renderStrengthLabel(data)}</Text>
              <Text style={styles.text}>Dehnen / Mobility: {data.includeStretching ? 'Ja' : 'Nein'}</Text>
              {data.zone2Pace && (
                <Text style={styles.text}>Zone-2 Pace: {formatPace(data.zone2Pace)} — bei {data.zone2Type === 'hr' ? '70%' : `Anstrengung ${data.zone2Value || '-'} /10`}</Text>
              )}
              {data.pr5k && data.pr5k !== '' && <Text style={styles.text}>PB 5km: {data.pr5k}</Text>}
              {data.pr10k && data.pr10k !== '' && <Text style={styles.text}>PB 10km: {data.pr10k}</Text>}
              {data.prHalf && data.prHalf !== '' && <Text style={styles.text}>PB Halbmarathon: {data.prHalf}</Text>}
              {data.prMarathon && data.prMarathon !== '' && <Text style={styles.text}>PB Marathon: {data.prMarathon}</Text>}
            </View>
          )}

          {/* Tage-Mapping */}
          {week.days?.map((day: any, j: number) => (
            <View key={j} style={styles.dayRow}>
              <Text style={[styles.text, styles.colDay, styles.bold]}>{day.day}</Text>
              <Text style={[styles.text, styles.colType]}>{day.activity}</Text>
              <Text style={[styles.text, styles.colInt, { color: '#EA580C' }]}>
                {day.intensity || '---'}
              </Text>
              <Text style={[styles.text, styles.colDet]}>{day.detail}</Text>
            </View>
          ))}

          {/* Footer mit Seitenzahlen */}
          <Text
            style={styles.footer}
            fixed
            render={({ pageNumber, totalPages }) => (
              `Seite ${pageNumber} von ${totalPages} • Generiert von PacePilot AI • ${data.target || data.distance || ''} Plan`
            )}
          />
        </Page>
      ))}
    </Document>
  );
}