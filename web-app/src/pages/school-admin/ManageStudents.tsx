import { useState, useEffect } from 'react';
import { Search, Plus, Mail, Phone, X, GraduationCap, CheckCircle, XCircle, Eye, User, BookOpen, MessageSquare, Send, AlignLeft, Users, CalendarDays, MapPin, Edit2, AlertCircle } from 'lucide-react';

// --- SUBJECT MAPPING ENGINES ---
const alStreams = ["Science Section", "Commerce Section", "Technology Section", "Arts Section"];

const alSubjectOptions: Record<string, string[]> = {
  "Science Section": ["Combined Mathematics", "Biology", "Physics", "Chemistry", "Agriculture", "General English", "GIT"],
  "Commerce Section": ["Accounting", "Business Studies", "Economics", "ICT", "General English", "Business Statistics"],
  "Technology Section": ["Engineering Technology (ET)", "Bio Systems Technology (BST)", "Science for Technology (SFT)", "ICT", "General English"],
  "Arts Section": ["Sinhala", "Tamil", "English", "Geography", "History", "Logic", "Political Science", "Media Studies", "Dancing", "Art", "Drama"]
};

// O/L Subject Buckets (As per exact requirements)
const olCoreSubjects = ["Sinhala", "Science", "Mathematics", "History", "English"];
const olReligions = ["Buddhism", "Catholicism", "Christianity", "Islam"];
const olBucket1 = ["Dancing", "Art", "Music", "English Literature", "Sinhala Literature", "Drama"];
const olBucket2 = ["Business and Accounting", "Geography", "Civic Education", "Tamil"];
const olBucket3 = ["ICT", "Agriculture", "Health Education"];

// Formatter for Read-Only Student Timetable
const formatStudentTimetable = (dbTimetable: any[], studentSubjects: string[]) => {
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  const periods = [
    { p: 1, time: '08:00 - 08:40', isBreak: false }, { p: 2, time: '08:40 - 09:20', isBreak: false },
    { p: -1, time: '09:20 - 09:40', isBreak: true, label: 'INTERVAL' },
    { p: 3, time: '09:40 - 10:20', isBreak: false }, { p: 4, time: '10:20 - 11:00', isBreak: false },
    { p: 5, time: '11:00 - 11:40', isBreak: false }, { p: 6, time: '11:40 - 12:20', isBreak: false },
    { p: 7, time: '12:20 - 01:00', isBreak: false }, { p: 8, time: '01:00 - 01:40', isBreak: false }
  ];

  return periods.map(period => {
    if (period.isBreak) return period;
    const row: any = { ...period, days: {} };
    days.forEach(day => {
      const classSlot = dbTimetable.find(slot => slot.day_of_week === day && slot.period_number === period.p);
      if (classSlot && studentSubjects.includes(classSlot.subject)) {
        row.days[day] = { subject: classSlot.subject, room: classSlot.room_number || "TBD", teacher: classSlot.teacher_name || "Assigned Staff" };
      } else {
        row.days[day] = null; 
      }
    });
    return row;
  });
};

export default function ManageStudents() {
  const [adminEmail, setAdminEmail] = useState('');
  const [students, setStudents] = useState<any[]>([]);
  const [schoolClasses, setSchoolClasses] = useState<any[]>([]); 
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const [searchTerm, setSearchTerm] = useState('');
  const [gradeFilter, setGradeFilter] = useState('all');

  // View Profile State
  const [selectedStudent, setSelectedStudent] = useState<any | null>(null);
  const [activeProfileTab, setActiveProfileTab] = useState<'profile' | 'timetable'>('profile');
  const [timetableData, setTimetableData] = useState<any[]>([]);

  // Form Modal State
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [formMode, setFormMode] = useState<'add' | 'edit'>('add');
  const [editingDbId, setEditingDbId] = useState<string | null>(null);

  // New Subject Engine States
  const [olSelections, setOlSelections] = useState({ religion: '', b1: '', b2: '', b3: '' });
  const [alStream, setAlStream] = useState('');

  const [formData, setFormData] = useState<{
    firstName: string; lastName: string; studentEmail: string; studentId: string; 
    grade: string; section: string; medium: string; subjects: string[]; 
    parentEmail: string; parentPhone: string; status: string;
  }>({
    firstName: '', lastName: '', studentEmail: '', studentId: '', 
    grade: '', section: '', medium: '', subjects: [], parentEmail: '', parentPhone: '', status: 'Active'
  });

  // Messaging State
  const [isMessageModalOpen, setIsMessageModalOpen] = useState(false);
  const [messageForm, setMessageForm] = useState({ recipientType: 'all', targetGrade: '', targetSection: '', targetStudentId: '', subject: '', messageBody: '' });

  useEffect(() => {
    const storedUser = localStorage.getItem('schoolConnectUser');
    if (storedUser) {
      const parsedUser = JSON.parse(storedUser);
      setAdminEmail(parsedUser.email);
      fetchStudents(parsedUser.email);
      fetchClasses(parsedUser.email);
    }
  }, []);

  const fetchStudents = async (email: string) => {
    try {
      const res = await fetch(`http://localhost:5000/api/school-admin/${email}/students`);
      if (res.ok) {
        const data = await res.json();
        const formattedStudents = data.map((s: any) => ({
          dbId: s.id, id: s.index_number, name: `${s.first_name} ${s.last_name}`, firstName: s.first_name, lastName: s.last_name,
          grade: s.grade_level, section: s.section || "Not Assigned", medium: s.medium || "English",
          subjects: s.subjects ? (typeof s.subjects === 'string' ? JSON.parse(s.subjects) : s.subjects) : [],
          studentEmail: s.email, parentEmail: s.parent_email || "N/A", parentPhone: s.parent_phone || "N/A", status: s.status || "Active"
        }));
        setStudents(formattedStudents);
      }
    } catch (err) { console.error(err); } finally { setIsLoading(false); }
  };

  const fetchClasses = async (email: string) => {
    try {
      const res = await fetch(`http://localhost:5000/api/school-admin/${email}/classes`);
      if (res.ok) setSchoolClasses(await res.json());
    } catch (err) { console.error(err); }
  };

  const fetchStudentTimetable = async (studentDbId: string, studentSubjects: string[]) => {
    try {
      const res = await fetch(`http://localhost:5000/api/school-admin/${adminEmail}/students/${studentDbId}/timetable`);
      if (res.ok) {
        const dbTimetable = await res.json();
        setTimetableData(formatStudentTimetable(dbTimetable, studentSubjects));
      }
    } catch (err) { console.error("Failed to fetch timetable", err); }
  };

  const handleStatusToggle = async (dbId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'Active' ? 'Suspended' : 'Active';
    setStudents(students.map(s => s.dbId === dbId ? { ...s, status: newStatus } : s));
    if (selectedStudent && selectedStudent.dbId === dbId) setSelectedStudent({ ...selectedStudent, status: newStatus });
    
    const studentToUpdate = students.find(s => s.dbId === dbId);
    if (!studentToUpdate) return;
    try {
      await fetch(`http://localhost:5000/api/school-admin/${adminEmail}/students/${dbId}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...studentToUpdate, status: newStatus })
      });
    } catch (err) { console.error(err); }
  };

  // --- DYNAMIC FORM HANDLERS ---
  const uniqueGrades = Array.from(new Set(schoolClasses.map(c => c.grade))).sort();
  const availableSectionsForGrade = schoolClasses.filter(c => c.grade === formData.grade).map(c => c.section);
  
  const isOL = formData.grade === 'Grade 10' || formData.grade === 'Grade 11';
  const isAL = formData.grade === 'Grade 12' || formData.grade === 'Grade 13';

  const handleGradeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newGrade = e.target.value;
    const sections = schoolClasses.filter(c => c.grade === newGrade).map(c => c.section);
    setFormData({ ...formData, grade: newGrade, section: sections.length === 1 ? sections[0] : '', subjects: [] });
    setOlSelections({ religion: '', b1: '', b2: '', b3: '' });
    setAlStream('');
  };

  const handleSectionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFormData({ ...formData, section: e.target.value, subjects: [] });
  };

  const handleAlSubjectToggle = (subject: string) => {
    setFormData(prev => {
      const isSelected = prev.subjects.includes(subject);
      if (isSelected) return { ...prev, subjects: prev.subjects.filter(s => s !== subject) };
      return { ...prev, subjects: [...prev.subjects, subject] };
    });
  };

  const openAddModal = () => {
    setFormMode('add'); setEditingDbId(null);
    setFormData({ firstName: '', lastName: '', studentEmail: '', studentId: '', grade: '', section: '', medium: '', subjects: [], parentEmail: '', parentPhone: '', status: 'Active' });
    setOlSelections({ religion: '', b1: '', b2: '', b3: '' }); setAlStream('');
    setIsFormModalOpen(true);
  };

  const openEditModal = (student: any) => {
    setFormMode('edit'); setEditingDbId(student.dbId);
    
    let parsedReligion = '', parsedB1 = '', parsedB2 = '', parsedB3 = '', parsedAlStream = '';

    if (student.grade === 'Grade 10' || student.grade === 'Grade 11') {
      parsedReligion = student.subjects.find((s: string) => olReligions.includes(s)) || '';
      parsedB1 = student.subjects.find((s: string) => olBucket1.includes(s)) || '';
      parsedB2 = student.subjects.find((s: string) => olBucket2.includes(s)) || '';
      parsedB3 = student.subjects.find((s: string) => olBucket3.includes(s)) || '';
    } else {
      // Find which A/L stream they belong to based on their subjects
      for (const stream of alStreams) {
        if (student.subjects.some((sub: string) => alSubjectOptions[stream].includes(sub))) {
          parsedAlStream = stream; break;
        }
      }
    }

    setOlSelections({ religion: parsedReligion, b1: parsedB1, b2: parsedB2, b3: parsedB3 });
    setAlStream(parsedAlStream);

    setFormData({
      firstName: student.firstName, lastName: student.lastName, studentId: student.id, studentEmail: student.studentEmail, 
      grade: student.grade, section: student.section, medium: student.medium, subjects: student.subjects || [],
      parentEmail: student.parentEmail === "N/A" ? "" : student.parentEmail, parentPhone: student.parentPhone === "N/A" ? "" : student.parentPhone, status: student.status
    });
    setIsFormModalOpen(true);
    setSelectedStudent(null);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Compile Final Subjects Array
    let finalSubjects = formData.subjects;
    if (isOL) {
      finalSubjects = [...olCoreSubjects, olSelections.religion, olSelections.b1, olSelections.b2, olSelections.b3].filter(Boolean);
    }

    const payload = { ...formData, subjects: finalSubjects };
    const url = formMode === 'add' ? `http://localhost:5000/api/school-admin/${adminEmail}/students` : `http://localhost:5000/api/school-admin/${adminEmail}/students/${editingDbId}`;
    const method = formMode === 'add' ? 'POST' : 'PUT';

    try {
      const response = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (response.ok) {
        setIsFormModalOpen(false);
        fetchStudents(adminEmail);
      } else {
        const data = await response.json();
        setError(data.error || "Failed to save student.");
      }
    } catch (err) { setError("Server connection error."); }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch(`http://localhost:5000/api/school-admin/${adminEmail}/messages/send`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(messageForm),
      });
      if (response.ok) {
        setIsMessageModalOpen(false);
        setMessageForm({ recipientType: 'all', targetGrade: '', targetSection: '', targetStudentId: '', subject: '', messageBody: '' });
        alert("Message dispatched successfully!"); 
      }
    } catch (err) { alert("Server connection error."); }
  };

  const handleViewProfile = (student: any) => {
    setSelectedStudent(student);
    setActiveProfileTab('profile');
    setTimetableData(formatStudentTimetable([], [])); // Clear old data
    fetchStudentTimetable(student.dbId, student.subjects);
  };

  const filteredStudents = students.filter(student => {
    const matchesSearch = student.name.toLowerCase().includes(searchTerm.toLowerCase()) || student.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesGrade = gradeFilter === 'all' || student.grade.includes(gradeFilter);
    return matchesSearch && matchesGrade;
  });

  // Validation to disable submit button
  const isSubmitDisabled = isOL 
    ? (!olSelections.religion || !olSelections.b1 || !olSelections.b2 || !olSelections.b3)
    : (isAL ? formData.subjects.length === 0 : false);

  return (
    <div className="space-y-6 relative">
      
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Manage Students</h1>
          <p className="text-sm text-slate-500 font-medium">View, search, and manage student enrollments and academic details.</p>
        </div>
        <div className="flex w-full sm:w-auto gap-3">
          <button onClick={() => {setMessageForm({ ...messageForm, recipientType: 'all', targetGrade: '', targetSection: '', targetStudentId: '' }); setIsMessageModalOpen(true);}} className="flex-1 sm:flex-none bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-colors shadow-sm">
            <MessageSquare size={18} /> Message Students
          </button>
          <button onClick={openAddModal} className="flex-1 sm:flex-none bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-colors shadow-sm">
            <Plus size={18} /> Add Student
          </button>
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input type="text" placeholder="Search by student name or ID..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all text-sm" />
        </div>
        <select value={gradeFilter} onChange={(e) => setGradeFilter(e.target.value)} className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 text-slate-700 font-medium text-sm">
          <option value="all">All Grades</option>
          {uniqueGrades.map(g => <option key={g} value={g as string}>{g as string}</option>)}
        </select>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-sm border-b border-slate-200">
                <th className="p-4 font-semibold">Student Profile</th>
                <th className="p-4 font-semibold">Academic Details</th>
                <th className="p-4 font-semibold">Parent Contact</th>
                <th className="p-4 font-semibold text-center">Status</th>
                <th className="p-4 font-semibold text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={5} className="p-12 text-center text-slate-500 animate-pulse font-medium">Loading real-time student data...</td></tr>
              ) : filteredStudents.length > 0 ? filteredStudents.map((student) => (
                <tr key={student.dbId} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 font-bold border-2 border-white shadow-sm shrink-0 uppercase">
                        {student.name.split(' ').map((n: string) => n[0]).join('')}
                      </div>
                      <div>
                        <p className="font-bold text-slate-800">{student.name}</p>
                        <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500 mt-0.5">
                          <GraduationCap size={12} className="text-blue-500" /> {student.id}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="text-sm font-bold text-slate-700 mb-1">
                      {student.grade} <span className="font-medium text-slate-400 mx-1">|</span> {student.section}
                    </div>
                    <div className="flex items-center gap-2 text-xs font-medium text-slate-500 line-clamp-1" title={student.subjects.join(', ')}>
                      <BookOpen size={12} className="text-slate-400 shrink-0" /> {student.subjects.length} Subjects ({student.medium})
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2 text-sm text-slate-600 mb-1"><Mail size={14} className="text-slate-400" /> {student.parentEmail}</div>
                    <div className="flex items-center gap-2 text-sm text-slate-600"><Phone size={14} className="text-slate-400" /> {student.parentPhone}</div>
                  </td>
                  <td className="p-4 text-center">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${student.status === 'Active' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                      {student.status}
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center justify-center gap-2">
                      <button onClick={() => handleViewProfile(student)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors" title="View Profile"><Eye size={18} /></button>
                      <button onClick={() => openEditModal(student)} className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-md transition-colors" title="Edit Student"><Edit2 size={18} /></button>
                      <button onClick={() => {setMessageForm({...messageForm, recipientType: 'individual', targetStudentId: student.id}); setIsMessageModalOpen(true);}} className="p-1.5 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded-md transition-colors" title="Message Student"><MessageSquare size={18} /></button>
                      <button onClick={() => handleStatusToggle(student.dbId, student.status)} className={`p-1.5 rounded-md transition-colors ${student.status === 'Active' ? 'text-red-400 hover:text-red-600 hover:bg-red-50' : 'text-emerald-400 hover:text-emerald-600 hover:bg-emerald-50'}`} title={student.status === 'Active' ? 'Suspend Student' : 'Reactivate Student'}>
                        {student.status === 'Active' ? <XCircle size={18} /> : <CheckCircle size={18} />}
                      </button>
                    </div>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={5} className="p-12 text-center text-slate-500 flex flex-col items-center gap-2">
                    <User size={32} className="text-slate-300" />
                    <p>No students found matching your filters.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- STUDENT PROFILE & TIMETABLE VIEW MODAL --- */}
      {selectedStudent && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
            
            <div className="bg-slate-50 border-b border-slate-100 p-6 flex justify-between items-start shrink-0">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 text-2xl font-bold border-4 border-white shadow-sm shrink-0 uppercase">
                  {selectedStudent.name.split(' ').map((n: string) => n[0]).join('')}
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-800">{selectedStudent.name}</h2>
                  <p className="text-sm font-semibold text-slate-500">Index: {selectedStudent.id}</p>
                  <span className={`inline-block mt-2 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${selectedStudent.status === 'Active' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                    {selectedStudent.status}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => openEditModal(selectedStudent)} className="text-blue-600 hover:bg-blue-50 p-2 rounded-full transition-colors flex items-center gap-2 text-sm font-bold pr-4">
                  <Edit2 size={16} /> Edit Profile
                </button>
                <button onClick={() => setSelectedStudent(null)} className="text-slate-400 hover:text-slate-600 hover:bg-slate-200 p-2 rounded-full transition-colors"><X size={20} /></button>
              </div>
            </div>

            <div className="flex border-b border-slate-200 px-6 shrink-0 bg-white">
              <button onClick={() => setActiveProfileTab('profile')} className={`py-3 px-4 text-sm font-bold border-b-2 transition-colors ${activeProfileTab === 'profile' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>Profile Details</button>
              <button onClick={() => setActiveProfileTab('timetable')} className={`py-3 px-4 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${activeProfileTab === 'timetable' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}><CalendarDays size={16} /> Weekly Timetable</button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 bg-white relative">
              {activeProfileTab === 'profile' && (
                <div className="space-y-6 animate-in fade-in duration-300">
                  {selectedStudent.status === 'Suspended' && (
                    <div className="bg-red-50 rounded-xl border border-red-100 p-4">
                      <h3 className="text-sm font-bold text-red-800 mb-1 flex items-center gap-2"><AlertCircle size={16} /> Account Suspended</h3>
                      <p className="text-sm font-medium text-red-800 mt-1 pl-6">Student account is currently suspended. Platform access is restricted.</p>
                    </div>
                  )}
                  <div>
                    <h3 className="text-sm font-bold text-slate-800 mb-3 border-b border-slate-100 pb-2 flex items-center gap-2"><GraduationCap size={16} className="text-blue-500" /> Academic Profile</h3>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-100"><p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Grade</p><p className="font-bold text-slate-700 mt-0.5 text-sm truncate">{selectedStudent.grade}</p></div>
                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-100"><p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Section</p><p className="font-bold text-slate-700 mt-0.5 text-sm truncate">{selectedStudent.section}</p></div>
                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-100"><p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Medium</p><p className="font-bold text-slate-700 mt-0.5 text-sm truncate">{selectedStudent.medium}</p></div>
                    </div>
                    <div className="mt-4">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Enrolled Subjects ({selectedStudent.subjects.length})</p>
                      <div className="flex flex-wrap gap-2">
                        {selectedStudent.subjects.map((sub: string) => (
                          <span key={sub} className="px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-100 rounded-md text-xs font-semibold">{sub}</span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-bold text-slate-800 mb-3 border-b border-slate-100 pb-2 flex items-center gap-2"><Users size={16} className="text-emerald-500" /> Parent / Guardian Contact</h3>
                    <div className="bg-slate-50 rounded-xl border border-slate-100 p-4 space-y-3">
                      <div className="flex items-center gap-3"><Mail size={16} className="text-slate-400" /><div><p className="text-xs text-slate-500 font-medium">Email Address</p><p className="text-sm font-bold text-slate-800">{selectedStudent.parentEmail}</p></div></div>
                      <div className="flex items-center gap-3"><Phone size={16} className="text-slate-400" /><div><p className="text-xs text-slate-500 font-medium">Phone Number</p><p className="text-sm font-bold text-slate-800">{selectedStudent.parentPhone}</p></div></div>
                    </div>
                  </div>
                </div>
              )}

              {/* READ-ONLY TIMETABLE */}
              {activeProfileTab === 'timetable' && (
                <div className="animate-in fade-in duration-300 flex flex-col h-full">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-sm font-bold text-slate-800">Student Schedule</h3>
                    <p className="text-xs text-slate-500 italic">Auto-generated based on Class Timetable & Enrolled Subjects.</p>
                  </div>
                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse min-w-[700px]">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200">
                            <th className="p-3 text-xs font-bold text-slate-500 uppercase tracking-wider border-r border-slate-200 w-24 text-center">Time</th>
                            {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].map(day => <th key={day} className="p-3 text-xs font-bold text-slate-700 uppercase tracking-wider border-r border-slate-200 text-center w-1/5">{day}</th>)}
                          </tr>
                        </thead>
                        <tbody>
                          {timetableData.map((row, pIndex) => (
                            row.isBreak ? (
                              <tr key={pIndex} className="bg-amber-50/50 border-b border-slate-100"><td className="p-2 text-xs font-semibold text-amber-700 text-center border-r border-slate-200 whitespace-nowrap">{row.time}</td><td colSpan={5} className="p-2 text-xs font-bold text-amber-600 text-center uppercase tracking-[0.2em]">{row.label}</td></tr>
                            ) : (
                              <tr key={pIndex} className="border-b border-slate-100">
                                <td className="p-2 text-[10px] font-semibold text-slate-500 text-center border-r border-slate-200 whitespace-nowrap bg-slate-50">{row.time}</td>
                                {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].map(day => {
                                  const slot = row.days[day];
                                  return (
                                    <td key={day} className="p-1.5 border-r border-slate-100 last:border-none">
                                      {slot ? (
                                        <div className="bg-blue-50 border border-blue-100 rounded-lg p-2 h-full flex flex-col justify-center items-center text-center">
                                          <p className="text-xs font-bold text-blue-800">{slot.subject}</p>
                                          <div className="flex flex-col items-center gap-0.5 mt-1 text-[9px] font-medium text-slate-500"><span className="truncate w-full">{slot.teacher}</span><span className="flex items-center gap-1"><MapPin size={8} /> {slot.room}</span></div>
                                        </div>
                                      ) : (
                                        <div className="h-full min-h-[60px] flex items-center justify-center rounded-lg border-2 border-transparent text-slate-300"><span className="text-[10px] font-medium">- Free -</span></div>
                                      )}
                                    </td>
                                  );
                                })}
                              </tr>
                            )
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* --- ADD / EDIT STUDENT MODAL --- */}
      {isFormModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[60] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            
            <div className="bg-slate-50 border-b border-slate-100 p-5 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${formMode === 'add' ? 'bg-blue-100 text-blue-600' : 'bg-amber-100 text-amber-600'}`}>
                  {formMode === 'add' ? <GraduationCap size={20} /> : <Edit2 size={20} />}
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-800">{formMode === 'add' ? 'Enroll New Student' : 'Edit Student Profile'}</h2>
                  <p className="text-xs text-slate-500 font-medium">{formMode === 'add' ? 'Add student profile and academic details' : 'Update existing student records'}</p>
                </div>
              </div>
              <button onClick={() => setIsFormModalOpen(false)} className="text-slate-400 hover:text-slate-600 hover:bg-slate-200 p-2 rounded-full transition-colors"><X size={20} /></button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1">
              {error && <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm font-medium border border-red-200">{error}</div>}

              <form id="student-form" onSubmit={handleFormSubmit} className="space-y-6">
                
                {/* 1. Basic Info */}
                <div>
                  <h3 className="text-sm font-bold text-slate-800 mb-4 border-b border-slate-100 pb-2">Student Information</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">First Name</label>
                      <input type="text" required placeholder="e.g. John" value={formData.firstName} onChange={(e) => setFormData({...formData, firstName: e.target.value})} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-500 text-sm" />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Last Name</label>
                      <input type="text" required placeholder="e.g. Doe" value={formData.lastName} onChange={(e) => setFormData({...formData, lastName: e.target.value})} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-500 text-sm" />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Student ID / Index</label>
                      <input type="text" required placeholder="e.g. STU-2026-101" disabled={formMode === 'edit'} value={formData.studentId} onChange={(e) => setFormData({...formData, studentId: e.target.value})} className={`w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-500 text-sm ${formMode === 'edit' ? 'opacity-50 cursor-not-allowed' : ''}`} />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Student Email</label>
                      <input type="email" placeholder="student@school.edu" value={formData.studentEmail} onChange={(e) => setFormData({...formData, studentEmail: e.target.value})} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-500 text-sm" />
                    </div>
                  </div>
                </div>

                {/* 2. Academic Info */}
                <div>
                  <h3 className="text-sm font-bold text-slate-800 mb-4 border-b border-slate-100 pb-2">Academic Details</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Grade</label>
                      <select required value={formData.grade} onChange={handleGradeChange} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-500 text-sm text-slate-700">
                        <option value="" disabled>Select Grade</option>
                        {uniqueGrades.map(g => <option key={g as string} value={g as string}>{g as string}</option>)}
                      </select>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Section (Class)</label>
                      <select required value={formData.section} onChange={handleSectionChange} disabled={!formData.grade} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-500 text-sm text-slate-700 disabled:opacity-50">
                        <option value="" disabled>Select Section</option>
                        {availableSectionsForGrade.map(sec => <option key={sec as string} value={sec as string}>{sec as string}</option>)}
                      </select>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Medium</label>
                      <select required value={formData.medium} onChange={(e) => setFormData({...formData, medium: e.target.value})} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-500 text-sm text-slate-700">
                        <option value="" disabled>Select Medium</option>
                        <option value="English">English</option>
                        <option value="Sinhala">Sinhala</option>
                        <option value="Tamil">Tamil</option>
                      </select>
                    </div>
                  </div>

                  {/* O/L SMART SUBJECT SELECTOR */}
                  {isOL && (
                    <div className="space-y-4 animate-in fade-in duration-300 p-4 bg-slate-50 rounded-xl border border-slate-200 mt-6">
                      <h4 className="text-sm font-bold text-slate-800">O/L Subject Selection</h4>
                      <div className="bg-blue-50 p-3 rounded-lg border border-blue-100">
                        <p className="text-[10px] font-bold text-blue-800 mb-2 uppercase tracking-wider">Core Subjects (Compulsory)</p>
                        <div className="flex flex-wrap gap-2">
                          {olCoreSubjects.map(sub => (
                            <span key={sub} className="px-2.5 py-1 bg-white text-blue-700 rounded-md border border-blue-200 text-xs font-bold shadow-sm">
                              {sub} <CheckCircle size={10} className="inline ml-1 text-emerald-500"/>
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="flex flex-col gap-1.5">
                          <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Religion</label>
                          <select value={olSelections.religion} onChange={e => setOlSelections({...olSelections, religion: e.target.value})} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-100 text-slate-700">
                            <option value="">Select Religion</option>
                            {olReligions.map(r => <option key={r} value={r}>{r}</option>)}
                          </select>
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Bucket 1 (Aesthetics / Lit)</label>
                          <select value={olSelections.b1} onChange={e => setOlSelections({...olSelections, b1: e.target.value})} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-100 text-slate-700">
                            <option value="">Select Subject</option>
                            {olBucket1.map(r => <option key={r} value={r}>{r}</option>)}
                          </select>
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Bucket 2 (Commerce / Geog)</label>
                          <select value={olSelections.b2} onChange={e => setOlSelections({...olSelections, b2: e.target.value})} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-100 text-slate-700">
                            <option value="">Select Subject</option>
                            {olBucket2.map(r => <option key={r} value={r}>{r}</option>)}
                          </select>
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Bucket 3 (Tech / Health)</label>
                          <select value={olSelections.b3} onChange={e => setOlSelections({...olSelections, b3: e.target.value})} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-100 text-slate-700">
                            <option value="">Select Subject</option>
                            {olBucket3.map(r => <option key={r} value={r}>{r}</option>)}
                          </select>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* A/L SMART SUBJECT SELECTOR */}
                  {isAL && (
                    <div className="space-y-4 animate-in fade-in duration-300 p-4 bg-slate-50 rounded-xl border border-slate-200 mt-6">
                      <div className="flex flex-col gap-1.5 mb-4">
                        <label className="text-xs font-bold text-slate-800 uppercase tracking-wider">Select A/L Stream</label>
                        <select value={alStream} onChange={e => {setAlStream(e.target.value); setFormData({...formData, subjects: []})}} className="w-full sm:w-1/2 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-100 text-slate-700">
                          <option value="">Select Stream</option>
                          {alStreams.map(stream => <option key={stream} value={stream}>{stream}</option>)}
                        </select>
                      </div>

                      {alStream && (
                        <div className="animate-in fade-in duration-300">
                          <div className="flex items-center justify-between mb-2">
                            <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Select Enrolled Subjects</label>
                            <span className="text-xs font-bold text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full">Selected: {formData.subjects.length}</span>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {alSubjectOptions[alStream].map(subject => {
                              const isSelected = formData.subjects.includes(subject);
                              return (
                                <button
                                  key={subject} type="button" onClick={() => handleAlSubjectToggle(subject)}
                                  className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                                    isSelected ? 'bg-blue-100 border-blue-500 text-blue-700' : 'bg-white border-slate-200 text-slate-600 hover:border-blue-300 hover:bg-blue-50'
                                  }`}
                                >
                                  {subject} {isSelected && <CheckCircle size={12} className="inline ml-1 mb-0.5" />}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                </div>

                {/* 3. Parent Details */}
                <div>
                  <h3 className="text-sm font-bold text-slate-800 mb-4 border-b border-slate-100 pb-2">Parent / Guardian Contact</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Parent Email</label>
                      <input type="email" required placeholder="parent@email.com" value={formData.parentEmail} onChange={(e) => setFormData({...formData, parentEmail: e.target.value})} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-500 text-sm" />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Parent Phone</label>
                      <input type="tel" required placeholder="+94 77 000 0000" value={formData.parentPhone} onChange={(e) => setFormData({...formData, parentPhone: e.target.value})} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-500 text-sm" />
                    </div>
                  </div>
                </div>

              </form>
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3 shrink-0">
              <button onClick={() => setIsFormModalOpen(false)} className="px-4 py-2 text-slate-600 text-sm font-medium hover:bg-slate-200 rounded-lg transition-colors">Cancel</button>
              <button 
                type="submit" form="student-form" 
                disabled={isSubmitDisabled}
                className={`${formMode === 'add' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-amber-600 hover:bg-amber-700'} disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm`}
              >
                {formMode === 'add' ? 'Enroll Student' : 'Update Profile'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- SMART MESSAGING MODAL --- */}
      {isMessageModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="bg-slate-50 border-b border-slate-100 p-5 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="bg-purple-100 text-purple-600 p-2 rounded-lg"><Send size={20} /></div>
                <div>
                  <h2 className="text-lg font-bold text-slate-800">Compose Message</h2>
                  <p className="text-xs text-slate-500 font-medium">Broadcast updates directly to students</p>
                </div>
              </div>
              <button onClick={() => setIsMessageModalOpen(false)} className="text-slate-400 hover:text-slate-600 hover:bg-slate-200 p-2 rounded-full transition-colors"><X size={20} /></button>
            </div>
            
            <div className="p-6">
              <form id="compose-message-form" onSubmit={handleSendMessage} className="space-y-4">
                
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Send To</label>
                  <select 
                    value={messageForm.recipientType} 
                    onChange={(e) => setMessageForm({...messageForm, recipientType: e.target.value, targetGrade: '', targetSection: '', targetStudentId: ''})}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-100 focus:border-purple-500 transition-all text-sm text-slate-800 font-medium"
                  >
                    <option value="all">All Students</option>
                    <option value="grade">Specific Grade</option>
                    <option value="section">Specific Section</option>
                    <option value="individual">Individual Student</option>
                  </select>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  {messageForm.recipientType === 'grade' && (
                    <div className="flex flex-col gap-1.5 animate-in fade-in slide-in-from-top-2 duration-300">
                      <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Select Grade</label>
                      <select required value={messageForm.targetGrade} onChange={(e) => setMessageForm({...messageForm, targetGrade: e.target.value})} className="w-full px-4 py-2.5 bg-purple-50 border border-purple-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-200 focus:border-purple-500 transition-all text-sm text-purple-900 font-medium">
                        <option value="" disabled>Choose a grade...</option>
                        {uniqueGrades.map(g => <option key={g as string} value={g as string}>{g as string}</option>)}
                      </select>
                    </div>
                  )}

                  {messageForm.recipientType === 'section' && (
                    <div className="flex flex-col gap-1.5 animate-in fade-in slide-in-from-top-2 duration-300">
                      <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Select Section</label>
                      <select required value={messageForm.targetSection} onChange={(e) => setMessageForm({...messageForm, targetSection: e.target.value})} className="w-full px-4 py-2.5 bg-purple-50 border border-purple-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-200 focus:border-purple-500 transition-all text-sm text-purple-900 font-medium">
                        <option value="" disabled>Choose a section...</option>
                        {Array.from(new Set(schoolClasses.map(c => c.section))).sort().map(sec => <option key={sec as string} value={sec as string}>{sec as string} Students</option>)}
                      </select>
                    </div>
                  )}

                  {messageForm.recipientType === 'individual' && (
                    <div className="flex flex-col gap-1.5 animate-in fade-in slide-in-from-top-2 duration-300">
                      <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Select Student</label>
                      <select required value={messageForm.targetStudentId} onChange={(e) => setMessageForm({...messageForm, targetStudentId: e.target.value})} className="w-full px-4 py-2.5 bg-purple-50 border border-purple-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-200 focus:border-purple-500 transition-all text-sm text-purple-900 font-medium">
                        <option value="" disabled>Choose a student...</option>
                        {students.map((s) => (<option key={s.id} value={s.id}>{s.name} ({s.grade})</option>))}
                      </select>
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-1.5 pt-2 border-t border-slate-100">
                  <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Message Subject</label>
                  <input type="text" required placeholder="e.g. Science Fair Registration Details" value={messageForm.subject} onChange={(e) => setMessageForm({...messageForm, subject: e.target.value})} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-100 focus:border-purple-500 transition-all text-sm text-slate-800" />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Message Details</label>
                  <div className="relative">
                    <AlignLeft size={16} className="absolute left-3 top-3 text-slate-400" />
                    <textarea required placeholder="Type your message here..." rows={4} value={messageForm.messageBody} onChange={(e) => setMessageForm({...messageForm, messageBody: e.target.value})} className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-100 focus:border-purple-500 transition-all text-sm text-slate-800 resize-none" />
                  </div>
                </div>
              </form>
            </div>
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
              <button onClick={() => setIsMessageModalOpen(false)} className="px-4 py-2 text-slate-600 text-sm font-medium hover:bg-slate-200 rounded-lg transition-colors">Cancel</button>
              <button type="submit" form="compose-message-form" className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm flex items-center gap-2">
                <Send size={16} /> Send Message
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}