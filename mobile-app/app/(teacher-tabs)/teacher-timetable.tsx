import React, { useState, useEffect, useCallback } from "react";
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  ActivityIndicator,
  Dimensions
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context"; 
import { FontAwesome6, Feather } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";

const { width } = Dimensions.get("window");

export default function TeacherTimetable() {
  const router = useRouter(); 
  const params = useLocalSearchParams();
  
  const initialEmail = (params.email as string) || "";
  const initialName = (params.full_name as string) || "Teacher";

  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  
  // Set default selected day to today (if weekend, default to Monday)
  const currentDayIndex = new Date().getDay();
  const todayName = (currentDayIndex >= 1 && currentDayIndex <= 5) ? daysOfWeek[currentDayIndex - 1] : 'Monday';

  const [selectedDay, setSelectedDay] = useState<string>(todayName);
  const [isLoading, setIsLoading] = useState(true);
  const [timetableData, setTimetableData] = useState<any[]>([]);

  useEffect(() => {
    const fetchTimetable = async () => {
      if (!initialEmail) return;
      setIsLoading(true);
      try {
        const timestamp = new Date().getTime();
        // Adjust this IP to your machine's IP!
        const response = await fetch(`http://172.20.10.7:5000/api/teacher/${initialEmail}/timetable?t=${timestamp}`);
        
        if (response.ok) {
          const data = await response.json();
          setTimetableData(data);
        }
      } catch (error) {
        console.error("Failed to fetch teacher timetable:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTimetable();
  }, [initialEmail]);

  const filteredClasses = timetableData
    .filter(slot => slot.day_of_week === selectedDay)
    .sort((a, b) => {
      // Basic string sort works if times are 08:00 AM format, 
      // but to be safe we sort by period_number since it's an integer
      return (parseInt(a.period_number) || 0) - (parseInt(b.period_number) || 0);
    });

  // Color mapping similar to dashboard for nice visuals
  const colors = ["#DBEAFE", "#D1FAE5", "#FEF3C7", "#FCE7F3", "#E0E7FF"];
  const iconColors = ["#2563EB", "#059669", "#D97706", "#DB2777", "#4F46E5"];

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Feather name="arrow-left" size={24} color="#1E293B" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Timetable</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* DAY TABS */}
      <View style={styles.tabsContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsScrollView}>
          {daysOfWeek.map((day) => {
            const isActive = selectedDay === day;
            return (
              <TouchableOpacity 
                key={day} 
                style={[styles.dayTab, isActive && styles.dayTabActive]}
                onPress={() => setSelectedDay(day)}
                activeOpacity={0.7}
              >
                <Text style={[styles.dayTabText, isActive && styles.dayTabTextActive]}>{day}</Text>
                {isActive && <View style={styles.activeIndicator} />}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* TIMETABLE LIST */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={styles.loadingText}>Loading Timetable...</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.listContainer} showsVerticalScrollIndicator={false}>
          {filteredClasses.length > 0 ? (
            filteredClasses.map((cls, index) => {
              const bgColor = colors[index % colors.length];
              const icColor = iconColors[index % iconColors.length];

              return (
                <View key={`${cls.day_of_week}-${cls.period_number}-${index}`} style={styles.classCard}>
                  {/* Timeline indicator (left line) */}
                  <View style={styles.timelineIndicators}>
                    <View style={[styles.timelineDot, { backgroundColor: icColor }]} />
                    {index !== filteredClasses.length - 1 && <View style={styles.timelineLine} />}
                  </View>
                  
                  {/* Card Content */}
                  <View style={styles.cardContentWrapper}>
                    <Text style={styles.timeText}>{cls.time_slot}</Text>
                    
                    <View style={styles.cardBox}>
                      <View style={styles.cardHeader}>
                        <View style={[styles.iconBg, { backgroundColor: bgColor }]}>
                          <FontAwesome6 name="book-open" size={16} color={icColor} />
                        </View>
                        <View style={styles.periodBadge}>
                          <Text style={styles.periodText}>Period {cls.period_number}</Text>
                        </View>
                      </View>
                      
                      <Text style={styles.subjectText}>{cls.subject}</Text>
                      <Text style={styles.gradeText}>{cls.grade} - {cls.section}</Text>

                      <View style={styles.cardFooter}>
                        <View style={styles.footerItem}>
                          <Feather name="map-pin" size={14} color="#64748B" />
                          <Text style={styles.footerItemText}>{cls.room_number || "TBD"}</Text>
                        </View>
                        <View style={styles.footerItem}>
                          <Feather name="users" size={14} color="#64748B" />
                          <Text style={styles.footerItemText}>Class</Text>
                        </View>
                      </View>
                    </View>
                  </View>
                </View>
              );
            })
          ) : (
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconBg}>
                <FontAwesome6 name="mug-hot" size={32} color="#94A3B8" />
              </View>
              <Text style={styles.emptyTitle}>Free Day!</Text>
              <Text style={styles.emptySubtitle}>You have no classes scheduled for {selectedDay}.</Text>
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#F8FAFC" },
  
  // Header
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, paddingTop: 10, paddingBottom: 15, backgroundColor: "#FFFFFF", borderBottomWidth: 1, borderBottomColor: "#E2E8F0" },
  backButton: { padding: 8, width: 40 },
  headerTitle: { fontSize: 18, fontWeight: "bold", color: "#1E293B" },
  
  // Tabs
  tabsContainer: { backgroundColor: "#FFFFFF", paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: "#E2E8F0", elevation: 2, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 3 },
  tabsScrollView: { paddingHorizontal: 15 },
  dayTab: { paddingHorizontal: 16, paddingVertical: 12, marginRight: 8, position: "relative" },
  dayTabActive: { },
  dayTabText: { fontSize: 14, fontWeight: "600", color: "#64748B" },
  dayTabTextActive: { color: "#2563EB", fontWeight: "bold" },
  activeIndicator: { position: "absolute", bottom: 0, left: "20%", right: "20%", height: 3, backgroundColor: "#2563EB", borderTopLeftRadius: 3, borderTopRightRadius: 3 },
  
  // States
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  loadingText: { marginTop: 12, color: "#64748B", fontSize: 14, fontWeight: "500" },
  emptyContainer: { flex: 1, justifyContent: "center", alignItems: "center", marginTop: 80 },
  emptyIconBg: { width: 80, height: 80, borderRadius: 40, backgroundColor: "#E2E8F0", justifyContent: "center", alignItems: "center", marginBottom: 16 },
  emptyTitle: { fontSize: 20, fontWeight: "bold", color: "#1E293B", marginBottom: 8 },
  emptySubtitle: { fontSize: 14, color: "#64748B", textAlign: "center" },
  
  // List
  listContainer: { padding: 20, paddingBottom: 40 },
  classCard: { flexDirection: "row", marginBottom: 20 },
  
  // Timeline
  timelineIndicators: { width: 30, alignItems: "center", marginRight: 15 },
  timelineDot: { width: 14, height: 14, borderRadius: 7, marginTop: 4, zIndex: 2, borderWidth: 3, borderColor: "#FFFFFF", shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 1 },
  timelineLine: { width: 2, flex: 1, backgroundColor: "#E2E8F0", marginTop: 4, marginBottom: -24 },
  
  // Card
  cardContentWrapper: { flex: 1 },
  timeText: { fontSize: 13, fontWeight: "700", color: "#475569", marginBottom: 8 },
  cardBox: { backgroundColor: "#FFFFFF", borderRadius: 16, padding: 16, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2, borderWidth: 1, borderColor: "#F1F5F9" },
  
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 },
  iconBg: { width: 36, height: 36, borderRadius: 10, justifyContent: "center", alignItems: "center" },
  periodBadge: { backgroundColor: "#F8FAFC", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, borderWidth: 1, borderColor: "#E2E8F0" },
  periodText: { fontSize: 11, fontWeight: "bold", color: "#64748B" },
  
  subjectText: { fontSize: 18, fontWeight: "bold", color: "#1E293B", marginBottom: 4 },
  gradeText: { fontSize: 14, color: "#64748B", fontWeight: "600", marginBottom: 16 },
  
  cardFooter: { flexDirection: "row", alignItems: "center", borderTopWidth: 1, borderTopColor: "#F1F5F9", paddingTop: 12, gap: 20 },
  footerItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  footerItemText: { fontSize: 13, color: "#64748B", fontWeight: "500" }
});
