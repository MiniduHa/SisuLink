import React, { useState } from "react";
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  TextInput,
  Modal,
  Platform,
  Alert
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { FontAwesome6, Feather, Ionicons } from "@expo/vector-icons";
import WatermarkOverlay from "../../components/WatermarkOverlay";


export default function JobsScreen() {
  // --- STATES ---
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIndustry, setSelectedIndustry] = useState("All");
  const [selectedJob, setSelectedJob] = useState<any>(null);
  const [isJobModalVisible, setJobModalVisible] = useState(false);

  // --- MOCK DATA ---
  const industries = ["All", "IT/Software", "Design", "Marketing", "Business", "Engineering"];

  const [jobsData, setJobsData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  React.useEffect(() => {
    fetchJobs();
  }, []);

  const fetchJobs = async () => {
    try {
      const response = await fetch("http://172.20.10.7:5000/api/student/jobs");
      if (response.ok) {
        const data = await response.json();
        setJobsData(data.map((job: any) => ({
          ...job,
          industry: job.industry_type || "General", // Mapping backend field if different
          logoColor: job.bg_color || "#3B82F6",
          postedAt: "Recently" // Simplifying for now
        })));
      }
    } catch (error) {
      console.error("Failed to fetch jobs:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // --- FILTERING LOGIC ---
  const filteredJobs = jobsData.filter(job => {
    const matchesIndustry = selectedIndustry === "All" || job.industry === selectedIndustry;
    const matchesSearch = job.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          job.company_name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesIndustry && matchesSearch;
  });

  // --- HANDLERS ---
  const openJobDetails = (job: any) => {
    setSelectedJob(job);
    setJobModalVisible(true);
  };

  const handleApply = () => {
    // In a real app, this would send an API request to submit the student's resume
    Alert.alert(
      "Application Submitted! 🎉", 
      `Your profile and resume have been sent to ${selectedJob?.company}. Good luck!`,
      [{ text: "OK", onPress: () => setJobModalVisible(false) }]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <WatermarkOverlay />

      
      {/* HEADER */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Jobs & Internships</Text>
        <TouchableOpacity style={styles.savedIconBtn}>
          <Feather name="bookmark" size={22} color="#1E293B" />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        
        {/* SEARCH BAR */}
        <View style={styles.searchContainer}>
          <Feather name="search" size={20} color="#94A3B8" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search roles, companies..."
            placeholderTextColor="#94A3B8"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery("")} style={styles.clearIcon}>
              <Feather name="x-circle" size={18} color="#94A3B8" />
            </TouchableOpacity>
          )}
        </View>

        {/* INDUSTRY FILTERS */}
        <View style={styles.filterWrapper}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
            {industries.map((industry) => (
              <TouchableOpacity
                key={industry}
                style={[styles.filterChip, selectedIndustry === industry && styles.filterChipActive]}
                onPress={() => setSelectedIndustry(industry)}
              >
                <Text style={[styles.filterText, selectedIndustry === industry && styles.filterTextActive]}>
                  {industry}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* JOBS LIST */}
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.jobsList}>
          {filteredJobs.length === 0 ? (
            <View style={styles.emptyState}>
              <FontAwesome6 name="magnifying-glass-minus" size={40} color="#CBD5E1" style={{ marginBottom: 16 }} />
              <Text style={styles.emptyStateText}>No jobs found matching your criteria.</Text>
            </View>
          ) : (
            filteredJobs.map((job) => (
              <TouchableOpacity 
                key={job.id} 
                style={styles.jobCard} 
                activeOpacity={0.8}
                onPress={() => openJobDetails(job)}
              >
                <View style={styles.jobCardHeader}>
                  <View style={[styles.companyLogo, { backgroundColor: job.logoColor }]}>
                    <Text style={styles.companyLogoText}>{job.company_name.charAt(0)}</Text>
                  </View>
                  <View style={styles.jobCardInfo}>
                    <Text style={styles.jobTitle} numberOfLines={1}>{job.title}</Text>
                    <Text style={styles.jobCompany}>{job.company_name}</Text>
                  </View>
                  <TouchableOpacity style={styles.bookmarkBtn}>
                    <Feather name="bookmark" size={18} color="#94A3B8" />
                  </TouchableOpacity>
                </View>

                <View style={styles.jobTagsRow}>
                  <View style={styles.jobTag}>
                    <Feather name="map-pin" size={12} color="#64748B" style={{ marginRight: 4 }} />
                    <Text style={styles.jobTagText}>{job.location}</Text>
                  </View>
                  <View style={styles.jobTag}>
                    <Feather name="briefcase" size={12} color="#64748B" style={{ marginRight: 4 }} />
                    <Text style={styles.jobTagText}>{job.type}</Text>
                  </View>
                </View>

                <View style={styles.jobCardFooter}>
                  <Text style={styles.postedText}>{job.postedAt}</Text>
                  <Text style={styles.viewDetailsText}>View Details</Text>
                </View>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      </View>

      {/* ======================================================= */}
      {/* JOB DETAILS MODAL                                       */}
      {/* ======================================================= */}
      <Modal
        animationType="slide"
        transparent={false}
        visible={isJobModalVisible}
        onRequestClose={() => setJobModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          
          {/* Modal Header */}
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setJobModalVisible(false)} style={styles.modalBackButton}>
              <FontAwesome6 name="arrow-left" size={20} color="#1E293B" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalHeaderIcon}>
              <Feather name="bookmark" size={22} color="#1E293B" />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.modalScrollContent} showsVerticalScrollIndicator={false}>
            
            {/* Job Header Info */}
            <View style={styles.modalJobHeader}>
              <View style={[styles.modalCompanyLogo, { backgroundColor: selectedJob?.logoColor || '#3B82F6' }]}>
                <Text style={styles.modalCompanyLogoText}>{selectedJob?.company_name?.charAt(0)}</Text>
              </View>
              <Text style={styles.modalJobTitle}>{selectedJob?.title}</Text>
              <Text style={styles.modalJobCompany}>{selectedJob?.company_name}</Text>
              
              <View style={styles.modalTagsRow}>
                <View style={styles.modalTag}>
                  <Text style={styles.modalTagText}>{selectedJob?.location}</Text>
                </View>
                <View style={styles.modalTag}>
                  <Text style={styles.modalTagText}>{selectedJob?.type}</Text>
                </View>
                <View style={styles.modalTag}>
                  <Text style={styles.modalTagText}>{selectedJob?.industry}</Text>
                </View>
              </View>
              <Text style={styles.modalPostedText}>Posted {selectedJob?.postedAt}</Text>
            </View>

            <View style={styles.modalDivider} />

            {/* Job Description */}
            <Text style={styles.sectionTitle}>Job Description</Text>
            <Text style={styles.bodyText}>{selectedJob?.description}</Text>

            {/* Requirements */}
            <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Requirements</Text>
            <View style={styles.requirementsList}>
              {typeof selectedJob?.requirements === 'string' ? (
                <Text style={styles.bodyText}>{selectedJob.requirements}</Text>
              ) : selectedJob?.requirements?.map((req: string, index: number) => (
                <View key={index} style={styles.requirementBullet}>
                  <View style={styles.bulletDot} />
                  <Text style={styles.bodyText}>{req}</Text>
                </View>
              ))}
            </View>

            {/* Company Info Placeholder */}
            <View style={styles.aboutCompanyCard}>
              <Text style={styles.aboutCompanyTitle}>About {selectedJob?.company_name}</Text>
              <Text style={styles.aboutCompanyText}>
                We are an industry leader committed to innovation and nurturing young talent. Join us to build your career and make a global impact.
              </Text>
            </View>

          </ScrollView>

          {/* Fixed Apply Button at Bottom */}
          <View style={styles.applyFooter}>
            <TouchableOpacity style={styles.applyButton} onPress={handleApply} activeOpacity={0.8}>
              <Text style={styles.applyButtonText}>Apply Now</Text>
              <FontAwesome6 name="arrow-right-long" size={16} color="#FFFFFF" style={{ marginLeft: 8 }} />
            </TouchableOpacity>
          </View>

        </View>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  content: { flex: 1 },
  
  /* Header */
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, paddingVertical: 12, backgroundColor: "#FFFFFF" },
  headerTitle: { fontSize: 22, fontWeight: "bold", color: "#1E293B" },
  savedIconBtn: { padding: 8 },

  /* Search Bar */
  searchContainer: { flexDirection: "row", alignItems: "center", backgroundColor: "#FFFFFF", marginHorizontal: 20, marginTop: 16, borderRadius: 12, borderWidth: 1, borderColor: "#E2E8F0", paddingHorizontal: 16, height: 50 },
  searchIcon: { marginRight: 12 },
  searchInput: { flex: 1, fontSize: 15, color: "#1E293B" },
  clearIcon: { padding: 4 },

  /* Filters */
  filterWrapper: { marginTop: 16, marginBottom: 8 },
  filterScroll: { paddingHorizontal: 20, gap: 10 },
  filterChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E2E8F0" },
  filterChipActive: { backgroundColor: "#2563EB", borderColor: "#2563EB" },
  filterText: { fontSize: 13, fontWeight: "600", color: "#64748B" },
  filterTextActive: { color: "#FFFFFF" },

  /* Jobs List */
  jobsList: { paddingHorizontal: 20, paddingBottom: 100, paddingTop: 10 },
  emptyState: { alignItems: "center", justifyContent: "center", paddingVertical: 60 },
  emptyStateText: { color: "#94A3B8", fontSize: 15 },

  jobCard: { backgroundColor: "#FFFFFF", borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: "#F1F5F9", shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 6, elevation: 2 },
  jobCardHeader: { flexDirection: "row", alignItems: "flex-start", marginBottom: 16 },
  companyLogo: { width: 48, height: 48, borderRadius: 12, justifyContent: "center", alignItems: "center", marginRight: 12 },
  companyLogoText: { fontSize: 20, fontWeight: "bold", color: "#FFFFFF" },
  jobCardInfo: { flex: 1 },
  jobTitle: { fontSize: 16, fontWeight: "bold", color: "#1E293B", marginBottom: 4 },
  jobCompany: { fontSize: 13, color: "#64748B" },
  bookmarkBtn: { padding: 4 },
  
  jobTagsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 },
  jobTag: { flexDirection: "row", alignItems: "center", backgroundColor: "#F1F5F9", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  jobTagText: { fontSize: 11, fontWeight: "600", color: "#475569" },

  jobCardFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingTop: 12, borderTopWidth: 1, borderTopColor: "#F1F5F9" },
  postedText: { fontSize: 11, color: "#94A3B8" },
  viewDetailsText: { fontSize: 13, fontWeight: "bold", color: "#2563EB" },

  /* ================= MODAL STYLES ================= */
  modalContainer: { flex: 1, backgroundColor: "#FFFFFF" },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, paddingTop: Platform.OS === 'ios' ? 50 : 40, paddingBottom: 16, backgroundColor: "#FFFFFF", borderBottomWidth: 1, borderBottomColor: "#E2E8F0" },
  modalBackButton: { padding: 8, marginLeft: -8 },
  modalHeaderIcon: { padding: 8, marginRight: -8 },
  
  modalScrollContent: { padding: 20, paddingBottom: 120 }, // Extra padding for fixed bottom button
  
  modalJobHeader: { alignItems: "center", marginBottom: 24, marginTop: 10 },
  modalCompanyLogo: { width: 80, height: 80, borderRadius: 20, justifyContent: "center", alignItems: "center", marginBottom: 16 },
  modalCompanyLogoText: { fontSize: 36, fontWeight: "bold", color: "#FFFFFF" },
  modalJobTitle: { fontSize: 22, fontWeight: "bold", color: "#1E293B", textAlign: "center", marginBottom: 8 },
  modalJobCompany: { fontSize: 16, color: "#64748B", marginBottom: 16 },
  
  modalTagsRow: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 8, marginBottom: 16 },
  modalTag: { backgroundColor: "#EFF6FF", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  modalTagText: { fontSize: 12, fontWeight: "bold", color: "#2563EB" },
  modalPostedText: { fontSize: 12, color: "#94A3B8" },
  
  modalDivider: { height: 1, backgroundColor: "#E2E8F0", marginBottom: 24 },
  
  sectionTitle: { fontSize: 18, fontWeight: "bold", color: "#1E293B", marginBottom: 12 },
  bodyText: { fontSize: 15, color: "#475569", lineHeight: 24 },
  
  requirementsList: { gap: 12 },
  requirementBullet: { flexDirection: "row", alignItems: "flex-start", paddingRight: 10 },
  bulletDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#64748B", marginTop: 9, marginRight: 12 },

  aboutCompanyCard: { backgroundColor: "#F8FAFC", padding: 20, borderRadius: 16, marginTop: 32, borderWidth: 1, borderColor: "#E2E8F0" },
  aboutCompanyTitle: { fontSize: 16, fontWeight: "bold", color: "#1E293B", marginBottom: 8 },
  aboutCompanyText: { fontSize: 14, color: "#475569", lineHeight: 22 },

  /* Bottom Fixed Apply Button */
  applyFooter: { position: "absolute", bottom: 0, left: 0, right: 0, backgroundColor: "#FFFFFF", paddingHorizontal: 20, paddingTop: 16, paddingBottom: Platform.OS === "ios" ? 34 : 24, borderTopWidth: 1, borderTopColor: "#E2E8F0", shadowColor: "#000", shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 10 },
  applyButton: { flexDirection: "row", backgroundColor: "#2563EB", paddingVertical: 16, borderRadius: 12, justifyContent: "center", alignItems: "center" },
  applyButtonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "bold" },
});