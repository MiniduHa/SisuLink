import React, { useState, useEffect, useCallback } from "react";
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Dimensions,
  Image,
  ActivityIndicator,
  RefreshControl
} from "react-native";
import { FontAwesome6, Ionicons, MaterialCommunityIcons, Feather } from "@expo/vector-icons";
import WatermarkOverlay from "../../components/WatermarkOverlay";
import { useRouter, useLocalSearchParams, useFocusEffect } from "expo-router";

const { width } = Dimensions.get("window");

export default function IndustryScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const [companyName, setCompanyName] = useState((params.company_name as string) || "Industry Partner");
  const [email, setEmail] = useState((params.email as string) || "");
  const [logoUrl, setLogoUrl] = useState<string | null>((params.logo_url as string) || null);
  const [status, setStatus] = useState((params.status as string) || "Pending");

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [dashboardData, setDashboardData] = useState<any>({
    partner: {},
    stats: { activeJobs: 0, totalJobs: 0, applicants: 0, activeAnnouncements: 0 },
    jobs: [],
    announcements: []
  });

  const fetchDashboardData = async () => {
    if (!email) return;
    try {
      const response = await fetch(`http://172.20.10.7:5000/api/industry/${email}/dashboard`);
      if (response.ok) {
        const data = await response.json();
        setDashboardData(data);
        setCompanyName(data.partner.company_name);
        setLogoUrl(data.partner.logo_url);
        setStatus(data.partner.status);
      }
    } catch (error) {
      console.error("Failed to fetch industry dashboard:", error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchDashboardData();
    }, [email])
  );

  const onRefresh = () => {
    setIsRefreshing(true);
    fetchDashboardData();
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
      <ScrollView 
        contentContainerStyle={styles.scrollContent} 
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} colors={["#2563EB"]} />}
      >
        <View style={styles.header}>
          <View style={styles.userInfo}>
            <TouchableOpacity 
              style={styles.avatarPlaceholder} 
              activeOpacity={0.8}
              onPress={() => router.push({ pathname: "/(industry-tabs)/industry-profile", params: { company_name: companyName, email, logo_url: logoUrl || "null", status } })}
            >
              {logoUrl ? (
                <Image source={{ uri: logoUrl }} style={styles.avatarImage} />
              ) : (
                <Text style={styles.avatarText}>{companyName.charAt(0).toUpperCase()}</Text>
              )}
            </TouchableOpacity>
            <View>
              <Text style={styles.greeting}>Hello, {companyName}!</Text>
              <Text style={styles.statusText}>
                Account Status: <Text style={{ color: status === 'Active' ? '#16A34A' : '#EF4444', fontWeight: 'bold' }}>{status}</Text>
              </Text>
            </View>
          </View>
        </View>

        {status !== 'Active' && (
          <View style={styles.pendingBanner}>
            <Ionicons name="time" size={24} color="#92400E" />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.pendingTitle}>Account Pending Approval</Text>
              <Text style={styles.pendingSubtitle}>The Super Admin is reviewing your registration. You will be notified via email once approved.</Text>
            </View>
          </View>
        )}

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <View style={[styles.iconBox, { backgroundColor: '#DBEAFE' }]}>
              <FontAwesome6 name="briefcase" size={20} color="#2563EB" />
            </View>
            <Text style={styles.statValue}>{dashboardData.stats.activeJobs}</Text>
            <Text style={styles.statLabel}>Active Jobs</Text>
          </View>
          <View style={styles.statCard}>
            <View style={[styles.iconBox, { backgroundColor: '#FEF3C7' }]}>
              <FontAwesome6 name="bullhorn" size={20} color="#D97706" />
            </View>
            <Text style={styles.statValue}>{dashboardData.stats.activeAnnouncements || 0}</Text>
            <Text style={styles.statLabel}>Active Ann.</Text>
          </View>
          <View style={styles.statCard}>
            <View style={[styles.iconBox, { backgroundColor: '#F0FDF4' }]}>
              <Feather name="users" size={20} color="#16A34A" />
            </View>
            <Text style={styles.statValue}>{dashboardData.stats.applicants}</Text>
            <Text style={styles.statLabel}>Applicants</Text>
          </View>
        </View>

        {/* Recent Jobs */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>My Postings</Text>
          <TouchableOpacity onPress={() => router.push({ pathname: "/manage-jobs", params: { email } })}>
            <Text style={styles.linkText}>View All</Text>
          </TouchableOpacity>
        </View>

        {dashboardData.jobs.length > 0 ? (
          dashboardData.jobs.slice(0, 3).map((job: any) => (
            <TouchableOpacity 
              key={job.id} 
              style={styles.jobCard}
              onPress={() => router.push({ pathname: "/manage-jobs", params: { email } })}
              activeOpacity={0.8}
            >
              <View style={styles.jobInfo}>
                <Text style={styles.jobTitle}>{job.title}</Text>
                <Text style={styles.jobDetails}>{job.location} • {job.employment_type}</Text>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: job.status === 'Active' ? '#DCFCE7' : '#F1F5F9' }]}>
                <Text style={[styles.statusBadgeText, { color: job.status === 'Active' ? '#16A34A' : '#64748B' }]}>{job.status}</Text>
              </View>
            </TouchableOpacity>
          ))
        ) : (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="briefcase-outline" size={48} color="#CBD5E1" />
            <Text style={styles.emptyText}>You haven't posted any jobs yet.</Text>
            <TouchableOpacity 
              style={[styles.emptyBtn, status !== 'Active' && { backgroundColor: '#94A3B8' }]} 
              onPress={() => status === 'Active' ? router.push({ pathname: "/manage-jobs", params: { email } }) : alert("Account pending approval.")}
              activeOpacity={0.8}
            >
              <Text style={styles.emptyBtnText}>Post your first job</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Recent Announcements */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>My Announcements</Text>
          <TouchableOpacity onPress={() => router.push({ pathname: "/manage-announcements", params: { email } })}>
            <Text style={styles.linkText}>View All</Text>
          </TouchableOpacity>
        </View>

        {dashboardData.announcements && dashboardData.announcements.length > 0 ? (
          dashboardData.announcements.slice(0, 3).map((ann: any) => (
            <TouchableOpacity 
              key={ann.id} 
              style={[styles.jobCard, { borderLeftColor: '#F59E0B' }]}
              onPress={() => router.push({ pathname: "/manage-announcements", params: { email } })}
              activeOpacity={0.8}
            >
              <View style={styles.jobInfo}>
                <Text style={styles.jobTitle}>{ann.title}</Text>
                <Text style={styles.jobDetails}>{ann.type} • {ann.target_school_id === null ? "All Schools" : ann.target_school_id}</Text>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: ann.status === 'Active' ? '#DCFCE7' : ann.status === 'Pending' ? '#FEF9C3' : '#FEE2E2' }]}>
                <Text style={[styles.statusBadgeText, { color: ann.status === 'Active' ? '#16A34A' : ann.status === 'Pending' ? '#CA8A04' : '#EF4444' }]}>{ann.status}</Text>
              </View>
            </TouchableOpacity>
          ))
        ) : (
          <View style={[styles.emptyState, { marginTop: 10 }]}>
            <MaterialCommunityIcons name="bullhorn-outline" size={48} color="#CBD5E1" />
            <Text style={styles.emptyText}>No announcements posted.</Text>
            <TouchableOpacity 
              style={[styles.emptyBtn, status !== 'Active' && { backgroundColor: '#94A3B8' }]} 
              onPress={() => status === 'Active' ? router.push({ pathname: "/manage-announcements", params: { email } }) : alert("Account pending approval.")}
              activeOpacity={0.8}
            >
              <Text style={styles.emptyBtnText}>Post Announcement</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  scrollContent: { paddingHorizontal: 20, paddingTop: 60, paddingBottom: 40 },
  header: { marginBottom: 30 },
  userInfo: { flexDirection: "row", alignItems: "center" },
  avatarPlaceholder: { width: 56, height: 56, borderRadius: 28, backgroundColor: "#2563EB", justifyContent: "center", alignItems: "center", marginRight: 16, overflow: "hidden" },
  avatarImage: { width: "100%", height: "100%", resizeMode: "cover" },
  avatarText: { color: "#FFFFFF", fontSize: 20, fontWeight: "bold" },
  greeting: { fontSize: 22, fontWeight: "bold", color: "#1E293B", marginBottom: 4 },
  statusText: { fontSize: 13, color: "#64748B" },
  statsGrid: { flexDirection: 'row', gap: 16, marginBottom: 32 },
  statCard: { flex: 1, backgroundColor: "#FFFFFF", borderRadius: 20, padding: 20, elevation: 2 },
  iconBox: { width: 40, height: 40, borderRadius: 12, justifyContent: "center", alignItems: "center", marginBottom: 12 },
  statValue: { fontSize: 24, fontWeight: "bold", color: "#1E293B", marginBottom: 4 },
  statLabel: { fontSize: 12, color: "#64748B", fontWeight: "600" },
  sectionTitle: { fontSize: 18, fontWeight: "bold", color: "#1E293B", marginBottom: 16 },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16, marginTop: 8 },
  linkText: { fontSize: 14, fontWeight: "600", color: "#3B82F6" },
  actionRow: { flexDirection: 'row', gap: 20, marginBottom: 32 },
  actionBtn: { alignItems: 'center' },
  actionIcon: { width: 56, height: 56, borderRadius: 16, justifyContent: "center", alignItems: "center", marginBottom: 8, elevation: 4 },
  actionLabel: { fontSize: 12, fontWeight: "700", color: "#475569" },
  jobCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#FFFFFF', padding: 16, borderRadius: 16, marginBottom: 12, borderLeftWidth: 4, borderLeftColor: '#2563EB', elevation: 1 },
  jobInfo: { flex: 1 },
  jobTitle: { fontSize: 15, fontWeight: "bold", color: "#1E293B", marginBottom: 4 },
  jobDetails: { fontSize: 12, color: "#64748B" },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusBadgeText: { fontSize: 11, fontWeight: "bold" },
  emptyState: { alignItems: 'center', padding: 40, backgroundColor: '#FFFFFF', borderRadius: 24, marginTop: 10 },
  emptyText: { marginTop: 16, fontSize: 14, color: '#64748B', textAlign: 'center' },
  emptyBtn: { marginTop: 20, backgroundColor: '#2563EB', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12 },
  emptyBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 14 },
  pendingBanner: {
    backgroundColor: "#FEF3C7",
    borderWidth: 1,
    borderColor: "#FDE68A",
    borderRadius: 20,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  pendingTitle: { fontSize: 15, fontWeight: "bold", color: "#92400E", marginBottom: 2 },
  pendingSubtitle: { fontSize: 12, color: "#B45309", lineHeight: 18 },
});
