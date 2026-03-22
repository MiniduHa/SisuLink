import React, { useState } from "react";
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Image 
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { FontAwesome6, Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";

export default function ChildDetailsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const studentId = params.studentId as string;
  const studentName = params.studentName as string || "Student";
  const grade = params.grade as string || "Grade N/A";
  const avatarUrl = params.avatarUrl as string;

  const [showCalendar, setShowCalendar] = useState(false);
  const [activeDay, setActiveDay] = useState("Mon");

  const fullReport = {
    attendance: 92,
    term: "Term 2 - 2023",
    rank: "5th out of 40",
    behavior: "Excellent conduct. Very active in class discussions.",
    subjects: [
      { name: "Mathematics", marks: 88, grade: "A", average: 65 },
      { name: "Science", marks: 76, grade: "B", average: 60 },
      { name: "English", marks: 92, grade: "A", average: 70 },
      { name: "History", marks: 85, grade: "A", average: 68 },
      { name: "ICT", marks: 95, grade: "A", average: 75 },
    ],
    extracurriculars: ["Under-15 Cricket Team", "Science Society"]
  };

  const timetable: Record<string, { time: string, subject: string, teacher: string }[]> = {
    "Mon": [
      { time: "08:00 AM", subject: "Mathematics", teacher: "Mr. Perera" },
      { time: "08:45 AM", subject: "Science", teacher: "Mrs. Silva" },
      { time: "09:30 AM", subject: "English", teacher: "Ms. Fernando" },
      { time: "10:45 AM", subject: "History", teacher: "Mr. Bandara" },
    ],
    "Tue": [
      { time: "08:00 AM", subject: "English", teacher: "Ms. Fernando" },
      { time: "08:45 AM", subject: "ICT", teacher: "Mr. Kumara" },
      { time: "09:30 AM", subject: "Mathematics", teacher: "Mr. Perera" },
      { time: "10:45 AM", subject: "Buddhism", teacher: "Rev. Thero" },
    ],
    "Wed": [{ time: "08:00 AM", subject: "Science", teacher: "Mrs. Silva" }, { time: "08:45 AM", subject: "Geography", teacher: "Mr. Dias" }],
    "Thu": [{ time: "08:00 AM", subject: "History", teacher: "Mr. Bandara" }, { time: "08:45 AM", subject: "Mathematics", teacher: "Mr. Perera" }],
    "Fri": [{ time: "08:00 AM", subject: "P.T.", teacher: "Mr. Jayasinghe" }, { time: "08:45 AM", subject: "ICT", teacher: "Mr. Kumara" }],
  };

  const daysOfWeek = ["Mon", "Tue", "Wed", "Thu", "Fri"];

  const renderCalendar = () => {
    const days = Array.from({ length: 30 }, (_, i) => i + 1);
    const weekDays = ["S", "M", "T", "W", "T", "F", "S"];

    return (
      <View style={styles.calendarContainer}>
        <View style={styles.calendarHeader}>
          <Text style={styles.calendarMonth}>October 2023</Text>
          <View style={styles.legendRow}>
            <View style={[styles.legendDot, { backgroundColor: "#10B981" }]} />
            <Text style={styles.legendText}>Present</Text>
            <View style={[styles.legendDot, { backgroundColor: "#EF4444", marginLeft: 8 }]} />
            <Text style={styles.legendText}>Absent</Text>
          </View>
        </View>
        
        <View style={styles.calendarGrid}>
          {weekDays.map((day, idx) => (
            <Text key={`wd-${idx}`} style={styles.weekDayText}>{day}</Text>
          ))}
          
          {/* FIX: Removed spaces between components! */}
          <View style={styles.dayBox} />
          <View style={styles.dayBox} />
          
          {days.map((day) => {
            const isWeekend = (day + 2) % 7 === 0 || (day + 3) % 7 === 0;
            const isAbsent = day === 14;
            let bgColor = "#10B981"; 
            if (isWeekend) bgColor = "#E2E8F0"; 
            if (isAbsent) bgColor = "#EF4444"; 

            return (
              <View key={day} style={[styles.dayBox, { backgroundColor: bgColor }]}>
                <Text style={[styles.dayText, { color: isWeekend ? "#64748B" : "#FFFFFF" }]}>{day}</Text>
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

        <Text style={styles.sectionTitle}>Class Timetable</Text>
        <View style={styles.card}>
          <View style={styles.daysTabsContainer}>
            {daysOfWeek.map(day => (
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
            {timetable[activeDay].map((lesson, idx) => (
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

        <Text style={styles.sectionTitle}>Mark Report ({fullReport.term})</Text>
        <View style={styles.card}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderText, { flex: 2 }]}>Subject</Text>
            <Text style={[styles.tableHeaderText, { flex: 1, textAlign: "center" }]}>Class Avg</Text>
            <Text style={[styles.tableHeaderText, { flex: 1, textAlign: "right" }]}>Marks</Text>
          </View>
          
          {fullReport.subjects.map((sub, idx) => (
            <View key={idx} style={styles.tableRow}>
              <Text style={[styles.subjectName, { flex: 2 }]}>{sub.name}</Text>
              <Text style={[styles.classAvg, { flex: 1, textAlign: "center" }]}>{sub.average}%</Text>
              <View style={[styles.scoreBlock, { flex: 1, justifyContent: "flex-end" }]}>
                <Text style={styles.subjectMarks}>{sub.marks}</Text>
                <View style={[styles.gradeBadge, { backgroundColor: sub.grade === 'A' ? '#D1FAE5' : '#EFF6FF' }]}>
                  <Text style={[styles.gradeText, { color: sub.grade === 'A' ? '#059669' : '#2563EB' }]}>{sub.grade}</Text>
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

        <Text style={styles.sectionTitle}>Extracurricular Activities</Text>
        <View style={styles.card}>
          {fullReport.extracurriculars.map((activity, idx) => (
            <View key={idx} style={styles.activityRow}>
              <View style={styles.bulletPoint} />
              <Text style={styles.activityText}>{activity}</Text>
            </View>
          ))}
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

  calendarContainer: { backgroundColor: "#FFFFFF", borderRadius: 16, padding: 15, marginBottom: 25, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  calendarHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 15 },
  calendarMonth: { fontSize: 16, fontWeight: "bold", color: "#1E293B" },
  legendRow: { flexDirection: "row", alignItems: "center" },
  legendDot: { width: 8, height: 8, borderRadius: 4, marginRight: 4 },
  legendText: { fontSize: 10, color: "#64748B", fontWeight: "600" },
  calendarGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" },
  weekDayText: { width: "13%", textAlign: "center", fontSize: 12, fontWeight: "bold", color: "#9CA3AF", marginBottom: 10 },
  dayBox: { width: "13%", aspectRatio: 1, justifyContent: "center", alignItems: "center", borderRadius: 8, marginBottom: 5 },
  dayText: { fontSize: 13, fontWeight: "bold" },

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
  activityText: { fontSize: 14, color: "#1E293B", fontWeight: "500" }
});