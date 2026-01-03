import React from 'react';
import { Page, Text, View, Document, StyleSheet } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: { 
    padding: 40, 
    backgroundColor: '#050505', 
    color: '#fff', 
    fontFamily: 'Helvetica' 
  },
  debugBox: { 
    position: 'absolute', 
    top: 20, 
    right: 20, 
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
    paddingBottom: 15 
  },
  title: { 
    fontSize: 28, 
    fontWeight: 'bold', 
    color: '#EA580C', 
    letterSpacing: 2 
  },
  subtitle: { 
    fontSize: 10, 
    color: '#666', 
    marginTop: 5, 
    textTransform: 'uppercase',
    letterSpacing: 1
  },
  weekBox: { 
    marginTop: 20, 
    marginBottom: 10 
  },
  weekTitle: { 
    fontSize: 14, 
    fontWeight: 'bold', 
    color: '#EA580C', 
    marginBottom: 10, 
    backgroundColor: '#111', 
    padding: 6,
    borderRadius: 4,
    textTransform: 'uppercase'
  },
  dayRow: { 
    flexDirection: 'row', 
    borderBottomWidth: 1, 
    borderColor: '#222', 
    paddingVertical: 8,
    minHeight: 40,
    alignItems: 'flex-start'
  },
  dayCol: { 
    width: '15%', 
    fontSize: 10, 
    fontWeight: 'bold', 
    color: '#888' 
  },
  activityCol: { 
    width: '25%', 
    fontSize: 10, 
    fontWeight: 'bold', 
    color: '#fff',
    paddingRight: 5
  },
  detailCol: { 
    width: '60%', 
    fontSize: 9, 
    color: '#ccc', 
    lineHeight: 1.4,
    paddingRight: 10
  },
  footer: { 
    position: 'absolute', 
    bottom: 20, 
    left: 40, 
    right: 40, 
    fontSize: 8, 
    textAlign: 'center', 
    color: '#444', 
    borderTopWidth: 1, 
    borderColor: '#222', 
    paddingTop: 10 
  }
});

export function PlanPDF({ data }: { data: any }) {
  // INTELLIGENTE SUCHE: Wir prüfen alle möglichen Keys, die die KI nutzen könnte
  const weeksArray = data?.trainingPlan || data?.trainingsplan || data?.weeks || data?.plan;

  // 1. Sicherheits-Check
  if (!data || !weeksArray || !Array.isArray(weeksArray)) {
    return (
      <Document>
        <Page size="A4" style={styles.page}>
          <Text style={styles.title}>DATEN-FEHLER</Text>
          <Text style={{fontSize: 12, marginTop: 20}}>
            Die KI hat Daten gesendet, aber unter einem unbekannten Namen.
          </Text>
          <Text style={{fontSize: 10, color: '#EA580C', marginTop: 10}}>
            Gefundene Keys im Datensatz: {Object.keys(data || {}).join(', ')}
          </Text>
        </Page>
      </Document>
    );
  }

  return (
    <Document title={`PacePilot Plan`}>
      <Page size="A4" style={styles.page} wrap>
        
        {/* DEBUG INFO */}
        {data.debug && (
          <View style={styles.debugBox} fixed>
            <Text>MOD: {data.debug.model}</Text>
            <Text>IN: {data.debug.inputTokens} tkn</Text>
            <Text>OUT: {data.debug.outputTokens} tkn</Text>
          </View>
        )}

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>PACEPILOT PRO</Text>
          <Text style={styles.subtitle}>Individueller Performance-Plan • Ziel: {data.target || 'Training'}</Text>
          <Text style={{ fontSize: 8, color: '#EA580C', marginTop: 4 }}>
            Umfang: {weeksArray.length} Wochen Trainingsplan
          </Text>
        </View>

        {/* ÄUẞERE SCHLEIFE: Durch die Wochen gehen */}
        {weeksArray.map((week: any, i: number) => (
          <View key={i} style={styles.weekBox} wrap={false}>
            <Text style={styles.weekTitle}>Woche {week.weekNumber || i + 1}</Text>
            
            {/* INNERE SCHLEIFE: Durch die Tage gehen */}
            {week.days && Array.isArray(week.days) ? (
              week.days.map((day: any, j: number) => (
                <View key={j} style={styles.dayRow}>
                  <Text style={styles.dayCol}>{day.day || "Tag"}</Text>
                  <Text style={styles.activityCol}>{day.activity || "Aktivität"}</Text>
                  <Text style={styles.detailCol}>{day.detail || "Regeneration"}</Text>
                </View>
              ))
            ) : (
              <Text style={{ color: 'red', fontSize: 10 }}>Keine Tagesdaten gefunden.</Text>
            )}
          </View>
        ))}

        {/* Footer */}
        <Text 
          style={styles.footer} 
          fixed 
          render={({ pageNumber, totalPages }) => (
            `Seite ${pageNumber} / ${totalPages} • Generiert von PacePilot AI • Wissenschaftliche Richtwerte`
          )} 
        />
      </Page>
    </Document>
  );
}