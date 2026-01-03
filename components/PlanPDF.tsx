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
            <Text style={styles.subtitle}>
              ZIEL: {data.target || 'MARATHON'} | PACE: {data.targetPace || '--:--'} MIN/KM | ZEIT: {data.targetTime || '--:--:--'}
            </Text>
          </View>

          <Text style={styles.weekTitle}>Trainingswoche {week.weekNumber || i + 1}</Text>

          {/* Tabellen-Kopf */}
          <View style={styles.tableHeader}>
            <Text style={[styles.headerCol, styles.colDay]}>Tag</Text>
            <Text style={[styles.headerCol, styles.colType]}>Art</Text>
            <Text style={[styles.headerCol, styles.colInt]}>Intensität</Text>
            <Text style={[styles.headerCol, styles.colDet]}>Details & Vorgaben</Text>
          </View>

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
              `Seite ${pageNumber} von ${totalPages} • Generiert von PacePilot AI • {data.target} Plan`
            )} 
          />
        </Page>
      ))}
    </Document>
  );
}