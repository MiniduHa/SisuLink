import React, { useState, useEffect, useCallback } from "react";
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Dimensions,
  Image,
  ImageBackground
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context"; 
import { FontAwesome6, Ionicons, MaterialCommunityIcons, Feather } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter, useFocusEffect } from "expo-router";

// Import the Master Calendar Data to keep news consistent!
import { sharedCalendarEvents } from "../(auth)/calendar"; 

const { width } = Dimensions.get("window");

// --- TEACHER MOCK DATA ---
const todaysClasses = [
  { id: "c1", subject: "Science", grade: "Grade 10-A", time: "08:30 AM - 09:15 AM", room: "Lab 2", students: 34, color: "#DBEAFE", iconColor: "#2563EB" },
  { id: "c2", subject: "Mathematics", grade: "Grade 10-B", time: "09:15 AM - 10:00 AM", room: "Room 102", students: 32, color: "#FEF3C7", iconColor: "#D97706" },
  { id: "c3", subject: "Science", grade: "Grade 11-C", time: "11:00 AM - 11:45 AM", room: "Lab 1", students: 36, color: "#D1FAE5", iconColor: "#059669" },
];

const pendingTasks = [
  { id: "t1", title: "Mark Morning Attendance", deadline: "Due in 30 mins", type: "urgent" },
  { id: "t2", title: "Upload Term 2 Science Marks", deadline: "Due Tomorrow", type: "pending" },
  { id: "t3", title: "Review PTA Meeting Notes", deadline: "Due in 3 Days", type: "normal" },
];

const urgentNoticeData = { 
  icon: "bullhorn", 
  title: "Staff Meeting at 1:30 PM", 
  time: "1h ago", 
  body: "Please assemble in the Main Staff Room immediately after the 5th period. Attendance is mandatory." 
};

export default function TeacherDashboard() {
  const router = useRouter(); 
  const params = useLocalSearchParams();
  
  // Extract Data from Login
  const [teacherData, setTeacherData] = useState({
    full_name: (params.full_name as string) || "Teacher",
    email: (params.email as string) || "",
    staff_id: (params.staff_id as string) || "Staff Member",
    profile_photo_url: (params.profile_photo_url as string) || "null"
  });

  const firstName = teacherData.full_name ? teacherData.full_name.split(" ")[0] : "Teacher";

  const getNavParams = () => ({
    full_name: teacherData.full_name,
    email: teacherData.email,
    staff_id: teacherData.staff_id,
    profile_photo_url: teacherData.profile_photo_url
  });

  // --- LATEST NEWS FILTERING LOGIC ---
  const pastSpecialEvents = sharedCalendarEvents
    .filter(event => {
      const isPast = new Date(event.date) < new Date(); 
      return event.isSpecial && isPast;
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()); 

  const formatDateForNews = (dateString: string) => {
    const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString('en-US', options);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
          
          {/* HEADER */}
          <View style={styles.headerRowNew}>
            <View style={styles.headerLeft}>
              <TouchableOpacity 
                activeOpacity={0.7} 
                style={styles.avatarTouchTarget}
                onPress={() => router.push({ pathname: "/(teacher-tabs)/teacher-profile", params: getNavParams() })}
              >
                {teacherData.profile_photo_url && teacherData.profile_photo_url !== "null" ? (
                  <Image source={{ uri: teacherData.profile_photo_url }} style={styles.avatarHeader} />
                ) : (
                  <FontAwesome6 name="circle-user" size={46} color="#2563EB" />
                )}
              </TouchableOpacity>
              <View>
                <Text style={styles.greeting}>Hello, {firstName}</Text>
                <Text style={styles.subtext}>ID: {teacherData.staff_id}</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.notificationButton}>
              <Ionicons name="notifications-outline" size={26} color="#1E293B" />
              <View style={styles.notificationBadge} />
            </TouchableOpacity>
          </View>

          <View style={styles.dashboardContent}>
            
            {/* OVERVIEW STATS */}
            <View style={styles.statsContainer}>
              <View style={styles.statBox}>
                <View style={[styles.statIconBg, { backgroundColor: "#DBEAFE" }]}><FontAwesome6 name="chalkboard-user" size={16} color="#2563EB" /></View>
                <Text style={styles.statValue}>{todaysClasses.length}</Text>
                <Text style={styles.statLabel}>Classes Today</Text>
              </View>
              <View style={styles.statBox}>
                <View style={[styles.statIconBg, { backgroundColor: "#FEF3C7" }]}><FontAwesome6 name="clipboard-list" size={16} color="#D97706" /></View>
                <Text style={styles.statValue}>2</Text>
                <Text style={styles.statLabel}>Pending Tasks</Text>
              </View>
              <View style={styles.statBox}>
                <View style={[styles.statIconBg, { backgroundColor: "#D1FAE5" }]}><FontAwesome6 name="users" size={16} color="#059669" /></View>
                <Text style={styles.statValue}>102</Text>
                <Text style={styles.statLabel}>Total Students</Text>
              </View>
            </View>

            {/* TODAY's SCHEDULE */}
            <View style={styles.sectionHeaderNew}>
              <Text style={styles.sectionTitleNew}>TODAY'S SCHEDULE</Text>
              <TouchableOpacity><Text style={styles.sectionLink}>View Timetable</Text></TouchableOpacity>
            </View>
            
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.switcherScroll}>
              {todaysClasses.map((cls, index) => (
                <TouchableOpacity key={index} style={styles.classCard} activeOpacity={0.8}>
                  <View style={styles.classCardHeader}>
                    <View style={[styles.classIconBg, { backgroundColor: cls.color }]}>
                      <FontAwesome6 name="book-open" size={14} color={cls.iconColor} />
                    </View>
                    <Text style={styles.classTime}>{cls.time}</Text>
                  </View>
                  <Text style={styles.classSubject}>{cls.subject}</Text>
                  <Text style={styles.classGrade}>{cls.grade}</Text>
                  
                  <View style={styles.classCardFooter}>
                    <View style={styles.footerItem}>
                      <Feather name="map-pin" size={12} color="#64748B" />
                      <Text style={styles.footerItemText}>{cls.room}</Text>
                    </View>
                    <View style={styles.footerItem}>
                      <Feather name="users" size={12} color="#64748B" />
                      <Text style={styles.footerItemText}>{cls.students} Students</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* URGENT NOTICE */}
            <View style={styles.urgentNoticeCard}>
              <View style={styles.noticeHeader}>
                <MaterialCommunityIcons name={urgentNoticeData.icon as any} size={28} color="#EF4444" />
                <View style={styles.noticeTitleBlock}>
                  <Text style={styles.noticeType}>STAFF NOTICE</Text>
                  <Text style={styles.noticeTitle}>{urgentNoticeData.title}</Text>
                </View>
                <Text style={styles.noticeTime}>{urgentNoticeData.time}</Text>
              </View>
              <Text style={styles.noticeBody}>{urgentNoticeData.body}</Text>
            </View>

            {/* TO-DO / PENDING TASKS */}
            <View style={styles.sectionHeaderNew}>
              <Text style={styles.sectionTitleNew}>PENDING TASKS</Text>
            </View>
            <View style={styles.tasksContainer}>
              {pendingTasks.map((task) => (
                <TouchableOpacity key={task.id} style={styles.taskRow} activeOpacity={0.7}>
                  <View style={[styles.taskCheckbox, task.type === 'urgent' && styles.taskCheckboxUrgent]}>
                    {task.type === 'urgent' && <View style={styles.urgentDot} />}
                  </View>
                  <View style={styles.taskInfo}>
                    <Text style={[styles.taskTitle, task.type === 'urgent' && { color: '#EF4444' }]}>{task.title}</Text>
                    <Text style={styles.taskDeadline}>{task.deadline}</Text>
                  </View>
                  <FontAwesome6 name="chevron-right" size={14} color="#CBD5E1" />
                </TouchableOpacity>
              ))}
            </View>

            {/* LATEST NEWS SECTION */}
            <View style={styles.sectionHeaderNew}>
              <Text style={styles.sectionTitleNew}>LATEST SCHOOL NEWS</Text>
              <TouchableOpacity onPress={() => router.push("/(auth)/calendar")}>
                <Text style={styles.sectionLink}>View Calendar</Text>
              </TouchableOpacity>
            </View>

            <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} contentContainerStyle={styles.newsCarouselScroll}>
              {pastSpecialEvents.map((news) => (
                <TouchableOpacity key={news.id} style={styles.newsCard} activeOpacity={0.9}>
                  <ImageBackground source={{ uri: news.image }} style={styles.newsImage} imageStyle={{ borderRadius: 16 }}>
                    <View style={styles.newsOverlay}>
                      <Text style={styles.newsDate}>{formatDateForNews(news.date)}</Text>
                      <Text style={styles.newsTitle} numberOfLines={2}>{news.title}</Text>
                    </View>
                  </ImageBackground>
                </TouchableOpacity>
              ))}
            </ScrollView>

          </View>
        </ScrollView>
        
        {/* BOTTOM TAB BAR */}
        <View style={styles.bottomTabBar}>
          {[ 
            { icon: "home", label: "Home", route: "/(teacher-tabs)/teacher-screen" }, 
            { icon: "users", label: "Classes", route: null }, // Placeholder for future classes screen
            { icon: "calendar", label: "Calendar", route: "/(auth)/calendar" }, 
            { icon: "info", label: "About Us", route: "/(auth)/about-us" } 
          ].map((tab, index) => {
            const isActive = index === 0; 
            return (
              <TouchableOpacity 
                key={index} 
                style={styles.tabItem}
                onPress={() => {
                  if (tab.route && !isActive) {
                    router.navigate({ pathname: tab.route as any, params: getNavParams() });
                  }
                }}
                activeOpacity={0.7}
              >
                <Feather name={tab.icon as any} size={20} color={isActive ? "#2563EB" : "#64748B"} />
                <Text style={[styles.tabLabel, { color: isActive ? "#2563EB" : "#64748B" }]}>{tab.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#F8FAFC" },
  container: { paddingBottom: 100 }, 
  
  // Header
  headerRowNew: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 24, paddingTop: 10, paddingBottom: 20, borderBottomWidth: 1, borderBottomColor: "#E2E8F0", backgroundColor: "#FFFFFF" },
  headerLeft: { flexDirection: "row", alignItems: "center" },
  avatarTouchTarget: { marginRight: 15, justifyContent: 'center', alignItems: 'center' },
  avatarHeader: { width: 48, height: 48, borderRadius: 24 }, 
  greeting: { fontSize: 22, fontWeight: "bold", color: "#1E293B" },
  subtext: { fontSize: 13, color: "#64748B", marginTop: 3, fontWeight: "600" },
  notificationButton: { padding: 5, position: "relative" },
  notificationBadge: { position: "absolute", top: 5, right: 6, width: 10, height: 10, borderRadius: 5, backgroundColor: "#EF4444", borderWidth: 2, borderColor: "#FFFFFF" },
  
  dashboardContent: { paddingHorizontal: 24, marginTop: 20 },
  
  // Stats
  statsContainer: { flexDirection: "row", justifyContent: "space-between", marginBottom: 25 },
  statBox: { flex: 1, backgroundColor: "#FFFFFF", paddingVertical: 15, paddingHorizontal: 10, borderRadius: 16, alignItems: "center", marginHorizontal: 4, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2, borderWidth: 1, borderColor: "#F1F5F9" },
  statIconBg: { width: 36, height: 36, borderRadius: 18, justifyContent: "center", alignItems: "center", marginBottom: 8 },
  statValue: { fontSize: 18, fontWeight: "bold", color: "#1E293B" },
  statLabel: { fontSize: 11, color: "#64748B", marginTop: 4, fontWeight: "600", textAlign: "center" },

  // Sections
  sectionHeaderNew: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 15, marginTop: 5 },
  sectionTitleNew: { fontSize: 13, fontWeight: "800", color: "#9CA3AF", letterSpacing: 0.5 },
  sectionLink: { fontSize: 13, color: "#2563EB", fontWeight: "600" },
  
  // Classes Horizontal Scroll
  switcherScroll: { paddingBottom: 10, overflow: 'visible', marginBottom: 15 },
  classCard: { backgroundColor: "#FFFFFF", padding: 20, borderRadius: 20, marginRight: 15, width: width * 0.65, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2, borderWidth: 1, borderColor: "#F1F5F9" },
  classCardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  classIconBg: { width: 32, height: 32, borderRadius: 10, justifyContent: "center", alignItems: "center" },
  classTime: { fontSize: 12, fontWeight: "600", color: "#64748B" },
  classSubject: { fontSize: 18, fontWeight: "bold", color: "#1E293B", marginBottom: 2 },
  classGrade: { fontSize: 14, color: "#64748B", fontWeight: "500", marginBottom: 16 },
  classCardFooter: { flexDirection: "row", justifyContent: "space-between", borderTopWidth: 1, borderTopColor: "#F1F5F9", paddingTop: 12 },
  footerItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  footerItemText: { fontSize: 12, color: "#64748B", fontWeight: "500" },

  // Urgent Notice
  urgentNoticeCard: { backgroundColor: "#FEF2F2", padding: 20, borderRadius: 20, marginBottom: 25, shadowColor: "#EF4444", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 10, elevation: 4 },
  noticeHeader: { flexDirection: "row", alignItems: "flex-start", marginBottom: 15 },
  noticeTitleBlock: { flex: 1, paddingHorizontal: 12 },
  noticeType: { fontSize: 12, fontWeight: "bold", color: "#EF4444", letterSpacing: 0.5 },
  noticeTitle: { fontSize: 16, fontWeight: "800", color: "#1E293B", marginTop: 3 },
  noticeTime: { fontSize: 11, color: "#9CA3AF" },
  noticeBody: { fontSize: 13, color: "#475569", lineHeight: 20, fontWeight: "500" },

  // Tasks
  tasksContainer: { backgroundColor: "#FFFFFF", borderRadius: 20, padding: 15, marginBottom: 25, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2, borderWidth: 1, borderColor: "#F1F5F9" },
  taskRow: { flexDirection: "row", alignItems: "center", paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#F8FAFC" },
  taskCheckbox: { width: 24, height: 24, borderRadius: 8, borderWidth: 2, borderColor: "#E2E8F0", marginRight: 15, justifyContent: "center", alignItems: "center" },
  taskCheckboxUrgent: { borderColor: "#FECACA", backgroundColor: "#FEF2F2" },
  urgentDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#EF4444" },
  taskInfo: { flex: 1 },
  taskTitle: { fontSize: 15, fontWeight: "600", color: "#1E293B", marginBottom: 4 },
  taskDeadline: { fontSize: 12, color: "#64748B" },

  // News Carousel
  newsCarouselScroll: { paddingBottom: 10, marginBottom: 20 },
  newsCard: { width: width * 0.75, height: 160, marginRight: 15, borderRadius: 16, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 4 },
  newsImage: { width: "100%", height: "100%", justifyContent: "flex-end" },
  newsOverlay: { backgroundColor: "rgba(0,0,0,0.5)", padding: 15, borderBottomLeftRadius: 16, borderBottomRightRadius: 16 },
  newsDate: { color: "#E2E8F0", fontSize: 11, fontWeight: "600", marginBottom: 4 },
  newsTitle: { color: "#FFFFFF", fontSize: 16, fontWeight: "bold" },

  // Bottom Tab Bar
  bottomTabBar: { flexDirection: "row", justifyContent: "space-around", backgroundColor: "#FFFFFF", paddingVertical: 12, paddingHorizontal: 20, borderTopWidth: 1, borderTopColor: "#E2E8F0", position: "absolute", bottom: 0, left: 0, right: 0 },
  tabItem: { alignItems: "center", flex: 1 }, 
  tabLabel: { fontSize: 10, marginTop: 4, fontWeight: "600" }
});