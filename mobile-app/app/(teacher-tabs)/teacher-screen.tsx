import React, { useState, useCallback } from "react";
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Dimensions,
  Image,
  ImageBackground,
  ActivityIndicator,
  Modal
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context"; 
import { FontAwesome6, Ionicons, MaterialCommunityIcons, Feather } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter, useFocusEffect } from "expo-router";

// Import the Master Calendar Data to keep news consistent!
import { sharedCalendarEvents } from "../(auth)/calendar"; 

const { width } = Dimensions.get("window");

export default function TeacherDashboard() {
  const router = useRouter(); 
  const params = useLocalSearchParams();
  
  // Extract initial parameters passed from the Login screen
  const initialEmail = (params.email as string) || "";
  const initialName = (params.full_name as string) || "Teacher";

  // --- DYNAMIC STATE FOR REAL DATA ---
  const [isLoading, setIsLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState<any>({
    teacher: { full_name: initialName, staff_id: "", email: initialEmail, profile_photo: null },
    todaysClasses: [],
    pendingTasks: [],
    urgentNoticeData: null,
    stats: { totalClassesToday: 0, pendingTasks: 0, totalStudents: 0 }
  });

  // --- MODAL STATE ---
  const [isStudentsModalVisible, setStudentsModalVisible] = useState(false);
  const [teacherStudents, setTeacherStudents] = useState<any[]>([]);
  const [isStudentsLoading, setIsStudentsLoading] = useState(false);

  // --- FETCH REAL DATA FROM BACKEND ---
  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      const fetchDashboardData = async () => {
        if (!initialEmail) return;
        setIsLoading(true);
        try {
          const timestamp = new Date().getTime();
          // Adjust this IP to your machine's IP!
          const response = await fetch(`http://172.20.10.7:5000/api/teacher/${initialEmail}/dashboard?t=${timestamp}`);
          
          if (response.ok && isActive) {
            const data = await response.json();
            setDashboardData(data);
          }
        } catch (error) {
          console.error("Failed to fetch teacher dashboard data:", error);
        } finally {
          if (isActive) setIsLoading(false);
        }
      };

      fetchDashboardData();
      return () => { isActive = false; };
    }, [initialEmail])
  );

  const firstName = dashboardData.teacher.full_name ? dashboardData.teacher.full_name.split(" ")[0] : "Teacher";

  const getNavParams = () => ({
    full_name: dashboardData.teacher.full_name,
    email: dashboardData.teacher.email || initialEmail,
    staff_id: dashboardData.teacher.staff_id,
    profile_photo_url: dashboardData.teacher.profile_photo || "null"
  });

  const handleOpenStudentsModal = async () => {
    setStudentsModalVisible(true);
    if (!initialEmail || teacherStudents.length > 0) return;
    
    setIsStudentsLoading(true);
    try {
      const timestamp = new Date().getTime();
      const response = await fetch(`http://172.20.10.7:5000/api/teacher/${initialEmail}/students?t=${timestamp}`);
      if (response.ok) {
        const data = await response.json();
        setTeacherStudents(data);
      }
    } catch (error) {
      console.error("Failed to fetch teacher students:", error);
    } finally {
      setIsStudentsLoading(false);
    }
  };

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

  // Show a loading spinner while fetching the database
  if (isLoading) {
    return (
      <View style={[styles.safeArea, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#2563EB" />
        <Text style={{ marginTop: 10, color: "#64748B" }}>Loading Teacher Portal...</Text>
      </View>
    );
  }

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
                {dashboardData.teacher.profile_photo && dashboardData.teacher.profile_photo !== "null" ? (
                  <Image source={{ uri: dashboardData.teacher.profile_photo }} style={styles.avatarHeader} />
                ) : (
                  <FontAwesome6 name="circle-user" size={46} color="#2563EB" />
                )}
              </TouchableOpacity>
              <View>
                <Text style={styles.greeting}>Hello, {firstName}</Text>
                <Text style={styles.subtext}>ID: {dashboardData.teacher.staff_id}</Text>
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
                <Text style={styles.statValue}>{dashboardData.stats.totalClassesToday}</Text>
                <Text style={styles.statLabel}>Classes Today</Text>
              </View>
              <View style={styles.statBox}>
                <View style={[styles.statIconBg, { backgroundColor: "#FEF3C7" }]}><FontAwesome6 name="clipboard-list" size={16} color="#D97706" /></View>
                <Text style={styles.statValue}>{dashboardData.stats.pendingTasks}</Text>
                <Text style={styles.statLabel}>Pending Tasks</Text>
              </View>
              <TouchableOpacity style={styles.statBox} activeOpacity={0.7} onPress={handleOpenStudentsModal}>
                <View style={[styles.statIconBg, { backgroundColor: "#D1FAE5" }]}><FontAwesome6 name="users" size={16} color="#059669" /></View>
                <Text style={styles.statValue}>{dashboardData.stats.totalStudents}</Text>
                <Text style={styles.statLabel}>Total Students</Text>
              </TouchableOpacity>
            </View>

            {/* TODAY'S SCHEDULE */}
            <View style={styles.sectionHeaderNew}>
              <Text style={styles.sectionTitleNew}>TODAY'S SCHEDULE</Text>
              <TouchableOpacity onPress={() => router.push({ pathname: "/(teacher-tabs)/teacher-timetable", params: getNavParams() })}>
                <Text style={styles.sectionLink}>View Timetable</Text>
              </TouchableOpacity>
            </View>
            
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.switcherScroll}>
              {dashboardData.todaysClasses.map((cls: any, index: number) => (
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
              
              {dashboardData.todaysClasses.length === 0 && (
                <Text style={{ color: "#64748B", fontStyle: "italic", marginTop: 10 }}>No classes scheduled for today.</Text>
              )}
            </ScrollView>

            {/* URGENT NOTICE (Only renders if there is data in the DB) */}
            {dashboardData.urgentNoticeData && (
              <View style={styles.urgentNoticeCard}>
                <View style={styles.noticeHeader}>
                  <MaterialCommunityIcons name={dashboardData.urgentNoticeData.icon as any} size={28} color="#EF4444" />
                  <View style={styles.noticeTitleBlock}>
                    <Text style={styles.noticeType}>STAFF NOTICE</Text>
                    <Text style={styles.noticeTitle}>{dashboardData.urgentNoticeData.title}</Text>
                  </View>
                  <Text style={styles.noticeTime}>{dashboardData.urgentNoticeData.time}</Text>
                </View>
                <Text style={styles.noticeBody}>{dashboardData.urgentNoticeData.body}</Text>
              </View>
            )}

            {/* TO-DO / PENDING TASKS */}
            <View style={styles.sectionHeaderNew}>
              <Text style={styles.sectionTitleNew}>PENDING TASKS</Text>
            </View>
            <View style={styles.tasksContainer}>
              {dashboardData.pendingTasks.map((task: any) => (
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
              
              {dashboardData.pendingTasks.length === 0 && (
                <Text style={{ color: "#16A34A", textAlign: "center", paddingVertical: 10 }}>All caught up!</Text>
              )}
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
            { icon: "users", label: "Classes", route: null }, 
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

        {/* MODAL FOR STUDENTS LIST */}
        <Modal
          visible={isStudentsModalVisible}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setStudentsModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>My Students</Text>
                <TouchableOpacity onPress={() => setStudentsModalVisible(false)} style={styles.closeModalButton}>
                  <Feather name="x" size={24} color="#64748B" />
                </TouchableOpacity>
              </View>
              
              {isStudentsLoading ? (
                <View style={styles.modalLoading}>
                  <ActivityIndicator size="large" color="#2563EB" />
                  <Text style={styles.modalLoadingText}>Loading students...</Text>
                </View>
              ) : (
                <ScrollView contentContainerStyle={styles.studentsListScroll} showsVerticalScrollIndicator={false}>
                  {teacherStudents.length > 0 ? (
                    teacherStudents.map((student: any) => (
                      <View key={student.id} style={styles.studentCardRow}>
                        <View style={styles.studentAvatar}>
                          {student.profile_photo_url && student.profile_photo_url !== "null" ? (
                            <Image source={{ uri: student.profile_photo_url }} style={styles.studentAvatarImg} />
                          ) : (
                            <Text style={styles.studentAvatarText}>{student.first_name[0]}</Text>
                          )}
                        </View>
                        <View style={styles.studentDetails}>
                          <Text style={styles.studentName}>{student.first_name} {student.last_name}</Text>
                          <Text style={styles.studentMeta}>{student.grade_level} - {student.section} • ID: {student.index_number}</Text>
                        </View>
                        <View style={styles.studentActions}>
                          <TouchableOpacity style={styles.actionIconBtn}>
                            <Feather name="phone" size={16} color="#2563EB" />
                          </TouchableOpacity>
                          <TouchableOpacity style={styles.actionIconBtn}>
                            <Feather name="mail" size={16} color="#2563EB" />
                          </TouchableOpacity>
                        </View>
                      </View>
                    ))
                  ) : (
                    <Text style={styles.noStudentsText}>No students assigned to your classes yet.</Text>
                  )}
                </ScrollView>
              )}
            </View>
          </View>
        </Modal>

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
  tabLabel: { fontSize: 10, marginTop: 4, fontWeight: "600" },

  // Modal Styles
  modalOverlay: { flex: 1, backgroundColor: "rgba(15, 23, 42, 0.4)", justifyContent: "flex-end" },
  modalContent: { backgroundColor: "#FFFFFF", borderTopLeftRadius: 24, borderTopRightRadius: 24, height: Dimensions.get('window').height * 0.75, paddingBottom: 20 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 20, borderBottomWidth: 1, borderBottomColor: "#F1F5F9" },
  modalTitle: { fontSize: 18, fontWeight: "bold", color: "#1E293B" },
  closeModalButton: { padding: 4, backgroundColor: "#F8FAFC", borderRadius: 20 },
  modalLoading: { flex: 1, justifyContent: "center", alignItems: "center" },
  modalLoadingText: { marginTop: 12, color: "#64748B", fontSize: 14, fontWeight: "500" },
  studentsListScroll: { padding: 20, paddingBottom: 40 },
  studentCardRow: { flexDirection: "row", alignItems: "center", backgroundColor: "#FFFFFF", padding: 16, borderRadius: 16, marginBottom: 12, borderWidth: 1, borderColor: "#F1F5F9", shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 4, elevation: 1 },
  studentAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: "#DBEAFE", justifyContent: "center", alignItems: "center", marginRight: 14, overflow: "hidden" },
  studentAvatarImg: { width: "100%", height: "100%" },
  studentAvatarText: { fontSize: 18, fontWeight: "bold", color: "#2563EB" },
  studentDetails: { flex: 1 },
  studentName: { fontSize: 15, fontWeight: "bold", color: "#1E293B", marginBottom: 2 },
  studentMeta: { fontSize: 12, color: "#64748B", fontWeight: "500" },
  studentActions: { flexDirection: "row", gap: 10 },
  actionIconBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: "#EFF6FF", justifyContent: "center", alignItems: "center" },
  noStudentsText: { textAlign: "center", marginTop: 40, color: "#64748B", fontSize: 14, fontStyle: "italic" }
});