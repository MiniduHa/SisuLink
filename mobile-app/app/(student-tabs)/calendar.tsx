import React, { useState, useCallback, useEffect } from "react";
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity,
  Dimensions,
  ActivityIndicator
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { FontAwesome6, Feather } from "@expo/vector-icons";
import { useRouter, Stack, useGlobalSearchParams } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";

const { width } = Dimensions.get("window");

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const CATEGORIES = ["All", "Academic", "Holiday", "Sports", "Admin"];

export default function SchoolCalendarScreen() {
  const router = useRouter();
  const params = useGlobalSearchParams();
  const userEmail = (params.email as string) || "";

  // Helper to convert 24h "14:30" format to "02:30 PM"
  const formatTime = (timeStr: string) => {
    if (!timeStr) return '';
    const [h, m] = timeStr.split(':');
    const hours = parseInt(h, 10);
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const formattedHours = hours % 12 || 12;
    return `${formattedHours.toString().padStart(2, '0')}:${m} ${ampm}`;
  };

  // --- STATE ---
  const [events, setEvents] = useState<any[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth()); 
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [isLoading, setIsLoading] = useState(true);

  // --- FETCH DATA ---
  useFocusEffect(
    useCallback(() => {
      let isActive = true;
      const fetchEvents = async () => {
        if (!userEmail) return;
        setIsLoading(true);
        try {
          const timestamp = new Date().getTime();
          const response = await fetch(`http://172.20.10.7:5000/api/teacher/${userEmail}/events?t=${timestamp}`);
          if (response.ok && isActive) {
            const data = await response.json();
            // Map DB fields to UI expectations
            const mappedEvents = data.map((evt: any) => ({
              id: evt.id.toString(),
              date: evt.event_date.split('T')[0],
              title: evt.title,
              type: evt.type.toLowerCase(),
              isSpecial: evt.is_special,
              time: evt.time_from === "00:00" && evt.time_to === "23:59" ? "All Day" : `${formatTime(evt.time_from)} - ${formatTime(evt.time_to)}`,
              description: evt.description
            }));
            setEvents(mappedEvents);
          }
        } catch (error) {
          console.error("Failed to fetch events:", error);
        } finally {
          if (isActive) setIsLoading(false);
        }
      };

      fetchEvents();
      return () => { isActive = false; };
    }, [userEmail])
  );

  // --- FILTERING LOGIC ---
  const filteredEvents = events.filter(event => {
    const eventMonth = parseInt(event.date.split('-')[1]) - 1; // Extract month from YYYY-MM-DD
    const matchMonth = eventMonth === selectedMonth;
    const matchCategory = selectedCategory === "All" || event.type.toLowerCase() === selectedCategory.toLowerCase();
    return matchMonth && matchCategory;
  });

  // Sort events by date ascending
  filteredEvents.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // --- UI HELPERS ---
  const getEventColor = (type: string) => {
    switch(type) {
      case 'holiday': return { bg: '#FCE7F3', text: '#E11D48', icon: 'umbrella-beach' }; 
      case 'academic': return { bg: '#DBEAFE', text: '#2563EB', icon: 'book-open' };     
      case 'sports': return { bg: '#D1FAE5', text: '#059669', icon: 'medal' };           
      case 'admin': return { bg: '#FEF3C7', text: '#D97706', icon: 'users' };            
      default: return { bg: '#F1F5F9', text: '#64748B', icon: 'calendar-day' };          
    }
  };

  const formatDay = (dateString: string) => {
    const date = new Date(dateString);
    return date.getDate().toString();
  };

  const formatDayName = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { weekday: 'short' }); 
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <FontAwesome6 name="arrow-left" size={20} color="#1E293B" />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>School Calendar</Text>
          <Text style={styles.headerYear}>2026 Academic Year</Text>
        </View>
        <TouchableOpacity style={styles.filterBtn}>
          <Feather name="search" size={20} color="#1E293B" />
        </TouchableOpacity>
      </View>

      <View style={styles.monthSelectorContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.monthScroll}>
          {MONTHS.map((month, index) => {
            const isActive = selectedMonth === index;
            return (
              <TouchableOpacity 
                key={index} 
                style={[styles.monthPill, isActive && styles.monthPillActive]}
                onPress={() => setSelectedMonth(index)}
              >
                <Text style={[styles.monthText, isActive && styles.monthTextActive]}>{month}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <View style={styles.categoryContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryScroll}>
          {CATEGORIES.map((cat, index) => {
            const isActive = selectedCategory === cat;
            return (
              <TouchableOpacity 
                key={index} 
                style={[styles.categoryPill, isActive && styles.categoryPillActive]}
                onPress={() => setSelectedCategory(cat)}
              >
                <Text style={[styles.categoryText, isActive && styles.categoryTextActive]}>{cat}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {isLoading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={{ marginTop: 10, color: "#64748B" }}>Fetching events...</Text>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.eventListContent}>
        
        {filteredEvents.length > 0 ? (
          filteredEvents.map((event) => {
            const colors = getEventColor(event.type);
            return (
              <View key={event.id} style={styles.eventCard}>
                <View style={styles.dateBox}>
                  <Text style={styles.dateDayName}>{formatDayName(event.date)}</Text>
                  <Text style={styles.dateNumber}>{formatDay(event.date)}</Text>
                </View>
                <View style={styles.eventDetails}>
                  <View style={styles.eventHeader}>
                    <View style={[styles.typeBadge, { backgroundColor: colors.bg }]}>
                      <FontAwesome6 name={colors.icon as any} size={10} color={colors.text} />
                      <Text style={[styles.typeText, { color: colors.text }]}>{event.type.toUpperCase()}</Text>
                    </View>
                    <Text style={styles.timeText}>{event.time}</Text>
                  </View>
                  <Text style={styles.eventTitle}>{event.title}</Text>
                  <Text style={styles.eventDescription} numberOfLines={2}>{event.description}</Text>
                </View>
              </View>
            );
          })
        ) : (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconBg}>
              <FontAwesome6 name="calendar-xmark" size={40} color="#9CA3AF" />
            </View>
            <Text style={styles.emptyTitle}>No Events Found</Text>
            <Text style={styles.emptySub}>There are no {selectedCategory !== "All" ? selectedCategory.toLowerCase() : ""} events scheduled for {MONTHS[selectedMonth]}.</Text>
          </View>
        )}

      </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#F8FAFC" },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, paddingVertical: 15, backgroundColor: "#FFFFFF" },
  backBtn: { padding: 8, backgroundColor: "#F1F5F9", borderRadius: 12 },
  filterBtn: { padding: 8, backgroundColor: "#F1F5F9", borderRadius: 12 },
  headerTitleContainer: { alignItems: "center" },
  headerTitle: { fontSize: 18, fontWeight: "bold", color: "#1E293B" },
  headerYear: { fontSize: 12, color: "#2563EB", fontWeight: "600", marginTop: 2 },
  monthSelectorContainer: { backgroundColor: "#FFFFFF", paddingBottom: 15, borderBottomWidth: 1, borderBottomColor: "#E2E8F0" },
  monthScroll: { paddingHorizontal: 15, gap: 8 },
  monthPill: { paddingVertical: 8, paddingHorizontal: 20, borderRadius: 20, backgroundColor: "#F8FAFC" },
  monthPillActive: { backgroundColor: "#2563EB" },
  monthText: { fontSize: 14, fontWeight: "600", color: "#64748B" },
  monthTextActive: { color: "#FFFFFF" },
  categoryContainer: { paddingTop: 15, paddingBottom: 5 },
  categoryScroll: { paddingHorizontal: 20, gap: 10 },
  categoryPill: { paddingVertical: 6, paddingHorizontal: 16, borderRadius: 16, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E2E8F0" },
  categoryPillActive: { backgroundColor: "#1E293B", borderColor: "#1E293B" },
  categoryText: { fontSize: 12, fontWeight: "600", color: "#64748B" },
  categoryTextActive: { color: "#FFFFFF" },
  eventListContent: { paddingHorizontal: 20, paddingTop: 15, paddingBottom: 40 },
  eventCard: { flexDirection: "row", backgroundColor: "#FFFFFF", borderRadius: 20, padding: 15, marginBottom: 15, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 8, elevation: 2, borderWidth: 1, borderColor: "#F1F5F9" },
  dateBox: { width: 60, height: 70, backgroundColor: "#F8FAFC", borderRadius: 16, justifyContent: "center", alignItems: "center", marginRight: 15, borderWidth: 1, borderColor: "#E2E8F0" },
  dateDayName: { fontSize: 12, color: "#64748B", fontWeight: "600", textTransform: "uppercase", marginBottom: 2 },
  dateNumber: { fontSize: 22, fontWeight: "bold", color: "#2563EB" },
  eventDetails: { flex: 1, justifyContent: "center" },
  eventHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  typeBadge: { flexDirection: "row", alignItems: "center", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, gap: 5 },
  typeText: { fontSize: 10, fontWeight: "bold", letterSpacing: 0.5 },
  timeText: { fontSize: 12, color: "#9CA3AF", fontWeight: "500" },
  eventTitle: { fontSize: 16, fontWeight: "bold", color: "#1E293B", marginBottom: 4 },
  eventDescription: { fontSize: 13, color: "#64748B", lineHeight: 18 },
  emptyState: { alignItems: "center", justifyContent: "center", marginTop: 80 },
  emptyIconBg: { width: 80, height: 80, borderRadius: 40, backgroundColor: "#F1F5F9", justifyContent: "center", alignItems: "center", marginBottom: 15 },
  emptyTitle: { fontSize: 18, fontWeight: "bold", color: "#1E293B", marginBottom: 6 },
  emptySub: { fontSize: 14, color: "#64748B", textAlign: "center", paddingHorizontal: 40, lineHeight: 20 },
});