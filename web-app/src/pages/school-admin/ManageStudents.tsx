import { useState } from 'react';
import { Search, Plus, Mail, Phone, X, GraduationCap, CheckCircle, XCircle, Eye, User, BookOpen, MessageSquare, Send, AlignLeft, Users, CalendarDays, MapPin, Edit2, Edit3, Save, Trash2, AlertCircle } from 'lucide-react';

// --- DYNAMIC SUBJECT MAPPING ---
const subjectOptions: Record<string, string[]> = {
  "O/L": ["Mathematics", "Science", "English", "Sinhala", "Tamil", "History", "Religion", "ICT", "Business & Accounting", "Art", "Dancing", "Music"],
  "Science Section": ["Combined Mathematics", "Biology", "Physics", "Chemistry", "Agriculture", "General English"],
  "Commerce Section": ["Accounting", "Business Studies", "Economics", "ICT", "General English"],
  "Technology Section": ["Engineering Technology (ET)", "Bio Systems Technology (BST)", "Science for Technology (SFT)", "ICT", "General English"],
  "Arts Section": ["Sinhala", "Tamil", "English", "Geography", "History", "Logic", "Political Science", "Media Studies"]
};

// --- MOCK DATA ---
const initialStudents = [
  { id: 'STU-2024-001', name: "Kavindu Perera", grade: "Grade 10", section: "O/L", medium: "Sinhala", subjects: ["Mathematics", "Science", "History"], parentEmail: "p.perera@email.com", parentPhone: "+94 77 111 2222", status: "Active" },
  { id: 'STU-2024-002', name: "Sanduni Silva", grade: "Grade 11", section: "O/L", medium: "English", subjects: ["Mathematics", "Science", "Business & Accounting"], parentEmail: "silva.fam@email.com", parentPhone: "+94 77 222 3333", status: "Active" },
  { id: 'STU-2023-145', name: "Tharindu Fernando", grade: "Grade 12", section: "Science Section", medium: "English", subjects: ["Physics", "Combined Mathematics", "Chemistry"], parentEmail: "tharindu.parent@email.com", parentPhone: "+94 77 333 4444", status: "Suspended" },
  { id: 'STU-2025-089', name: "Nethmi Jayasuriya", grade: "Grade 12", section: "Arts Section", medium: "Sinhala", subjects: ["Geography", "Logic", "Political Science"], parentEmail: "nethmi.mom@email.com", parentPhone: "+94 77 444 5555", status: "Active" },
  { id: 'STU-2022-302', name: "Dineth Rajapakse", grade: "Grade 13", section: "Science Section", medium: "English", subjects: ["Biology", "Physics", "Chemistry"], parentEmail: "rajapakse@email.com", parentPhone: "+94 77 555 6666", status: "Active" },
];

// --- MOCK TIMETABLE GENERATOR FOR STUDENTS ---
const generateStudentTimetable = (subjects: string[]) => {
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  const periods = [
    { id: 1, time: '08:00 - 08:40' }, { id: 2, time: '08:40 - 09:20' }, 
    { id: 'break', time: '09:20 - 09:40', label: 'Interval' },
    { id: 3, time: '09:40 - 10:20' }, { id: 4, time: '10:20 - 11:00' },
    { id: 5, time: '11:00 - 11:40' }, { id: 6, time: '11:40 - 12:20' },
    { id: 7, time: '12:20 - 01:00' }, { id: 8, time: '01:00 - 01:40' }
  ];

  return periods.map(period => {
    if (period.id === 'break') return { ...period, isBreak: true };
    const row: any = { ...period, isBreak: false, days: {} };
    days.forEach(day => {
      if (subjects && subjects.length > 0 && Math.random() > 0.3) {
        const randomSubject = subjects[Math.floor(Math.random() * subjects.length)];
        row.days[day] = { subject: randomSubject, room: `Room ${Math.floor(Math.random() * 50) + 100}`, teacher: "Assigned Staff" };
      } else {
        row.days[day] = null;
      }
    });
    return row;
  });
};

export default function ManageStudents() {
  const [searchTerm, setSearchTerm] = useState('');
  const [gradeFilter, setGradeFilter] = useState('all');
  const [students, setStudents] = useState(initialStudents);

  // View Profile State
  const [selectedStudent, setSelectedStudent] = useState<any | null>(null);
  const [activeProfileTab, setActiveProfileTab] = useState<'profile' | 'timetable'>('profile');

  // Timetable Edit State
  const [timetableData, setTimetableData] = useState<any[]>([]);
  const [isEditingTimetable, setIsEditingTimetable] = useState(false);
  const [editingSlot, setEditingSlot] = useState<{ pIndex: number, day: string } | null>(null);
  const [slotForm, setSlotForm] = useState({ subject: '', room: '', teacher: '' });

  // Form Modal State (Handles BOTH Add and Edit)
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [formMode, setFormMode] = useState<'add' | 'edit'>('add');
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null);

  const [formData, setFormData] = useState<{
    firstName: string; lastName: string; studentEmail: string; studentId: string; 
    grade: string; section: string; medium: string; subjects: string[]; 
    parentEmail: string; parentPhone: string;
  }>({
    firstName: '', lastName: '', studentEmail: '', studentId: '', 
    grade: '', section: '', medium: '', subjects: [], parentEmail: '', parentPhone: ''
  });

  // Messaging State
  const [isMessageModalOpen, setIsMessageModalOpen] = useState(false);
  const [messageForm, setMessageForm] = useState({
    recipientType: 'all', targetGrade: '', targetSection: '', targetStudentId: '', subject: '', messageBody: ''
  });
  
  // Filter Logic
  const filteredStudents = students.filter(student => {
    const matchesSearch = student.name.toLowerCase().includes(searchTerm.toLowerCase()) || student.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesGrade = gradeFilter === 'all' || student.grade.includes(gradeFilter);
    return matchesSearch && matchesGrade;
  });

  const handleStatusToggle = (studentId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'Active' ? 'Suspended' : 'Active';
    setStudents(students.map(s => s.id === studentId ? { ...s, status: newStatus } : s));
    if (selectedStudent && selectedStudent.id === studentId) {
      setSelectedStudent({ ...selectedStudent, status: newStatus });
    }
  };

  const handleSubjectToggle = (subject: string) => {
    setFormData(prev => {
      const isSelected = prev.subjects.includes(subject);
      if (isSelected) {
        return { ...prev, subjects: prev.subjects.filter(s => s !== subject) };
      } else {
        return { ...prev, subjects: [...prev.subjects, subject] };
      }
    });
  };

  const handleSectionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFormData({ ...formData, section: e.target.value, subjects: [] });
  };

  // --- MODAL CONTROLLERS ---

  const openAddModal = () => {
    setFormMode('add');
    setEditingStudentId(null);
    setFormData({ firstName: '', lastName: '', studentEmail: '', studentId: '', grade: '', section: '', medium: '', subjects: [], parentEmail: '', parentPhone: '' });
    setIsFormModalOpen(true);
  };

  const openEditModal = (student: any) => {
    const [firstName, ...lastNames] = student.name.split(' ');
    setFormMode('edit');
    setEditingStudentId(student.id);
    setFormData({
      firstName: firstName || '',
      lastName: lastNames.join(' ') || '',
      studentId: student.id,
      studentEmail: student.studentEmail || '', 
      grade: student.grade,
      section: student.section,
      medium: student.medium,
      subjects: student.subjects || [],
      parentEmail: student.parentEmail,
      parentPhone: student.parentPhone
    });
    setIsFormModalOpen(true);
    setSelectedStudent(null);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const submittedStudent = {
      id: formData.studentId,
      name: `${formData.firstName} ${formData.lastName}`,
      grade: formData.grade,
      section: formData.section,
      medium: formData.medium,
      subjects: formData.subjects,
      parentEmail: formData.parentEmail,
      parentPhone: formData.parentPhone,
      status: formMode === 'edit' ? (students.find(s => s.id === editingStudentId)?.status || 'Active') : "Active"
    };

    if (formMode === 'edit') {
      setStudents(students.map(s => s.id === editingStudentId ? submittedStudent : s));
    } else {
      setStudents([submittedStudent, ...students]);
    }
    setIsFormModalOpen(false);
  };

  const openMessageModal = (type: string, studentId?: string) => {
    setMessageForm({ ...messageForm, recipientType: type, targetStudentId: studentId || '', targetGrade: '', targetSection: '', subject: '', messageBody: '' });
    setIsMessageModalOpen(true);
  };

  // The missing function from before
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Sending Message to Student(s):", messageForm);
    // You can add API logic here
    setIsMessageModalOpen(false);
    setMessageForm({
      recipientType: 'all',
      targetGrade: '',
      targetSection: '',
      targetStudentId: '',
      subject: '',
      messageBody: ''
    });
  };

  const handleViewProfile = (student: any) => {
    setSelectedStudent(student);
    setActiveProfileTab('profile');
    setIsEditingTimetable(false);
    setTimetableData(generateStudentTimetable(student.subjects)); // Generate mock timetable data
  };

  // --- TIMETABLE EDIT HANDLERS ---
  const handleSlotClick = (pIndex: number, day: string, currentData: any) => {
    if (!isEditingTimetable) return;
    setEditingSlot({ pIndex, day });
    if (currentData) {
      setSlotForm({ subject: currentData.subject || '', room: currentData.room || '', teacher: currentData.teacher || '' });
    } else {
      setSlotForm({ subject: '', room: '', teacher: '' });
    }
  };

  const handleSaveSlot = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSlot) return;
    const newData = [...timetableData];
    newData[editingSlot.pIndex].days[editingSlot.day] = { ...slotForm };
    setTimetableData(newData);
    setEditingSlot(null);
  };

  const handleClearSlot = () => {
    if (!editingSlot) return;
    const newData = [...timetableData];
    newData[editingSlot.pIndex].days[editingSlot.day] = null;
    setTimetableData(newData);
    setEditingSlot(null);
  };

  return (
    <div className="space-y-6 relative">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Manage Students</h1>
          <p className="text-sm text-slate-500 font-medium">View, search, and manage student enrollments and academic details.</p>
        </div>
        <div className="flex w-full sm:w-auto gap-3">
          <button onClick={() => openMessageModal('all')} className="flex-1 sm:flex-none bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-colors shadow-sm">
            <MessageSquare size={18} /> Message Students
          </button>
          <button onClick={openAddModal} className="flex-1 sm:flex-none bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-colors shadow-sm">
            <Plus size={18} /> Add Student
          </button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input type="text" placeholder="Search by student name or ID..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all text-sm" />
        </div>
        <select value={gradeFilter} onChange={(e) => setGradeFilter(e.target.value)} className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 text-slate-700 font-medium text-sm">
          <option value="all">All Grades</option>
          <option value="10">Grade 10 (O/L)</option>
          <option value="11">Grade 11 (O/L)</option>
          <option value="12">Grade 12 (A/L)</option>
          <option value="13">Grade 13 (A/L)</option>
        </select>
      </div>

      {/* Students Table */}
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
              {filteredStudents.map((student) => (
                <tr key={student.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 font-bold border-2 border-white shadow-sm shrink-0 uppercase">
                        {student.name.split(' ').map(n => n[0]).join('')}
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
                    <div className="flex items-center gap-2 text-sm text-slate-600 mb-1">
                      <Mail size={14} className="text-slate-400" /> {student.parentEmail}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <Phone size={14} className="text-slate-400" /> {student.parentPhone}
                    </div>
                  </td>
                  <td className="p-4 text-center">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      student.status === 'Active' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {student.status}
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center justify-center gap-2">
                      <button onClick={() => handleViewProfile(student)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors" title="View Profile">
                        <Eye size={18} />
                      </button>
                      <button onClick={() => openEditModal(student)} className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-md transition-colors" title="Edit Student">
                        <Edit2 size={18} />
                      </button>
                      <button onClick={() => openMessageModal('individual', student.id)} className="p-1.5 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded-md transition-colors" title="Message Student">
                        <MessageSquare size={18} />
                      </button>
                      <button onClick={() => handleStatusToggle(student.id, student.status)} className={`p-1.5 rounded-md transition-colors ${student.status === 'Active' ? 'text-red-400 hover:text-red-600 hover:bg-red-50' : 'text-emerald-400 hover:text-emerald-600 hover:bg-emerald-50'}`} title={student.status === 'Active' ? 'Suspend Student' : 'Reactivate Student'}>
                        {student.status === 'Active' ? <XCircle size={18} /> : <CheckCircle size={18} />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredStudents.length === 0 && (
            <div className="p-8 text-center text-slate-500 flex flex-col items-center gap-2">
              <User size={32} className="text-slate-300" />
              <p>No students found matching your filters.</p>
            </div>
          )}
        </div>
      </div>

      {/* --- STUDENT PROFILE & TIMETABLE VIEW MODAL --- */}
      {selectedStudent && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
            
            {/* Modal Header */}
            <div className="bg-slate-50 border-b border-slate-100 p-6 flex justify-between items-start shrink-0">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 text-2xl font-bold border-4 border-white shadow-sm shrink-0 uppercase">
                  {selectedStudent.name.split(' ').map((n: string) => n[0]).join('')}
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-800">{selectedStudent.name}</h2>
                  <p className="text-sm font-semibold text-slate-500">Index: {selectedStudent.id}</p>
                  <span className={`inline-block mt-2 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                    selectedStudent.status === 'Active' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                  }`}>
                    {selectedStudent.status}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => openEditModal(selectedStudent)} className="text-blue-600 hover:bg-blue-50 p-2 rounded-full transition-colors flex items-center gap-2 text-sm font-bold pr-4">
                  <Edit2 size={16} /> Edit Profile
                </button>
                <button onClick={() => {setSelectedStudent(null); setIsEditingTimetable(false);}} className="text-slate-400 hover:text-slate-600 hover:bg-slate-200 p-2 rounded-full transition-colors">
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex border-b border-slate-200 px-6 shrink-0 bg-white">
              <button onClick={() => {setActiveProfileTab('profile'); setIsEditingTimetable(false);}} className={`py-3 px-4 text-sm font-bold border-b-2 transition-colors ${activeProfileTab === 'profile' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
                Profile Details
              </button>
              <button onClick={() => setActiveProfileTab('timetable')} className={`py-3 px-4 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${activeProfileTab === 'timetable' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
                <CalendarDays size={16} /> Weekly Timetable
              </button>
            </div>

            {/* Scrollable Content Area */}
            <div className="p-6 overflow-y-auto flex-1 bg-white relative">
              
              {/* TAB 1: PROFILE DETAILS */}
              {activeProfileTab === 'profile' && (
                <div className="space-y-6 animate-in fade-in duration-300">
                  <div>
                    <h3 className="text-sm font-bold text-slate-800 mb-3 border-b border-slate-100 pb-2 flex items-center gap-2">
                      <GraduationCap size={16} className="text-blue-500" /> Academic Profile
                    </h3>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Grade</p>
                        <p className="font-bold text-slate-700 mt-0.5 text-sm truncate">{selectedStudent.grade}</p>
                      </div>
                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Section</p>
                        <p className="font-bold text-slate-700 mt-0.5 text-sm truncate">{selectedStudent.section}</p>
                      </div>
                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Medium</p>
                        <p className="font-bold text-slate-700 mt-0.5 text-sm truncate">{selectedStudent.medium}</p>
                      </div>
                    </div>
                    
                    <div className="mt-4">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Enrolled Subjects ({selectedStudent.subjects.length})</p>
                      <div className="flex flex-wrap gap-2">
                        {selectedStudent.subjects.map((sub: string) => (
                          <span key={sub} className="px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-100 rounded-md text-xs font-semibold">
                            {sub}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-bold text-slate-800 mb-3 border-b border-slate-100 pb-2 flex items-center gap-2">
                      <Users size={16} className="text-emerald-500" /> Parent / Guardian Contact
                    </h3>
                    <div className="bg-slate-50 rounded-xl border border-slate-100 p-4 space-y-3">
                      <div className="flex items-center gap-3">
                        <Mail size={16} className="text-slate-400" />
                        <div>
                          <p className="text-xs text-slate-500 font-medium">Email Address</p>
                          <p className="text-sm font-bold text-slate-800">{selectedStudent.parentEmail}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Phone size={16} className="text-slate-400" />
                        <div>
                          <p className="text-xs text-slate-500 font-medium">Phone Number</p>
                          <p className="text-sm font-bold text-slate-800">{selectedStudent.parentPhone}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: TIMETABLE */}
              {activeProfileTab === 'timetable' && (
                <div className="animate-in fade-in duration-300 flex flex-col h-full">
                  
                  {/* Timetable Header / Controls */}
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-sm font-bold text-slate-800">Student Schedule</h3>
                    <button 
                      onClick={() => setIsEditingTimetable(!isEditingTimetable)}
                      className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors ${
                        isEditingTimetable 
                          ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' 
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {isEditingTimetable ? <><Save size={16}/> Done Editing</> : <><Edit3 size={16}/> Edit Timetable</>}
                    </button>
                  </div>

                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse min-w-[700px]">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200">
                            <th className="p-3 text-xs font-bold text-slate-500 uppercase tracking-wider border-r border-slate-200 w-24 text-center">Time</th>
                            {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].map(day => (
                              <th key={day} className="p-3 text-xs font-bold text-slate-700 uppercase tracking-wider border-r border-slate-200 text-center w-1/5">{day}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {timetableData.map((row, pIndex) => (
                            row.isBreak ? (
                              <tr key={pIndex} className="bg-amber-50/50 border-b border-slate-100">
                                <td className="p-2 text-xs font-semibold text-amber-700 text-center border-r border-slate-200 whitespace-nowrap">{row.time}</td>
                                <td colSpan={5} className="p-2 text-xs font-bold text-amber-600 text-center uppercase tracking-[0.2em]">{row.label}</td>
                              </tr>
                            ) : (
                              <tr key={pIndex} className="border-b border-slate-100">
                                <td className="p-2 text-[10px] font-semibold text-slate-500 text-center border-r border-slate-200 whitespace-nowrap bg-slate-50">{row.time}</td>
                                {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].map(day => {
                                  const slot = row.days[day];
                                  return (
                                    <td 
                                      key={day} 
                                      onClick={() => handleSlotClick(pIndex, day, slot)}
                                      className={`p-1.5 border-r border-slate-100 last:border-none transition-all ${
                                        isEditingTimetable ? 'cursor-pointer hover:bg-blue-50/50' : ''
                                      }`}
                                    >
                                      {slot ? (
                                        <div className={`bg-blue-50 border border-blue-100 rounded-lg p-2 h-full flex flex-col justify-center items-center text-center ${isEditingTimetable ? 'hover:border-blue-400 shadow-sm' : ''}`}>
                                          <p className="text-xs font-bold text-blue-800">{slot.subject}</p>
                                          <div className="flex items-center gap-1 mt-1 text-[9px] font-medium text-slate-500">
                                            <MapPin size={10} /> {slot.room}
                                          </div>
                                        </div>
                                      ) : (
                                        <div className={`h-full min-h-[60px] flex items-center justify-center rounded-lg border-2 border-transparent ${isEditingTimetable ? 'border-dashed border-slate-200 hover:border-blue-400 hover:bg-blue-50 text-blue-500' : 'text-slate-300'}`}>
                                          <span className={`text-[10px] font-medium ${isEditingTimetable ? 'font-bold' : ''}`}>
                                            {isEditingTimetable ? '+ Add Class' : '- Free -'}
                                          </span>
                                        </div>
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
                  
                  {isEditingTimetable && (
                     <div className="mt-4 p-3 bg-blue-50 border border-blue-100 rounded-lg flex items-start gap-2 text-blue-700 text-xs font-medium">
                       <AlertCircle size={14} className="shrink-0 mt-0.5" />
                       <p>You are currently in Edit Mode. Click on any slot in the grid above to assign a subject and room, or mark it as a free period.</p>
                     </div>
                  )}
                  {!isEditingTimetable && (
                    <p className="text-xs text-slate-400 mt-4 text-center">Timetable is generated based on the master schedule of enrolled subjects.</p>
                  )}
                </div>
              )}

            </div>
          </div>
        </div>
      )}

      {/* --- SLOT EDITOR MODAL (Only shows when clicking a slot in edit mode) --- */}
      {editingSlot && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4 animate-in fade-in zoom-in-95 duration-200">
           <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
              <div className="bg-slate-50 border-b border-slate-100 p-4 flex justify-between items-center">
                <div>
                  <h3 className="font-bold text-slate-800">Edit Schedule Slot</h3>
                  <p className="text-xs font-medium text-slate-500">{editingSlot.day} • {timetableData[editingSlot.pIndex].time}</p>
                </div>
                <button onClick={() => setEditingSlot(null)} className="text-slate-400 hover:text-slate-600 bg-slate-100 hover:bg-slate-200 p-1.5 rounded-full"><X size={16} /></button>
              </div>
              <div className="p-5">
                <form id="slot-form" onSubmit={handleSaveSlot} className="space-y-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Subject</label>
                    <select 
                      required 
                      value={slotForm.subject} 
                      onChange={(e) => setSlotForm({...slotForm, subject: e.target.value})} 
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-500"
                    >
                      <option value="" disabled>Select Subject</option>
                      {selectedStudent?.subjects?.map((sub: string) => (
                        <option key={sub} value={sub}>{sub}</option>
                      ))}
                      <option disabled>---</option>
                      <option value="Study Hall">Study Hall</option>
                      <option value="Library">Library</option>
                      <option value="PE / Sports">PE / Sports</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Teacher</label>
                    <input type="text" placeholder="e.g. Mr. Perera" value={slotForm.teacher} onChange={(e) => setSlotForm({...slotForm, teacher: e.target.value})} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-500" />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Room / Location</label>
                    <input type="text" required placeholder="e.g. Room 101" value={slotForm.room} onChange={(e) => setSlotForm({...slotForm, room: e.target.value})} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-500" />
                  </div>
                </form>
              </div>
              <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-between items-center">
                <button type="button" onClick={handleClearSlot} className="text-xs font-bold text-red-600 hover:text-red-700 flex items-center gap-1"><Trash2 size={14}/> Clear Slot</button>
                <div className="flex gap-2">
                  <button onClick={() => setEditingSlot(null)} className="px-3 py-1.5 text-slate-600 text-xs font-bold hover:bg-slate-200 rounded-lg">Cancel</button>
                  <button type="submit" form="slot-form" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded-lg text-xs font-bold shadow-sm">Save</button>
                </div>
              </div>
           </div>
        </div>
      )}

      {/* --- ADD / EDIT STUDENT MODAL --- */}
      {isFormModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[60] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            
            <div className="bg-slate-50 border-b border-slate-100 p-5 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${formMode === 'add' ? 'bg-blue-100 text-blue-600' : 'bg-amber-100 text-amber-600'}`}>
                  {formMode === 'add' ? <GraduationCap size={20} /> : <Edit2 size={20} />}
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-800">
                    {formMode === 'add' ? 'Enroll New Student' : 'Edit Student Profile'}
                  </h2>
                  <p className="text-xs text-slate-500 font-medium">
                    {formMode === 'add' ? 'Add student profile and academic details' : 'Update existing student records'}
                  </p>
                </div>
              </div>
              <button onClick={() => setIsFormModalOpen(false)} className="text-slate-400 hover:text-slate-600 hover:bg-slate-200 p-2 rounded-full transition-colors"><X size={20} /></button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1">
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
                      <select required value={formData.grade} onChange={(e) => setFormData({...formData, grade: e.target.value})} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-500 text-sm text-slate-700">
                        <option value="" disabled>Select Grade</option>
                        <option value="Grade 10">Grade 10 (O/L)</option>
                        <option value="Grade 11">Grade 11 (O/L)</option>
                        <option value="Grade 12">Grade 12 (A/L)</option>
                        <option value="Grade 13">Grade 13 (A/L)</option>
                      </select>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Section</label>
                      <select required value={formData.section} onChange={handleSectionChange} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-500 text-sm text-slate-700">
                        <option value="" disabled>Select Section</option>
                        {Object.keys(subjectOptions).map(sec => <option key={sec} value={sec}>{sec}</option>)}
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

                  {formData.section && (
                    <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Select All Enrolled Subjects</label>
                        <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">Selected: {formData.subjects.length}</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {subjectOptions[formData.section].map(subject => {
                          const isSelected = formData.subjects.includes(subject);
                          return (
                            <button
                              key={subject} type="button" onClick={() => handleSubjectToggle(subject)}
                              className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                                isSelected ? 'bg-blue-100 border-blue-500 text-blue-700' : 'bg-white border-slate-200 text-slate-600 hover:border-blue-300 hover:bg-slate-50'
                              }`}
                            >
                              {subject} {isSelected && <CheckCircle size={12} className="inline ml-1 mb-0.5" />}
                            </button>
                          );
                        })}
                      </div>
                      {formData.subjects.length === 0 && <p className="text-xs text-amber-600 mt-2 font-medium">Please select all subjects the student is enrolled in.</p>}
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
                disabled={formData.subjects.length === 0 && formData.section !== ''}
                className={`${formMode === 'add' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-amber-600 hover:bg-amber-700'} disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm`}
              >
                {formMode === 'add' ? 'Save Student' : 'Update Profile'}
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
                        <option value="Grade 10">Grade 10</option>
                        <option value="Grade 11">Grade 11</option>
                        <option value="Grade 12">Grade 12</option>
                        <option value="Grade 13">Grade 13</option>
                      </select>
                    </div>
                  )}

                  {messageForm.recipientType === 'section' && (
                    <div className="flex flex-col gap-1.5 animate-in fade-in slide-in-from-top-2 duration-300">
                      <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Select Section</label>
                      <select required value={messageForm.targetSection} onChange={(e) => setMessageForm({...messageForm, targetSection: e.target.value})} className="w-full px-4 py-2.5 bg-purple-50 border border-purple-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-200 focus:border-purple-500 transition-all text-sm text-purple-900 font-medium">
                        <option value="" disabled>Choose a section...</option>
                        {Object.keys(subjectOptions).map((sec) => (<option key={sec} value={sec}>{sec} Students</option>))}
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