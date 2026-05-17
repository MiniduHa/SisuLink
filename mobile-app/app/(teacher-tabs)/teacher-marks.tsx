import React, { useState, useEffect } from "react";
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  TextInput,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Image,
  Modal,
  Keyboard,
  TouchableWithoutFeedback
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { FontAwesome6, Feather } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";

// Utility to calculate grade from numeric mark
const calculateGrade = (mark: number) => {
  if (mark >= 75) return 'A';
  if (mark >= 65) return 'B';
  if (mark >= 50) return 'C';
  if (mark >= 35) return 'S';
  return 'W';
};

const getGradeColor = (grade: string) => {
  if (grade === 'A') return '#059669';
  if (grade === 'B') return '#2563EB';
  if (grade === 'C') return '#D97706';
  return '#EF4444';
};

export default function TeacherMarksScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const teacherEmail = params.email as string;

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [assignments, setAssignments] = useState<any[]>([]);
  
  // Selection States
  const [selectedClass, setSelectedClass] = useState<string | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [selectedTerm, setSelectedTerm] = useState<string>("Term 1");
  const terms = ["Term 1", "Term 2", "Term 3"];

  const [students, setStudents] = useState<any[]>([]);
  const [marksData, setMarksData] = useState<Record<string, any>>({});
  
  // Modal State
  const [selectedStudent, setSelectedStudent] = useState<any | null>(null);
  const [modalMarks, setModalMarks] = useState("");
  const [modalRemarks, setModalRemarks] = useState("");
  const [modalGrade, setModalGrade] = useState("-");

  useEffect(() => {
    fetchAssignments();
  }, []);

  const fetchAssignments = async () => {
    try {
      const response = await fetch(`http://172.20.10.7:5000/api/teacher/${teacherEmail}/assignments`);
      if (response.ok) {
        const data = await response.json();
        setAssignments(data);
        
        // Auto-select first available if possible
        if (data.length > 0) {
          const firstClass = `${data[0].grade}-${data[0].section}`;
          setSelectedClass(firstClass);
          setSelectedSubject(data[0].subject);
        }
      }
    } catch (error) {
      console.error("Failed to fetch assignments:", error);
      Alert.alert("Error", "Could not load class assignments.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (selectedClass && selectedSubject && selectedTerm) {
      fetchClassMarks();
    }
  }, [selectedClass, selectedSubject, selectedTerm]);

  const fetchClassMarks = async () => {
    if (!selectedClass) return;
    
    if (students.length === 0) {
      setIsLoading(true);
    }
    const [grade, section] = selectedClass.split('-');
    
    try {
      const response = await fetch(`http://172.20.10.7:5000/api/teacher/${teacherEmail}/class-marks?grade=${grade}&section=${section}&subject=${selectedSubject}&term=${selectedTerm}`);
      
      if (response.ok) {
        const data = await response.json();
        setStudents(data.students);
        
        // Initialize state with fetched marks or defaults
        const newMarksData: Record<string, any> = {};
        data.students.forEach((student: any) => {
          const existing = data.marks[student.index_number];
          newMarksData[student.index_number] = {
            marks: existing ? existing.marks.toString() : "",
            grade: existing ? existing.grade : "-",
            remarks: existing ? existing.remarks : ""
          };
        });
        setMarksData(newMarksData);
      }
    } catch (error) {
      console.error("Failed to fetch class marks:", error);
      Alert.alert("Error", "Could not load student list.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleStudentSelect = (student: any) => {
    const existing = marksData[student.index_number];
    setSelectedStudent(student);
    setModalMarks(existing?.marks || "");
    setModalGrade(existing?.grade || "-");
    setModalRemarks(existing?.remarks || "");
  };

  const handleModalMarkChange = (value: string) => {
    const numericValue = parseInt(value, 10);
    let grade = "-";
    
    if (!isNaN(numericValue) && numericValue >= 0 && numericValue <= 100) {
      grade = calculateGrade(numericValue);
    } else if (value === "") {
      grade = "-";
    }
    setModalMarks(value);
    setModalGrade(grade);
  };

  const handleSaveIndividualMark = async () => {
    if (!selectedClass || !selectedSubject || !selectedStudent) return;

    if (modalMarks !== "") {
      const num = parseInt(modalMarks, 10);
      if (isNaN(num) || num < 0 || num > 100) {
        Alert.alert("Validation Error", "Invalid marks. Must be 0-100.");
        return;
      }
    }

    setIsSaving(true);

    const payload = [{
      studentId: selectedStudent.id,
      indexNumber: selectedStudent.index_number,
      marks: modalMarks || 0,
      grade: modalGrade === "-" ? "W" : modalGrade,
      remarks: modalRemarks
    }];

    try {
      const response = await fetch(`http://172.20.10.7:5000/api/teacher/${teacherEmail}/class-marks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: selectedSubject,
          term: selectedTerm,
          marksData: payload
        })
      });

      if (response.ok) {
        // Update local state to reflect the saved mark
        setMarksData(prev => ({
          ...prev,
          [selectedStudent.index_number]: {
            marks: modalMarks,
            grade: modalGrade,
            remarks: modalRemarks
          }
        }));
        Alert.alert("Success", "Marks saved successfully!");
        setSelectedStudent(null);
      } else {
        const err = await response.json();
        Alert.alert("Error", err.error || "Failed to save marks.");
      }
    } catch (error) {
      console.error("Save marks error:", error);
      Alert.alert("Error", "Network error. Could not save marks.");
    } finally {
      setIsSaving(false);
    }
  };



  // Derive unique classes from assignments
  const uniqueClasses = Array.from(new Set(assignments.map(a => `${a.grade}-${a.section}`)));
  // Filter subjects based on selected class
  const availableSubjects = selectedClass 
    ? Array.from(new Set(assignments.filter(a => `${a.grade}-${a.section}` === selectedClass).map(a => a.subject)))
    : [];

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <FontAwesome6 name="arrow-left" size={20} color="#1E293B" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Manage Marks</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.filterSection}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
            {/* Class Filter */}
            <View style={styles.filterGroup}>
              <Text style={styles.filterLabel}>Class</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {uniqueClasses.map((cls, idx) => (
                  <TouchableOpacity 
                    key={idx} 
                    style={[styles.filterChip, selectedClass === cls && styles.filterChipActive]}
                    onPress={() => setSelectedClass(cls)}
                  >
                    <Text style={[styles.filterChipText, selectedClass === cls && styles.filterChipTextActive]}>{cls}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </ScrollView>
          
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
            {/* Subject Filter */}
            <View style={styles.filterGroup}>
              <Text style={styles.filterLabel}>Subject</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {availableSubjects.map((sub, idx) => (
                  <TouchableOpacity 
                    key={idx} 
                    style={[styles.filterChip, selectedSubject === sub && styles.filterChipActive]}
                    onPress={() => setSelectedSubject(sub as string)}
                  >
                    <Text style={[styles.filterChipText, selectedSubject === sub && styles.filterChipTextActive]}>{sub as string}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </ScrollView>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[styles.filterScroll, { marginBottom: 0 }]}>
            {/* Term Filter */}
            <View style={styles.filterGroup}>
              <Text style={styles.filterLabel}>Term</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {terms.map((term, idx) => (
                  <TouchableOpacity 
                    key={idx} 
                    style={[styles.filterChip, selectedTerm === term && styles.filterChipActive]}
                    onPress={() => setSelectedTerm(term)}
                  >
                    <Text style={[styles.filterChipText, selectedTerm === term && styles.filterChipTextActive]}>{term}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </ScrollView>
        </View>

        {isLoading ? (
          <View style={styles.centerContent}>
            <ActivityIndicator size="large" color="#2563EB" />
            <Text style={styles.loadingText}>Loading data...</Text>
          </View>
        ) : students.length === 0 ? (
          <View style={styles.centerContent}>
            <FontAwesome6 name="users-slash" size={40} color="#94A3B8" />
            <Text style={styles.emptyText}>No students found for this selection.</Text>
          </View>
        ) : (
          <ScrollView style={styles.listContainer} showsVerticalScrollIndicator={false}>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderText, { flex: 2 }]}>Student</Text>
              <Text style={[styles.tableHeaderText, { flex: 1, textAlign: "right", marginRight: 10 }]}>Status</Text>
            </View>

            {students.map((student) => {
              const hasMarks = marksData[student.index_number]?.marks !== "";
              return (
                <TouchableOpacity 
                  key={student.index_number} 
                  style={styles.studentListCard}
                  activeOpacity={0.7}
                  onPress={() => handleStudentSelect(student)}
                >
                  <View style={styles.studentInfoRowList}>
                    <View style={styles.avatar}>
                      {student.profile_photo_url && student.profile_photo_url !== "null" ? (
                        <Image source={{ uri: student.profile_photo_url }} style={styles.avatarImg} />
                      ) : (
                        <Text style={styles.avatarText}>{student.first_name[0]}</Text>
                      )}
                    </View>
                    <View style={styles.studentDetails}>
                      <Text style={styles.studentName}>{student.first_name} {student.last_name}</Text>
                      <Text style={styles.studentId}>{student.index_number}</Text>
                    </View>
                  </View>
                  
                  <View style={styles.statusBadge}>
                    {hasMarks ? (
                      <View style={[styles.badgeBg, { backgroundColor: "#D1FAE5" }]}>
                        <Text style={[styles.badgeText, { color: "#059669" }]}>Graded ({marksData[student.index_number].grade})</Text>
                      </View>
                    ) : (
                      <View style={[styles.badgeBg, { backgroundColor: "#FEE2E2" }]}>
                        <Text style={[styles.badgeText, { color: "#EF4444" }]}>Pending</Text>
                      </View>
                    )}
                    <Feather name="chevron-right" size={18} color="#94A3B8" style={{ marginLeft: 5 }} />
                  </View>
                </TouchableOpacity>
              );
            })}
            <View style={{ height: 40 }} />
          </ScrollView>
        )}

        <Modal
          visible={!!selectedStudent}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setSelectedStudent(null)}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.modalOverlay}>
              <KeyboardAvoidingView 
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                style={{ width: '100%' }}
              >
                <View style={styles.modalContent}>
                  <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>Enter Marks</Text>
                    <TouchableOpacity onPress={() => setSelectedStudent(null)} style={styles.closeModalButton}>
                      <Feather name="x" size={24} color="#64748B" />
                    </TouchableOpacity>
                  </View>
                  
                  {selectedStudent && (
                    <ScrollView 
                      style={styles.modalScroll} 
                      contentContainerStyle={styles.modalBody}
                      keyboardShouldPersistTaps="handled"
                    >
                      <View style={styles.modalStudentInfo}>
                         {selectedStudent.profile_photo_url && selectedStudent.profile_photo_url !== "null" ? (
                            <Image source={{ uri: selectedStudent.profile_photo_url }} style={styles.modalAvatarImg} />
                          ) : (
                            <View style={styles.modalAvatarFallback}>
                              <Text style={styles.modalAvatarText}>{selectedStudent.first_name[0]}</Text>
                            </View>
                          )}
                          <View>
                            <Text style={styles.modalStudentName}>{selectedStudent.first_name} {selectedStudent.last_name}</Text>
                            <Text style={styles.modalStudentMeta}>{selectedClass} • {selectedSubject}</Text>
                          </View>
                      </View>

                      <View style={styles.modalInputsContainer}>
                        <View style={styles.markInputGroup}>
                          <Text style={styles.inputLabel}>Marks (0-100)</Text>
                          <TextInput
                            style={styles.modalMarkInput}
                            value={modalMarks}
                            onChangeText={handleModalMarkChange}
                            keyboardType="numeric"
                            maxLength={3}
                            placeholder="0"
                            placeholderTextColor="#CBD5E1"
                          />
                        </View>

                        <View style={styles.gradeInputGroup}>
                          <Text style={styles.inputLabel}>Grade</Text>
                          <View style={styles.modalGradeBox}>
                            <Text style={[styles.modalGradeText, { color: getGradeColor(modalGrade) }]}>{modalGrade}</Text>
                          </View>
                        </View>
                      </View>

                      <View style={styles.remarkGroup}>
                        <Text style={styles.inputLabel}>Remarks</Text>
                        <TextInput
                          style={styles.modalRemarkInput}
                          value={modalRemarks}
                          onChangeText={setModalRemarks}
                          placeholder="Add a remark (optional)"
                          placeholderTextColor="#9CA3AF"
                          maxLength={100}
                          multiline={true}
                          numberOfLines={3}
                        />
                      </View>

                      <TouchableOpacity 
                        style={[styles.modalSaveButton, isSaving && styles.saveButtonDisabled]} 
                        onPress={handleSaveIndividualMark}
                        disabled={isSaving}
                      >
                        {isSaving ? (
                          <ActivityIndicator color="#FFFFFF" size="small" />
                        ) : (
                          <>
                            <Feather name="save" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
                            <Text style={styles.modalSaveButtonText}>Save Marks</Text>
                          </>
                        )}
                      </TouchableOpacity>
                    </ScrollView>
                  )}
                </View>
              </KeyboardAvoidingView>
            </View>
          </TouchableWithoutFeedback>
        </Modal>

      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, paddingVertical: 15, backgroundColor: "#FFFFFF", borderBottomWidth: 1, borderBottomColor: "#E2E8F0" },
  backButton: { padding: 8, backgroundColor: "#F1F5F9", borderRadius: 12 },
  headerTitle: { fontSize: 18, fontWeight: "bold", color: "#1E293B" },
  
  filterSection: { backgroundColor: "#FFFFFF", paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: "#E2E8F0", elevation: 2, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4 },
  filterScroll: { paddingHorizontal: 20, marginBottom: 15 },
  filterGroup: { flexDirection: "row", alignItems: "center" },
  filterLabel: { fontSize: 13, fontWeight: "bold", color: "#64748B", width: 60 },
  filterChip: { paddingHorizontal: 16, paddingVertical: 8, backgroundColor: "#F1F5F9", borderRadius: 20, marginRight: 10, borderWidth: 1, borderColor: "transparent" },
  filterChipActive: { backgroundColor: "#EFF6FF", borderColor: "#3B82F6" },
  filterChipText: { fontSize: 13, color: "#475569", fontWeight: "600" },
  filterChipTextActive: { color: "#2563EB", fontWeight: "bold" },

  centerContent: { flex: 1, justifyContent: "center", alignItems: "center" },
  loadingText: { marginTop: 12, color: "#64748B", fontSize: 14, fontWeight: "500" },
  emptyText: { marginTop: 12, color: "#64748B", fontSize: 15, fontStyle: "italic" },

  listContainer: { flex: 1, padding: 20 },
  tableHeader: { flexDirection: "row", paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: "#E2E8F0", marginBottom: 15, paddingHorizontal: 5 },
  tableHeaderText: { fontSize: 12, fontWeight: "bold", color: "#9CA3AF" },

  studentListCard: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: "#FFFFFF", padding: 16, borderRadius: 16, marginBottom: 12, borderWidth: 1, borderColor: "#F1F5F9", shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, shadowRadius: 3, elevation: 1 },
  studentInfoRowList: { flexDirection: "row", alignItems: "center", flex: 1 },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: "#DBEAFE", justifyContent: "center", alignItems: "center", marginRight: 12, overflow: "hidden" },
  avatarImg: { width: "100%", height: "100%" },
  avatarText: { fontSize: 18, fontWeight: "bold", color: "#2563EB" },
  studentDetails: { flex: 1 },
  studentName: { fontSize: 15, fontWeight: "bold", color: "#1E293B" },
  studentId: { fontSize: 12, color: "#64748B", marginTop: 2 },
  statusBadge: { flexDirection: "row", alignItems: "center" },
  badgeBg: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12 },
  badgeText: { fontSize: 11, fontWeight: "bold" },

  // Modal Styles
  modalOverlay: { flex: 1, backgroundColor: "rgba(15, 23, 42, 0.5)", justifyContent: "flex-end" },
  modalContent: { backgroundColor: "#FFFFFF", borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '90%' },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 20, borderBottomWidth: 1, borderBottomColor: "#F1F5F9" },
  modalTitle: { fontSize: 18, fontWeight: "bold", color: "#1E293B" },
  closeModalButton: { padding: 4, backgroundColor: "#F8FAFC", borderRadius: 20 },
  modalScroll: { maxHeight: 500 },
  modalBody: { padding: 20, paddingBottom: 40 },
  modalStudentInfo: { flexDirection: "row", alignItems: "center", marginBottom: 25, backgroundColor: "#F8FAFC", padding: 15, borderRadius: 16 },
  modalAvatarImg: { width: 50, height: 50, borderRadius: 25, marginRight: 15 },
  modalAvatarFallback: { width: 50, height: 50, borderRadius: 25, backgroundColor: "#DBEAFE", justifyContent: "center", alignItems: "center", marginRight: 15 },
  modalAvatarText: { fontSize: 20, fontWeight: "bold", color: "#2563EB" },
  modalStudentName: { fontSize: 18, fontWeight: "bold", color: "#1E293B" },
  modalStudentMeta: { fontSize: 13, color: "#64748B", marginTop: 4, fontWeight: "500" },
  
  modalInputsContainer: { flexDirection: "row", justifyContent: "space-between", marginBottom: 20 },
  markInputGroup: { flex: 1, marginRight: 15 },
  gradeInputGroup: { width: 80 },
  inputLabel: { fontSize: 13, fontWeight: "bold", color: "#64748B", marginBottom: 8 },
  modalMarkInput: { backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E2E8F0", borderRadius: 12, paddingHorizontal: 15, paddingVertical: 12, fontSize: 18, fontWeight: "bold", color: "#1E293B", textAlign: "center" },
  modalGradeBox: { backgroundColor: "#F8FAFC", borderWidth: 1, borderColor: "#E2E8F0", borderRadius: 12, height: 52, justifyContent: "center", alignItems: "center" },
  modalGradeText: { fontSize: 20, fontWeight: "bold" },

  remarkGroup: { marginBottom: 30 },
  modalRemarkInput: { backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E2E8F0", borderRadius: 12, paddingHorizontal: 15, paddingVertical: 12, fontSize: 15, color: "#475569" },

  modalSaveButton: { flexDirection: "row", backgroundColor: "#2563EB", paddingVertical: 15, borderRadius: 12, justifyContent: "center", alignItems: "center" },
  saveButtonDisabled: { opacity: 0.7 },
  modalSaveButtonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "bold" }
});
