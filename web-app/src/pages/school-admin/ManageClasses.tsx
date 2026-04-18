import { useState, useEffect } from 'react';
import { Search, Plus, X, BookOpen, Users, GraduationCap, MapPin, Eye, UserCheck, CalendarDays, Trash2, Edit3, Save, AlertCircle } from 'lucide-react';

const timeSlots = [
  { p: 1, time: '08:00 - 08:40', isBreak: false }, { p: 2, time: '08:40 - 09:20', isBreak: false },
  { p: -1, time: '09:20 - 09:40', isBreak: true, label: 'INTERVAL' },
  { p: 3, time: '09:40 - 10:20', isBreak: false }, { p: 4, time: '10:20 - 11:00', isBreak: false },
  { p: 5, time: '11:00 - 11:40', isBreak: false }, { p: 6, time: '11:40 - 12:20', isBreak: false },
  { p: 7, time: '12:20 - 01:00', isBreak: false }, { p: 8, time: '01:00 - 01:40', isBreak: false }
];
const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

const generateMockStudents = (count: number) => {
  return Array.from({ length: Math.min(count, 15) }, () => ({
    id: `STU-${2024 - Math.floor(Math.random() * 3)}-${Math.floor(Math.random() * 900) + 100}`,
    name: ["Kavindu Perera", "Sanduni Silva", "Tharindu Fernando", "Nethmi Jayasuriya", "Dineth Rajapakse", "Amali Perera", "Kasun Silva"][Math.floor(Math.random() * 7)],
    status: Math.random() > 0.1 ? 'Active' : 'Suspended'
  }));
};

export default function ManageClasses() {
  const [adminEmail, setAdminEmail] = useState('');
  const [classes, setClasses] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState('');
  const [gradeFilter, setGradeFilter] = useState('all');

  // View Modal State
  const [selectedClass, setSelectedClass] = useState<any | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'timetable' | 'students'>('overview');
  const [mockStudents, setMockStudents] = useState<any[]>([]);

  // Timetable Editor State
  const [timetableData, setTimetableData] = useState<any[]>([]);
  const [isEditingTimetable, setIsEditingTimetable] = useState(false);
  const [editingSlot, setEditingSlot] = useState<{ day: string, period: number, time: string } | null>(null);
  const [slotForm, setSlotForm] = useState({ subject: '', teacherId: '' });

  // Add Form State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [formData, setFormData] = useState({ grade: 'Grade 10', section: '', classTeacherId: '', roomNumber: '', capacity: 40 });

  useEffect(() => {
    const storedUser = localStorage.getItem('schoolConnectUser');
    if (storedUser) {
      const parsedUser = JSON.parse(storedUser);
      setAdminEmail(parsedUser.email);
      fetchClasses(parsedUser.email);
      fetchTeachers(parsedUser.email);
    }
  }, []);

  const fetchClasses = async (email: string) => {
    try {
      const res = await fetch(`http://localhost:5000/api/school-admin/${email}/classes`);
      if (res.ok) setClasses(await res.json());
    } catch (err) { console.error(err); } finally { setIsLoading(false); }
  };

  const fetchTeachers = async (email: string) => {
    try {
      const res = await fetch(`http://localhost:5000/api/school-admin/${email}/teachers`);
      if (res.ok) setTeachers(await res.json());
    } catch (err) { console.error(err); }
  };

  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`http://localhost:5000/api/school-admin/${adminEmail}/classes`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(formData)
      });
      if (res.ok) {
        setIsAddModalOpen(false);
        setFormData({ grade: 'Grade 10', section: '', classTeacherId: '', roomNumber: '', capacity: 40 });
        fetchClasses(adminEmail);
      }
    } catch (err) { console.error(err); }
  };

  // --- NEW DELETE FUNCTION ---
  const handleDeleteClass = async (classId: string, className: string) => {
    // Safety confirmation dialog
    if (!window.confirm(`Are you sure you want to delete ${className}? This will permanently erase the class and its master timetable.`)) {
      return;
    }

    try {
      const res = await fetch(`http://localhost:5000/api/school-admin/${adminEmail}/classes/${classId}`, {
        method: 'DELETE'
      });
      
      if (res.ok) {
        // Remove it from the UI immediately without needing a full refresh
        setClasses(classes.filter(c => c.id !== classId));
        if (selectedClass?.id === classId) {
          setSelectedClass(null); // Close modal if open
        }
      } else {
        alert("Failed to delete the class. Please try again.");
      }
    } catch (err) {
      console.error(err);
      alert("Server connection error.");
    }
  };

  // TIMETABLE API CALLS
  const fetchTimetable = async (classId: string) => {
    try {
      const res = await fetch(`http://localhost:5000/api/school-admin/${adminEmail}/classes/${classId}/timetable`);
      if (res.ok) setTimetableData(await res.json());
    } catch (err) { console.error(err); }
  };

  const handleViewClass = (cls: any) => {
    setSelectedClass(cls);
    setActiveTab('overview');
    setIsEditingTimetable(false);
    setMockStudents(generateMockStudents(cls.capacity || 40));
    fetchTimetable(cls.id);
  };

  const getSlotData = (day: string, period: number) => {
    return timetableData.find(slot => slot.day_of_week === day && slot.period_number === period);
  };

  const handleSlotClick = (day: string, period: number, time: string) => {
    if (!isEditingTimetable) return;
    const existing = getSlotData(day, period);
    setEditingSlot({ day, period, time });
    setSlotForm({ subject: existing?.subject || '', teacherId: existing?.teacher_id || '' });
  };

  const handleSaveSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSlot || !selectedClass) return;
    try {
      const payload = {
        dayOfWeek: editingSlot.day, periodNumber: editingSlot.period, timeSlot: editingSlot.time,
        subject: slotForm.subject, teacherId: slotForm.teacherId || null
      };
      const res = await fetch(`http://localhost:5000/api/school-admin/${adminEmail}/classes/${selectedClass.id}/timetable`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
      });
      if (res.ok) {
        setEditingSlot(null);
        fetchTimetable(selectedClass.id); // Refresh grid
      }
    } catch (err) { console.error(err); }
  };

  const handleClearSlot = async () => {
    if (!editingSlot || !selectedClass) return;
    try {
      const payload = { dayOfWeek: editingSlot.day, periodNumber: editingSlot.period, timeSlot: editingSlot.time, subject: '', teacherId: null };
      const res = await fetch(`http://localhost:5000/api/school-admin/${adminEmail}/classes/${selectedClass.id}/timetable`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
      });
      if (res.ok) { setEditingSlot(null); fetchTimetable(selectedClass.id); }
    } catch (err) { console.error(err); }
  };

  const filteredClasses = classes.filter(cls => {
    const fullName = `${cls.grade} - ${cls.section}`;
    const matchesSearch = fullName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesGrade = gradeFilter === 'all' || cls.grade.includes(gradeFilter);
    return matchesSearch && matchesGrade;
  });

  return (
    <div className="space-y-6 relative">
      
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Manage Classes</h1>
          <p className="text-sm text-slate-500 font-medium">Create classes, assign class teachers, and manage Master Timetables.</p>
        </div>
        <button onClick={() => setIsAddModalOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors shadow-sm">
          <Plus size={18} /> Create Class
        </button>
      </div>

      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input type="text" placeholder="Search by class name..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all text-sm" />
        </div>
        <select value={gradeFilter} onChange={(e) => setGradeFilter(e.target.value)} className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-medium text-sm">
          <option value="all">All Grades</option>
          <option value="Grade 10">Grade 10</option>
          <option value="Grade 11">Grade 11</option>
          <option value="Grade 12">Grade 12</option>
          <option value="Grade 13">Grade 13</option>
        </select>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-sm border-b border-slate-200">
                <th className="p-4 font-semibold">Class Details</th>
                <th className="p-4 font-semibold">Class Teacher & Capacity</th>
                <th className="p-4 font-semibold text-center">Room</th>
                <th className="p-4 font-semibold text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={4} className="p-8 text-center text-slate-500 font-medium animate-pulse">Loading classes...</td></tr>
              ) : filteredClasses.length > 0 ? filteredClasses.map((cls) => (
                <tr key={cls.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 border-2 border-white shadow-sm shrink-0"><BookOpen size={20} /></div>
                      <div>
                        <p className="font-bold text-slate-800">{cls.grade} - {cls.section}</p>
                        <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500 mt-0.5"><GraduationCap size={12} className="text-blue-500" /> System ID: {cls.id}</div>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-1">
                      <UserCheck size={14} className="text-slate-400" /> {cls.class_teacher_name || "Not Assigned"}
                    </div>
                    <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                      <Users size={14} className="text-blue-500" /> {cls.capacity || 40} Seat Capacity
                    </div>
                  </td>
                  <td className="p-4 text-center">
                    <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-lg text-xs font-bold flex items-center justify-center gap-1 w-max mx-auto border border-slate-200">
                      <MapPin size={12} /> {cls.room_number || "TBD"}
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center justify-center gap-2">
                      <button onClick={() => handleViewClass(cls)} className="px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white text-xs font-bold rounded-md transition-colors flex items-center gap-1" title="View Dashboard">
                        <Eye size={14} /> Open
                      </button>
                      <button onClick={() => handleDeleteClass(cls.id, `${cls.grade} - ${cls.section}`)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors" title="Delete Class">
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-slate-500 flex flex-col items-center">
                    <AlertCircle size={32} className="text-slate-300 mb-2" />
                    <p>No classes found.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- CLASS DASHBOARD MODAL --- */}
      {selectedClass && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-5xl overflow-hidden flex flex-col max-h-[90vh]">
            
            <div className="bg-slate-50 border-b border-slate-100 p-6 flex justify-between items-start shrink-0">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-blue-100 flex items-center justify-center text-blue-700 font-bold border-4 border-white shadow-sm shrink-0">
                  <BookOpen size={28} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-800">{selectedClass.grade} - {selectedClass.section}</h2>
                  <p className="text-sm font-semibold text-slate-500">Room: {selectedClass.room_number || "Not Assigned"}</p>
                </div>
              </div>
              <button onClick={() => setSelectedClass(null)} className="text-slate-400 hover:text-slate-600 hover:bg-slate-200 p-2 rounded-full transition-colors"><X size={20} /></button>
            </div>

            <div className="flex border-b border-slate-200 px-6 shrink-0 bg-white">
              <button onClick={() => { setActiveTab('overview'); setIsEditingTimetable(false); }} className={`py-3 px-4 text-sm font-bold border-b-2 transition-colors ${activeTab === 'overview' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>Overview</button>
              <button onClick={() => setActiveTab('timetable')} className={`py-3 px-4 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'timetable' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}><CalendarDays size={16} /> Master Timetable</button>
              <button onClick={() => { setActiveTab('students'); setIsEditingTimetable(false); }} className={`py-3 px-4 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'students' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}><Users size={16} /> Student Roster</button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 bg-white relative">
              
              {/* TAB 1: OVERVIEW */}
              {activeTab === 'overview' && (
                <div className="space-y-6 animate-in fade-in duration-300">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="bg-blue-50 p-5 rounded-xl border border-blue-100 flex flex-col items-center justify-center text-center">
                      <UserCheck size={28} className="text-blue-500 mb-2" />
                      <p className="text-xs font-bold text-blue-400 uppercase tracking-wider mb-1">Class Teacher</p>
                      <p className="font-bold text-blue-900 text-lg">{selectedClass.class_teacher_name || "Not Assigned"}</p>
                    </div>
                    <div className="grid grid-rows-2 gap-4">
                      <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex items-center justify-between">
                        <div>
                          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-0.5">Capacity</p>
                          <p className="font-bold text-slate-800 text-lg">{selectedClass.capacity} Seats</p>
                        </div>
                        <Users size={24} className="text-slate-300" />
                      </div>
                      <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex items-center justify-between">
                        <div>
                          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-0.5">Location</p>
                          <p className="font-bold text-slate-800 text-lg">{selectedClass.room_number || "TBD"}</p>
                        </div>
                        <MapPin size={24} className="text-slate-300" />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: MASTER TIMETABLE */}
              {activeTab === 'timetable' && (
                <div className="animate-in fade-in duration-300 flex flex-col h-full">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-sm font-bold text-slate-800">Weekly Schedule</h3>
                    <button onClick={() => setIsEditingTimetable(!isEditingTimetable)} className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors ${isEditingTimetable ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}>
                      {isEditingTimetable ? <><Save size={16}/> Done Editing</> : <><Edit3 size={16}/> Edit Master</>}
                    </button>
                  </div>
                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse min-w-[800px]">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200">
                            <th className="p-3 text-xs font-bold text-slate-500 uppercase border-r text-center w-24">Time</th>
                            {daysOfWeek.map(day => <th key={day} className="p-3 text-xs font-bold text-slate-700 uppercase border-r text-center w-1/5">{day}</th>)}
                          </tr>
                        </thead>
                        <tbody>
                          {timeSlots.map((slot, index) => (
                            slot.isBreak ? (
                              <tr key={index} className="bg-amber-50/50 border-b border-slate-100"><td className="p-2 text-xs font-semibold text-amber-700 text-center border-r">{slot.time}</td><td colSpan={5} className="p-2 text-xs font-bold text-amber-600 text-center tracking-[0.2em]">{slot.label}</td></tr>
                            ) : (
                              <tr key={index} className="border-b border-slate-100">
                                <td className="p-2 text-[10px] font-semibold text-slate-500 text-center border-r bg-slate-50">{slot.time}</td>
                                {daysOfWeek.map(day => {
                                  const slotData = getSlotData(day, slot.p);
                                  return (
                                    <td key={day} onClick={() => handleSlotClick(day, slot.p, slot.time)} className={`p-1.5 border-r border-slate-100 transition-all ${isEditingTimetable ? 'cursor-pointer hover:bg-blue-50/50' : ''}`}>
                                      {slotData && slotData.subject ? (
                                        <div className={`bg-blue-50 border border-blue-100 rounded-lg p-2 h-full flex flex-col justify-center items-center text-center ${isEditingTimetable ? 'hover:border-blue-400' : ''}`}>
                                          <p className="text-xs font-bold text-blue-800">{slotData.subject}</p>
                                          <p className="text-[10px] font-semibold text-blue-600 mt-0.5 truncate w-full px-1">{slotData.teacher_name || 'No Teacher'}</p>
                                        </div>
                                      ) : (
                                        <div className={`h-full min-h-[60px] flex items-center justify-center rounded-lg border-2 border-transparent ${isEditingTimetable ? 'border-dashed border-slate-200 hover:border-blue-400 hover:bg-blue-50 text-blue-500' : 'text-slate-200'}`}>
                                          <span className="text-[10px] font-medium">{isEditingTimetable ? '+ Assign' : '-'}</span>
                                        </div>
                                      )}
                                    </td>
                                  )
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

              {/* TAB 3: STUDENT ROSTER */}
              {activeTab === 'students' && (
                <div className="animate-in fade-in duration-300">
                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 text-slate-500 text-xs border-b border-slate-200">
                          <th className="p-3 font-semibold uppercase">Student Name & ID</th>
                          <th className="p-3 font-semibold text-center uppercase">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {mockStudents.map((student, idx) => (
                          <tr key={idx} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                            <td className="p-3">
                              <p className="font-bold text-slate-800 text-sm">{student.name}</p>
                              <p className="text-xs text-slate-500 mt-0.5">{student.id}</p>
                            </td>
                            <td className="p-3 text-center">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${student.status === 'Active' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>{student.status}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p className="text-xs text-slate-400 mt-4 text-center">Showing mock data until students are formally assigned to this class.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Timetable Editor Modal */}
      {editingSlot && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
           <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
              <div className="bg-slate-50 p-4 flex justify-between items-center border-b border-slate-100">
                <div><h3 className="font-bold text-slate-800">Assign Subject</h3><p className="text-xs text-slate-500">{editingSlot.day} • {editingSlot.time}</p></div>
                <button onClick={() => setEditingSlot(null)} className="p-1.5 text-slate-400 hover:bg-slate-200 rounded-full"><X size={16}/></button>
              </div>
              <div className="p-5">
                <form id="slot-form" onSubmit={handleSaveSlot} className="space-y-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-600 uppercase">Subject</label>
                    <input type="text" required value={slotForm.subject} onChange={e => setSlotForm({...slotForm, subject: e.target.value})} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg mt-1 focus:ring-2 focus:ring-blue-100" placeholder="e.g. Mathematics" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-600 uppercase">Assign Teacher</label>
                    <select value={slotForm.teacherId} onChange={e => setSlotForm({...slotForm, teacherId: e.target.value})} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg mt-1 focus:ring-2 focus:ring-blue-100 text-slate-700">
                      <option value="">-- Leave Unassigned --</option>
                      {teachers.map(t => <option key={t.id} value={t.id}>{t.full_name} ({t.subject || 'N/A'})</option>)}
                    </select>
                  </div>
                </form>
              </div>
              <div className="p-4 bg-slate-50 flex justify-between items-center border-t border-slate-100">
                <button type="button" onClick={handleClearSlot} className="text-xs font-bold text-red-600 hover:text-red-700 flex items-center gap-1"><Trash2 size={14}/> Clear Slot</button>
                <div className="flex gap-2">
                  <button onClick={() => setEditingSlot(null)} className="px-3 py-1.5 text-slate-600 text-xs font-bold hover:bg-slate-200 rounded-lg">Cancel</button>
                  <button type="submit" form="slot-form" className="bg-blue-600 text-white px-4 py-1.5 rounded-lg text-xs font-bold">Save</button>
                </div>
              </div>
           </div>
        </div>
      )}

      {/* Add New Class Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
           <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
             <div className="bg-slate-50 p-5 border-b border-slate-100 flex justify-between items-center"><div className="flex items-center gap-3"><div className="bg-blue-100 text-blue-600 p-2 rounded-lg"><Plus size={20}/></div><div><h3 className="font-bold text-slate-800 text-lg">Add New Class</h3><p className="text-xs text-slate-500">Set up room and teacher</p></div></div><button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:bg-slate-200 p-2 rounded-full"><X size={20}/></button></div>
             <div className="p-6">
                <form id="class-form" onSubmit={handleCreateClass} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-semibold text-slate-600 uppercase">Grade</label>
                      <select required value={formData.grade} onChange={e => setFormData({...formData, grade: e.target.value})} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg mt-1 focus:ring-2 focus:ring-blue-100 text-slate-700">
                        <option value="" disabled>Select Grade</option>
                        <option value="Grade 10">Grade 10</option>
                        <option value="Grade 11">Grade 11</option>
                        <option value="Grade 12">Grade 12</option>
                        <option value="Grade 13">Grade 13</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-600 uppercase">Section</label>
                      <select required value={formData.section} onChange={e => setFormData({...formData, section: e.target.value})} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg mt-1 focus:ring-2 focus:ring-blue-100 text-slate-700">
                        <option value="" disabled>Select Section</option>
                        <option value="O/L">O/L</option>
                        <option value="Science Section">Science Section</option>
                        <option value="Commerce Section">Commerce Section</option>
                        <option value="Technology Section">Technology Section</option>
                        <option value="Arts Section">Arts Section</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-600 uppercase">Class Teacher</label>
                    <select value={formData.classTeacherId} onChange={e => setFormData({...formData, classTeacherId: e.target.value})} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg mt-1 focus:ring-2 focus:ring-blue-100 text-slate-700">
                      <option value="">-- None --</option>
                      {teachers.map(t => <option key={t.id} value={t.id}>{t.full_name}</option>)}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-semibold text-slate-600 uppercase">Room Number</label>
                      <input type="text" value={formData.roomNumber} onChange={e => setFormData({...formData, roomNumber: e.target.value})} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg mt-1 focus:ring-2 focus:ring-blue-100" placeholder="e.g. Lab 01" />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-600 uppercase">Capacity</label>
                      <input type="number" required value={formData.capacity} onChange={e => setFormData({...formData, capacity: parseInt(e.target.value)})} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg mt-1 focus:ring-2 focus:ring-blue-100" />
                    </div>
                  </div>
                </form>
             </div>
             <div className="p-4 bg-slate-50 flex justify-end gap-2 border-t border-slate-100">
                <button type="button" onClick={() => setIsAddModalOpen(false)} className="px-4 py-2 text-slate-600 text-sm font-bold hover:bg-slate-200 rounded-lg">Cancel</button>
                <button type="submit" form="class-form" className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg text-sm font-bold">Create Class</button>
             </div>
           </div>
        </div>
      )}
    </div>
  );
}