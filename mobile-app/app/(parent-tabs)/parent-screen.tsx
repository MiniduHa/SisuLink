import React, { useState, useEffect, useCallback } from "react";
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Dimensions,
  Image,
  ImageBackground,
  ActivityIndicator
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context"; 
import { FontAwesome6, Ionicons, MaterialCommunityIcons, Feather } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter, useFocusEffect } from "expo-router";
import WatermarkOverlay from "../../components/WatermarkOverlay";


const { width } = Dimensions.get("window");

let globalEmailCache = ""; 

export default function ParentDashboard() {
  const router = useRouter(); 
  const params = useLocalSearchParams();
  
  if (params.email) globalEmailCache = params.email as string;
  const userEmail = globalEmailCache;

  const [isLoading, setIsLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState<any>({
    parent: {
      full_name: (params.full_name as string) || "Parent",
      email: userEmail,
      profile_photo: (params.profile_photo_url as string) || null
    },
    children: [],
    urgentNotices: [],
    specialEvents: []
  });

  const userName = dashboardData.parent.full_name;

  const [activeChildId, setActiveChildId] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);

  useFocusEffect(
    useCallback(() => {
      let isActive = true;
      const fetchDashboardData = async () => {
        if (!userEmail) return;
        // Notice: We DO NOT set isLoading(true) here anymore, 
        // so it won't flash when changing tabs! It updates silently.
        try {
          const timestamp = new Date().getTime();
          const response = await fetch(`http://172.20.10.7:5000/api/parent/${userEmail}/dashboard?t=${timestamp}`);
          if (response.ok && isActive) {
            const data = await response.json();
            setDashboardData(data);
            if (data.children && data.children.length > 0 && !activeChildId) {
              setActiveChildId(data.children[0].studentId);
            }
          }
        } catch (error) {
          console.error("Failed to fetch parent dashboard data:", error);
        } finally {
          if (isActive) setIsLoading(false);
        }
      };

      const fetchMessages = async () => {
        if (!userEmail) return;
        try {
          const response = await fetch(`http://172.20.10.7:5000/api/messages/Parent/${userEmail}`);
          if (response.ok && isActive) {
            const data = await response.json();
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
    }, [userEmail])
  );

  const currentAcademics = activeChildId ? (dashboardData.children || []).find((c: any) => c.studentId === activeChildId)?.academics : null;

  const getNavParams = () => ({
    email: dashboardData.parent.email || userEmail, 
    full_name: dashboardData.parent.full_name || "Parent",
    profile_photo_url: dashboardData.parent.profile_photo || "null",
    child_ids: JSON.stringify(dashboardData.children?.map((c: any) => c.studentId) || [])
  });

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <WatermarkOverlay />

      <View style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
          
          <View style={styles.headerRowNew}>
            <View style={styles.headerLeft}>
              <TouchableOpacity 
                activeOpacity={0.7} 
                style={styles.avatarTouchTarget}
                onPress={() => router.push({ pathname: "/(parent-tabs)/parent-profile", params: getNavParams() as any })}
              >
                {dashboardData.parent.profile_photo && dashboardData.parent.profile_photo !== "null" ? (
                  <Image source={{ uri: dashboardData.parent.profile_photo }} style={styles.avatarHeader} />
                ) : (
                  <FontAwesome6 name="circle-user" size={46} color="#2563EB" />
                )}
              </TouchableOpacity>
              <View>
                <Text style={styles.greeting}>Hello, {(dashboardData.parent.full_name || "Parent").split(" ")[0]}</Text>
                <Text style={styles.subtext}>Welcome back</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.notificationButton}>
              <Ionicons name="notifications-outline" size={26} color="#1E293B" />
              <View style={styles.notificationBadge} />
            </TouchableOpacity>
          </View>

          {activeChildId ? (
            <View style={styles.dashboardContent}>
              
              <View style={styles.sectionHeaderNew}>
                <Text style={styles.sectionTitleNew}>YOUR CHILDREN</Text>
                <TouchableOpacity><Text style={styles.sectionLink}>View All</Text></TouchableOpacity>
              </View>
              
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.switcherScroll}>
                {(dashboardData.children || []).map((child: any, index: number) => {
                  const isActive = activeChildId === child.studentId;
                  return (
                    <TouchableOpacity 
                      key={index}
                      style={[styles.childCardNew, isActive ? styles.activeChildCardNew : styles.inactiveChildCardNew]}
                      onPress={() => {
                        if (isActive) {
                          router.push({
                            pathname: "/(parent-tabs)/child-details",
                            params: { studentId: child.studentId, studentName: child.name, grade: child.class }
                          });
                        } else {
                          setActiveChildId(child.studentId);
                        }
                      }}
                      activeOpacity={0.8}
                    >
                      <View style={styles.childAvatarPlaceholder}>
                          <FontAwesome6 name="circle-user" size={40} color={isActive ? "#E0F2FE" : "#9CA3AF"} />
                      </View>
                      <View style={styles.childInfoText}>
                        <Text style={[styles.childNameNew, { color: isActive ? "#FFFFFF" : "#1E293B" }]} numberOfLines={1}>{child.name}</Text>
                        <Text style={[styles.childSubInfo, { color: isActive ? "#E0F2FE" : "#64748B" }]} numberOfLines={1}>{`${child.class} • ID: ${child.studentId}`}</Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {currentAcademics && (
                <View style={styles.academicSection}>
                  <View style={styles.sectionHeaderNew}>
                    <Text style={styles.sectionTitleNew}>ACADEMIC OVERVIEW</Text>
                    <TouchableOpacity onPress={() => {
                      if (!activeChildId) return;
                      const child = (dashboardData.children || []).find((c: any) => c.studentId === activeChildId);
                      router.push({ pathname: "/(parent-tabs)/child-details", params: { studentId: activeChildId, studentName: child?.name || "Student", grade: child?.class || "", avatarUrl: "null" } })
                    }}>
                      <Text style={styles.sectionLink}>Full Report</Text>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.statsContainer}>
                    <View style={styles.statBox}>
                      <View style={[styles.statIconBg, { backgroundColor: "#D1FAE5" }]}><FontAwesome6 name="calendar-check" size={16} color="#059669" /></View>
                      <Text style={styles.statValue}>{currentAcademics.attendance}</Text>
                      <Text style={styles.statLabel}>Attendance</Text>
                    </View>
                    <View style={styles.statBox}>
                      <View style={[styles.statIconBg, { backgroundColor: "#FEF3C7" }]}><FontAwesome6 name="star" size={16} color="#D97706" /></View>
                      <Text style={styles.statValue}>{currentAcademics.avgGrade}</Text>
                      <Text style={styles.statLabel}>Avg Grade</Text>
                    </View>
                    <View style={styles.statBox}>
                      <View style={[styles.statIconBg, { backgroundColor: "#DBEAFE" }]}><FontAwesome6 name="trophy" size={16} color="#2563EB" /></View>
                      <Text style={styles.statValue}>{currentAcademics.rank}</Text>
                      <Text style={styles.statLabel}>Class Rank</Text>
                    </View>
                  </View>

                  <View style={styles.marksCard}>
                    <View style={styles.marksHeader}>
                      <Text style={styles.marksTitle}>Recent Results ({currentAcademics.term})</Text>
                    </View>
                    {currentAcademics.subjects.map((sub: any, idx: number) => (
                      <View key={idx}>
                        <View style={styles.subjectRow}>
                          <Text style={styles.subjectName}>{sub.name}</Text>
                          <View style={styles.scoreBlock}>
                            <Text style={styles.subjectMarks}>{sub.marks}%</Text>
                            <View style={[styles.gradeBadge, { backgroundColor: sub.grade === 'A' || sub.grade === 'A+' ? '#D1FAE5' : '#EFF6FF' }]}>
                              <Text style={[styles.gradeText, { color: sub.grade === 'A' || sub.grade === 'A+' ? '#059669' : '#2563EB' }]}>{sub.grade}</Text>
                            </View>
                          </View>
                        </View>
                        {idx < currentAcademics.subjects.length - 1 && <View style={styles.subjectDivider} />}
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {dashboardData.urgentNotices && dashboardData.urgentNotices.length > 0 && dashboardData.urgentNotices.map((notice: any) => (
                <View key={notice.id} style={styles.urgentNoticeCard}>
                  <View style={styles.noticeHeader}>
                    <MaterialCommunityIcons name={notice.icon as any} size={28} color="#EF4444" />
                    <View style={styles.noticeTitleBlock}>
                      <Text style={styles.noticeType}>URGENT NOTICE</Text>
                      <Text style={styles.noticeTitle}>{notice.title}</Text>
                    </View>
                    <Text style={styles.noticeTime}>{notice.time}</Text>
                  </View>
                  <Text style={styles.noticeBody}>{notice.body}</Text>
                </View>
              ))}

              {/* LATEST SCHOOL NEWS */}
              <View style={styles.sectionHeaderNew}>
                <Text style={styles.sectionTitleNew}>LATEST SCHOOL NEWS</Text>
                <TouchableOpacity onPress={() => router.push("/(auth)/calendar")}>
                  <Text style={styles.sectionLink}>View Calendar</Text>
                </TouchableOpacity>
              </View>

              <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 10, marginBottom: 20 }}>
                {dashboardData.specialEvents && dashboardData.specialEvents.length > 0 ? (
                  dashboardData.specialEvents.map((news: any) => (
                    <TouchableOpacity key={news.id} style={[styles.gridCard, { width: width * 0.75, height: 160, marginRight: 15, padding: 0, overflow: 'hidden' }]} activeOpacity={0.9}>
                      <ImageBackground source={{ uri: news.image }} style={{ width: "100%", height: "100%", justifyContent: "flex-end" }}>
                        <View style={{ backgroundColor: "rgba(0,0,0,0.5)", padding: 15 }}>
                          <Text style={{ color: "#E2E8F0", fontSize: 11, fontWeight: "600", marginBottom: 4 }}>{news.date}</Text>
                          <Text style={{ color: "#FFFFFF", fontSize: 16, fontWeight: "bold" }} numberOfLines={2}>{news.title}</Text>
                        </View>
                      </ImageBackground>
                    </TouchableOpacity>
                  ))
                ) : (
                  <View style={[styles.gridCard, { width: width * 0.75, height: 160, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F1F5F9' }]}>
                    <Text style={{ color: '#64748B', fontStyle: 'italic' }}>No special events to display.</Text>
                  </View>
                )}
              </ScrollView>

              <View style={styles.gridRow}>
                <View style={styles.gridCard}>
                  <View style={styles.gridCardHeader}>
                    <MaterialCommunityIcons name="calendar-month" size={24} color="#2563EB" />
                    <Text style={styles.cardStatusLabel}>UPCOMING</Text>
                  </View>
                  <Text style={styles.eventDate}>OCT 20, 2026</Text>
                  <Text style={styles.eventTitle}>PTA Meeting</Text>
                </View>
                <View style={styles.gridCard}>
                  <View style={styles.gridCardHeader}>
                    <MaterialCommunityIcons name="credit-card" size={24} color="#D97706" />
                    <Text style={[styles.cardStatusLabel, { color: "#D97706" }]}>PENDING</Text>
                  </View>
                  <Text style={styles.paymentStatus}>Due in 5 days</Text>
                  <Text style={styles.paymentAmount}>LKR 4,500.00</Text>
                </View>
              </View>

              <View style={styles.sectionHeaderNew}>
                <Text style={styles.sectionTitleNew}>RECENT MESSAGES</Text>
                <TouchableOpacity onPress={() => router.push({ pathname: "/(parent-tabs)/parent-messages", params: getNavParams() as any })}>
                  <Text style={styles.sectionLink}>Read All</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.messagesList}>
                {messages.length > 0 ? (
                  messages.map((msg: any) => (
                    <TouchableOpacity 
                      key={msg.id} 
                      style={[styles.messageCard, msg.unread && styles.messageCardUnread]} 
                      onPress={() => router.push({ pathname: "/(parent-tabs)/parent-messages", params: { ...params, email: userEmail, full_name: userName } as any })}
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
                  <Text style={{ textAlign: 'center', color: '#94A3B8', marginTop: 10 }}>No recent messages</Text>
                )}
              </View>

            </View>
          ) : (
             <View style={styles.emptyState}>
              <FontAwesome6 name="folder-open" size={40} color="#CBD5E1" />
              <Text style={styles.emptyStateText}>No child accounts linked.</Text>
            </View>
          )}

        </ScrollView>
        
        {/* BOTTOM TAB BAR */}
        <View style={styles.bottomTabBar}>
          {[ 
            { icon: "home", label: "Home", route: "/(parent-tabs)/parent-screen" }, 
            { icon: "message-square", label: "Messages", route: "/(parent-tabs)/parent-messages" }, 
            { icon: "calendar", label: "Calendar", route: "/(auth)/calendar" }, 
            { icon: "info", label: "About Us", route: "/(auth)/about-us" } 
          ].map((tab: any, index: number) => {
            const isActive = index === 0; 
            return (
              <TouchableOpacity 
                key={index} 
                style={styles.tabItem}
                onPress={() => {
                  if (tab.route && !isActive) {
                    router.navigate({ pathname: tab.route as any, params: getNavParams() as any });
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
  headerRowNew: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 24, paddingTop: 10, paddingBottom: 20, borderBottomWidth: 1, borderBottomColor: "#E2E8F0" },
  headerLeft: { flexDirection: "row", alignItems: "center" },
  avatarTouchTarget: { marginRight: 15, justifyContent: 'center', alignItems: 'center' },
  avatarHeader: { width: 48, height: 48, borderRadius: 24 }, 
  greeting: { fontSize: 22, fontWeight: "bold", color: "#1E293B" },
  subtext: { fontSize: 13, color: "#64748B", marginTop: 3 },
  notificationButton: { padding: 5, position: "relative" },
  notificationBadge: { position: "absolute", top: 5, right: 6, width: 10, height: 10, borderRadius: 5, backgroundColor: "#EF4444", borderWidth: 2, borderColor: "#F8FAFC" },
  dashboardContent: { paddingHorizontal: 24, marginTop: 20 },
  sectionHeaderNew: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 15, marginTop: 10 },
  sectionTitleNew: { fontSize: 13, fontWeight: "800", color: "#9CA3AF", letterSpacing: 0.5 },
  sectionLink: { fontSize: 13, color: "#2563EB", fontWeight: "600" },
  switcherScroll: { paddingBottom: 10, overflow: 'visible', marginBottom: 15 },
  childCardNew: { flexDirection: "row", alignItems: "center", padding: 15, borderRadius: 20, marginRight: 15, width: width * 0.70, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 5, elevation: 3 },
  activeChildCardNew: { backgroundColor: "#2B8CEE" },
  inactiveChildCardNew: { backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E2E8F0" },
  childAvatar: { width: 45, height: 45, borderRadius: 22.5, marginRight: 12 },
  childAvatarPlaceholder: { width: 45, height: 45, borderRadius: 22.5, marginRight: 12, justifyContent: "center", alignItems: "center" },
  childInfoText: { flex: 1 },
  childNameNew: { fontSize: 16, fontWeight: "bold" },
  childSubInfo: { fontSize: 12, marginTop: 3, fontWeight: "500" },
  academicSection: { marginBottom: 25 },
  statsContainer: { flexDirection: "row", justifyContent: "space-between", marginBottom: 15 },
  statBox: { flex: 1, backgroundColor: "#FFFFFF", paddingVertical: 15, paddingHorizontal: 10, borderRadius: 16, alignItems: "center", marginHorizontal: 4, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  statIconBg: { width: 36, height: 36, borderRadius: 18, justifyContent: "center", alignItems: "center", marginBottom: 8 },
  statValue: { fontSize: 18, fontWeight: "bold", color: "#1E293B" },
  statLabel: { fontSize: 11, color: "#64748B", marginTop: 4, fontWeight: "600" },
  marksCard: { backgroundColor: "#FFFFFF", borderRadius: 16, padding: 20, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  marksHeader: { marginBottom: 15 },
  marksTitle: { fontSize: 15, fontWeight: "bold", color: "#1E293B" },
  subjectRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 8 },
  subjectName: { fontSize: 14, color: "#475569", fontWeight: "500", flex: 1 },
  scoreBlock: { flexDirection: "row", alignItems: "center" },
  subjectMarks: { fontSize: 14, fontWeight: "bold", color: "#1E293B", marginRight: 10 },
  gradeBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  gradeText: { fontSize: 12, fontWeight: "bold" },
  subjectDivider: { height: 1, backgroundColor: "#F1F5F9", marginVertical: 4 },
  urgentNoticeCard: { backgroundColor: "#FEF2F2", padding: 20, borderRadius: 20, marginBottom: 25, shadowColor: "#EF4444", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 10, elevation: 4 },
  noticeHeader: { flexDirection: "row", alignItems: "flex-start", marginBottom: 15 },
  noticeTitleBlock: { flex: 1, paddingHorizontal: 12 },
  noticeType: { fontSize: 12, fontWeight: "bold", color: "#EF4444", letterSpacing: 0.5 },
  noticeTitle: { fontSize: 16, fontWeight: "800", color: "#1E293B", marginTop: 3 },
  noticeTime: { fontSize: 11, color: "#9CA3AF" },
  noticeBody: { fontSize: 13, color: "#475569", lineHeight: 20, fontWeight: "500" },
  gridRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 25 },
  gridCard: { flex: 0.48, backgroundColor: "#FFFFFF", padding: 20, borderRadius: 20, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  gridCardHeader: { flexDirection: "row", alignItems: "center", marginBottom: 15, justifyContent: "space-between" },
  cardStatusLabel: { fontSize: 11, fontWeight: "bold", color: "#2563EB", letterSpacing: 0.5 },
  eventDate: { fontSize: 12, fontWeight: "500", color: "#64748B" },
  eventTitle: { fontSize: 16, fontWeight: "800", color: "#1E293B", marginTop: 5 },
  paymentStatus: { fontSize: 12, fontWeight: "500", color: "#64748B" },
  paymentAmount: { fontSize: 16, fontWeight: "800", color: "#1E293B", marginTop: 5 },
  messagesList: { marginBottom: 20 },
  messageCard: { flexDirection: "row", alignItems: "center", backgroundColor: "#FFFFFF", padding: 15, borderRadius: 20, marginBottom: 15, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  messageCardUnread: { backgroundColor: "#F8FAFC", borderColor: "#E0F2FE", borderWidth: 1 },
  messageIconBg: { width: 36, height: 36, borderRadius: 18, backgroundColor: "#EFF6FF", justifyContent: "center", alignItems: "center", marginRight: 15 },
  messageInfo: { flex: 1 },
  messageRowOne: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  messageSender: { fontSize: 14, fontWeight: "bold", color: "#1E293B" },
  messageTimeText: { fontSize: 11, color: "#9CA3AF" },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#2563EB", marginLeft: 5 },
  messageSnippet: { fontSize: 12, color: "#64748B", marginTop: 3 },
  messageSnippetUnread: { color: "#1E293B", fontWeight: "600" },
  emptyState: { alignItems: "center", justifyContent: "center", marginTop: 60 },
  emptyStateText: { marginTop: 12, fontSize: 15, color: "#64748B", fontWeight: "500" },
  bottomTabBar: { flexDirection: "row", justifyContent: "space-around", backgroundColor: "#FFFFFF", paddingVertical: 12, paddingHorizontal: 20, borderTopWidth: 1, borderTopColor: "#E2E8F0", position: "absolute", bottom: 0, left: 0, right: 0 },
  tabItem: { alignItems: "center", flex: 1 }, 
  tabLabel: { fontSize: 10, marginTop: 4, fontWeight: "600" }
});