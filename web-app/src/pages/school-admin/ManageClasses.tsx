import { useState } from 'react';
import { Search, Plus, X, BookOpen, Users, GraduationCap, MapPin, Eye, Settings, UserCheck, Book, Trash2 } from 'lucide-react';

// --- MOCK DATA ---
const initialClasses = [
  { 
    id: 'CLS-10-SCA', name: "10 Science - A", grade: "Grade 10", studentCount: 45, room: "Lab 01", status: "Active",
    classTeacher: "Anura Fernando",
    subjectTeachers: [
      { subject: "Mathematics", teacher: "Kumari Perera" },
      { subject: "Science", teacher: "Anura Fernando" },
      { subject: "English", teacher: "Dinesh Silva" },
    ]
  },
  { 
    id: 'CLS-11-CMA', name: "11 Commerce - A", grade: "Grade 11", studentCount: 42, room: "Room 302", status: "Active",
    classTeacher: "Malini Jayawardena",
    subjectTeachers: [
      { subject: "Accounting", teacher: "Malini Jayawardena" },
      { subject: "Business Studies", teacher: "Saman Kumara" },
      { subject: "English", teacher: "Dinesh Silva" },
    ]
  },
  { 
    id: 'CLS-12-PHY', name: "12 Physics - Core", grade: "Grade 12", studentCount: 30, room: "Physics Lab", status: "Active",
    classTeacher: "Dr. Ruwanthi Peiris",
    subjectTeachers: [
      { subject: "Physics", teacher: "Dr. Ruwanthi Peiris" },
      { subject: "Combined Maths", teacher: "Kumari Perera" },
    ]
  },
];

// Mock function to generate a student list for the view modal (Linter warning fixed here)
const generateMockStudents = (count: number) => {
  return Array.from({ length: Math.min(count, 15) }, () => ({
    id: `STU-${2024 - Math.floor(Math.random() * 3)}-${Math.floor(Math.random() * 900) + 100}`,
    name: ["Kavindu Perera", "Sanduni Silva", "Tharindu Fernando", "Nethmi Jayasuriya", "Dineth Rajapakse", "Amali Perera", "Kasun Silva"][Math.floor(Math.random() * 7)],
    status: Math.random() > 0.1 ? 'Active' : 'Suspended'
  }));
};

export default function ManageClasses() {
  const [searchTerm, setSearchTerm] = useState('');
  const [gradeFilter, setGradeFilter] = useState('all');
  const [classes, setClasses] = useState(initialClasses);

  // View Modal State
  const [selectedClass, setSelectedClass] = useState<any | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'subjects' | 'students'>('overview');
  const [mockStudents, setMockStudents] = useState<any[]>([]);

  // Add/Edit Form State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '', grade: '', room: '', classTeacher: '', studentCount: ''
  });
  const [subjectList, setSubjectList] = useState([{ subject: '', teacher: '' }]);
  
  // Filter Logic
  const filteredClasses = classes.filter(cls => {
    const matchesSearch = cls.name.toLowerCase().includes(searchTerm.toLowerCase()) || cls.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesGrade = gradeFilter === 'all' || cls.grade.includes(gradeFilter);
    return matchesSearch && matchesGrade;
  });

  // --- FORM HANDLERS ---
  const handleAddSubjectRow = () => {
    setSubjectList([...subjectList, { subject: '', teacher: '' }]);
  };

  const handleRemoveSubjectRow = (index: number) => {
    setSubjectList(subjectList.filter((_, i) => i !== index));
  };

  const handleSubjectChange = (index: number, field: 'subject' | 'teacher', value: string) => {
    const newList = [...subjectList];
    newList[index][field] = value;
    setSubjectList(newList);
  };

  const handleCreateClass = (e: React.FormEvent) => {
    e.preventDefault();
    
    const validSubjects = subjectList.filter(s => s.subject.trim() !== '' && s.teacher.trim() !== '');
    const gradeNumber = formData.grade.replace(/\D/g, ''); 
    const generatedId = `CLS-${gradeNumber}-${Math.floor(Math.random() * 1000)}`;

    const newClass = {
      id: generatedId,
      name: formData.name,
      grade: formData.grade,
      studentCount: parseInt(formData.studentCount) || 0,
      room: formData.room,
      status: "Active",
      classTeacher: formData.classTeacher,
      subjectTeachers: validSubjects
    };

    setClasses([newClass, ...classes]);
    setFormData({ name: '', grade: '', room: '', classTeacher: '', studentCount: '' });
    setSubjectList([{ subject: '', teacher: '' }]);
    setIsAddModalOpen(false);
  };

  const handleViewClass = (cls: any) => {
    setSelectedClass(cls);
    setActiveTab('overview');
    setMockStudents(generateMockStudents(cls.studentCount));
  };

  return (
    <div className="space-y-6 relative">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Manage Classes</h1>
          <p className="text-sm text-slate-500 font-medium">Create classes, assign class teachers, and manage subject allocations.</p>
        </div>
        <button 
          onClick={() => setIsAddModalOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors shadow-sm"
        >
          <Plus size={18} /> Create Class
        </button>
      </div>

      {/* Search and Filters */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            type="text" placeholder="Search by class name or ID..." 
            value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all text-sm"
          />
        </div>
        <select 
          value={gradeFilter} onChange={(e) => setGradeFilter(e.target.value)}
          className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 text-slate-700 font-medium text-sm"
        >
          <option value="all">All Grades</option>
          <option value="10">Grade 10 (O/L)</option>
          <option value="11">Grade 11 (O/L)</option>
          <option value="12">Grade 12 (A/L)</option>
          <option value="13">Grade 13 (A/L)</option>
        </select>
      </div>

      {/* Classes Table */}
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
              {filteredClasses.map((cls) => (
                <tr key={cls.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 border-2 border-white shadow-sm shrink-0">
                        <BookOpen size={20} />
                      </div>
                      <div>
                        <p className="font-bold text-slate-800">{cls.name}</p>
                        <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500 mt-0.5">
                          <GraduationCap size={12} className="text-blue-500" /> {cls.grade} • {cls.id}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-1">
                      <UserCheck size={14} className="text-slate-400" /> {cls.classTeacher}
                    </div>
                    <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                      <Users size={14} className="text-blue-500" /> {cls.studentCount} Students Enrolled
                    </div>
                  </td>
                  <td className="p-4 text-center">
                    <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-lg text-xs font-bold flex items-center justify-center gap-1 w-max mx-auto border border-slate-200">
                      <MapPin size={12} /> {cls.room}
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center justify-center gap-2">
                      <button onClick={() => handleViewClass(cls)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-md transition-colors" title="View Class Dashboard">
                        <Eye size={18} />
                      </button>
                      <button className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-md transition-colors" title="Edit Class Settings">
                        <Settings size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredClasses.length === 0 && (
            <div className="p-8 text-center text-slate-500 flex flex-col items-center gap-2">
              <BookOpen size={32} className="text-slate-300" />
              <p>No classes found matching your filters.</p>
            </div>
          )}
        </div>
      </div>

      {/* --- CLASS DASHBOARD MODAL --- */}
      {selectedClass && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
            
            {/* Modal Header */}
            <div className="bg-slate-50 border-b border-slate-100 p-6 flex justify-between items-start shrink-0">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-blue-100 flex items-center justify-center text-blue-700 text-2xl font-bold border-4 border-white shadow-sm shrink-0">
                  <BookOpen size={28} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-800">{selectedClass.name}</h2>
                  <p className="text-sm font-semibold text-slate-500">ID: {selectedClass.id} • {selectedClass.grade}</p>
                </div>
              </div>
              <button onClick={() => setSelectedClass(null)} className="text-slate-400 hover:text-slate-600 hover:bg-slate-200 p-2 rounded-full transition-colors"><X size={20} /></button>
            </div>

            {/* Navigation Tabs */}
            <div className="flex border-b border-slate-200 px-6 shrink-0 bg-white">
              <button onClick={() => setActiveTab('overview')} className={`py-3 px-4 text-sm font-bold border-b-2 transition-colors ${activeTab === 'overview' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
                Overview
              </button>
              <button onClick={() => setActiveTab('subjects')} className={`py-3 px-4 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'subjects' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
                <Book size={16} /> Subjects & Teachers
              </button>
              <button onClick={() => setActiveTab('students')} className={`py-3 px-4 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'students' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
                <Users size={16} /> Student Roster
              </button>
            </div>

            {/* Scrollable Content Area */}
            <div className="p-6 overflow-y-auto flex-1 bg-white relative">
              
              {/* TAB 1: OVERVIEW */}
              {activeTab === 'overview' && (
                <div className="space-y-6 animate-in fade-in duration-300">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="bg-blue-50 p-5 rounded-xl border border-blue-100 flex flex-col items-center justify-center text-center">
                      <UserCheck size={28} className="text-blue-500 mb-2" />
                      <p className="text-xs font-bold text-blue-400 uppercase tracking-wider mb-1">Class Teacher</p>
                      <p className="font-bold text-blue-900 text-lg">{selectedClass.classTeacher}</p>
                    </div>
                    <div className="grid grid-rows-2 gap-4">
                      <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex items-center justify-between">
                        <div>
                          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-0.5">Enrolled</p>
                          <p className="font-bold text-slate-800 text-lg">{selectedClass.studentCount} Students</p>
                        </div>
                        <Users size={24} className="text-slate-300" />
                      </div>
                      <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex items-center justify-between">
                        <div>
                          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-0.5">Location</p>
                          <p className="font-bold text-slate-800 text-lg">{selectedClass.room}</p>
                        </div>
                        <MapPin size={24} className="text-slate-300" />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: SUBJECTS & TEACHERS */}
              {activeTab === 'subjects' && (
                <div className="animate-in fade-in duration-300">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-sm font-bold text-slate-800">Assigned Subjects</h3>
                    <button className="text-xs font-bold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-md transition-colors flex items-center gap-1">
                      <Plus size={14} /> Assign New
                    </button>
                  </div>
                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 text-slate-500 text-xs border-b border-slate-200">
                          <th className="p-3 font-semibold uppercase tracking-wider">Subject</th>
                          <th className="p-3 font-semibold uppercase tracking-wider">Assigned Teacher</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedClass.subjectTeachers.map((subj: any, idx: number) => (
                          <tr key={idx} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50">
                            <td className="p-3 font-bold text-slate-700 text-sm">{subj.subject}</td>
                            <td className="p-3 text-sm font-medium text-slate-600 flex items-center gap-2">
                              <Users size={14} className="text-slate-400" /> {subj.teacher}
                            </td>
                          </tr>
                        ))}
                        {selectedClass.subjectTeachers.length === 0 && (
                          <tr><td colSpan={2} className="p-4 text-center text-sm text-slate-500">No subjects assigned yet.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* TAB 3: STUDENT ROSTER */}
              {activeTab === 'students' && (
                <div className="animate-in fade-in duration-300">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-sm font-bold text-slate-800">Student Roster</h3>
                    <div className="relative">
                      <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input type="text" placeholder="Search roster..." className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-md focus:ring-2 focus:ring-blue-100" />
                    </div>
                  </div>
                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 text-slate-500 text-xs border-b border-slate-200">
                          <th className="p-3 font-semibold uppercase tracking-wider">Student Name & ID</th>
                          <th className="p-3 font-semibold text-center uppercase tracking-wider">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {mockStudents.map((student, idx) => (
                          <tr key={idx} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50 cursor-pointer group">
                            <td className="p-3">
                              <p className="font-bold text-slate-800 text-sm group-hover:text-blue-600 transition-colors">{student.name}</p>
                              <p className="text-xs text-slate-500 mt-0.5">{student.id}</p>
                            </td>
                            <td className="p-3 text-center">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${student.status === 'Active' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                                {student.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p className="text-xs text-slate-400 mt-4 text-center">Showing {mockStudents.length} of {selectedClass.studentCount} enrolled students. (Showing limited list for demo purposes).</p>
                </div>
              )}

            </div>
          </div>
        </div>
      )}

      {/* --- ADD NEW CLASS MODAL --- */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[60] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            
            <div className="bg-slate-50 border-b border-slate-100 p-5 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-3">
                <div className="bg-blue-100 text-blue-600 p-2 rounded-lg"><Plus size={20} /></div>
                <div>
                  <h2 className="text-lg font-bold text-slate-800">Create New Class</h2>
                  <p className="text-xs text-slate-500 font-medium">Setup class details and assign teachers</p>
                </div>
              </div>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-600 hover:bg-slate-200 p-2 rounded-full transition-colors"><X size={20} /></button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1">
              <form id="add-class-form" onSubmit={handleCreateClass} className="space-y-6">
                
                {/* 1. Basic Info */}
                <div>
                  <h3 className="text-sm font-bold text-slate-800 mb-4 border-b border-slate-100 pb-2">Class Information</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.5 sm:col-span-2">
                      <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Class Name</label>
                      <input type="text" required placeholder="e.g. 10 Science - A" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-500 text-sm" />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Grade</label>
                      <select required value={formData.grade} onChange={(e) => setFormData({...formData, grade: e.target.value})} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-500 text-sm text-slate-700">
                        <option value="" disabled>Select Grade</option>
                        <option value="Grade 10">Grade 10</option>
                        <option value="Grade 11">Grade 11</option>
                        <option value="Grade 12">Grade 12</option>
                        <option value="Grade 13">Grade 13</option>
                      </select>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Room / Location</label>
                      <input type="text" required placeholder="e.g. Lab 01" value={formData.room} onChange={(e) => setFormData({...formData, room: e.target.value})} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-500 text-sm" />
                    </div>
                  </div>
                </div>

                {/* 2. Capacity & Class Teacher */}
                <div>
                  <h3 className="text-sm font-bold text-slate-800 mb-4 border-b border-slate-100 pb-2">Staff & Capacity</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Class Teacher</label>
                      <input type="text" required placeholder="e.g. Anura Fernando" value={formData.classTeacher} onChange={(e) => setFormData({...formData, classTeacher: e.target.value})} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-500 text-sm" />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Student Capacity</label>
                      <input type="number" required placeholder="e.g. 40" min="1" value={formData.studentCount} onChange={(e) => setFormData({...formData, studentCount: e.target.value})} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-500 text-sm" />
                    </div>
                  </div>
                </div>

                {/* 3. Dynamic Subject Assignments */}
                <div>
                  <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-2">
                    <h3 className="text-sm font-bold text-slate-800">Subject Allocations</h3>
                    <button type="button" onClick={handleAddSubjectRow} className="text-xs font-bold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-md transition-colors flex items-center gap-1">
                      <Plus size={14} /> Add Subject
                    </button>
                  </div>
                  
                  <div className="space-y-3">
                    {subjectList.map((item, index) => (
                      <div key={index} className="flex items-center gap-3">
                        <div className="flex-1">
                          <input type="text" placeholder="Subject Name (e.g. Mathematics)" value={item.subject} onChange={(e) => handleSubjectChange(index, 'subject', e.target.value)} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-500 text-sm" />
                        </div>
                        <div className="flex-1">
                          <input type="text" placeholder="Assigned Teacher" value={item.teacher} onChange={(e) => handleSubjectChange(index, 'teacher', e.target.value)} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-500 text-sm" />
                        </div>
                        <button type="button" onClick={() => handleRemoveSubjectRow(index)} disabled={subjectList.length === 1} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors" title="Remove Subject">
                          <Trash2 size={18} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

              </form>
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3 shrink-0">
              <button onClick={() => setIsAddModalOpen(false)} className="px-4 py-2 text-slate-600 text-sm font-medium hover:bg-slate-200 rounded-lg transition-colors">Cancel</button>
              <button type="submit" form="add-class-form" className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm">
                Create Class
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}