import React, { useState, useEffect } from "react";
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
import { useLocalSearchParams, useRouter } from "expo-router";

const { width } = Dimensions.get("window");

// --- Mock Data ---
const childProfiles = {
  "ST001": { name: "Arjun Perera", grade: "Grade 8-B", school: "Royal College", avatarUrl: null },
  "ST002": { name: "Fatima Ali", grade: "Grade 6-A", school: "St. Bridget's", avatarUrl: null },
};

// Detailed Academic Data for the Dashboard Overview
const childAcademics = {
  "ST001": {
    attendance: "92%",
    avgGrade: "A-",
    rank: "5th",
    term: "Term 2",
    subjects: [
      { name: "Mathematics", marks: 88, grade: "A" },
      { name: "Science", marks: 76, grade: "B" },
      { name: "English", marks: 92, grade: "A" },
      { name: "History", marks: 85, grade: "A" },
    ]
  },
  "ST002": {
    attendance: "98%",
    avgGrade: "A+",
    rank: "1st",
    term: "Term 2",
    subjects: [
      { name: "Mathematics", marks: 95, grade: "A" },
      { name: "Science", marks: 98, grade: "A" },
      { name: "English", marks: 94, grade: "A" },
      { name: "Geography", marks: 89, grade: "A" },
    ]
  }
};

const urgentNoticeData = {
  icon: "bullhorn", title: "Sports Meet Postponed", time: "2h ago",
  body: "Due to weather conditions, the Inter-House Sports Meet is rescheduled for Friday."
};

const upcomingEventData = { icon: "calendar-month", dateMonth: "OCT", dateDay: "20", dateYear: "2023", title: "PTA Meeting" };
const pendingPaymentData = { icon: "credit-card", status: "Due in 5 days", amount: "LKR 4,500.00" };

const latestNewsData = [
  { id: '1', title: "Annual Prize Giving 2023", date: "Nov 15", image: "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=500&q=80" },
  { id: '2', title: "New Science Lab Opening", date: "Nov 10", image: "https://images.unsplash.com/photo-1571260899304-4250708cb6ee?w=500&q=80" },
  { id: '3', title: "Inter-School Debating", date: "Nov 05", image: "https://images.unsplash.com/photo-1528605248644-14dd04022da1?w=500&q=80" },
];

export default function ParentDashboard() {
  const router = useRouter(); 
  const { full_name, email, child_ids, profile_photo_url } = useLocalSearchParams();
  
  const [childrenList, setChildrenList] = useState<string[]>([]);
  const [activeChildId, setActiveChildId] = useState<string | null>(null);

  const [messages, setMessages] = useState([
    { id: 1, icon: "account-school", sender: "Class Teacher", time: "10:30 AM", snippet: "Please check Arjun's Science project marks...", unread: true },
    { id: 2, icon: "bank", sender: "Accounts Office", time: "Yesterday", snippet: "Term 3 facility fees receipt is available...", unread: false },
    { id: 3, icon: "bullhorn", sender: "School Admin", time: "Oct 12", snippet: "Invitation: Annual Founder's Day Dinner", unread: true },
  ]);

  useEffect(() => {
    if (child_ids && typeof child_ids === 'string') {
      try {
        const parsedIds = JSON.parse(child_ids);
        setChildrenList(parsedIds);
        if (parsedIds.length > 0) setActiveChildId(parsedIds[0]);
      } catch (error) {
        console.error("Failed to parse child IDs", error);
      }
    }
  }, [child_ids]);

  const firstName = full_name ? (full_name as string).split(" ")[0] : "Parent";

  const handleReadMessage = (id: number) => {
    setMessages(messages.map(msg => msg.id === id ? { ...msg, unread: false } : msg));
  };

  const currentAcademics = activeChildId ? childAcademics[activeChildId as keyof typeof childAcademics] : null;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
          
          {/* HEADER SECTION */}
          <View style={styles.headerRowNew}>
            <View style={styles.headerLeft}>
              
              <TouchableOpacity 
                activeOpacity={0.7} 
                style={styles.avatarTouchTarget}
                onPress={() => {
                  router.push({
                    pathname: "/(parent-tabs)/parent-profile",
                    params: { full_name, email, child_ids, profile_photo_url }
                  });
                }}
              >
                {profile_photo_url && profile_photo_url !== "null" ? (
                  <Image source={{ uri: profile_photo_url as string }} style={styles.avatarHeader} />
                ) : (
                  <FontAwesome6 name="circle-user" size={46} color="#2563EB" />
                )}
              </TouchableOpacity>
              
              <View>
                <Text style={styles.greeting}>Hello, {firstName}</Text>
                <Text style={styles.subtext}>Parent Dashboard</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.notificationButton}>
              <Ionicons name="notifications-outline" size={26} color="#1E293B" />
              <View style={styles.notificationBadge} />
            </TouchableOpacity>
          </View>

          {/* DASHBOARD CONTENT */}
          {activeChildId ? (
            <View style={styles.dashboardContent}>
              
              {/* YOUR CHILDREN Switcher Section */}
              <View style={styles.sectionHeaderNew}>
                <Text style={styles.sectionTitleNew}>YOUR CHILDREN</Text>
                <TouchableOpacity><Text style={styles.sectionLink}>View All</Text></TouchableOpacity>
              </View>
              
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.switcherScroll}>
                {childrenList.map((id, index) => {
                  const isActive = activeChildId === id;
                  const profile = childProfiles[id as keyof typeof childProfiles] || { name: `Student ID: ${id}`, grade: "Linked Student", school: "School Connect", avatarUrl: null };
                  
                  return (
                    <TouchableOpacity 
                      key={index}
                      style={[styles.childCardNew, isActive ? styles.activeChildCardNew : styles.inactiveChildCardNew]}
                      // Smart Navigation Logic
                      onPress={() => {
                        if (isActive) {
                          router.push({
                            pathname: "/(parent-tabs)/child-details",
                            params: { 
                              studentId: id, 
                              studentName: profile.name, 
                              grade: profile.grade, 
                              school: profile.school,
                              avatarUrl: profile.avatarUrl || "null" 
                            }
                          });
                        } else {
                          setActiveChildId(id);
                        }
                      }}
                      activeOpacity={0.8}
                    >
                      {profile.avatarUrl ? (
                        <Image source={{ uri: profile.avatarUrl }} style={styles.childAvatar} />
                      ) : (
                        <View style={styles.childAvatarPlaceholder}>
                           <FontAwesome6 name="circle-user" size={40} color={isActive ? "#E0F2FE" : "#9CA3AF"} />
                        </View>
                      )}
                      
                      <View style={styles.childInfoText}>
                        <Text style={[styles.childNameNew, { color: isActive ? "#FFFFFF" : "#1E293B" }]} numberOfLines={1}>{profile.name}</Text>
                        <Text style={[styles.childSubInfo, { color: isActive ? "#E0F2FE" : "#64748B" }]} numberOfLines={1}>{`${profile.grade} • ID: ${id}`}</Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {/* ACADEMIC OVERVIEW SECTION */}
              {currentAcademics && (
                <View style={styles.academicSection}>
                  <View style={styles.sectionHeaderNew}>
                    <Text style={styles.sectionTitleNew}>ACADEMIC OVERVIEW</Text>
                    <TouchableOpacity 
                      onPress={() => {
                        const profile = childProfiles[activeChildId as keyof typeof childProfiles];
                        router.push({
                          pathname: "/(parent-tabs)/child-details",
                          params: { 
                            studentId: activeChildId, 
                            studentName: profile?.name || "Student", 
                            grade: profile?.grade || "", 
                            avatarUrl: profile?.avatarUrl || "null" 
                          }
                        });
                      }}
                    >
                      <Text style={styles.sectionLink}>Full Report</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Quick Stats Row */}
                  <View style={styles.statsContainer}>
                    <View style={styles.statBox}>
                      <View style={[styles.statIconBg, { backgroundColor: "#D1FAE5" }]}>
                        <FontAwesome6 name="calendar-check" size={16} color="#059669" />
                      </View>
                      <Text style={styles.statValue}>{currentAcademics.attendance}</Text>
                      <Text style={styles.statLabel}>Attendance</Text>
                    </View>
                    
                    <View style={styles.statBox}>
                      <View style={[styles.statIconBg, { backgroundColor: "#FEF3C7" }]}>
                        <FontAwesome6 name="star" size={16} color="#D97706" />
                      </View>
                      <Text style={styles.statValue}>{currentAcademics.avgGrade}</Text>
                      <Text style={styles.statLabel}>Avg Grade</Text>
                    </View>

                    <View style={styles.statBox}>
                      <View style={[styles.statIconBg, { backgroundColor: "#DBEAFE" }]}>
                        <FontAwesome6 name="trophy" size={16} color="#2563EB" />
                      </View>
                      <Text style={styles.statValue}>{currentAcademics.rank}</Text>
                      <Text style={styles.statLabel}>Class Rank</Text>
                    </View>
                  </View>

                  {/* Subject Marks Card */}
                  <View style={styles.marksCard}>
                    <View style={styles.marksHeader}>
                      <Text style={styles.marksTitle}>Recent Results ({currentAcademics.term})</Text>
                    </View>
                    {currentAcademics.subjects.map((sub, idx) => (
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

              {/* URGENT NOTICE section */}
              <View style={styles.urgentNoticeCard}>
                <View style={styles.noticeHeader}>
                  <MaterialCommunityIcons name={urgentNoticeData.icon as any} size={28} color="#EF4444" />
                  <View style={styles.noticeTitleBlock}>
                    <Text style={styles.noticeType}>URGENT NOTICE</Text>
                    <Text style={styles.noticeTitle}>{urgentNoticeData.title}</Text>
                  </View>
                  <Text style={styles.noticeTime}>{urgentNoticeData.time}</Text>
                </View>
                <Text style={styles.noticeBody}>{urgentNoticeData.body}</Text>
              </View>

              {/* UPCOMING & PENDING section */}
              <View style={styles.gridRow}>
                <View style={styles.gridCard}>
                  <View style={styles.gridCardHeader}>
                    <MaterialCommunityIcons name={upcomingEventData.icon as any} size={24} color="#2563EB" />
                    <Text style={styles.cardStatusLabel}>UPCOMING</Text>
                  </View>
                  <Text style={styles.eventDate}>{`${upcomingEventData.dateMonth} ${upcomingEventData.dateDay}, ${upcomingEventData.dateYear}`}</Text>
                  <Text style={styles.eventTitle}>{upcomingEventData.title}</Text>
                </View>

                <View style={styles.gridCard}>
                  <View style={styles.gridCardHeader}>
                    <MaterialCommunityIcons name={pendingPaymentData.icon as any} size={24} color="#D97706" />
                    <Text style={[styles.cardStatusLabel, { color: "#D97706" }]}>PENDING</Text>
                  </View>
                  <Text style={styles.paymentStatus}>{pendingPaymentData.status}</Text>
                  <Text style={styles.paymentAmount}>{pendingPaymentData.amount}</Text>
                </View>
              </View>

              {/* LATEST NEWS CAROUSEL */}
              <View style={styles.sectionHeaderNew}>
                <Text style={styles.sectionTitleNew}>LATEST SCHOOL NEWS</Text>
                <TouchableOpacity><Text style={styles.sectionLink}>View All</Text></TouchableOpacity>
              </View>
              <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} contentContainerStyle={styles.newsCarouselScroll}>
                {latestNewsData.map((news) => (
                  <TouchableOpacity key={news.id} style={styles.newsCard} activeOpacity={0.9}>
                    <ImageBackground source={{ uri: news.image }} style={styles.newsImage} imageStyle={{ borderRadius: 16 }}>
                      <View style={styles.newsOverlay}>
                        <Text style={styles.newsDate}>{news.date}</Text>
                        <Text style={styles.newsTitle} numberOfLines={2}>{news.title}</Text>
                      </View>
                    </ImageBackground>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* RECENT MESSAGES section */}
              <View style={styles.sectionHeaderNew}>
                <Text style={styles.sectionTitleNew}>RECENT MESSAGES</Text>
                <TouchableOpacity><Text style={styles.sectionLink}>Read All</Text></TouchableOpacity>
              </View>
              <View style={styles.messagesList}>
                {messages.map(msg => (
                  <TouchableOpacity 
                    key={msg.id} 
                    style={[styles.messageCard, msg.unread && styles.messageCardUnread]} 
                    onPress={() => handleReadMessage(msg.id)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.messageIconBg}>
                      <MaterialCommunityIcons name={msg.icon as any} size={20} color="#2563EB" />
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
                ))}
              </View>

            </View>
          ) : (
             <View style={styles.emptyState}>
              <FontAwesome6 name="folder-open" size={40} color="#CBD5E1" />
              <Text style={styles.emptyStateText}>No child accounts linked.</Text>
            </View>
          )}

        </ScrollView>
        
        {/* Bottom Tab Navigation */}
        <View style={styles.bottomTabBar}>
          {[ 
            { icon: "home", label: "Home" }, 
            { icon: "users", label: "Children" }, 
            { icon: "message-square", label: "Messages" }, 
            { icon: "calendar", label: "Calendar" }, 
            { icon: "info", label: "About Us" } 
          ].map((tab, index) => (
            <View key={index} style={styles.tabItem}>
              <Feather name={tab.icon as any} size={20} color={index === 0 ? "#2563EB" : "#64748B"} />
              <Text style={[styles.tabLabel, { color: index === 0 ? "#2563EB" : "#64748B" }]}>{tab.label}</Text>
            </View>
          ))}
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

  newsCarouselScroll: { paddingBottom: 10, marginBottom: 20 },
  newsCard: { width: width * 0.75, height: 160, marginRight: 15, borderRadius: 16, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 4 },
  newsImage: { width: "100%", height: "100%", justifyContent: "flex-end" },
  newsOverlay: { backgroundColor: "rgba(0,0,0,0.5)", padding: 15, borderBottomLeftRadius: 16, borderBottomRightRadius: 16 },
  newsDate: { color: "#E2E8F0", fontSize: 11, fontWeight: "600", marginBottom: 4 },
  newsTitle: { color: "#FFFFFF", fontSize: 16, fontWeight: "bold" },

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
  tabItem: { alignItems: "center" },
  tabLabel: { fontSize: 10, marginTop: 4, fontWeight: "600" }
});