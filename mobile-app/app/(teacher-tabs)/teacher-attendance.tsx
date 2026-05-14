import React, { useState, useEffect, useCallback, useMemo } from "react";
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  ActivityIndicator,
  Platform,
  Alert
} from "react-native";
import { FontAwesome6 } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams, useFocusEffect, useNavigation } from "expo-router";

export default function TeacherAttendanceScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const params = useLocalSearchParams();
  const email = (params.email as string) || "";
  
  const [isModified, setIsModified] = useState(false);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isHistoryVisible, setIsHistoryVisible] = useState(false);
  const [isReportVisible, setIsReportVisible] = useState(false);
  const [attendanceHistory, setAttendanceHistory] = useState<any[]>([]);
  const [monthlyReport, setMonthlyReport] = useState<any>(null);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [isReportLoading, setIsReportLoading] = useState(false);
  const [students, setStudents] = useState<any[]>([]);
  const [attendanceDate, setAttendanceDate] = useState(() => {
    const today = new Date();
    return today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0');
  });
  
  const [attendanceData, setAttendanceData] = useState<Record<string, 'Present' | 'Absent'>>({});

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      const fetchStudents = async () => {
        if (!email) return;
        setIsLoading(true);
        try {
          const timestamp = new Date().getTime();
          const response = await fetch(`http://172.20.10.7:5000/api/teacher/${email}/class-students?t=${timestamp}`);
          if (response.ok && isActive) {
            const data = await response.json();
            setStudents(data.students || []);
            
            // Initialize with existing data if any, otherwise empty
            if (data.existingAttendance && Object.keys(data.existingAttendance).length > 0) {
              setAttendanceData(data.existingAttendance);
            } else {
              setAttendanceData({});
            }
          }
        } catch (error) {
          console.error("Failed to fetch class students:", error);
        } finally {
          if (isActive) setIsLoading(false);
        }
      };

      fetchStudents();
      return () => { isActive = false; };
    }, [email])
  );

  const fetchHistory = async () => {
    if (!email) return;
    setIsHistoryLoading(true);
    setIsHistoryVisible(true);
    try {
      const response = await fetch(`http://172.20.10.7:5000/api/teacher/${email}/attendance-history`);
      if (response.ok) {
        const data = await response.json();
        setAttendanceHistory(data);
      }
    } catch (error) {
      console.error("Failed to fetch history:", error);
    } finally {
      setIsHistoryLoading(false);
    }
  };

  const fetchMonthlyReport = async (year: number, month: number) => {
    if (!email) return;
    setIsReportLoading(true);
    setIsReportVisible(true);
    try {
      const response = await fetch(`http://172.20.10.7:5000/api/teacher/${email}/attendance-monthly-report/${year}/${month}`);
      if (response.ok) {
        const data = await response.json();
        setMonthlyReport(data);
      }
    } catch (error) {
      console.error("Failed to fetch monthly report:", error);
    } finally {
      setIsReportLoading(false);
    }
  };

  const groupHistoryByMonth = () => {
    const groups: Record<string, { year: number, month: number, records: any[] }> = {};
    attendanceHistory.forEach(record => {
      const date = new Date(record.date);
      const monthYear = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      if (!groups[monthYear]) {
        groups[monthYear] = { 
          year: date.getFullYear(), 
          month: date.getMonth() + 1, 
          records: [] 
        };
      }
      groups[monthYear].records.push(record);
    });
    return groups;
  };

  // Handle back navigation prevention
  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (e) => {
      if (!isModified || isSubmitting) {
        return;
      }

      e.preventDefault();

      Alert.alert(
        'Discard changes?',
        'You have unsaved attendance marks. Are you sure you want to leave?',
        [
          { text: "Stay", style: 'cancel', onPress: () => {} },
          {
            text: 'Discard',
            style: 'destructive',
            onPress: () => navigation.dispatch(e.data.action),
          },
        ]
      );
    });

    return unsubscribe;
  }, [navigation, isModified, isSubmitting]);

  const setAttendance = (studentId: string, status: 'Present' | 'Absent') => {
    setIsModified(true);
    setAttendanceData(prev => ({
      ...prev,
      [studentId]: status
    }));
  };

  const submitAttendance = async () => {
    if (Object.keys(attendanceData).length < students.length) {
      Alert.alert("Incomplete", "Please mark attendance for all students before submitting.");
      return;
    }
    
    setIsSubmitting(true);
    
    // Format payload
    const payloadData = Object.keys(attendanceData).map(studentId => ({
      studentId,
      status: attendanceData[studentId]
    }));

    try {
      const response = await fetch('http://172.20.10.7:5000/api/teacher/attendance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          date: attendanceDate,
          attendanceData: payloadData
        })
      });

      if (response.ok) {
        Alert.alert(
          "Success", 
          "Attendance has been marked successfully.",
          [{ text: "OK", onPress: () => router.back() }]
        );
      } else {
        const errData = await response.json();
        Alert.alert("Error", errData.error || "Failed to mark attendance.");
      }
    } catch (error) {
      console.error("Attendance submission error:", error);
      Alert.alert("Error", "A network error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
      setIsModified(false); // Reset modified state after submission (to allow navigation)
    }
  };

  const { presentCount, absentCount } = useMemo(() => {
    const values = Object.values(attendanceData);
    return {
      presentCount: values.filter(v => v === 'Present').length,
      absentCount: values.filter(v => v === 'Absent').length
    };
  }, [attendanceData]);

  if (isLoading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#2563EB" />
        <Text style={{ marginTop: 10, color: "#64748B" }}>Loading Class Students...</Text>
      </View>
    );
  }


  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <FontAwesome6 name="chevron-left" size={20} color="#1E293B" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mark Attendance</Text>
        <TouchableOpacity style={styles.historyButton} onPress={fetchHistory}>
          <FontAwesome6 name="clock-rotate-left" size={20} color="#2563EB" />
        </TouchableOpacity>
      </View>

      <View style={styles.infoCard}>
        <View style={styles.infoRow}>
          <FontAwesome6 name="calendar-day" size={16} color="#64748B" />
          <Text style={styles.infoText}>{new Date(attendanceDate).toDateString()}</Text>
        </View>
        <View style={styles.statsRow}>
          <View style={styles.statPill}>
            <Text style={styles.statPillLabel}>Total</Text>
            <Text style={styles.statPillValue}>{students.length}</Text>
          </View>
          <View style={[styles.statPill, { backgroundColor: '#DCFCE7' }]}>
            <Text style={[styles.statPillLabel, { color: '#166534' }]}>Present</Text>
            <Text style={[styles.statPillValue, { color: '#16A34A' }]}>{presentCount}</Text>
          </View>
          <View style={[styles.statPill, { backgroundColor: '#FEE2E2' }]}>
            <Text style={[styles.statPillLabel, { color: '#991B1B' }]}>Absent</Text>
            <Text style={[styles.statPillValue, { color: '#EF4444' }]}>{absentCount}</Text>
          </View>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.listContainer} showsVerticalScrollIndicator={false}>
        {students.length > 0 ? (
          students.map(student => (
            <View key={student.id} style={styles.studentCard}>
              <View style={styles.studentInfo}>
                <View style={styles.avatarPlaceholder}>
                  <Text style={styles.avatarText}>
                    {student.first_name[0]}{student.last_name ? student.last_name[0] : ''}
                  </Text>
                </View>
                <View>
                  <Text style={styles.studentName}>{student.first_name} {student.last_name}</Text>
                  <Text style={styles.studentId}>{student.index_number}</Text>
                </View>
              </View>
              
              <View style={styles.actionButtons}>
                <TouchableOpacity 
                  style={[
                    styles.actionBtn, 
                    attendanceData[student.id] === 'Present' ? styles.activePresent : styles.inactiveBtn
                  ]}
                  activeOpacity={0.7}
                  onPress={() => setAttendance(student.id, 'Present')}
                >
                  <FontAwesome6 
                    name="check" 
                    size={16} 
                    color={attendanceData[student.id] === 'Present' ? "#16A34A" : "#64748B"} 
                  />
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[
                    styles.actionBtn, 
                    attendanceData[student.id] === 'Absent' ? styles.activeAbsent : styles.inactiveBtn
                  ]}
                  activeOpacity={0.7}
                  onPress={() => setAttendance(student.id, 'Absent')}
                >
                  <FontAwesome6 
                    name="xmark" 
                    size={16} 
                    color={attendanceData[student.id] === 'Absent' ? "#EF4444" : "#64748B"} 
                  />
                </TouchableOpacity>
              </View>
            </View>
          ))
        ) : (
          <View style={styles.emptyState}>
            <FontAwesome6 name="user-slash" size={40} color="#CBD5E1" />
            <Text style={styles.emptyText}>No students found in your class.</Text>
          </View>
        )}
      </ScrollView>

      {students.length > 0 && (
        <View style={styles.footer}>
          <TouchableOpacity 
            style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]} 
            onPress={submitAttendance}
            disabled={isSubmitting}
            activeOpacity={0.8}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.submitButtonText}>Submit Attendance</Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* ATTENDANCE HISTORY MODAL */}
      {isHistoryVisible && (
        <View style={styles.historyModalOverlay}>
          <View style={styles.historyModalContainer}>
            <View style={styles.historyModalHeader}>
              <Text style={styles.historyModalTitle}>Attendance History</Text>
              <TouchableOpacity onPress={() => setIsHistoryVisible(false)}>
                <FontAwesome6 name="xmark" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            {isHistoryLoading ? (
              <View style={styles.historyLoadingContainer}>
                <ActivityIndicator size="small" color="#2563EB" />
                <Text style={styles.historyLoadingText}>Loading records...</Text>
              </View>
            ) : (
              <ScrollView style={styles.historyList}>
                {Object.keys(groupHistoryByMonth()).length > 0 ? (
                  Object.entries(groupHistoryByMonth()).map(([monthName, group], idx) => (
                    <View key={idx} style={styles.historyMonthGroup}>
                      <TouchableOpacity 
                        style={styles.monthHeader}
                        onPress={() => fetchMonthlyReport(group.year, group.month)}
                      >
                        <Text style={styles.monthHeaderText}>{monthName}</Text>
                        <View style={styles.monthHeaderRight}>
                          <Text style={styles.viewReportText}>Full Report</Text>
                          <FontAwesome6 name="chevron-right" size={12} color="#2563EB" />
                        </View>
                      </TouchableOpacity>
                      
                      {group.records.map((record, index) => (
                        <View key={index} style={styles.historyItem}>
                          <View style={styles.historyItemLeft}>
                            <Text style={styles.historyDate}>
                              {new Date(record.date).toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' })}
                            </Text>
                          </View>
                          <View style={styles.historyItemRight}>
                            <View style={styles.historyStatPill}>
                              <Text style={[styles.historyStatLabel, { color: '#16A34A' }]}>P: {record.present_count}</Text>
                            </View>
                            <View style={[styles.historyStatPill, { backgroundColor: '#FEE2E2' }]}>
                              <Text style={[styles.historyStatLabel, { color: '#EF4444' }]}>A: {record.absent_count}</Text>
                            </View>
                          </View>
                        </View>
                      ))}
                    </View>
                  ))
                ) : (
                  <View style={styles.historyEmptyState}>
                    <Text style={styles.historyEmptyText}>No past records found for this year.</Text>
                  </View>
                )}
              </ScrollView>
            )}
          </View>
        </View>
      )}

      {/* FULL SCREEN MONTHLY REPORT MODAL */}
      {isReportVisible && (
        <View style={styles.reportModalOverlay}>
          <View style={styles.reportContainer}>
            <View style={styles.reportHeader}>
              <View>
                <Text style={styles.reportTitle}>Monthly Attendance Report</Text>
                {monthlyReport && (
                  <Text style={styles.reportSubtitle}>
                    {(() => {
                      const d = new Date(monthlyReport.startDate);
                      return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
                    })()}
                  </Text>
                )}
              </View>
              <TouchableOpacity onPress={() => setIsReportVisible(false)} style={styles.reportCloseBtn}>
                <FontAwesome6 name="xmark" size={20} color="#1E293B" />
              </TouchableOpacity>
            </View>

            {isReportLoading ? (
              <View style={styles.reportLoading}>
                <ActivityIndicator size="large" color="#2563EB" />
                <Text style={styles.reportLoadingText}>Generating Report...</Text>
              </View>
            ) : monthlyReport ? (
              <View style={styles.reportContent}>
                <ScrollView horizontal showsHorizontalScrollIndicator={true}>
                  <View>
                    {/* Table Header */}
                    <View style={styles.reportTableHeader}>
                      <View style={styles.studentNameCol}><Text style={styles.tableHeaderText}>Student Name</Text></View>
                      {/* Generate days for header */}
                      {Array.from({ length: new Date(new Date(monthlyReport.endDate).getFullYear(), new Date(monthlyReport.endDate).getMonth() + 1, 0).getDate() }, (_, i) => i + 1).map(day => (
                        <View key={day} style={styles.dayCol}><Text style={styles.dayHeaderText}>{day}</Text></View>
                      ))}
                    </View>

                    {/* Table Body */}
                    <ScrollView style={styles.reportTableBody}>
                      {monthlyReport.students.map((student: any) => (
                        <View key={student.id} style={styles.reportTableRow}>
                          <View style={styles.studentNameCol}>
                            <Text style={styles.studentNameText} numberOfLines={1}>{student.first_name} {student.last_name}</Text>
                            <Text style={styles.studentIdText}>{student.index_number}</Text>
                          </View>
                          {Array.from({ length: new Date(new Date(monthlyReport.endDate).getFullYear(), new Date(monthlyReport.endDate).getMonth() + 1, 0).getDate() }, (_, i) => i + 1).map(day => {
                            const dateKey = `${new Date(monthlyReport.startDate).getFullYear()}-${(new Date(monthlyReport.startDate).getMonth() + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
                            const status = monthlyReport.attendanceMap[student.id]?.[dateKey];
                            return (
                              <View key={day} style={styles.dayCol}>
                                <View style={[
                                  styles.statusDot,
                                  status === 'Present' ? styles.statusPresent : status === 'Absent' ? styles.statusAbsent : styles.statusEmpty
                                ]}>
                                  {status && <Text style={styles.statusText}>{status === 'Present' ? 'P' : 'A'}</Text>}
                                </View>
                              </View>
                            );
                          })}
                        </View>
                      ))}
                    </ScrollView>
                  </View>
                </ScrollView>
              </View>
            ) : null}
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  header: { 
    flexDirection: "row", 
    justifyContent: "space-between", 
    alignItems: "center", 
    paddingHorizontal: 20, 
    paddingTop: Platform.OS === 'ios' ? 60 : 40, 
    paddingBottom: 20, 
    backgroundColor: "#FFFFFF" 
  },
  backButton: { width: 40, height: 40, justifyContent: "center" },
  headerTitle: { fontSize: 18, fontWeight: "bold", color: "#1E293B" },
  infoCard: { 
    backgroundColor: "#FFFFFF", 
    margin: 20, 
    padding: 20, 
    borderRadius: 16, 
    elevation: 2, 
    shadowColor: "#000", 
    shadowOffset: { width: 0, height: 2 }, 
    shadowOpacity: 0.05, 
    shadowRadius: 4 
  },
  infoRow: { flexDirection: "row", alignItems: "center", marginBottom: 15 },
  infoText: { fontSize: 16, fontWeight: "600", color: "#1E293B", marginLeft: 10 },
  statsRow: { flexDirection: "row", justifyContent: "space-between" },
  statPill: { 
    flex: 1, 
    backgroundColor: "#F1F5F9", 
    borderRadius: 12, 
    padding: 10, 
    alignItems: "center",
    marginHorizontal: 4
  },
  statPillLabel: { fontSize: 11, fontWeight: "600", color: "#64748B", marginBottom: 4 },
  statPillValue: { fontSize: 18, fontWeight: "bold", color: "#1E293B" },
  listContainer: { paddingHorizontal: 20, paddingBottom: 100 },
  studentCard: { 
    flexDirection: "row", 
    alignItems: "center", 
    justifyContent: "space-between", 
    backgroundColor: "#FFFFFF", 
    padding: 15, 
    borderRadius: 16, 
    marginBottom: 12,
    elevation: 1,
    shadowColor: "#000", 
    shadowOffset: { width: 0, height: 1 }, 
    shadowOpacity: 0.05, 
    shadowRadius: 2 
  },
  studentInfo: { flexDirection: "row", alignItems: "center", flex: 1 },
  avatarPlaceholder: { 
    width: 44, 
    height: 44, 
    borderRadius: 22, 
    backgroundColor: "#DBEAFE", 
    justifyContent: "center", 
    alignItems: "center", 
    marginRight: 12 
  },
  avatarText: { color: "#2563EB", fontWeight: "bold", fontSize: 16 },
  studentName: { fontSize: 15, fontWeight: "bold", color: "#1E293B", marginBottom: 2 },
  studentId: { fontSize: 12, color: "#64748B" },
  actionButtons: { flexDirection: "row", gap: 8 },
  actionBtn: { 
    width: 38, 
    height: 38, 
    borderRadius: 10, 
    justifyContent: "center", 
    alignItems: "center",
    borderWidth: 1
  },
  inactiveBtn: { backgroundColor: "#F8FAFC", borderColor: "#E2E8F0" },
  activePresent: { backgroundColor: "#DCFCE7", borderColor: "#BBF7D0" },
  activeAbsent: { backgroundColor: "#FEE2E2", borderColor: "#FECACA" },
  actionBtnText: { fontSize: 14, fontWeight: "bold" },
  emptyState: { alignItems: "center", justifyContent: "center", paddingVertical: 50 },
  emptyText: { marginTop: 15, color: "#64748B", fontSize: 15 },
  footer: { 
    position: "absolute", 
    bottom: 0, 
    left: 0, 
    right: 0, 
    backgroundColor: "#FFFFFF", 
    padding: 20, 
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9"
  },
  submitButton: { 
    backgroundColor: "#2563EB", 
    paddingVertical: 16, 
    borderRadius: 12, 
    alignItems: "center" 
  },
  submitButtonDisabled: { opacity: 0.7 },
  submitButtonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "bold" },
  historyButton: { width: 40, height: 40, justifyContent: "center", alignItems: "flex-end" },
  historyModalOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
    padding: 20
  },
  historyModalContainer: {
    backgroundColor: '#FFFFFF',
    width: '100%',
    maxHeight: '80%',
    borderRadius: 24,
    padding: 20,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10
  },
  historyModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingBottom: 15
  },
  historyModalTitle: { fontSize: 18, fontWeight: 'bold', color: '#1E293B' },
  historyLoadingContainer: { padding: 40, alignItems: 'center' },
  historyLoadingText: { marginTop: 10, color: '#64748B', fontSize: 14 },
  historyList: { width: '100%' },
  historyItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC'
  },
  historyItemLeft: { flex: 1 },
  historyDate: { fontSize: 15, fontWeight: '600', color: '#1E293B' },
  historyItemRight: { flexDirection: 'row', gap: 8 },
  historyStatPill: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    minWidth: 50,
    alignItems: 'center'
  },
  historyStatLabel: { fontSize: 12, fontWeight: 'bold' },
  historyEmptyState: { padding: 40, alignItems: 'center' },
  historyEmptyText: { color: '#94A3B8', fontSize: 14 },
  historyMonthGroup: { marginBottom: 20 },
  monthHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingVertical: 10, 
    paddingHorizontal: 5,
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    marginBottom: 5
  },
  monthHeaderText: { fontSize: 16, fontWeight: 'bold', color: '#1E293B' },
  monthHeaderRight: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  viewReportText: { fontSize: 12, fontWeight: '600', color: '#2563EB' },
  reportModalOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#FFFFFF',
    zIndex: 2000,
  },
  reportContainer: { flex: 1, paddingTop: Platform.OS === 'ios' ? 50 : 20 },
  reportHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingHorizontal: 20, 
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9'
  },
  reportTitle: { fontSize: 20, fontWeight: 'bold', color: '#1E293B' },
  reportSubtitle: { fontSize: 14, color: '#64748B', fontWeight: '600' },
  reportCloseBtn: { padding: 5 },
  reportLoading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  reportLoadingText: { marginTop: 15, color: '#64748B', fontWeight: '500' },
  reportContent: { flex: 1 },
  reportTableHeader: { flexDirection: 'row', backgroundColor: '#F8FAFC', borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  reportTableBody: { flex: 1 },
  reportTableRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#F1F5F9', alignItems: 'center' },
  studentNameCol: { width: 150, padding: 10, borderRightWidth: 1, borderRightColor: '#F1F5F9', backgroundColor: '#FFFFFF' },
  studentNameText: { fontSize: 13, fontWeight: 'bold', color: '#1E293B' },
  studentIdText: { fontSize: 10, color: '#64748B', marginTop: 2 },
  dayCol: { width: 35, justifyContent: 'center', alignItems: 'center', borderRightWidth: 1, borderRightColor: '#F1F5F9', paddingVertical: 10 },
  tableHeaderText: { fontSize: 11, fontWeight: '800', color: '#64748B', textTransform: 'uppercase' },
  dayHeaderText: { fontSize: 11, fontWeight: 'bold', color: '#1E293B' },
  statusDot: { width: 22, height: 22, borderRadius: 6, justifyContent: 'center', alignItems: 'center' },
  statusPresent: { backgroundColor: '#DCFCE7' },
  statusAbsent: { backgroundColor: '#FEE2E2' },
  statusEmpty: { backgroundColor: '#F8FAFC' },
  statusText: { fontSize: 10, fontWeight: 'bold', color: '#1E293B' }
});
