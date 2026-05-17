import React, { useState, useEffect, useCallback } from "react";
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity,
  Platform,
  ActivityIndicator
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { FontAwesome6, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams, useFocusEffect } from "expo-router";
import AsyncStorage from '@react-native-async-storage/async-storage';
import WatermarkOverlay from "../../components/WatermarkOverlay";
export default function GradesScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  
  // Extract student details from params or storage
  const [studentId, setStudentId] = useState((params.studentId as string) || (params.index_number as string) || "");
  const [studentName, setStudentName] = useState((params.first_name as string) ? `${params.first_name} ${params.last_name}` : "Student");
  const [studentGrade, setStudentGrade] = useState((params.grade_level as string) || "Grade Level");

  useEffect(() => {
    const loadFromStorage = async () => {
      if (!studentId) {
        const storedId = await AsyncStorage.getItem('studentId');
        if (storedId) setStudentId(storedId);
        
        const firstName = await AsyncStorage.getItem('studentFirstName');
        const lastName = await AsyncStorage.getItem('studentLastName');
        if (firstName) setStudentName(`${firstName} ${lastName || ''}`.trim());
        
        const grade = await AsyncStorage.getItem('studentGrade');
        if (grade) setStudentGrade(grade);
      }
    };
    loadFromStorage();
  }, [studentId]);

  // --- REPORT STATES ---
  const [isLoading, setIsLoading] = useState(false);
  const [reportData, setReportData] = useState<any>(null);
  const [activeTerm, setActiveTerm] = useState<string | null>(null);

  // --- FETCH REAL DATA ---
  const fetchGrades = async () => {
    if (!studentId) {
      setIsLoading(false);
      return;
    }
    
    if (reportData === null) {
      setIsLoading(true);
    }
    try {
      const url = activeTerm 
        ? `http://172.20.10.7:5000/api/student/${studentId}/academic-report?term=${activeTerm}`
        : `http://172.20.10.7:5000/api/student/${studentId}/academic-report`;
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setReportData(data);
        if (!activeTerm && data.term && data.term !== "N/A") {
          setActiveTerm(data.term);
        }
      }
    } catch (error) {
      console.error("Failed to fetch academic report:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchGrades();
    }, [studentId, activeTerm])
  );

  const getMarkColor = (marks: number | string) => {
    if (marks === "-" || marks === null) return "#94A3B8";
    const num = Number(marks);
    if (num >= 75) return "#16A34A"; // A
    if (num >= 65) return "#2563EB"; // B
    if (num >= 55) return "#D97706"; // C
    if (num >= 35) return "#475569"; // S
    return "#EF4444"; // W/F
  };

  return (
    <SafeAreaView style={styles.container}>
      <WatermarkOverlay />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <FontAwesome6 name="arrow-left" size={20} color="#1E293B" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Academic Report</Text>
        <View style={{ width: 36 }} /> 
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={styles.loadingText}>Fetching Academic Records...</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          
          {/* Student Info Card */}
          <View style={styles.studentCard}>
            <View style={styles.studentInfoRow}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{(reportData?.studentName || studentName).charAt(0)}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.studentName}>{reportData?.studentName || studentName}</Text>
                <Text style={styles.studentDetail}>
                  {reportData?.studentGrade || studentGrade} • Index: {reportData?.studentIndex || studentId}
                </Text>
              </View>
            </View>
          </View>

          {/* Term Selector */}
          <View style={styles.termSelector}>
            {["Term 1", "Term 2", "Term 3"].map((term) => (
              <TouchableOpacity 
                key={term}
                style={[styles.termChip, activeTerm === term && styles.termChipActive]}
                onPress={() => setActiveTerm(term)}
              >
                <Text style={[styles.termText, activeTerm === term && styles.termTextActive]}>{term}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Results Table */}
          {reportData && reportData.subjects && reportData.subjects.length > 0 ? (
            <>
              <View style={styles.resultsContainer}>
                <View style={styles.tableHeader}>
                  <Text style={[styles.tableHeaderText, { flex: 2.5 }]}>Subjects</Text>
                  <Text style={[styles.tableHeaderText, { flex: 2, textAlign: "center" }]}>Remarks</Text>
                  <Text style={[styles.tableHeaderText, { flex: 1, textAlign: "center" }]}>Marks</Text>
                </View>

                {reportData.subjects.map((item: any, index: number) => (
                  <View key={index} style={styles.tableRow}>
                    <Text style={[styles.tableCellSubject, { flex: 2.5 }]}>{item.subject}</Text>
                    <Text style={[styles.tableCellRemarks, { flex: 2, textAlign: "center" }]}>{item.remarks}</Text>
                    <View style={{ flex: 1, alignItems: "center" }}>
                      <Text style={[styles.tableCellMarks, { color: getMarkColor(item.marks) }]}>
                        {item.marks}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>

              {/* Summary Performance Card */}
              <View style={styles.summaryCard}>
                <Text style={styles.summaryTitle}>Overall Performance</Text>
                <View style={styles.summaryGrid}>
                  <View style={styles.summaryBox}>
                    <Text style={styles.summaryLabel}>Student Avg</Text>
                    <Text style={styles.summaryValue}>{reportData.studentAverage}</Text>
                  </View>
                  <View style={styles.summaryBox}>
                    <Text style={styles.summaryLabel}>Class Avg</Text>
                    <Text style={styles.summaryValue}>{reportData.classAverage}</Text>
                  </View>
                  <View style={styles.summaryBox}>
                    <Text style={styles.summaryLabel}>Class Rank</Text>
                    <Text style={styles.summaryValue}>{reportData.classRank}</Text>
                  </View>
                </View>
              </View>
            </>
          ) : (
            <View style={styles.emptyStateContainer}>
              <FontAwesome6 name="file-circle-xmark" size={48} color="#CBD5E1" />
              <Text style={styles.emptyStateTitle}>No Records Found</Text>
              <Text style={styles.emptyStateSub}>Academic records for this term have not been published yet.</Text>
            </View>
          )}

        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, paddingTop: Platform.OS === 'ios' ? 10 : 20, paddingBottom: 16, backgroundColor: "#FFFFFF", borderBottomWidth: 1, borderBottomColor: "#E2E8F0" },
  backButton: { padding: 8, marginLeft: -8, width: 36 },
  headerTitle: { fontSize: 18, fontWeight: "bold", color: "#1E293B", flex: 1, textAlign: "center" },
  scrollContent: { padding: 20, paddingBottom: 60 },
  
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  loadingText: { marginTop: 12, color: "#64748B", fontWeight: "500" },

  
  studentCard: { backgroundColor: "#FFFFFF", padding: 16, borderRadius: 16, marginBottom: 20, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 5, elevation: 2 },
  studentInfoRow: { flexDirection: "row", alignItems: "center" },
  avatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: "#BFDBFE", justifyContent: "center", alignItems: "center", marginRight: 16 },
  avatarText: { fontSize: 20, fontWeight: "bold", color: "#2563EB", textTransform: "uppercase" },
  studentName: { fontSize: 18, fontWeight: "bold", color: "#1E293B", marginBottom: 4 },
  studentDetail: { fontSize: 13, color: "#64748B" },
  termSelector: { flexDirection: "row", gap: 10, marginBottom: 20 },
  termChip: { flex: 1, paddingVertical: 10, borderRadius: 10, backgroundColor: "#FFFFFF", alignItems: "center", borderWidth: 1, borderColor: "#E2E8F0" },
  termChipActive: { backgroundColor: "#EFF6FF", borderColor: "#2563EB" },
  termText: { fontSize: 13, fontWeight: "600", color: "#64748B" },
  termTextActive: { color: "#2563EB" },
  
  resultsContainer: { backgroundColor: "#FFFFFF", borderRadius: 16, padding: 16, marginBottom: 20, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 5, elevation: 2 },
  tableHeader: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#E2E8F0", paddingBottom: 12, marginBottom: 8 },
  tableHeaderText: { fontSize: 12, fontWeight: "bold", color: "#94A3B8", textTransform: "uppercase" },
  tableRow: { flexDirection: "row", alignItems: "center", paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#F1F5F9" },
  tableCellSubject: { fontSize: 14, fontWeight: "600", color: "#334155" },
  tableCellMarks: { fontSize: 15, fontWeight: "bold", color: "#1E293B" },
  tableCellRemarks: { fontSize: 13, color: "#64748B" },
  
  summaryCard: { backgroundColor: "#2563EB", borderRadius: 16, padding: 20, marginBottom: 20 },
  summaryTitle: { color: "#BFDBFE", fontSize: 14, fontWeight: "600", marginBottom: 16, textAlign: "center", textTransform: "uppercase", letterSpacing: 1 },
  summaryGrid: { flexDirection: "row", justifyContent: "space-between" },
  summaryBox: { alignItems: "center", flex: 1 },
  summaryLabel: { color: "#E0F2FE", fontSize: 12, marginBottom: 4 },
  summaryValue: { color: "#FFFFFF", fontSize: 24, fontWeight: "bold" },
  summarySubValue: { fontSize: 14, color: "#93C5FD", fontWeight: "normal" },
  
  remarksCard: { backgroundColor: "#FFFFFF", borderRadius: 16, padding: 16, borderWidth: 1, borderColor: "#E2E8F0", borderStyle: "dashed" },
  remarkHeader: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  remarkTitle: { fontSize: 14, fontWeight: "bold", color: "#475569", marginLeft: 8 },
  remarkText: { fontSize: 14, color: "#64748B", fontStyle: "italic", lineHeight: 22 },

  emptyStateContainer: { alignItems: "center", justifyContent: "center", paddingVertical: 50 },
  emptyStateTitle: { fontSize: 18, fontWeight: "bold", color: "#1E293B", marginTop: 16 },
  emptyStateSub: { fontSize: 13, color: "#64748B", marginTop: 8, textAlign: "center", paddingHorizontal: 20, lineHeight: 20 }
});