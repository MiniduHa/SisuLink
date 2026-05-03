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
import WatermarkOverlay from "../../components/WatermarkOverlay";


const { width } = Dimensions.get("window");

export default function TeacherDashboard() {
  const router = useRouter(); 
  const params = useLocalSearchParams();
  
  const initialEmail = (params.email as string) || "";
  const initialName = (params.full_name as string) || "Teacher";

  const [isLoading, setIsLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState<any>({
    teacher: { full_name: initialName, staff_id: "", email: initialEmail, profile_photo: null },
    todaysClasses: [],
    specialEvents: [],
    urgentNoticeData: [],
    allNotices: [], // NEW: Store all notices for the dropdown
    stats: { totalClassesToday: 0, totalStudents: 0 }
  });

  const [isStudentsModalVisible, setStudentsModalVisible] = useState(false);
  const [teacherStudents, setTeacherStudents] = useState<any[]>([]);
  const [isStudentsLoading, setIsStudentsLoading] = useState(false);

  // NEW: State for the Notification Dropdown
  const [isNoticesVisible, setIsNoticesVisible] = useState(false);

  const [messages, setMessages] = useState<any[]>([]);

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      const fetchDashboardData = async () => {
        if (!initialEmail) return;
        setIsLoading(true);
        try {
          const timestamp = new Date().getTime();
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

      const fetchMessages = async () => {
        if (!initialEmail) return;
        try {
          const response = await fetch(`http://172.20.10.7:5000/api/messages/Teacher/${initialEmail}`);
          if (response.ok && isActive) {
            const data = await response.json();
            // Show only received messages that are unread
            const receivedUnread = data.filter((m: any) => m.unread && m.sender !== 'Me');
            setMessages(receivedUnread.slice(0, 3)); 
          }
        } catch (error) {
          console.error("Failed to fetch messages:", error);
        }
      };

      fetchDashboardData();
      fetchMessages();
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

  return (
    <SafeAreaView style={styles.safeArea}>
      <WatermarkOverlay />

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

            {/* NOTIFICATION BUTTON */}
            <TouchableOpacity style={styles.notificationButton} onPress={() => setIsNoticesVisible(true)}>
              <Ionicons name="notifications-outline" size={26} color="#1E293B" />
              {/* Dynamic Badge showing the count of notices */}
              {dashboardData.allNotices && dashboardData.allNotices.length > 0 && (
                <View style={styles.notificationBadge}>
                  <Text style={styles.badgeText}>{dashboardData.allNotices.length}</Text>
                </View>
              )}
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
              <TouchableOpacity style={styles.statBox} activeOpacity={0.7} onPress={handleOpenStudentsModal}>
                <View style={[styles.statIconBg, { backgroundColor: "#D1FAE5" }]}><FontAwesome6 name="users" size={16} color="#059669" /></View>
                <Text style={styles.statValue}>{dashboardData.stats.totalStudents}</Text>
                <Text style={styles.statLabel}>Total Students</Text>
              </TouchableOpacity>
            </View>

            {/* TODAY'S SCHEDULE */}
            <View style={styles.sectionHeaderNew}>
              <Text style={styles.sectionTitleNew}>{dashboardData.currentDay ? dashboardData.currentDay.toUpperCase() : "TODAY"}'S SCHEDULE</Text>
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

            {/* URGENT NOTICE */}
            {dashboardData.urgentNoticeData && dashboardData.urgentNoticeData.length > 0 && (
              dashboardData.urgentNoticeData.map((notice: any) => (
                <View key={notice.id} style={styles.urgentNoticeCard}>
                  <View style={styles.noticeHeader}>
                    <MaterialCommunityIcons name={notice.icon as any} size={28} color="#EF4444" />
                    <View style={styles.noticeTitleBlock}>
                      <Text style={styles.noticeType}>STAFF NOTICE</Text>
                      <Text style={styles.noticeTitle}>{notice.title}</Text>
                    </View>
                    <Text style={styles.noticeTime}>{notice.time}</Text>
                  </View>
                  <Text style={styles.noticeBody}>{notice.body}</Text>
                </View>
              ))
            )}

            {/* RECENT MESSAGES SECTION */}
            <View style={styles.sectionHeaderNew}>
              <Text style={styles.sectionTitleNew}>RECENT MESSAGES</Text>
              <TouchableOpacity onPress={() => router.push({ pathname: "/(teacher-tabs)/teacher-messages", params: getNavParams() as any })}>
                <Text style={styles.sectionLink}>Read All</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.messagesList}>
              {messages.length > 0 ? (
                messages.map((msg: any) => (
                  <TouchableOpacity 
                    key={msg.id} 
                    style={[styles.messageCard, msg.unread && styles.messageCardUnread]} 
                    onPress={() => router.push({ pathname: "/(teacher-tabs)/teacher-messages", params: getNavParams() as any })}
                    activeOpacity={0.7}
                  >
                    <View style={styles.messageIconBg}>
                      <MaterialCommunityIcons name={msg.other_role === 'SchoolAdmin' ? "bullhorn" : "account-school"} size={20} color="#2563EB" />
                    </View>
                    <View style={styles.messageInfo}>
                      <View style={styles.messageRowOne}>
                        <Text style={styles.messageSender}>{msg.sender}</Text>
                        <Text style={styles.messageTimeText}>{msg.time}</Text>
                        {msg.unread && <View style={styles.unreadDot} />}
                      </View>
                      <Text style={[styles.messageSnippet, msg.unread && styles.messageSnippetUnread]} numberOfLines={1}>{msg.snippet}</Text>
                    </View>
                  </TouchableOpacity>
                ))
              ) : (
                <Text style={{ textAlign: 'center', color: '#94A3B8', marginTop: 10, fontStyle: 'italic' }}>No recent messages</Text>
              )}
            </View>

            {/* LATEST SCHOOL NEWS SECTION */}
            <View style={styles.sectionHeaderNew}>
              <Text style={styles.sectionTitleNew}>LATEST SCHOOL NEWS</Text>
              <TouchableOpacity onPress={() => router.push("/(auth)/calendar")}>
                <Text style={styles.sectionLink}>View Calendar</Text>
              </TouchableOpacity>
            </View>

            <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} contentContainerStyle={styles.newsCarouselScroll}>
              {dashboardData.specialEvents && dashboardData.specialEvents.length > 0 ? (
                dashboardData.specialEvents.map((news: any) => (
                  <TouchableOpacity key={news.id} style={styles.newsCard} activeOpacity={0.9}>
                    <ImageBackground source={{ uri: news.image }} style={styles.newsImage} imageStyle={{ borderRadius: 16 }}>
                      <View style={styles.newsOverlay}>
                        <Text style={styles.newsDate}>{news.date}</Text>
                        <Text style={styles.newsTitle} numberOfLines={2}>{news.title}</Text>
                      </View>
                    </ImageBackground>
                  </TouchableOpacity>
                ))
              ) : (
                <View style={[styles.newsCard, { justifyContent: 'center', alignItems: 'center', backgroundColor: '#F1F5F9' }]}>
                   <Text style={{ color: '#64748B', fontStyle: 'italic' }}>No special events to display.</Text>
                </View>
              )}
            </ScrollView>

          </View>
        </ScrollView>
        
        {/* BOTTOM TAB BAR */}
        <View style={styles.bottomTabBar}>
          {[ 
            { icon: "home", label: "Home", route: "/(teacher-tabs)/teacher-screen" }, 
            { icon: "message-square", label: "Messages", route: "/(teacher-tabs)/teacher-messages" }, 
            { icon: "folder", label: "Materials", route: "/(teacher-tabs)/teacher-materials" },
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
                    router.navigate({ pathname: tab.route as any, params: (tab as any).params || getNavParams() });
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

        {/* --- MODAL FOR NOTIFICATIONS DROPDOWN --- */}
        <Modal
          visible={isNoticesVisible}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setIsNoticesVisible(false)}
        >
          <TouchableOpacity 
            style={styles.noticesOverlay} 
            activeOpacity={1} 
            onPress={() => setIsNoticesVisible(false)}
          >
            <View style={styles.noticesPopup}>
              <View style={styles.noticesPopupHeader}>
                <Text style={styles.noticesPopupTitle}>Notifications</Text>
                <TouchableOpacity onPress={() => setIsNoticesVisible(false)}>
                  <Feather name="x" size={20} color="#64748B" />
                </TouchableOpacity>
              </View>
              
              <ScrollView style={styles.noticesScroll} showsVerticalScrollIndicator={false}>
                {dashboardData.allNotices && dashboardData.allNotices.length > 0 ? (
                  dashboardData.allNotices.map((notice: any) => (
                    <View key={notice.id} style={styles.noticeListItem}>
                      <View style={styles.noticeListIcon}>
                        <FontAwesome6 name="bell" size={16} color={notice.priority === 'High' ? '#EF4444' : '#3B82F6'} />
                      </View>
                      <View style={styles.noticeListContent}>
                        <Text style={styles.noticeListTitle}>{notice.title}</Text>
                        <Text style={styles.noticeListBody} numberOfLines={2}>{notice.body}</Text>
                        <Text style={styles.noticeListTime}>{notice.time}</Text>
                      </View>
                    </View>
                  ))
                ) : (
                  <Text style={styles.noNoticesText}>No new notifications.</Text>
                )}
              </ScrollView>
            </View>
          </TouchableOpacity>
        </Modal>

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
  notificationBadge: { position: "absolute", top: 2, right: 2, width: 14, height: 14, borderRadius: 7, backgroundColor: "#EF4444", borderWidth: 1, borderColor: "#FFFFFF", justifyContent: 'center', alignItems: 'center' },
  badgeText: { color: '#FFFFFF', fontSize: 8, fontWeight: 'bold' },
  
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

  // News Carousel
  newsCarouselScroll: { paddingBottom: 10, marginBottom: 20 },
  newsCard: { width: width * 0.75, height: 160, marginRight: 15, borderRadius: 16, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 4 },
  newsImage: { width: "100%", height: "100%", justifyContent: "flex-end" },
  newsOverlay: { backgroundColor: "rgba(0,0,0,0.5)", padding: 15, borderBottomLeftRadius: 16, borderBottomRightRadius: 16 },
  newsDate: { color: "#E2E8F0", fontSize: 11, fontWeight: "600", marginBottom: 4 },
  newsTitle: { color: "#FFFFFF", fontSize: 16, fontWeight: "bold" },

  // Messages
  messagesList: { marginBottom: 20 },
  messageCard: { flexDirection: "row", alignItems: "center", backgroundColor: "#FFFFFF", padding: 15, borderRadius: 16, marginBottom: 10, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 1 },
  messageCardUnread: { backgroundColor: "#F8FAFC", borderLeftWidth: 3, borderLeftColor: "#2563EB" },
  messageIconBg: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#DBEAFE", justifyContent: "center", alignItems: "center", marginRight: 15 },
  messageInfo: { flex: 1 },
  messageRowOne: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
  messageSender: { fontSize: 14, fontWeight: "bold", color: "#1E293B" },
  messageTimeText: { fontSize: 11, color: "#9CA3AF" },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#2563EB", marginLeft: 5 },
  messageSnippet: { fontSize: 13, color: "#64748B" },
  messageSnippetUnread: { color: "#1E293B", fontWeight: "600" },

  // Bottom Tab Bar
  bottomTabBar: { flexDirection: "row", justifyContent: "space-around", backgroundColor: "#FFFFFF", paddingVertical: 12, paddingHorizontal: 20, borderTopWidth: 1, borderTopColor: "#E2E8F0", position: "absolute", bottom: 0, left: 0, right: 0 },
  tabItem: { alignItems: "center", flex: 1 }, 
  tabLabel: { fontSize: 10, marginTop: 4, fontWeight: "600" },

  // --- NEW: Notifications Dropdown Modal Styles ---
  noticesOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.2)' },
  noticesPopup: { position: 'absolute', top: 70, right: 20, width: width * 0.75, maxHeight: 400, backgroundColor: '#FFFFFF', borderRadius: 16, shadowColor: '#000', shadowOffset: {width: 0, height: 4}, shadowOpacity: 0.15, shadowRadius: 12, elevation: 8, overflow: 'hidden' },
  noticesPopupHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#F1F5F9', backgroundColor: '#F8FAFC' },
  noticesPopupTitle: { fontSize: 15, fontWeight: 'bold', color: '#1E293B' },
  noticesScroll: { paddingHorizontal: 10, paddingVertical: 5 },
  noticeListItem: { flexDirection: 'row', paddingVertical: 12, paddingHorizontal: 6, borderBottomWidth: 1, borderBottomColor: '#F8FAFC', gap: 12 },
  noticeListIcon: { marginTop: 2 },
  noticeListContent: { flex: 1 },
  noticeListTitle: { fontSize: 13, fontWeight: 'bold', color: '#1E293B', marginBottom: 3 },
  noticeListBody: { fontSize: 12, color: '#64748B', marginBottom: 6 },
  noticeListTime: { fontSize: 10, color: '#9CA3AF', fontWeight: '500' },
  noNoticesText: { textAlign: 'center', padding: 30, color: '#64748B', fontStyle: 'italic', fontSize: 13 },

  // Student Modal Styles
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