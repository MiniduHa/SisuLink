import React, { useState, useEffect } from "react";
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  KeyboardAvoidingView, 
  Platform, 
  ScrollView,
  Alert 
} from "react-native";
import { FontAwesome6 } from "@expo/vector-icons";
import { useRouter } from "expo-router";

const API_URL = "http://172.20.10.7:5000/api/auth/register";
const SCHOOLS_API_URL = "http://172.20.10.7:5000/api/schools/list"; 

// --- MATCHED DEPARTMENTS & SUBJECTS FROM WEB DASHBOARD ---
const subjectOptions: Record<string, string[]> = {
  "Primary Section": ["Primary Mathematics", "English", "Sinhala", "Tamil", "Environment", "Religion", "Art", "Dancing", "Music", "Physical Education"],
  "Junior Secondary Section": ["Mathematics", "Science", "English", "Sinhala", "Tamil", "History", "Geography", "Civic Education", "ICT", "Health", "Art", "Music", "Dancing", "PTS"],
  "Senior Secondary (O/L)": ["Mathematics", "Science", "English", "Sinhala", "Tamil", "History", "Religion", "Geography", "Civic Education", "ICT", "Business & Accounting", "Art", "Music", "Dancing", "Home Economics"],
  "A/L - Physical Science": ["Combined Mathematics", "Physics", "Chemistry", "ICT", "GIT"],
  "A/L - Biological Science": ["Biology", "Physics", "Chemistry", "Agricultural Science", "GIT"],
  "A/L - Commerce": ["Accounting", "Business Studies", "Economics", "Business Statistics", "ICT", "GIT"],
  "A/L - Technology": ["Engineering Technology (ET)", "Bio Systems Technology (BST)", "Science for Technology (SFT)", "ICT", "GIT"],
  "A/L - Arts": ["Sinhala", "Tamil", "English", "Geography", "History", "Logic", "Political Science", "Media Studies", "Economics", "Buddhist Civilization", "Christian Civilization", "Art", "Music", "Dancing", "GIT"],
  // Aliases for compatibility
  "O/L": ["Mathematics", "Science", "English", "Sinhala", "Tamil", "History", "Religion", "Geography", "Civic Education", "ICT", "Business & Accounting", "Art", "Music", "Dancing", "Home Economics"],
  "Science Section": ["Combined Mathematics", "Biology", "Physics", "Chemistry", "ICT", "GIT"],
  "Commerce Section": ["Accounting", "Business Studies", "Economics", "Business Statistics", "ICT", "GIT"],
  "Technology Section": ["Engineering Technology (ET)", "Bio Systems Technology (BST)", "Science for Technology (SFT)", "ICT", "GIT"],
  "Arts Section": ["Sinhala", "Tamil", "English", "Geography", "History", "Logic", "Political Science", "Media Studies", "Economics", "Buddhist Civilization", "Christian Civilization", "Art", "Music", "Dancing", "GIT"],
  "Physical Science": ["Combined Mathematics", "Physics", "Chemistry", "ICT", "GIT"],
  "Biological Science": ["Biology", "Physics", "Chemistry", "Agricultural Science", "GIT"],
  "Commerce": ["Accounting", "Business Studies", "Economics", "Business Statistics", "ICT", "GIT"],
  "Technology": ["Engineering Technology (ET)", "Bio Systems Technology (BST)", "Science for Technology (SFT)", "ICT", "GIT"],
  "Arts": ["Sinhala", "Tamil", "English", "Geography", "History", "Logic", "Political Science", "Media Studies", "Economics", "Buddhist Civilization", "Christian Civilization", "Art", "Music", "Dancing", "GIT"],
  "Science": ["Combined Mathematics", "Biology", "Physics", "Chemistry", "ICT", "GIT"]
};

const olCoreSubjects = ["Sinhala", "Science", "Mathematics", "History", "English"];
const olBucket1 = ["Dancing", "Art", "Music", "English Literature", "Sinhala Literature", "Drama"];
const olBucket2 = ["Business and Accounting", "Geography", "Civic Education", "Tamil", "Second Language (Hindi/French)"];
const olBucket3 = ["ICT", "Agriculture", "Health Education", "Home Economics"];
const olReligions = ["Buddhism", "Hinduism", "Christianity", "Islam"];

const CustomInput = ({ label, ...props }: any) => (
  <View style={styles.inputGroup}>
    <Text style={styles.label}>{label}</Text>
    <TextInput
      style={styles.input}
      placeholderTextColor="#9CA3AF"
      {...props}
    />
  </View>
);

const CustomDropdown = ({ label, value, options, onSelect }: any) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <View style={styles.inputGroup}>
      <Text style={styles.label}>{label}</Text>
      <TouchableOpacity 
        style={styles.dropdownHeader} 
        onPress={() => setIsOpen(!isOpen)}
        activeOpacity={0.8}
      >
        <Text style={[styles.dropdownHeaderText, !value && { color: "#9CA3AF" }]}>
          {value || `Select ${label}`}
        </Text>
        <FontAwesome6 name={isOpen ? "chevron-up" : "chevron-down"} size={14} color="#64748B" />
      </TouchableOpacity>

      {isOpen && (
        <View style={styles.dropdownList}>
          {options && options.length > 0 ? (
            options.map((opt: string) => (
              <TouchableOpacity 
                key={opt} 
                style={styles.dropdownItem} 
                onPress={() => {
                  onSelect(opt);
                  setIsOpen(false);
                }}
              >
                <Text style={[styles.dropdownItemText, value === opt && styles.dropdownItemActive]}>
                  {opt}
                </Text>
              </TouchableOpacity>
            ))
          ) : (
            <View style={styles.dropdownItem}>
              <Text style={styles.dropdownItemText}>Loading options...</Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
};

const CustomCheckbox = ({ label, isChecked, onChange }: any) => (
  <TouchableOpacity style={styles.checkboxContainer} onPress={() => onChange(!isChecked)} activeOpacity={0.8}>
    <View style={[styles.checkbox, isChecked && styles.checkboxChecked]}>
      {isChecked && <FontAwesome6 name="check" size={12} color="#FFFFFF" />}
    </View>
    <Text style={styles.checkboxLabel}>{label}</Text>
  </TouchableOpacity>
);

export default function SignupScreen() {
  const router = useRouter();
  
  const [role, setRole] = useState("Student");
  const roles = ["Student", "Parent", "Teacher", "Industry"];

  // Dynamic School List State
  const [schoolList, setSchoolList] = useState<string[]>([]);

  // Name States
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [fullName, setFullName] = useState("");
  
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [school, setSchool] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [studentId, setStudentId] = useState("");
  const [grade, setGrade] = useState("");
  
  // Teacher Specific States
  const [staffId, setStaffId] = useState("");
  const [department, setDepartment] = useState("");
  const [subject, setSubject] = useState(""); 
  const [medium, setMedium] = useState("");
  const [isClassTeacher, setIsClassTeacher] = useState(false); // NEW: Class Teacher State
  
  const [companyName, setCompanyName] = useState("");
  const [brn, setBrn] = useState("");
  const [industryType, setIndustryType] = useState("");
  
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [childIds, setChildIds] = useState<string[]>([""]);
  const [availableGrades, setAvailableGrades] = useState<string[]>([]);
  const [availableRooms, setAvailableRooms] = useState<{room_number: string, section: string}[]>([]);
  const [room, setRoom] = useState("");
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [olSelections, setOlSelections] = useState({ religion: '', b1: '', b2: '', b3: '' });

  // Fetch registered schools from backend when component mounts
  useEffect(() => {
    const fetchSchools = async () => {
      try {
        const response = await fetch(SCHOOLS_API_URL);
        if (response.ok) {
          const data = await response.json();
          setSchoolList(data.map((s: any) => s.name));
        }
      } catch (error) {
        console.warn("⚠️ School list fetch failed. This only affects Student/Teacher registration.");
      }
    };
    fetchSchools();
  }, []);

  // Fetch available grades when school is selected
  useEffect(() => {
    if (school) {
      const fetchGrades = async () => {
        try {
          const response = await fetch(`http://172.20.10.7:5000/api/schools/${encodeURIComponent(school)}/grades`);
          if (response.ok) {
            const data = await response.json();
            setAvailableGrades(data);
          }
        } catch (error) {
          console.warn("⚠️ Grade list fetch failed.");
        }
      };
      fetchGrades();
    } else {
      setAvailableGrades([]);
      setGrade("");
      setAvailableRooms([]);
      setRoom("");
    }
  }, [school]);

  // Fetch available rooms when grade is selected
  useEffect(() => {
    if (school && grade) {
      const fetchRooms = async () => {
        try {
          const response = await fetch(`http://172.20.10.7:5000/api/schools/${encodeURIComponent(school)}/grades/${encodeURIComponent(grade)}/rooms`);
          if (response.ok) {
            const data = await response.json();
            setAvailableRooms(data);
          }
        } catch (error) {
          console.warn("⚠️ Room list fetch failed.");
        }
      };
      fetchRooms();
    } else {
      setAvailableRooms([]);
      setRoom("");
    }
  }, [school, grade]);

  useEffect(() => {
    if (grade && availableRooms.length === 0) {
      if (grade.match(/Grade [1-5]$/)) setDepartment("Primary Section");
      else if (grade.match(/Grade [6-9]$/)) setDepartment("Junior Secondary Section");
      else if (grade.match(/Grade 10|11/)) setDepartment("Senior Secondary (O/L)");
    }
  }, [grade, availableRooms]);

  const updateChildId = (text: string, index: number) => {
    const newIds = [...childIds];
    newIds[index] = text;
    setChildIds(newIds);
  };

  const addChildId = () => {
    setChildIds([...childIds, ""]);
  };

  const removeChildId = (index: number) => {
    const newIds = childIds.filter((_, i) => i !== index);
    setChildIds(newIds);
  };

  const handleCreateAccount = async () => {
    if (password !== confirmPassword) {
      Alert.alert("Error", "Passwords do not match!");
      return;
    }

    if (role !== "Student" && role !== "Parent" && role !== "Teacher" && role !== "Industry") {
      Alert.alert("Coming Soon", `Registration for ${role} is currently being developed.`);
      return;
    }

    if ((role === "Teacher" || role === "Industry") && !agreeTerms) {
      Alert.alert("Error", "You must agree to the Terms of Service to register.");
      return;
    }

    // Force school selection for Students and Teachers
    if ((role === "Student" || role === "Teacher") && !school) {
      Alert.alert("Error", "Please select your school from the list.");
      return;
    }

    // Force Subject selection for Teachers
    if (role === "Teacher" && (!department || !subject)) {
      Alert.alert("Error", "Please select both a Department and a Teaching Subject.");
      return;
    }

    setIsLoading(true);

    try {
      let payload: any = {
        role: role,
        email: email.toLowerCase().trim(),
        password: password,
      };
      
      if (role === "Student") {
        payload.first_name = firstName;
        payload.last_name = lastName;
        payload.grade_level = grade;
        payload.section = room || department; 
        payload.index_number = studentId;
        payload.school_name = school; 
        payload.medium = medium || "English";

        // Compile Final Subjects Array
        let finalSubjects = [...selectedSubjects];
        if (department === "Senior Secondary (O/L)" || department === "O/L" || department === "Senior Secondary") {
          if (!olSelections.religion || !olSelections.b1 || !olSelections.b2 || !olSelections.b3) {
            Alert.alert("Incomplete", "Please select all 9 subjects for O/L (6 Core + 3 Buckets).");
            setIsLoading(false);
            return;
          }
          finalSubjects = [...olCoreSubjects, olSelections.religion, olSelections.b1, olSelections.b2, olSelections.b3].filter(Boolean);
        } else if (department.includes("A/L") || department.includes("Science") || department.includes("Commerce") || department.includes("Technology") || department.includes("Arts")) {
          if (department.includes("A/L") && selectedSubjects.length < 3) {
            Alert.alert("Incomplete", "A/L students must select exactly 3 subjects.");
            setIsLoading(false);
            return;
          }
          finalSubjects = ["General English", "GIT", ...selectedSubjects];
        } else {
          finalSubjects = selectedSubjects;
        }
        payload.subjects = finalSubjects;
      } else if (role === "Parent") {
        payload.full_name = fullName;
        payload.phone_number = phone;
        payload.child_student_ids = childIds.filter(id => id.trim() !== "");
      } else if (role === "Teacher") {
        payload.full_name = fullName;
        payload.phone_number = phone;
        payload.staff_id = staffId;
        payload.department = department;
        payload.subject = subject; 
        payload.medium = medium;
        payload.is_class_teacher = isClassTeacher;
        payload.school_name = school; 
      } else if (role === "Industry") {
        payload.company_name = companyName;
        payload.brn = brn;
        payload.industry_type = industryType;
        payload.phone_number = phone;
      }
      
      const response = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (response.ok) {
        Alert.alert("Success!", data.message, [
          { text: "OK", onPress: () => router.push("/selection") }
        ]);
      } else {
        Alert.alert("Failed", data.error || "Something went wrong.");
      }
    } catch (error) {
      Alert.alert("Network Error", "Is your backend server running on port 5000?");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === "ios" ? "padding" : "height"} 
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <FontAwesome6 name="arrow-left" size={20} color="#1E293B" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Create Account</Text>
        </View>

        <Text style={styles.title}>{role} Sign Up</Text>
        <Text style={styles.subtitle}>Fill in your information to get started</Text>

        <CustomDropdown 
          label="Select your role" 
          value={role} 
          options={roles} 
          onSelect={(selectedRole: string) => {
            setRole(selectedRole);
            setAgreeTerms(false);
          }} 
        />
        
        {role === "Student" && (
          <>
            <View style={styles.row}>
              <View style={styles.halfInput}>
                <CustomInput label="First Name" placeholder="John" value={firstName} onChangeText={setFirstName} />
              </View>
              <View style={styles.halfInput}>
                <CustomInput label="Last Name" placeholder="Doe" value={lastName} onChangeText={setLastName} />
              </View>
            </View>
            <CustomInput label="Email Address" placeholder="your@email.com" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
            <CustomInput label="Student ID / Index" placeholder="Enter your ID" value={studentId} onChangeText={setStudentId} />
            
            <CustomDropdown 
              label="Registered School" 
              value={school} 
              options={schoolList} 
              onSelect={(selectedSchool: string) => {
                setSchool(selectedSchool);
                setGrade(""); // Reset grade when school changes
              }} 
            />

            <CustomDropdown 
              label="Select Grade" 
              value={grade} 
              options={availableGrades} 
              onSelect={(val: string) => {
                setGrade(val);
                setRoom("");
                setDepartment("");
                setSelectedSubjects([]);
              }} 
            />

            {availableRooms.length > 0 ? (
              <CustomDropdown 
                label="Class Room" 
                value={room} 
                options={availableRooms.map(r => r.room_number)} 
                onSelect={(val: string) => {
                  setRoom(val);
                  const selectedRoomObj = availableRooms.find(r => r.room_number === val);
                  if (selectedRoomObj) {
                    setDepartment(selectedRoomObj.section);
                    setSelectedSubjects([]);
                  }
                }} 
              />
            ) : grade ? (
              <CustomDropdown 
                label="Select Stream / Section" 
                value={department} 
                options={
                  grade.match(/Grade [1-5]$/) ? ["Primary Section"] :
                  grade.match(/Grade [6-9]$/) ? ["Junior Secondary Section"] :
                  grade.match(/Grade 10|11/) ? ["Senior Secondary (O/L)"] :
                  ["A/L - Physical Science", "A/L - Biological Science", "A/L - Commerce", "A/L - Technology", "A/L - Arts"]
                } 
                onSelect={(val: string) => {
                  setDepartment(val);
                  setSelectedSubjects([]);
                }} 
              />
            ) : null}

            {grade && !grade.match(/Grade [1-5]$/) && (
              <CustomDropdown 
                label="Medium" 
                value={medium} 
                options={["Sinhala", "English", "Tamil"]} 
                onSelect={setMedium} 
              />
            )}

            {/* O/L SMART SUBJECT SELECTOR */}
            {department && (department === "Senior Secondary (O/L)" || department === "O/L") && (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>O/L Subject Selection</Text>
                <View style={{backgroundColor: '#F1F5F9', padding: 12, borderRadius: 12, marginBottom: 12}}>
                  <Text style={{fontSize: 10, fontWeight: 'bold', color: '#64748B', marginBottom: 4, textTransform: 'uppercase'}}>Core Subjects (Compulsory)</Text>
                  <Text style={{fontSize: 12, color: '#334155'}}>{olCoreSubjects.join(", ")}</Text>
                </View>
                
                <CustomDropdown 
                  label="Religion" 
                  value={olSelections.religion} 
                  options={olReligions} 
                  onSelect={(val: string) => setOlSelections({...olSelections, religion: val})} 
                />
                <CustomDropdown 
                  label="Bucket 1 (Aesthetics / Lit)" 
                  value={olSelections.b1} 
                  options={olBucket1} 
                  onSelect={(val: string) => setOlSelections({...olSelections, b1: val})} 
                />
                <CustomDropdown 
                  label="Bucket 2 (Commerce / Geog)" 
                  value={olSelections.b2} 
                  options={olBucket2} 
                  onSelect={(val: string) => setOlSelections({...olSelections, b2: val})} 
                />
                <CustomDropdown 
                  label="Bucket 3 (Tech / Health)" 
                  value={olSelections.b3} 
                  options={olBucket3} 
                  onSelect={(val: string) => setOlSelections({...olSelections, b3: val})} 
                />
              </View>
            )}

            {/* REGULAR SUBJECT ENROLLMENT (Primary, Junior, A/L) */}
            {department && !department.includes("O/L") && (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Subject Enrollment ({department})</Text>
                {(department.includes("A/L") || department.includes("Science") || department.includes("Commerce") || department.includes("Technology") || department.includes("Arts")) ? (
                  <Text style={{fontSize: 10, color: '#64748B', marginBottom: 8}}>Select exactly 3 subjects. General English and GIT are included by default.</Text>
                ) : (
                  <Text style={{fontSize: 10, color: '#64748B', marginBottom: 8}}>Select the subjects you want to enroll in.</Text>
                )}
                <View style={styles.subjectGrid}>
                  {(subjectOptions[department] || []).map((sub: string) => (
                    <CustomCheckbox 
                      key={sub} 
                      label={sub} 
                      isChecked={selectedSubjects.includes(sub)} 
                      onChange={() => {
                        if (selectedSubjects.includes(sub)) {
                          setSelectedSubjects(selectedSubjects.filter(s => s !== sub));
                        } else {
                          if (department.includes("A/L") && selectedSubjects.length >= 3) {
                            Alert.alert("Limit Reached", "A/L students select exactly 3 subjects.");
                            return;
                          }
                          setSelectedSubjects([...selectedSubjects, sub]);
                        }
                      }} 
                    />
                  ))}
                </View>
              </View>
            )}
          </>
        )}

        {role === "Parent" && (
          <>
            <CustomInput label="Full Name" placeholder="Enter your full name" value={fullName} onChangeText={setFullName} />
            <CustomInput label="Email Address" placeholder="your@email.com" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
            <CustomInput label="Phone Number" placeholder="e.g. +94 77 123 4567" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
            
            <View style={styles.dynamicListContainer}>
              {childIds.map((id, index) => (
                <View key={index} style={styles.dynamicRow}>
                  <View style={{ flex: 1 }}>
                    <CustomInput 
                      label={childIds.length > 1 ? `Child ${index + 1} Student ID` : "Child's Student ID"} 
                      placeholder="Enter Student ID" 
                      value={id} 
                      onChangeText={(text: string) => updateChildId(text, index)} 
                    />
                  </View>
                  
                  {index > 0 && (
                    <TouchableOpacity style={styles.removeButton} onPress={() => removeChildId(index)}>
                      <FontAwesome6 name="trash-can" size={16} color="#EF4444" />
                    </TouchableOpacity>
                  )}
                </View>
              ))}
              
              <TouchableOpacity style={styles.addButton} onPress={addChildId}>
                <FontAwesome6 name="plus" size={14} color="#2563EB" />
                <Text style={styles.addButtonText}>Add another child</Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        {role === "Teacher" && (
          <>
            <CustomInput label="Full Name" placeholder="Enter your full name" value={fullName} onChangeText={setFullName} />
            <CustomInput label="Email Address" placeholder="your@email.com" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
            <CustomInput label="Phone Number" placeholder="e.g. +94 77 123 4567" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
            <CustomInput label="Staff ID" placeholder="Enter your Staff ID" value={staffId} onChangeText={setStaffId} />
            
            <CustomDropdown 
              label="Department / Section" 
              value={department} 
              options={Object.keys(subjectOptions)} 
              onSelect={(selectedDept: string) => {
                setDepartment(selectedDept);
                setSubject(""); 
                setSelectedSubjects([]); // Reset subjects if department changes
              }} 
            />

            {department ? (
              <CustomDropdown 
                label="Teaching Subject" 
                value={subject} 
                options={subjectOptions[department] || []} 
                onSelect={setSubject} 
              />
            ) : null}

            <CustomDropdown label="Medium" value={medium} options={["English", "Sinhala", "Tamil"]} onSelect={setMedium} />
            
            {/* NEW: Class Teacher Checkbox */}
            <CustomCheckbox 
              label="I am assigned as a Class Teacher" 
              isChecked={isClassTeacher} 
              onChange={setIsClassTeacher} 
            />

            <CustomDropdown 
              label="Registered School" 
              value={school} 
              options={schoolList} 
              onSelect={setSchool} 
            />
          </>
        )}

        {role === "Industry" && (
          <>
            <CustomInput label="Company Name" placeholder="Enter company name" value={companyName} onChangeText={setCompanyName} />
            <CustomInput label="Business Registration Number" placeholder="Enter BRN" value={brn} onChangeText={setBrn} />
            <CustomDropdown label="Industry Type" value={industryType} options={["Technology", "Healthcare", "Finance", "Education", "Manufacturing", "Other"]} onSelect={setIndustryType} />
            <CustomInput label="HR Contact Number" placeholder="Enter HR phone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
            <CustomInput label="Company Email" placeholder="company@email.com" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
          </>
        )}

        <CustomInput label="Create Password" placeholder="••••••••" value={password} onChangeText={setPassword} secureTextEntry />
        <CustomInput label="Confirm Password" placeholder="••••••••" value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry />

        {role === "Teacher" && (
          <CustomCheckbox label="I agree to the School IT Policy and Terms of Service" isChecked={agreeTerms} onChange={setAgreeTerms} />
        )}

        {role === "Industry" && (
          <CustomCheckbox label="I agree to the IT Policy and Terms of Service" isChecked={agreeTerms} onChange={setAgreeTerms} />
        )}

        <TouchableOpacity 
          style={[styles.createButton, isLoading && { opacity: 0.7 }]} 
          onPress={handleCreateAccount} 
          disabled={isLoading}
        >
          <Text style={styles.createButtonText}>{isLoading ? "Processing..." : "Create Account"}</Text>
        </TouchableOpacity>

        <View style={styles.loginRow}>
          <Text style={styles.loginText}>Already have an account? </Text>
          <TouchableOpacity onPress={() => router.push("/selection")}>
            <Text style={styles.loginLink}>Log In</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFFFF" },
  scrollContent: { paddingHorizontal: 24, paddingTop: 50, paddingBottom: 40 },
  header: { flexDirection: "row", alignItems: "center", marginBottom: 30 },
  backButton: { paddingRight: 16, paddingVertical: 8 },
  headerTitle: { fontSize: 16, fontWeight: "bold", color: "#1E293B" },
  title: { fontSize: 24, fontWeight: "bold", color: "#1E293B", marginBottom: 6 },
  subtitle: { fontSize: 14, color: "#64748B", marginBottom: 24 },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  halfInput: { flex: 0.48 },
  inputGroup: { marginBottom: 16 },
  label: { fontSize: 12, fontWeight: "600", color: "#475569", marginBottom: 8 },
  input: { backgroundColor: "#F8FAFC", borderWidth: 1, borderColor: "#E2E8F0", borderRadius: 12, padding: 16, fontSize: 14, color: "#1E293B" },
  dropdownHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: "#F8FAFC", borderWidth: 1, borderColor: "#E2E8F0", borderRadius: 12, padding: 16 },
  dropdownHeaderText: { fontSize: 14, color: "#1E293B", fontWeight: "500" },
  dropdownList: { backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E2E8F0", borderRadius: 12, marginTop: 4, paddingVertical: 8, elevation: 2 },
  dropdownItem: { paddingVertical: 12, paddingHorizontal: 16 },
  dropdownItemText: { fontSize: 14, color: "#64748B" },
  dropdownItemActive: { color: "#2563EB", fontWeight: "bold" },
  subjectGrid: { flexDirection: "row", flexWrap: "wrap", marginHorizontal: -4 },
  dynamicListContainer: { marginBottom: 8 },
  dynamicRow: { flexDirection: "row", alignItems: "flex-start" },
  removeButton: { padding: 16, backgroundColor: "#FEF2F2", borderRadius: 12, justifyContent: "center", alignItems: "center", marginLeft: 12, marginTop: 22, borderWidth: 1, borderColor: "#FECACA" },
  addButton: { flexDirection: "row", alignItems: "center", paddingVertical: 8, marginBottom: 16 },
  addButtonText: { color: "#2563EB", fontSize: 14, fontWeight: "600", marginLeft: 8 },
  checkboxContainer: { 
    flexDirection: "row", 
    alignItems: "center", 
    width: '50%', 
    marginBottom: 16, 
    paddingRight: 10 
  },
  checkbox: { width: 20, height: 20, borderRadius: 6, borderWidth: 1, borderColor: "#CBD5E1", justifyContent: "center", alignItems: "center", marginRight: 10 },
  checkboxChecked: { backgroundColor: "#2563EB", borderColor: "#2563EB" },
  checkboxLabel: { fontSize: 13, color: '#475569' },
  compulsoryPill: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#DCFCE7', 
    paddingHorizontal: 10, 
    paddingVertical: 6, 
    borderRadius: 20, 
    margin: 4,
    borderWidth: 1,
    borderColor: '#BBF7D0'
  },
  compulsoryText: { fontSize: 11, color: '#166534', fontWeight: '600', marginLeft: 6 },
  createButton: { backgroundColor: "#2563EB", paddingVertical: 16, borderRadius: 12, alignItems: "center", marginTop: 10 },
  createButtonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "bold" },
  loginRow: { flexDirection: "row", justifyContent: "center", marginTop: 24 },
  loginText: { fontSize: 14, color: "#64748B" },
  loginLink: { fontSize: 14, color: "#2563EB", fontWeight: "bold" },
});