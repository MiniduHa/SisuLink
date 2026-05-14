import React, { useState, useEffect } from "react";
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Image,
  ActivityIndicator
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { FontAwesome6, Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";

export default function ChildDetailsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const studentId = params.studentId as string;
  const initialStudentName = params.studentName as string || "Student";
  const initialGrade = params.grade as string || "Grade N/A";
  const initialAvatarUrl = params.avatarUrl as string;
  const parentEmail = params.parentEmail as string;
  const parentName = params.parentName as string;

  // --- STATE FOR INTERACTIVE FEATURES ---
  const [showCalendar, setShowCalendar] = useState(false);
  const [activeDay, setActiveDay] = useState("Mon");
  const [currentDate, setCurrentDate] = useState(new Date());
  
  // NEW: State to track which teacher card is currently expanded
  const [expandedTeacher, setExpandedTeacher] = useState<string | null>(null);

  // NEW: Backend Data State
  const [profileData, setProfileData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchAcademicProfile();
  }, [studentId]);

  const fetchAcademicProfile = async () => {
    try {
      const timestamp = new Date().getTime();
      // Using the same IP as other screens in the app
      const response = await fetch(`http://172.20.10.7:5000/api/parent/student/${studentId}/academic-profile?t=${timestamp}`);
      if (response.ok) {
        const data = await response.json();
        setProfileData(data);
      }
    } catch (error) {
      console.error("Failed to fetch academic profile:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Use fetched data or fall back to params/mock
  const studentName = profileData?.student?.name || initialStudentName;
  const grade = profileData?.student?.grade || initialGrade;
  const avatarUrl = profileData?.student?.avatarUrl || initialAvatarUrl;

  const getGradeColor = (grade: string) => {
    if (grade === 'A' || grade === 'A+') return '#059669';
    if (grade === 'B') return '#2563EB';
    if (grade === 'C') return '#D97706';
    return '#EF4444';
  };

  const getGradeBg = (grade: string) => {
    if (grade === 'A' || grade === 'A+') return '#D1FAE5';
    if (grade === 'B') return '#EFF6FF';
    if (grade === 'C') return '#FEF3C7';
    return '#FEE2E2';
  };

  const fullReport = {
    ...(profileData?.academics || {}),
    attendance: profileData?.academics?.attendance || 0,
    term: profileData?.academics?.term || "Current Term",
    rank: profileData?.academics?.rank || "N/A",
    behavior: profileData?.academics?.behavior || "No remarks available.",
    subjects: profileData?.academics?.subjects || [],
    extracurriculars: profileData?.academics?.extracurriculars || []
  };

  const teachersList = profileData?.teachers || [];
  const timetable = profileData?.timetable || {
    "Mon": [], "Tue": [], "Wed": [], "Thu": [], "Fri": []
  };

  const daysOfWeek = ["Mon", "Tue", "Wed", "Thu", "Fri"];

  const changeMonth = (offset: number) => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + offset, 1));
  };

  const renderCalendar = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const startingDayIndex = new Date(year, month, 1).getDay();
    const monthName = currentDate.toLocaleString('default', { month: 'long' });
    const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    
    const emptySlots = Array.from({ length: startingDayIndex }, (_, i) => i);
    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

    return (
      <View style={styles.calendarContainer}>
        <View style={styles.calendarHeader}>
          <TouchableOpacity onPress={() => changeMonth(-1)} style={styles.monthNavButton}>
            <Feather name="chevron-left" size={20} color="#64748B" />
          </TouchableOpacity>
          <Text style={styles.calendarMonth}>{monthName} {year}</Text>
          <TouchableOpacity onPress={() => changeMonth(1)} style={styles.monthNavButton}>
            <Feather name="chevron-right" size={20} color="#64748B" />
          </TouchableOpacity>
        </View>

        <View style={styles.legendContainer}>
          <View style={styles.legendRow}>
            <View style={[styles.legendDot, { backgroundColor: "#10B981" }]} />
            <Text style={styles.legendText}>Present</Text>
            <View style={[styles.legendDot, { backgroundColor: "#EF4444", marginLeft: 12 }]} />
            <Text style={styles.legendText}>Absent</Text>
          </View>
        </View>
        
        <View style={styles.calendarGrid}>
          {weekDays.map((day: string, idx: number) => (
            <View key={`header-${idx}`} style={styles.dayBoxWrapper}>
              <Text style={styles.weekDayText}>{day}</Text>
            </View>
          ))}
          {emptySlots.map((_: number, idx: number) => (
            <View key={`empty-${idx}`} style={styles.dayBoxWrapper} />
          ))}
          {days.map((day: number) => {
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const isAbsent = profileData?.academics?.absentDates?.includes(dateStr);
            const isPresent = profileData?.academics?.presentDates?.includes(dateStr);
            
            const dayOfWeek = (startingDayIndex + day - 1) % 7;
            const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

            let bgColor = "#FFFFFF";
            let textColor = "#1E293B";

            if (isAbsent) {
              bgColor = "#FEE2E2"; 
              textColor = "#EF4444"; 
            } else if (isPresent) {
              bgColor = "#D1FAE5"; 
              textColor = "#059669"; 
            } else if (isWeekend) {
              bgColor = "#F8FAFC"; 
              textColor = "#9CA3AF"; 
            }

            return (
              <View key={`day-${day}`} style={styles.dayBoxWrapper}>
                <View style={[styles.dayBox, { backgroundColor: bgColor }]}>
                  <Text style={[styles.dayText, { color: textColor }]}>{day}</Text>
                </View>
              </View>
            );
          })}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <FontAwesome6 name="arrow-left" size={20} color="#1E293B" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Academic Profile</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        
        <View style={styles.profileHeader}>
          {avatarUrl && avatarUrl !== "null" ? (
            <Image source={{ uri: avatarUrl }} style={styles.avatar} />
          ) : (
            <View style={styles.placeholderAvatar}>
              <FontAwesome6 name="circle-user" size={50} color="#2563EB" />
            </View>
          )}
          <View style={styles.profileInfo}>
            <Text style={styles.name}>{studentName}</Text>
            <Text style={styles.subtext}>{grade} • ID: {studentId}</Text>
          </View>
        </View>

        <View style={styles.rowCards}>
          <TouchableOpacity 
            style={[styles.halfCard, showCalendar && styles.activeCard]} 
            onPress={() => setShowCalendar(!showCalendar)}
            activeOpacity={0.8}
          >
            <View style={{ flexDirection: "row", width: "100%", justifyContent: "space-between", alignItems: "flex-start" }}>
              <View style={[styles.iconBg, { backgroundColor: "#D1FAE5" }]}>
                <FontAwesome6 name="calendar-check" size={18} color="#059669" />
              </View>
              <Feather name={showCalendar ? "chevron-up" : "chevron-down"} size={20} color="#9CA3AF" />
            </View>
            <Text style={styles.cardValue}>{fullReport.attendance}%</Text>
            <Text style={styles.cardLabel}>Attendance</Text>
          </TouchableOpacity>
          
          <View style={styles.halfCard}>
            <View style={[styles.iconBg, { backgroundColor: "#DBEAFE" }]}>
              <FontAwesome6 name="trophy" size={18} color="#2563EB" />
            </View>
            <Text style={styles.cardValue}>{fullReport.rank}</Text>
            <Text style={styles.cardLabel}>Class Rank</Text>
          </View>
        </View>

        {showCalendar && renderCalendar()}

        {/* === NEW TEACHERS SECTION === */}
        <Text style={styles.sectionTitle}>Teachers & Contacts</Text>
        <View style={styles.card}>
          {teachersList.map((teacher: any, idx: number) => {
            const isExpanded = expandedTeacher === teacher.id;
            return (
              <View key={teacher.id}>
                {/* Interactive Row */}
                <TouchableOpacity 
                  style={styles.teacherRow} 
                  onPress={() => setExpandedTeacher(isExpanded ? null : teacher.id)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.teacherAvatarBg, teacher.role.includes("Class Teacher") ? { backgroundColor: "#DBEAFE" } : { backgroundColor: "#F1F5F9" }]}>
                    <FontAwesome6 name="chalkboard-user" size={16} color={teacher.role.includes("Class Teacher") ? "#2563EB" : "#64748B"} />
                  </View>
                  <View style={styles.teacherInfo}>
                    <Text style={styles.teacherName}>{teacher.name}</Text>
                    <Text style={styles.teacherRole}>{teacher.role}</Text>
                  </View>
                  <Feather name={isExpanded ? "chevron-up" : "chevron-down"} size={20} color="#9CA3AF" />
                </TouchableOpacity>

                {/* Expanded Details */}
                {isExpanded && (
                  <View style={styles.teacherDetails}>
                    <View style={styles.contactRow}>
                      <Feather name="mail" size={16} color="#64748B" />
                      <Text style={styles.contactText}>{teacher.email}</Text>
                    </View>
                    <View style={styles.contactRow}>
                      <Feather name="phone" size={16} color="#64748B" />
                      <Text style={styles.contactText}>{teacher.phone}</Text>
                    </View>
                    
                    <TouchableOpacity 
                      style={styles.messageBtn}
                      onPress={() => {
                        router.push({
                          pathname: "/(parent-tabs)/parent-messages",
                          params: { 
                            email: parentEmail, 
                            full_name: parentName,
                            targetEmail: teacher.email,
                            targetName: teacher.name,
                            targetRole: teacher.role,
                            targetType: teacher.type || "teacher"
                          } as any
                        });
                      }}
                    >
                      <Feather name="message-square" size={16} color="#FFFFFF" style={{ marginRight: 8 }} />
                      <Text style={styles.messageBtnText}>Message Teacher</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {idx < teachersList.length - 1 && <View style={styles.divider} />}
              </View>
            );
          })}
        </View>

        <Text style={styles.sectionTitle}>Class Timetable</Text>
        <View style={styles.card}>
          <View style={styles.daysTabsContainer}>
            {daysOfWeek.map((day: string) => (
              <TouchableOpacity 
                key={day} 
                style={[styles.dayTab, activeDay === day && styles.activeDayTab]}
                onPress={() => setActiveDay(day)}
              >
                <Text style={[styles.dayTabText, activeDay === day && styles.activeDayTabText]}>{day}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.timetableList}>
            {timetable[activeDay].map((lesson: any, idx: number) => (
              <View key={idx} style={styles.timelineRow}>
                <View style={styles.timeColumn}>
                  <Text style={styles.timeText}>{lesson.time}</Text>
                </View>
                <View style={styles.timelineLine}>
                  <View style={styles.timelineDot} />
                  {idx !== timetable[activeDay].length - 1 && <View style={styles.timelineSegment} />}
                </View>
                <View style={styles.lessonCard}>
                  <Text style={styles.lessonSubject}>{lesson.subject}</Text>
                  <Text style={styles.lessonTeacher}>{lesson.teacher}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        <View style={[styles.sectionHeaderRow, { marginBottom: 10 }]}>
          <Text style={styles.sectionTitle}>Mark Report ({fullReport.term})</Text>
          <TouchableOpacity 
            style={styles.viewReportBtn}
            onPress={() => router.push({
              pathname: "/(parent-tabs)/child-report",
              params: { studentId, studentName, grade }
            })}
          >
            <Text style={styles.viewReportBtnText}>View Report</Text>
            <Feather name="chevron-right" size={14} color="#2563EB" />
          </TouchableOpacity>
        </View>
        <View style={styles.card}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderText, { flex: 2 }]}>Subject</Text>
            <Text style={[styles.tableHeaderText, { flex: 1.5, textAlign: "center" }]}>Remarks</Text>
            <Text style={[styles.tableHeaderText, { flex: 1, textAlign: "right" }]}>Marks</Text>
          </View>
          
          {fullReport.subjects.map((sub: any, idx: number) => (
            <View key={idx} style={styles.tableRow}>
              <Text style={[styles.subjectName, { flex: 2 }]} numberOfLines={1}>{sub.name}</Text>
              <Text style={[styles.tableCellRemarksSummary, { flex: 1.5, textAlign: "center" }]} numberOfLines={1}>{sub.remarks || "-"}</Text>
              <View style={[styles.scoreBlock, { flex: 1, justifyContent: "flex-end" }]}>
                <Text style={styles.subjectMarks}>{sub.marks}</Text>
                <View style={[styles.gradeBadge, { backgroundColor: getGradeBg(sub.grade) }]}>
                  <Text style={[styles.gradeText, { color: getGradeColor(sub.grade) }]}>{sub.grade}</Text>
                </View>
              </View>
            </View>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Class Teacher Remarks</Text>
        <View style={styles.card}>
          <View style={styles.remarkRowContainer}>
            <MaterialCommunityIcons name="comment-quote-outline" size={24} color="#9CA3AF" style={{ marginRight: 10 }} />
            <Text style={styles.remarkText}>{fullReport.behavior}</Text>
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, paddingVertical: 15, backgroundColor: "#FFFFFF", borderBottomWidth: 1, borderBottomColor: "#E2E8F0" },
  backButton: { padding: 8, backgroundColor: "#F1F5F9", borderRadius: 12 },
  headerTitle: { fontSize: 18, fontWeight: "bold", color: "#1E293B" },
  
  scrollContent: { paddingBottom: 40, paddingHorizontal: 20 },

  profileHeader: { flexDirection: "row", alignItems: "center", paddingVertical: 25 },
  avatar: { width: 70, height: 70, borderRadius: 35, marginRight: 15, borderWidth: 2, borderColor: "#FFFFFF" },
  placeholderAvatar: { width: 70, height: 70, borderRadius: 35, backgroundColor: "#DBEAFE", justifyContent: "center", alignItems: "center", marginRight: 15, borderWidth: 2, borderColor: "#FFFFFF" },
  profileInfo: { flex: 1 },
  name: { fontSize: 22, fontWeight: "bold", color: "#1E293B" },
  subtext: { fontSize: 14, color: "#64748B", marginTop: 4, fontWeight: "500" },

  rowCards: { flexDirection: "row", justifyContent: "space-between", marginBottom: 20 },
  halfCard: { flex: 0.48, backgroundColor: "#FFFFFF", padding: 20, borderRadius: 16, alignItems: "flex-start", shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2, borderWidth: 2, borderColor: "transparent" },
  activeCard: { borderColor: "#2563EB", backgroundColor: "#F8FAFC" },
  iconBg: { width: 40, height: 40, borderRadius: 20, justifyContent: "center", alignItems: "center", marginBottom: 10 },
  cardValue: { fontSize: 22, fontWeight: "bold", color: "#1E293B" },
  cardLabel: { fontSize: 12, color: "#64748B", marginTop: 4, fontWeight: "600" },

  // --- CALENDAR STYLES ---
  calendarContainer: { backgroundColor: "#FFFFFF", borderRadius: 16, padding: 20, marginBottom: 25, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  calendarHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 15 },
  monthNavButton: { padding: 8, backgroundColor: "#F8FAFC", borderRadius: 10 },
  calendarMonth: { fontSize: 16, fontWeight: "bold", color: "#1E293B" },
  legendContainer: { alignItems: "center", marginBottom: 20, paddingBottom: 15, borderBottomWidth: 1, borderBottomColor: "#F1F5F9" },
  legendRow: { flexDirection: "row", alignItems: "center" },
  legendDot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
  legendText: { fontSize: 12, color: "#64748B", fontWeight: "600" },
  calendarGrid: { flexDirection: "row", flexWrap: "wrap", width: "100%" },
  dayBoxWrapper: { width: "14.28%", alignItems: "center", paddingVertical: 5 },
  weekDayText: { fontSize: 12, fontWeight: "bold", color: "#9CA3AF", marginBottom: 8 },
  dayBox: { width: 34, height: 34, borderRadius: 17, justifyContent: "center", alignItems: "center" },
  dayText: { fontSize: 13, fontWeight: "bold" },

  // --- TEACHER ACCORDION STYLES ---
  teacherRow: { flexDirection: "row", alignItems: "center", paddingVertical: 12 },
  teacherAvatarBg: { width: 40, height: 40, borderRadius: 20, justifyContent: "center", alignItems: "center", marginRight: 15 },
  teacherInfo: { flex: 1 },
  teacherName: { fontSize: 15, fontWeight: "bold", color: "#1E293B" },
  teacherRole: { fontSize: 12, color: "#64748B", marginTop: 2, fontWeight: "500" },
  teacherDetails: { backgroundColor: "#F8FAFC", padding: 15, borderRadius: 12, marginTop: 5, marginBottom: 10 },
  contactRow: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  contactText: { fontSize: 13, color: "#475569", marginLeft: 10, fontWeight: "500" },
  messageBtn: { flexDirection: "row", backgroundColor: "#2563EB", paddingVertical: 10, borderRadius: 8, justifyContent: "center", alignItems: "center", marginTop: 5 },
  messageBtnText: { color: "#FFFFFF", fontWeight: "bold", fontSize: 13 },
  divider: { height: 1, backgroundColor: "#F1F5F9" },

  daysTabsContainer: { flexDirection: "row", justifyContent: "space-between", backgroundColor: "#F1F5F9", padding: 4, borderRadius: 12, marginBottom: 20 },
  dayTab: { flex: 1, paddingVertical: 8, alignItems: "center", borderRadius: 10 },
  activeDayTab: { backgroundColor: "#FFFFFF", shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 1 },
  dayTabText: { fontSize: 13, fontWeight: "600", color: "#64748B" },
  activeDayTabText: { color: "#2563EB", fontWeight: "bold" },
  
  timetableList: { paddingLeft: 5 },
  timelineRow: { flexDirection: "row" },
  timeColumn: { width: 70, paddingTop: 15 },
  timeText: { fontSize: 12, fontWeight: "bold", color: "#64748B" },
  timelineLine: { width: 30, alignItems: "center" },
  timelineDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: "#2563EB", marginTop: 16, zIndex: 2 },
  timelineSegment: { width: 2, flex: 1, backgroundColor: "#E2E8F0", marginTop: -5, zIndex: 1 },
  lessonCard: { flex: 1, backgroundColor: "#F8FAFC", padding: 15, borderRadius: 12, marginBottom: 15, borderWidth: 1, borderColor: "#E2E8F0" },
  lessonSubject: { fontSize: 15, fontWeight: "bold", color: "#1E293B" },
  lessonTeacher: { fontSize: 13, color: "#64748B", marginTop: 4 },

  sectionTitle: { fontSize: 14, fontWeight: "bold", color: "#9CA3AF", letterSpacing: 0.5, marginBottom: 10, paddingLeft: 5 },
  card: { backgroundColor: "#FFFFFF", borderRadius: 16, padding: 20, marginBottom: 25, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  
  tableHeader: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#E2E8F0", paddingBottom: 10, marginBottom: 10 },
  tableHeaderText: { fontSize: 12, fontWeight: "bold", color: "#9CA3AF" },
  tableRow: { flexDirection: "row", alignItems: "center", paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#F8FAFC" },
  subjectName: { fontSize: 14, fontWeight: "600", color: "#1E293B" },
  classAvg: { fontSize: 13, color: "#64748B" },
  
  scoreBlock: { flexDirection: "row", alignItems: "center" },
  subjectMarks: { fontSize: 15, fontWeight: "bold", color: "#1E293B", marginRight: 8 },
  gradeBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  gradeText: { fontSize: 12, fontWeight: "bold" },

  remarkRowContainer: { flexDirection: "row", alignItems: "flex-start" },
  remarkText: { flex: 1, fontSize: 14, color: "#475569", lineHeight: 22, fontStyle: "italic" },

  activityRow: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  bulletPoint: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#2563EB", marginRight: 10 },
  activityText: { fontSize: 14, color: "#1E293B", fontWeight: "500" },
  
  sectionHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingRight: 5 },
  viewReportBtn: { flexDirection: "row", alignItems: "center", backgroundColor: "#EFF6FF", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, borderWidth: 1, borderColor: "#DBEAFE" },
  viewReportBtnText: { fontSize: 12, color: "#2563EB", fontWeight: "bold", marginRight: 2 },
  tableCellRemarksSummary: { fontSize: 12, color: "#64748B" }
});