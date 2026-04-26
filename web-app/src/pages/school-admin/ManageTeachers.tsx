import { useState, useEffect } from 'react';
import { Search, Plus, Mail, Phone, X, Users, BookOpen, CheckCircle, XCircle, Eye, UserCheck, Briefcase, AlertCircle, MessageSquare, Send, AlignLeft, CalendarDays, MapPin, Edit2 } from 'lucide-react';

const subjectOptions: Record<string, string[]> = {
  "O/L": ["Mathematics", "Science", "English", "Sinhala", "Tamil", "History", "Religion", "ICT", "Business & Accounting"],
  "Science Section": ["Combined Mathematics", "Biology", "Physics", "Chemistry", "Agriculture"],
  "Commerce Section": ["Accounting", "Business Studies", "Economics", "ICT"],
  "Technology Section": ["Engineering Technology (ET)", "Bio Systems Technology (BST)", "Science for Technology (SFT)", "ICT"],
  "Arts Section": ["Sinhala", "Tamil", "English", "Geography", "History", "Logic", "Political Science"]
};

// --- REAL TIMETABLE FORMATTER ---
const formatTeacherTimetable = (dbTimetable: any[]) => {
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
      const assignedClass = dbTimetable.find(slot => slot.day_of_week === day && slot.period_number === period.p);
      
      if (assignedClass) {
        row.days[day] = { 
          class: `${assignedClass.grade} - ${assignedClass.section}`, 
          subject: assignedClass.subject, 
          room: assignedClass.room_number || "TBD" 
        };
      } else {
        row.days[day] = null; 
      }
    });
    return row;
  });
};

export default function ManageTeachers() {
  const [adminEmail, setAdminEmail] = useState('');
  const [teachers, setTeachers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const [searchTerm, setSearchTerm] = useState('');
  const [deptFilter, setDeptFilter] = useState('all');
  
  // Modal States
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingDbId, setEditingDbId] = useState<string | null>(null);
  
  const [selectedTeacher, setSelectedTeacher] = useState<any | null>(null);
  const [activeProfileTab, setActiveProfileTab] = useState<'profile' | 'timetable'>('profile');
  
  const [timetableData, setTimetableData] = useState<any[]>([]);
  
  const [isMessageModalOpen, setIsMessageModalOpen] = useState(false);
  const [messageForm, setMessageForm] = useState({ recipientType: 'all', targetSection: '', targetTeacherId: '', subject: '', messageBody: '' });
  
  // FIXED: Added isClassTeacher to form state
  const [formData, setFormData] = useState({ 
    fullName: '', staffId: '', email: '', phone: '', department: '', 
    subject: '', medium: '', status: 'Active', password: '', isClassTeacher: false 
  });

  useEffect(() => {
    const storedUser = localStorage.getItem('schoolConnectUser');
    if (storedUser) {
      const parsedUser = JSON.parse(storedUser);
      setAdminEmail(parsedUser.email);
      fetchTeachers(parsedUser.email);
    }
  }, []);

  const fetchTeachers = async (email: string) => {
    try {
      const timestamp = new Date().getTime();
      const response = await fetch(`http://localhost:5000/api/school-admin/${email}/teachers?t=${timestamp}`, {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
      if (response.ok) {
        const data = await response.json();
        
        const formattedTeachers = data.map((t: any) => ({
          dbId: t.id,
          id: t.staff_id || "N/A",
          name: t.full_name || "Unknown Teacher",
          department: t.department || "Unassigned",
          subject: t.subject || "Not Assigned",
          medium: t.medium || "N/A",
          email: t.email || "No Email",
          phone: t.phone_number || "N/A",
          status: t.status || "Active",
          isClassTeacher: t.is_class_teacher || false, // Fetch boolean
          joined: new Date(t.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
        }));
        setTeachers(formattedTeachers);
      }
    } catch (err) {
      console.error("Failed to fetch teachers", err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchTeacherTimetable = async (teacherDbId: string) => {
    try {
      const res = await fetch(`http://localhost:5000/api/school-admin/${adminEmail}/teachers/${teacherDbId}/timetable`);
      if (res.ok) {
        const data = await res.json();
        setTimetableData(formatTeacherTimetable(data));
      }
    } catch (err) {
      console.error("Failed to fetch timetable", err);
    }
  };

  const handleAddTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const payload = { ...formData, teacherEmail: formData.email };
    try {
      const response = await fetch(`http://localhost:5000/api/school-admin/${adminEmail}/teachers`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      });
      if (response.ok) {
        setIsAddModalOpen(false);
        setFormData({ fullName: '', staffId: '', email: '', phone: '', department: '', subject: '', medium: '', status: 'Active', password: '', isClassTeacher: false });
        fetchTeachers(adminEmail);
      } else {
        const data = await response.json();
        setError(data.error || "Failed to add teacher.");
      }
    } catch (err) { setError("Server connection error."); }
  };

  const handleOpenEditModal = (teacher: any) => {
    setEditingDbId(teacher.dbId);
    setFormData({
      fullName: teacher.name, staffId: teacher.id, email: teacher.email, phone: teacher.phone === "N/A" ? "" : teacher.phone,
      department: teacher.department, subject: teacher.subject === "Not Assigned" ? "" : teacher.subject, 
      medium: teacher.medium, status: teacher.status, password: '', isClassTeacher: teacher.isClassTeacher
    });
    setIsEditModalOpen(true);
  };

  const handleUpdateTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const payload = { ...formData, teacherEmail: formData.email };
    try {
      const response = await fetch(`http://localhost:5000/api/school-admin/${adminEmail}/teachers/${editingDbId}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      });
      if (response.ok) {
        setIsEditModalOpen(false);
        setEditingDbId(null);
        setFormData({ fullName: '', staffId: '', email: '', phone: '', department: '', subject: '', medium: '', status: 'Active', password: '', isClassTeacher: false });
        fetchTeachers(adminEmail); 
      } else {
        const data = await response.json();
        setError(data.error || "Failed to update teacher.");
      }
    } catch (err) { setError("Server connection error."); }
  };

  const handleStatusToggle = async (dbId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'Active' ? 'Inactive' : 'Active';
    setTeachers(teachers.map(t => t.dbId === dbId ? { ...t, status: newStatus } : t));
    const teacherToUpdate = teachers.find(t => t.dbId === dbId);
    if (!teacherToUpdate) return;
    try {
      await fetch(`http://localhost:5000/api/school-admin/${adminEmail}/teachers/${dbId}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: teacherToUpdate.name, teacherEmail: teacherToUpdate.email, phone: teacherToUpdate.phone === "N/A" ? "" : teacherToUpdate.phone,
          staffId: teacherToUpdate.id, department: teacherToUpdate.department, subject: teacherToUpdate.subject === "Not Assigned" ? "" : teacherToUpdate.subject,
          medium: teacherToUpdate.medium, status: newStatus, isClassTeacher: teacherToUpdate.isClassTeacher 
        }),
      });
    } catch (err) { console.error("Failed to update status", err); }
  };

  const handleViewProfile = (teacher: any) => {
    setSelectedTeacher(teacher);
    setActiveProfileTab('profile');
    setTimetableData(formatTeacherTimetable([])); 
    fetchTeacherTimetable(teacher.dbId);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch(`http://localhost:5000/api/school-admin/${adminEmail}/messages/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(messageForm),
      });

      if (response.ok) {
        setIsMessageModalOpen(false);
        setMessageForm({ recipientType: 'all', targetSection: '', targetTeacherId: '', subject: '', messageBody: '' });
        alert("Message successfully dispatched to staff!"); 
      } else {
        alert("Failed to send message. Please try again.");
      }
    } catch (err) {
      console.error("Messaging Error", err);
      alert("Server connection error.");
    }
  };

  const filteredTeachers = teachers.filter(teacher => {
    const safeName = (teacher.name || "").toLowerCase();
    const safeId = (teacher.id || "").toLowerCase();
    const safeDept = (teacher.department || "").toLowerCase();
    const searchLower = searchTerm.toLowerCase();

    const matchesSearch = safeName.includes(searchLower) || safeId.includes(searchLower);
    const matchesDept = deptFilter === 'all' || safeDept === deptFilter.toLowerCase();
    
    return matchesSearch && matchesDept;
  });

  return (
    <div className="space-y-6 relative">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Manage Teaching Staff</h1>
          <p className="text-sm text-slate-500 font-medium">Add, update, and manage teacher profiles and access.</p>
        </div>
        <div className="flex w-full sm:w-auto gap-3">
          <button onClick={() => setIsMessageModalOpen(true)} className="flex-1 sm:flex-none bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-colors shadow-sm">
            <MessageSquare size={18} /> Message Staff
          </button>
          <button onClick={() => { setFormData({ fullName: '', staffId: '', email: '', phone: '', department: '', subject: '', medium: '', status: 'Active', password: '', isClassTeacher: false }); setIsAddModalOpen(true); }} className="flex-1 sm:flex-none bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-colors shadow-sm">
            <Plus size={18} /> Add Teacher
          </button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input type="text" placeholder="Search by teacher name or ID..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all text-sm" />
        </div>
        <select value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)} className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 text-slate-700 font-medium text-sm">
          <option value="all">All Sections</option>
          <option value="o/l">O/L</option>
          <option value="science section">Science Section</option>
          <option value="commerce section">Commerce Section</option>
          <option value="technology section">Technology Section</option>
          <option value="arts section">Arts Section</option>
        </select>
      </div>

      {/* Teachers Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-sm border-b border-slate-200">
                <th className="p-4 font-semibold">Teacher Profile</th>
                <th className="p-4 font-semibold">Contact Details</th>
                <th className="p-4 font-semibold text-center">Status</th>
                <th className="p-4 font-semibold text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={4} className="p-12 text-center text-slate-500"><p className="font-medium animate-pulse">Loading real-time staff data...</p></td></tr>
              ) : filteredTeachers.length > 0 ? (
                filteredTeachers.map((teacher) => (
                  <tr key={teacher.dbId} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold border-2 border-white shadow-sm shrink-0 uppercase">
                          {(teacher.name || "T").charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-slate-800">{teacher.name}</p>
                          <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500 mt-0.5">
                            <BookOpen size={12} className="text-blue-500" /> 
                            <span className="font-semibold text-slate-700">{teacher.subject}</span> • {teacher.department} • {teacher.id}
                            {/* NEW: Class Teacher Badge */}
                            {teacher.isClassTeacher && (
                              <span className="ml-2 px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded text-[9px] font-bold uppercase tracking-wider border border-purple-200">
                                Class Teacher
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2 text-sm text-slate-600 mb-1"><Mail size={14} className="text-slate-400" /> {teacher.email}</div>
                      <div className="flex items-center gap-2 text-sm text-slate-600"><Phone size={14} className="text-slate-400" /> {teacher.phone}</div>
                    </td>
                    <td className="p-4 text-center">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        teacher.status === 'Active' ? 'bg-emerald-100 text-emerald-700' : 
                        teacher.status === 'On Leave' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {teacher.status}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => handleViewProfile(teacher)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors" title="View Profile">
                          <Eye size={18} />
                        </button>
                        <button onClick={() => {setMessageForm({...messageForm, recipientType: 'individual', targetTeacherId: teacher.id}); setIsMessageModalOpen(true);}} className="p-1.5 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded-md transition-colors" title="Message Teacher">
                          <MessageSquare size={18} />
                        </button>
                        <button onClick={() => handleOpenEditModal(teacher)} className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-md transition-colors" title="Edit Teacher">
                          <Edit2 size={18} />
                        </button>
                        <button onClick={() => handleStatusToggle(teacher.dbId, teacher.status)} className={`p-1.5 rounded-md transition-colors ${teacher.status === 'Active' ? 'text-red-400 hover:text-red-600 hover:bg-red-50' : 'text-emerald-400 hover:text-emerald-600 hover:bg-emerald-50'}`} title={teacher.status === 'Active' ? 'Deactivate Teacher' : 'Activate Teacher'}>
                          {teacher.status === 'Active' ? <XCircle size={18} /> : <CheckCircle size={18} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="p-12 text-center text-slate-500">
                    <Users size={48} className="mx-auto text-slate-300 mb-3" />
                    <p className="font-medium text-sm">No teaching staff found.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- ADD / EDIT TEACHER MODAL --- */}
      {(isAddModalOpen || isEditModalOpen) && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="bg-slate-50 border-b border-slate-100 p-5 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="bg-blue-100 text-blue-600 p-2 rounded-lg">{isEditModalOpen ? <Edit2 size={20} /> : <Users size={20} />}</div>
                <div>
                  <h2 className="text-lg font-bold text-slate-800">{isEditModalOpen ? "Edit Teacher Profile" : "Add New Teacher"}</h2>
                  <p className="text-xs text-slate-500 font-medium">{isEditModalOpen ? "Update staff details and status" : "Create a new staff account"}</p>
                </div>
              </div>
              <button onClick={() => { setIsAddModalOpen(false); setIsEditModalOpen(false); }} className="text-slate-400 hover:text-slate-600 hover:bg-slate-200 p-2 rounded-full transition-colors"><X size={20} /></button>
            </div>
            
            <div className="p-6">
              {error && <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm font-medium border border-red-200">{error}</div>}
              
              <form id="teacher-form" onSubmit={isEditModalOpen ? handleUpdateTeacher : handleAddTeacher} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Full Name</label>
                    <input type="text" required placeholder="e.g. John Doe" value={formData.fullName} onChange={(e) => setFormData({...formData, fullName: e.target.value})} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all text-sm" />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Staff ID</label>
                    <input type="text" required placeholder="e.g. TCH-005" value={formData.staffId} onChange={(e) => setFormData({...formData, staffId: e.target.value})} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all text-sm" />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Email Address</label>
                    <input type="email" required placeholder="teacher@school.edu" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all text-sm" />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Phone Number</label>
                    <input type="tel" required placeholder="+94 77 000 0000" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all text-sm" />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Department / Section</label>
                    <select required value={formData.department} onChange={(e) => setFormData({ ...formData, department: e.target.value, subject: '' })} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all text-sm text-slate-700">
                      <option value="" disabled>Select Section</option>
                      {Object.keys(subjectOptions).map((section) => (<option key={section} value={section}>{section}</option>))}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Teaching Medium</label>
                    <select required value={formData.medium} onChange={(e) => setFormData({...formData, medium: e.target.value})} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all text-sm text-slate-700">
                      <option value="" disabled>Select Medium</option>
                      <option value="English">English</option>
                      <option value="Sinhala">Sinhala</option>
                      <option value="Tamil">Tamil</option>
                    </select>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-in fade-in duration-300">
                  {formData.department && (
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Teaching Subject</label>
                      <select required value={formData.subject} onChange={(e) => setFormData({...formData, subject: e.target.value})} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all text-sm text-slate-700">
                        <option value="" disabled>Select Subject</option>
                        {subjectOptions[formData.department] ? subjectOptions[formData.department].map((subject) => (<option key={subject} value={subject}>{subject}</option>)) : null}
                      </select>
                    </div>
                  )}
                  
                  {isEditModalOpen ? (
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Account Status</label>
                      <select required value={formData.status} onChange={(e) => setFormData({...formData, status: e.target.value})} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all text-sm text-slate-700">
                        <option value="Active">Active</option>
                        <option value="On Leave">On Leave</option>
                        <option value="Inactive">Inactive</option>
                      </select>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Initial Password</label>
                      <input type="text" required placeholder="Set teacher's password" value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all text-sm" />
                    </div>
                  )}
                </div>

                {/* NEW: Web Dashboard Class Teacher Checkbox */}
                <div className="flex flex-col gap-1.5 sm:col-span-2 mt-2 bg-slate-50 p-3 rounded-lg border border-slate-200">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={formData.isClassTeacher} 
                      onChange={(e) => setFormData({...formData, isClassTeacher: e.target.checked})} 
                      className="w-5 h-5 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer" 
                    />
                    <span className="text-sm font-semibold text-slate-700">This teacher is assigned as a Class Teacher</span>
                  </label>
                </div>

              </form>
            </div>
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
              <button onClick={() => { setIsAddModalOpen(false); setIsEditModalOpen(false); }} className="px-4 py-2 text-slate-600 text-sm font-medium hover:bg-slate-200 rounded-lg transition-colors">Cancel</button>
              <button type="submit" form="teacher-form" className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm">
                {isEditModalOpen ? "Update Teacher" : "Save Teacher"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- TEACHER PROFILE & TIMETABLE VIEW MODAL --- */}
      {selectedTeacher && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="bg-slate-50 border-b border-slate-100 p-6 flex justify-between items-start shrink-0">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 text-2xl font-bold border-4 border-white shadow-sm shrink-0 uppercase">
                  {(selectedTeacher.name || "T").charAt(0).toUpperCase()}
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                    {selectedTeacher.name}
                    {selectedTeacher.isClassTeacher && (
                      <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded text-[10px] font-bold uppercase tracking-wider border border-purple-200">
                        Class Teacher
                      </span>
                    )}
                  </h2>
                  <p className="text-sm font-semibold text-slate-500">Staff ID: {selectedTeacher.id}</p>
                  <span className={`inline-block mt-2 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                    selectedTeacher.status === 'Active' ? 'bg-emerald-100 text-emerald-700' : 
                    selectedTeacher.status === 'On Leave' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
                  }`}>
                    {selectedTeacher.status}
                  </span>
                </div>
              </div>
              <button onClick={() => setSelectedTeacher(null)} className="text-slate-400 hover:text-slate-600 hover:bg-slate-200 p-2 rounded-full transition-colors"><X size={20} /></button>
            </div>

            {/* Navigation Tabs */}
            <div className="flex border-b border-slate-200 px-6 shrink-0 bg-white">
              <button onClick={() => setActiveProfileTab('profile')} className={`py-3 px-4 text-sm font-bold border-b-2 transition-colors ${activeProfileTab === 'profile' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
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
                  {selectedTeacher.status === 'On Leave' && (
                    <div className="bg-amber-50 rounded-xl border border-amber-100 p-4">
                      <h3 className="text-sm font-bold text-amber-800 mb-1 flex items-center gap-2">
                        <AlertCircle size={16} /> Leave Information
                      </h3>
                      <p className="text-sm font-medium text-amber-800 mt-1 pl-6">
                        Teacher is currently marked as on leave. Timetable assignments may need covering.
                      </p>
                    </div>
                  )}
                  <div>
                    <h3 className="text-sm font-bold text-slate-800 mb-3 border-b border-slate-100 pb-2 flex items-center gap-2">
                      <Briefcase size={16} className="text-blue-500" /> Academic Profile
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Section</p>
                        <p className="font-bold text-slate-700 mt-0.5 text-sm truncate">{selectedTeacher.department}</p>
                      </div>
                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Subject</p>
                        <p className="font-bold text-blue-700 mt-0.5 text-sm truncate">{selectedTeacher.subject}</p>
                      </div>
                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Medium</p>
                        <p className="font-bold text-slate-700 mt-0.5 text-sm truncate">{selectedTeacher.medium}</p>
                      </div>
                    </div>
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-800 mb-3 border-b border-slate-100 pb-2 flex items-center gap-2">
                      <UserCheck size={16} className="text-emerald-500" /> Contact Information
                    </h3>
                    <div className="bg-slate-50 rounded-xl border border-slate-100 p-4 space-y-3">
                      <div className="flex items-center gap-3">
                        <Mail size={16} className="text-slate-400" />
                        <div>
                          <p className="text-xs text-slate-500 font-medium">Email Address</p>
                          <p className="text-sm font-bold text-slate-800">{selectedTeacher.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Phone size={16} className="text-slate-400" />
                        <div>
                          <p className="text-xs text-slate-500 font-medium">Phone Number</p>
                          <p className="text-sm font-bold text-slate-800">{selectedTeacher.phone}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: DYNAMIC READ-ONLY TIMETABLE */}
              {activeProfileTab === 'timetable' && (
                <div className="animate-in fade-in duration-300 flex flex-col h-full">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-sm font-bold text-slate-800">Assigned Schedule</h3>
                    <p className="text-xs text-slate-500 italic">Timetables are managed via the Classes page.</p>
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
                                    <td key={day} className="p-1.5 border-r border-slate-100 last:border-none">
                                      {slot ? (
                                        <div className="bg-blue-50 border border-blue-100 rounded-lg p-2 h-full flex flex-col justify-center items-center text-center">
                                          <p className="text-xs font-bold text-blue-800">{slot.class}</p>
                                          <p className="text-[10px] font-semibold text-blue-600 mt-0.5">{slot.subject}</p>
                                          <div className="flex items-center gap-1 mt-1 text-[9px] font-medium text-slate-500">
                                            <MapPin size={10} /> {slot.room}
                                          </div>
                                        </div>
                                      ) : (
                                        <div className="h-full min-h-[65px] flex items-center justify-center rounded-lg border-2 border-transparent text-slate-300">
                                          <span className="text-[10px] font-medium">- Free -</span>
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
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* --- SMART MESSAGING MODAL --- */}
      {isMessageModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
           <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden">
            <div className="bg-slate-50 border-b border-slate-100 p-5 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="bg-purple-100 text-purple-600 p-2 rounded-lg"><Send size={20} /></div>
                <div>
                  <h2 className="text-lg font-bold text-slate-800">Compose Message</h2>
                  <p className="text-xs text-slate-500 font-medium">Send an internal message to teaching staff</p>
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
                    onChange={(e) => setMessageForm({...messageForm, recipientType: e.target.value, targetSection: '', targetTeacherId: ''})}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-100 focus:border-purple-500 transition-all text-sm text-slate-800 font-medium"
                  >
                    <option value="all">Entire Teaching Staff</option>
                    <option value="section">Specific Section</option>
                    <option value="individual">Individual Teacher</option>
                  </select>
                </div>
                {messageForm.recipientType === 'section' && (
                  <div className="flex flex-col gap-1.5 animate-in fade-in slide-in-from-top-2 duration-300">
                    <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Select Section</label>
                    <select required value={messageForm.targetSection} onChange={(e) => setMessageForm({...messageForm, targetSection: e.target.value})} className="w-full px-4 py-2.5 bg-purple-50 border border-purple-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-200 focus:border-purple-500 transition-all text-sm text-purple-900 font-medium">
                      <option value="" disabled>Choose a section...</option>
                      {Object.keys(subjectOptions).map((section) => (<option key={section} value={section}>{section} Teachers</option>))}
                    </select>
                  </div>
                )}
                {messageForm.recipientType === 'individual' && (
                  <div className="flex flex-col gap-1.5 animate-in fade-in slide-in-from-top-2 duration-300">
                    <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Select Teacher</label>
                    <select required value={messageForm.targetTeacherId} onChange={(e) => setMessageForm({...messageForm, targetTeacherId: e.target.value})} className="w-full px-4 py-2.5 bg-purple-50 border border-purple-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-200 focus:border-purple-500 transition-all text-sm text-purple-900 font-medium">
                      <option value="" disabled>Choose a teacher...</option>
                      {teachers.map((t) => (<option key={t.id} value={t.id}>{t.name} ({t.department})</option>))}
                    </select>
                  </div>
                )}
                <div className="flex flex-col gap-1.5 pt-2 border-t border-slate-100">
                  <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Message Subject</label>
                  <input type="text" required placeholder="e.g. Urgent Update Regarding Timetable" value={messageForm.subject} onChange={(e) => setMessageForm({...messageForm, subject: e.target.value})} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-100 focus:border-purple-500 transition-all text-sm text-slate-800" />
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