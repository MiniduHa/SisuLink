import React, { useState, useEffect, useCallback } from "react";
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Dimensions,
  Modal,
  Platform,
  Image,
  ImageBackground,
  ActivityIndicator
} from "react-native";
import { FontAwesome6, Ionicons, MaterialCommunityIcons, Feather } from "@expo/vector-icons";
import WatermarkOverlay from "../../components/WatermarkOverlay";

import { useRouter, useLocalSearchParams, useFocusEffect } from "expo-router";

const { width } = Dimensions.get("window");

export default function StudentScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

  // --- DYNAMIC STUDENT DATA STATES ---
  const [firstName, setFirstName] = useState((params.first_name as string) || "Student");
  const [lastName, setLastName] = useState((params.last_name as string) || "");
  const [email, setEmail] = useState((params.email as string) || "");
  const [gradeLevel, setGradeLevel] = useState((params.grade as string) || "Grade 11");
  const [profilePhoto, setProfilePhoto] = useState<string | null>((params.profile_photo as string) || null);
  
  const studentId = (params.studentId as string) || "";

  const avatarInitials = (firstName[0] + (lastName[0] || "")).toUpperCase();
  const isALevel = gradeLevel.includes("12") || gradeLevel.includes("13");
  const academicLevel = isALevel ? "A/L" : "O/L";

  // --- DASHBOARD DATA STATES ---
  const [isLoading, setIsLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState<any>({
    ongoingSubjects: [],
    gradesData: [],
    internshipsData: [],
    attendanceStats: { percentage: "0%", status: "Loading...", message: "", present: 0, absent: 0 },
    specialEvents: [],
    urgentNoticeData: [],
    allNotices: [],
    industryAnnouncements: []
  });
  const [allMaterials, setAllMaterials] = useState<any[]>([]);

  const [messages, setMessages] = useState<any[]>([]);

  // --- FETCH LATEST DATA EVERY TIME SCREEN APPEARS ---
  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      const fetchAllData = async () => {
        if (!studentId) return;
        setIsLoading(true);
        try {
          const timestamp = new Date().getTime();
          const profileRes = fetch(`http://172.20.10.7:5000/api/profile/${studentId}?t=${timestamp}`);
          const dashboardRes = fetch(`http://172.20.10.7:5000/api/student/${studentId}/dashboard?t=${timestamp}`);
          const materialsRes = fetch(`http://172.20.10.7:5000/api/student/${studentId}/materials?t=${timestamp}`);
          
          const [profileResponse, dashboardResponse, materialsResponse] = await Promise.all([
            profileRes, 
            dashboardRes,
            materialsRes
          ]);

          if (profileResponse.ok && dashboardResponse.ok && materialsResponse.ok && isActive) {
            const profileData = await profileResponse.json();
            const dashData = await dashboardResponse.json();
            const materialsData = await materialsResponse.json();
            
            setFirstName(profileData.first_name);
            setLastName(profileData.last_name);
            setEmail(profileData.email);
            setGradeLevel(profileData.grade_level);
            if (profileData.profile_photo_url) setProfilePhoto(profileData.profile_photo_url);
            setDashboardData(dashData);
            setAllMaterials(materialsData);
          }
        } catch (error) {
          console.error("Failed to fetch dashboard data:", error);
        } finally {
          if (isActive) setIsLoading(false);
        }
      };

      const fetchMessages = async () => {
        if (!email) return;
        try {
          const response = await fetch(`http://172.20.10.7:5000/api/messages/Student/${email}`);
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

      fetchAllData();
      fetchMessages();
      return () => { isActive = false; };
    }, [studentId, email])
  );

  // --- UI STATES ---
  const [greeting, setGreeting] = useState("");
  const [currentDate, setCurrentDate] = useState("");
  const [isAttendanceModalVisible, setAttendanceModalVisible] = useState(false);
  const [isSubjectModalVisible, setSubjectModalVisible] = useState(false);
  const [isNoticesVisible, setIsNoticesVisible] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState<any>(null);

  useEffect(() => {
    const date = new Date();
    const hour = date.getHours();
    if (hour < 12) setGreeting("Good morning");
    else if (hour < 18) setGreeting("Good afternoon");
    else setGreeting("Good evening");

    const days = ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"];
    const months = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
    setCurrentDate(`${days[date.getDay()]}, ${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`);
  }, []);

  // Filter materials for the selected subject
  const currentSubjectVideos = allMaterials.filter(m => m.subject === selectedSubject?.name && (m.material_type === 'Video' || m.material_type?.toLowerCase().includes('video')));
  const currentSubjectNotes = allMaterials.filter(m => m.subject === selectedSubject?.name && (m.material_type === 'Note' || m.material_type === 'PDF' || m.material_type?.toLowerCase().includes('note') || m.material_type?.toLowerCase().includes('pdf')));
  const currentSubjectGeneral = allMaterials.filter(m => m.subject === selectedSubject?.name && !currentSubjectVideos.includes(m) && !currentSubjectNotes.includes(m));

  const calendarDays = [
    { day: 28, type: 'prev', status: 'none' }, { day: 29, type: 'prev', status: 'none' }, { day: 30, type: 'prev', status: 'none' },
    { day: 1, type: 'current', status: 'present' }, { day: 2, type: 'current', status: 'present' }, { day: 3, type: 'current', status: 'absent' }, { day: 4, type: 'current', status: 'present' },
    { day: 5, type: 'current', status: 'none' }, { day: 6, type: 'current', status: 'present', selected: true }, { day: 7, type: 'current', status: 'none' }, { day: 8, type: 'current', status: 'present' }, { day: 9, type: 'current', status: 'present' }, { day: 10, type: 'current', status: 'present' }, { day: 11, type: 'current', status: 'none' },
  ];

  const openSubject = (subject: any) => {
    setSelectedSubject(subject);
    setSubjectModalVisible(true);
  };

  if (isLoading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#2563EB" />
        <Text style={{ marginTop: 10, color: "#64748B" }}>Loading Dashboard...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <WatermarkOverlay />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        
        <View style={styles.header}>
          <View style={styles.userInfo}>
            <TouchableOpacity 
              style={styles.avatarPlaceholder}
              onPress={() => router.push({
                pathname: "/student-profile",
                params: { 
                  first_name: firstName, 
                  last_name: lastName, 
                  grade: gradeLevel, 
                  attendance: dashboardData.attendanceStats.percentage, 
                  email: email,      
                  studentId: studentId,
                  profile_photo: profilePhoto || ""
                }
              })}
              activeOpacity={0.8}
            >
              {profilePhoto && profilePhoto.length > 5 ? (
                <Image key={profilePhoto} source={{ uri: profilePhoto }} style={styles.avatarImage} />
              ) : (
                <Text style={styles.avatarText}>{avatarInitials}</Text>
              )}
            </TouchableOpacity>

            <View>
              <Text style={styles.greeting}>{greeting}, {firstName}!</Text>
              <Text style={styles.dateText}>{currentDate} • {academicLevel}</Text>
            </View>
          </View>
          <TouchableOpacity 
            style={styles.notificationBtn} 
            activeOpacity={0.8}
            onPress={() => setIsNoticesVisible(true)}
          >
            <Ionicons name="notifications" size={20} color="#2563EB" />
            {dashboardData.allNotices && dashboardData.allNotices.length > 0 && (
              <View style={styles.notificationDot}>
                 <Text style={styles.notificationDotText}>{dashboardData.allNotices.length}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.attendanceCard}>
          <Text style={styles.sectionSubtitle}>Attendance Overview</Text>
          <View style={styles.attendanceRow}>
            <View style={styles.attendanceLeft}>
              <Text style={styles.attendancePercentage}>{dashboardData.attendanceStats.percentage}</Text>
              <Text style={styles.attendanceStatus}>{dashboardData.attendanceStats.status}</Text>
            </View>
            <TouchableOpacity onPress={() => setAttendanceModalVisible(true)}>
              <FontAwesome6 name="calendar-check" size={20} color="#3B82F6" />
            </TouchableOpacity>
          </View>
          <Text style={styles.attendanceFooter}>{dashboardData.attendanceStats.message}</Text>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>On Going Subjects</Text>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.subjectsScroll}>
          {dashboardData.ongoingSubjects.map((item: any) => (
            <TouchableOpacity key={item.id} style={[styles.subjectCard, { backgroundColor: item.bg }]} onPress={() => openSubject(item)} activeOpacity={0.9}>
              <View style={[styles.subjectIconBox, { backgroundColor: item.color + '20' }]}> 
                {item.icon === "sigma" ? ( <MaterialCommunityIcons name="sigma" size={28} color={item.color} /> ) : ( <FontAwesome6 name={item.icon} size={22} color={item.color} /> )}
              </View>
              <Text style={styles.subjectCardTitle} numberOfLines={2}>{item.name}</Text>
              <Text style={styles.subjectCardTeacher}>{item.teacher}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* URGENT NOTICE */}
        {dashboardData.urgentNoticeData && dashboardData.urgentNoticeData.length > 0 && (
          dashboardData.urgentNoticeData.map((notice: any) => (
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
          ))
        )}

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Messages</Text>
          <TouchableOpacity onPress={() => router.push({ pathname: "/(student-tabs)/student-messages", params: { email: email, first_name: firstName, last_name: lastName } as any })}><Text style={styles.linkText}>View All</Text></TouchableOpacity>
        </View>

        <View style={styles.messagesContainer}>
          {messages.length > 0 ? (
            messages.map((msg: any) => (
              <TouchableOpacity 
                key={msg.id} 
                style={[styles.messageCard, msg.unread && styles.messageCardUnread]} 
                onPress={() => router.push({ pathname: "/(student-tabs)/student-messages", params: { email: email, first_name: firstName, last_name: lastName } as any })}
              >
                <View style={styles.messageIconBg}>
                  <MaterialCommunityIcons name={msg.other_role === 'SchoolAdmin' ? "bullhorn" : "account-school"} size={22} color="#2563EB" />
                </View>
                <View style={styles.messageInfo}>
                  <View style={styles.messageRow}>
                    <Text style={styles.messageSender}>{msg.sender}</Text>
                    <Text style={styles.messageTime}>{msg.time}</Text>
                  </View>
                  <Text style={styles.messageSnippet} numberOfLines={1}>{msg.snippet}</Text>
                </View>
              </TouchableOpacity>
            ))
          ) : (
            <Text style={{ textAlign: 'center', color: '#94A3B8', fontStyle: 'italic', marginVertical: 10 }}>No recent messages</Text>
          )}
        </View>

        {/* LATEST SCHOOL NEWS SECTION */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Latest School News</Text>
          <TouchableOpacity onPress={() => router.push("/calendar")}>
            <Text style={styles.linkText}>View All</Text>
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

        <View style={[styles.sectionHeader, { marginTop: 24 }]}>
          <Text style={styles.sectionTitle}>Latest Grades</Text>
          <TouchableOpacity onPress={() => router.push("/grades")}><Text style={styles.linkText}>View Report</Text></TouchableOpacity>
        </View>

        {dashboardData.gradesData.map((item: any) => (
          <View key={item.id} style={styles.gradeCard}>
            <View style={styles.gradeInfoLeft}>
              <View style={[styles.gradeIconContainer, { backgroundColor: item.iconBg }]}>
                {item.icon === "sigma" ? ( <MaterialCommunityIcons name="sigma" size={24} color={item.iconColor} /> ) : ( <FontAwesome6 name={item.icon} size={18} color={item.iconColor} /> )}
              </View>
              <View><Text style={styles.subjectName}>{item.subject}</Text><Text style={styles.assessmentType}>{item.type}</Text></View>
            </View>
            <View style={styles.gradeInfoRight}>
              <View style={[styles.gradeBadge, { backgroundColor: item.gradeBg }]}><Text style={[styles.gradeBadgeText, { color: item.gradeColor }]}>{item.grade}</Text></View>
              <FontAwesome6 name={item.trend} size={14} color={item.trendColor} style={{ marginLeft: 8 }} />
            </View>
          </View>
        ))}

        {/* INDUSTRY ANNOUNCEMENTS SECTION */}
        <View style={[styles.sectionHeader, { marginTop: 10 }]}>
          <Text style={styles.sectionTitle}>Industry Announcements</Text>
        </View>

        <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} contentContainerStyle={styles.newsCarouselScroll}>
          {dashboardData.industryAnnouncements && dashboardData.industryAnnouncements.length > 0 ? (
            dashboardData.industryAnnouncements.map((ann: any) => (
              <TouchableOpacity key={ann.id} style={styles.newsCard} activeOpacity={0.9}>
                <ImageBackground source={{ uri: ann.cover_photo || "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=500&q=80" }} style={styles.newsImage} imageStyle={{ borderRadius: 16 }}>
                  <View style={styles.newsOverlay}>
                    <Text style={styles.newsDate}>{new Date(ann.created_at).toLocaleDateString()}</Text>
                    <Text style={styles.newsTitle} numberOfLines={2}>{ann.title}</Text>
                    <Text style={{color: '#E2E8F0', fontSize: 12, marginTop: 4}}>{ann.company_name} • {ann.type}</Text>
                  </View>
                </ImageBackground>
              </TouchableOpacity>
            ))
          ) : (
            <View style={[styles.newsCard, { justifyContent: 'center', alignItems: 'center', backgroundColor: '#F1F5F9' }]}>
               <Text style={{ color: '#64748B', fontStyle: 'italic' }}>No industry announcements.</Text>
            </View>
          )}
        </ScrollView>

        <View style={[styles.sectionHeader, { marginTop: 10 }]}>
          <Text style={styles.sectionTitle}>Recommended Internships</Text>
          <TouchableOpacity onPress={() => router.push("/jobs")}><Text style={styles.linkText}>See All</Text></TouchableOpacity>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.internshipScroll}>
          {dashboardData.internshipsData.map((item: any) => (
            <View key={item.id} style={[styles.internshipCard, { backgroundColor: item.bg }]}>
              <View style={styles.internshipTopRow}>
                <View style={styles.companyLogoPlaceholder}><Text style={styles.companyInitial}>{item.company.charAt(0)}</Text></View>
                <View style={styles.typeBadge}><Text style={styles.typeBadgeText}>{item.type}</Text></View>
              </View>
              <Text style={styles.internshipTitle} numberOfLines={2}>{item.title}</Text>
              <Text style={styles.internshipCompany} numberOfLines={1}>{item.company}</Text>
              <TouchableOpacity style={styles.applyButton} activeOpacity={0.8} onPress={() => router.push("/jobs")}><Text style={styles.applyButtonText}>Apply Now</Text></TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      </ScrollView>

      {/* --- SUBJECT MATERIALS MODAL --- */}
      <Modal animationType="slide" transparent={false} visible={isSubjectModalVisible} onRequestClose={() => setSubjectModalVisible(false)}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setSubjectModalVisible(false)} style={styles.modalBackButton}>
              <FontAwesome6 name="arrow-left" size={20} color="#1E293B" />
            </TouchableOpacity>
            <Text style={styles.modalHeaderTitle} numberOfLines={1}>{selectedSubject?.name} Materials</Text>
            <View style={{ width: 36 }}></View>
          </View>

          <ScrollView contentContainerStyle={styles.modalScrollContent} showsVerticalScrollIndicator={false}>
            <View style={[styles.subjectBanner, { backgroundColor: selectedSubject?.bg || '#EFF6FF' }]}>
               <View style={[styles.bannerIconBox, { backgroundColor: selectedSubject?.color || '#2563EB' }]}>
                  {selectedSubject?.icon === "sigma" ? (
                    <MaterialCommunityIcons name="sigma" size={32} color="#FFFFFF" />
                  ) : (
                    <FontAwesome6 name={selectedSubject?.icon || "book"} size={26} color="#FFFFFF" />
                  )}
               </View>
               <View style={{ flex: 1 }}>
                  <Text style={styles.bannerTitle}>{selectedSubject?.name}</Text>
                  <Text style={styles.bannerTeacher}>Taught by {selectedSubject?.teacher}</Text>
               </View>
            </View>

            {currentSubjectVideos.length > 0 && (
              <View style={styles.materialSection}>
                <View style={styles.materialSectionHeader}>
                  <Feather name="video" size={18} color="#1E293B" />
                  <Text style={styles.materialSectionTitle}>Video Lectures</Text>
                </View>
                {currentSubjectVideos.map(video => (
                  <View key={video.id} style={styles.materialItem}>
                    <View style={styles.materialItemIconBox}><FontAwesome6 name="play" size={14} color="#EF4444" /></View>
                    <View style={styles.materialItemInfo}>
                      <Text style={styles.materialItemTitle}>{video.title}</Text>
                      <Text style={styles.materialItemSub}>{video.teacher_name || 'Teacher'}</Text>
                    </View>
                    <TouchableOpacity style={styles.actionIconButton}><FontAwesome6 name="circle-play" size={22} color="#2563EB" /></TouchableOpacity>
                  </View>
                ))}
              </View>
            )}

            {currentSubjectNotes.length > 0 && (
              <View style={styles.materialSection}>
                <View style={styles.materialSectionHeader}>
                  <Feather name="file-text" size={18} color="#1E293B" />
                  <Text style={styles.materialSectionTitle}>Study Notes & PDFs</Text>
                </View>
                {currentSubjectNotes.map(note => (
                  <View key={note.id} style={styles.materialItem}>
                    <View style={[styles.materialItemIconBox, { backgroundColor: '#EFF6FF' }]}><FontAwesome6 name="file-pdf" size={14} color="#2563EB" /></View>
                    <View style={styles.materialItemInfo}>
                      <Text style={styles.materialItemTitle}>{note.title}</Text>
                      <Text style={styles.materialItemSub}>{note.teacher_name || 'Teacher'}</Text>
                    </View>
                    <TouchableOpacity style={styles.actionIconButton}><FontAwesome6 name="download" size={20} color="#2563EB" /></TouchableOpacity>
                  </View>
                ))}
              </View>
            )}

            {currentSubjectGeneral.length > 0 && (
              <View style={styles.materialSection}>
                <View style={styles.materialSectionHeader}>
                  <Feather name="layers" size={18} color="#1E293B" />
                  <Text style={styles.materialSectionTitle}>Other Resources</Text>
                </View>
                {currentSubjectGeneral.map(item => (
                  <View key={item.id} style={styles.materialItem}>
                    <View style={[styles.materialItemIconBox, { backgroundColor: '#F8FAFC' }]}><FontAwesome6 name="box-archive" size={14} color="#64748B" /></View>
                    <View style={styles.materialItemInfo}>
                      <Text style={styles.materialItemTitle}>{item.title}</Text>
                      <Text style={styles.materialItemSub}>{item.material_type} • {item.teacher_name || 'Teacher'}</Text>
                    </View>
                    <TouchableOpacity style={styles.actionIconButton}><FontAwesome6 name="link" size={20} color="#2563EB" /></TouchableOpacity>
                  </View>
                ))}
              </View>
            )}

            {currentSubjectVideos.length === 0 && currentSubjectNotes.length === 0 && currentSubjectGeneral.length === 0 && (
              <View style={{ padding: 40, alignItems: 'center' }}>
                <MaterialCommunityIcons name="folder-open-outline" size={64} color="#CBD5E1" />
                <Text style={{ marginTop: 16, color: '#64748B', fontSize: 16, fontWeight: '600' }}>No materials shared yet</Text>
                <Text style={{ marginTop: 4, color: '#94A3B8', fontSize: 14, textAlign: 'center' }}>Your teacher hasn't uploaded any resources for this subject yet.</Text>
              </View>
            )}
          </ScrollView>
        </View>
      </Modal>

      {/* --- ATTENDANCE MODAL --- */}
      <Modal animationType="slide" transparent={false} visible={isAttendanceModalVisible} onRequestClose={() => setAttendanceModalVisible(false)}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setAttendanceModalVisible(false)} style={styles.modalBackButton}>
              <FontAwesome6 name="arrow-left" size={20} color="#1E293B" />
            </TouchableOpacity>
            <Text style={styles.modalHeaderTitle}>Attendance Details</Text>
            <View style={{ width: 36 }}></View>
          </View>

          <ScrollView contentContainerStyle={styles.modalScrollContent} showsVerticalScrollIndicator={false}>
            <View style={styles.statsRow}>
              <View style={[styles.statCard, { backgroundColor: "#F0F9FF", flex: 1.2 }]}>
                <Text style={styles.statLabel}>Total Attendance</Text>
                <View style={styles.statValueRow}>
                  <Text style={styles.statValue}>{dashboardData.attendanceStats.percentage}</Text>
                  <Text style={styles.statTrend}>+2%</Text>
                </View>
              </View>
              <View style={[styles.statCard, { flex: 1 }]}><Text style={styles.statLabel}>Present</Text><Text style={styles.statValue}>{dashboardData.attendanceStats.present}</Text></View>
              <View style={[styles.statCard, { flex: 1 }]}><Text style={styles.statLabel}>Absent</Text><Text style={styles.statValue}>{dashboardData.attendanceStats.absent}</Text></View>
            </View>

            <View style={styles.calendarWidget}>
              <View style={styles.calendarHeader}>
                <FontAwesome6 name="chevron-left" size={14} color="#1E293B" /><Text style={styles.calendarMonth}>October 2023</Text><FontAwesome6 name="chevron-right" size={14} color="#1E293B" />
              </View>
              <View style={styles.calendarGrid}>
                {calendarDays.map((item, index) => (
                  <View key={index} style={styles.calendarCell}>
                    <View style={[styles.dayNumberCircle, item.selected && styles.dayNumberSelected]}>
                      <Text style={[styles.dayNumberText, item.type === 'prev' && styles.dayNumberPrev, item.selected && styles.dayNumberTextSelected]}>{item.day}</Text>
                    </View>
                    {item.status === 'present' && <View style={[styles.statusDot, { backgroundColor: '#16A34A' }]} />}
                    {item.status === 'absent' && <View style={[styles.statusDot, { backgroundColor: '#EF4444' }]} />}
                  </View>
                ))}
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* --- NOTIFICATIONS DROPDOWN MODAL --- */}
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  scrollContent: { paddingHorizontal: 20, paddingTop: 60, paddingBottom: 100 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 24 },
  userInfo: { flexDirection: "row", alignItems: "center" },
  avatarPlaceholder: { width: 48, height: 48, borderRadius: 24, backgroundColor: "#2563EB", justifyContent: "center", alignItems: "center", marginRight: 12, overflow: "hidden" },
  avatarImage: { width: "100%", height: "100%", resizeMode: "cover" },
  avatarText: { color: "#FFFFFF", fontSize: 16, fontWeight: "bold" },
  greeting: { fontSize: 20, fontWeight: "bold", color: "#1E293B", marginBottom: 2 },
  dateText: { fontSize: 10, fontWeight: "700", color: "#64748B", letterSpacing: 0.5 },
  notificationBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: "#FFFFFF", justifyContent: "center", alignItems: "center", elevation: 2 },
  notificationDot: { position: "absolute", top: 2, right: 2, width: 14, height: 14, borderRadius: 7, backgroundColor: "#EF4444", borderWidth: 1.5, borderColor: "#FFFFFF", justifyContent: 'center', alignItems: 'center' },
  notificationDotText: { color: '#FFFFFF', fontSize: 8, fontWeight: 'bold' },
  attendanceCard: { backgroundColor: "#FFFFFF", borderRadius: 20, padding: 20, marginBottom: 30, elevation: 3 },
  sectionSubtitle: { fontSize: 14, fontWeight: "600", color: "#475569", marginBottom: 8 },
  attendanceRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  attendanceLeft: { flexDirection: "row", alignItems: "baseline" },
  attendancePercentage: { fontSize: 36, fontWeight: "900", color: "#2563EB", marginRight: 8 },
  attendanceStatus: { fontSize: 14, fontWeight: "700", color: "#16A34A" },
  attendanceFooter: { fontSize: 12, color: "#94A3B8" },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  sectionTitle: { fontSize: 18, fontWeight: "bold", color: "#1E293B" },
  linkText: { fontSize: 14, fontWeight: "600", color: "#3B82F6" },
  subjectsScroll: { paddingBottom: 10, gap: 16 },
  subjectCard: { width: width * 0.4, borderRadius: 16, padding: 16, marginRight: 16 },
  subjectIconBox: { width: 48, height: 48, borderRadius: 12, justifyContent: "center", alignItems: "center", marginBottom: 16 },
  subjectCardTitle: { fontSize: 15, fontWeight: "bold", color: "#1E293B", marginBottom: 4 },
  subjectCardTeacher: { fontSize: 12, color: "#64748B" },
  gradeCard: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: "#FFFFFF", borderRadius: 16, padding: 16, marginBottom: 12, elevation: 2 },
  gradeInfoLeft: { flexDirection: "row", alignItems: "center" },
  gradeIconContainer: { width: 44, height: 44, borderRadius: 12, justifyContent: "center", alignItems: "center", marginRight: 12 },
  subjectName: { fontSize: 15, fontWeight: "bold", color: "#1E293B", marginBottom: 2 },
  assessmentType: { fontSize: 12, color: "#94A3B8" },
  gradeInfoRight: { flexDirection: "row", alignItems: "center" },
  gradeBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  gradeBadgeText: { fontWeight: "800", fontSize: 14 },
  internshipScroll: { paddingBottom: 20, gap: 16 },
  internshipCard: { width: width * 0.65, borderRadius: 20, padding: 20, marginRight: 16 },
  internshipTopRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 },
  companyLogoPlaceholder: { width: 40, height: 40, borderRadius: 8, backgroundColor: "#0F172A", justifyContent: "center", alignItems: "center" },
  companyInitial: { color: "#FFFFFF", fontSize: 18, fontWeight: "bold" },
  typeBadge: { backgroundColor: "#3B82F6", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  typeBadgeText: { color: "#FFFFFF", fontSize: 10, fontWeight: "bold" },
  internshipTitle: { fontSize: 16, fontWeight: "bold", color: "#1E293B", marginBottom: 4 },
  internshipCompany: { fontSize: 12, color: "#64748B", marginBottom: 20 },
  applyButton: { backgroundColor: "#2563EB", paddingVertical: 12, borderRadius: 10, alignItems: "center" },
  applyButtonText: { color: "#FFFFFF", fontWeight: "bold", fontSize: 14 },
  messagesContainer: { marginBottom: 10 },
  messageCard: { flexDirection: "row", alignItems: "center", backgroundColor: "#FFFFFF", padding: 16, borderRadius: 16, marginBottom: 12, elevation: 1 },
  messageCardUnread: { borderLeftWidth: 4, borderLeftColor: "#2563EB" },
  messageIconBg: { width: 44, height: 44, borderRadius: 12, backgroundColor: "#DBEAFE", justifyContent: "center", alignItems: "center", marginRight: 12 },
  messageInfo: { flex: 1 },
  messageRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
  messageSender: { fontSize: 15, fontWeight: "bold", color: "#1E293B" },
  messageTime: { fontSize: 11, color: "#9CA3AF" },
  messageSnippet: { fontSize: 13, color: "#64748B" },
  modalContainer: { flex: 1, backgroundColor: "#F8FAFC" },
  modalScrollContent: { padding: 20, paddingBottom: 60 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, paddingTop: Platform.OS === 'ios' ? 50 : 40, paddingBottom: 16, backgroundColor: "#FFFFFF", borderBottomWidth: 1, borderBottomColor: "#E2E8F0" },
  modalBackButton: { padding: 8, marginLeft: -8, width: 36 },
  modalHeaderTitle: { fontSize: 18, fontWeight: "bold", color: "#1E293B", flex: 1, textAlign: "center" },
  subjectBanner: { flexDirection: "row", alignItems: "center", padding: 20, borderRadius: 16, marginBottom: 24 },
  bannerIconBox: { width: 60, height: 60, borderRadius: 16, justifyContent: "center", alignItems: "center", marginRight: 16 },
  bannerTitle: { fontSize: 18, fontWeight: "bold", color: "#1E293B", marginBottom: 4 },
  bannerTeacher: { fontSize: 13, color: "#475569" },
  materialSection: { marginBottom: 24 },
  materialSectionHeader: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  materialSectionTitle: { fontSize: 16, fontWeight: "bold", color: "#1E293B", marginLeft: 8 },
  materialItem: { flexDirection: "row", alignItems: "center", backgroundColor: "#FFFFFF", padding: 16, borderRadius: 12, marginBottom: 8, elevation: 1 },
  materialItemIconBox: { width: 40, height: 40, borderRadius: 10, backgroundColor: "#FEF2F2", justifyContent: "center", alignItems: "center", marginRight: 12 },
  materialItemInfo: { flex: 1, marginRight: 12 },
  materialItemTitle: { fontSize: 14, fontWeight: "600", color: "#1E293B", marginBottom: 4 },
  materialItemSub: { fontSize: 12, color: "#64748B" },
  downloadButton: { width: 36, height: 36, borderRadius: 18, backgroundColor: "#EFF6FF", justifyContent: "center", alignItems: "center" },
  actionIconButton: { padding: 4 },
  statsRow: { flexDirection: "row", gap: 10, marginBottom: 24 },
  statCard: { backgroundColor: "#FFFFFF", borderRadius: 16, padding: 16, elevation: 2 },
  statLabel: { fontSize: 12, fontWeight: "600", color: "#64748B", marginBottom: 8 },
  statValueRow: { flexDirection: "row", alignItems: "baseline", gap: 6 },
  statValue: { fontSize: 24, fontWeight: "900", color: "#1E293B" },
  statTrend: { fontSize: 12, fontWeight: "bold", color: "#16A34A" },
  calendarWidget: { backgroundColor: "#FFFFFF", borderRadius: 20, padding: 20, marginBottom: 24, elevation: 3 },
  calendarHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  calendarMonth: { fontSize: 16, fontWeight: "bold", color: "#1E293B" },
  calendarGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" },
  calendarCell: { width: `${100 / 7}%`, alignItems: "center", marginBottom: 16 },
  dayNumberCircle: { width: 30, height: 30, borderRadius: 15, justifyContent: "center", alignItems: "center", marginBottom: 4 },
  dayNumberSelected: { backgroundColor: "#DBEAFE" },
  dayNumberText: { fontSize: 14, fontWeight: "700", color: "#1E293B" },
  dayNumberPrev: { color: "#CBD5E1" },
  dayNumberTextSelected: { color: "#2563EB" },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  
  // Urgent Notice
  urgentNoticeCard: { backgroundColor: "#FEF2F2", padding: 20, borderRadius: 20, marginBottom: 25, shadowColor: "#EF4444", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 10, elevation: 4, marginTop: 10 },
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

  // Notifications Popover
  noticesOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.2)' },
  noticesPopup: { position: 'absolute', top: 110, right: 20, width: width * 0.75, maxHeight: 400, backgroundColor: '#FFFFFF', borderRadius: 16, shadowColor: '#000', shadowOffset: {width: 0, height: 4}, shadowOpacity: 0.15, shadowRadius: 12, elevation: 8, overflow: 'hidden' },
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
});