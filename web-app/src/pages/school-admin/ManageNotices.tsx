import { useState } from 'react';
import { Search, Plus, X, Megaphone, CalendarDays, Users, Edit2, Trash2, Eye, CheckCircle2, AlignLeft, FileText } from 'lucide-react';

// --- MOCK DATA ---
const initialNotices = [
  { 
    id: 'NOT-001', title: "School Closed for Vesak Poya", date: "2026-04-12", 
    priority: "High", audience: "All Students & Parents", status: "Published", author: "Principal's Office",
    content: "Please be informed that the school will remain closed on the 1st of May in observance of Vesak Poya. Regular academic activities will resume on the following Monday. We wish all our students and their families a peaceful and meaningful Vesak."
  },
  { 
    id: 'NOT-002', title: "Grade 10 Parent-Teacher Meeting", date: "2026-04-11", 
    priority: "Normal", audience: "Grade 10 Students", status: "Published", author: "Admin Office",
    content: "The termly Parent-Teacher meeting for Grade 10 students is scheduled for next Friday from 2:00 PM to 4:30 PM in the Main Hall. Your attendance is highly appreciated to discuss your child's academic progress."
  },
  { 
    id: 'NOT-003', title: "Inter-House Sports Meet Registration", date: "2026-04-10", 
    priority: "Normal", audience: "All Students", status: "Published", author: "Sports Department",
    content: "Registrations for the Annual Inter-House Sports Meet are now open. Students interested in participating in track and field events must submit their names to their respective House Captains before the end of this week."
  },
  { 
    id: 'NOT-004', title: "Update on Term 1 Examination Timetable", date: "2026-04-09", 
    priority: "High", audience: "All Students", status: "Draft", author: "Examination Unit",
    content: "Draft timetable for the upcoming Term 1 examinations. Please review the attached schedule. Final confirmation will be published next week."
  },
  { 
    id: 'NOT-005', title: "New Library Opening Hours", date: "2026-04-05", 
    priority: "Low", audience: "All Students", status: "Published", author: "Library Department",
    content: "Starting next month, the Main Library will extend its opening hours. The new operating hours will be from 7:30 AM to 5:00 PM on all weekdays to give students more time for reference and study."
  },
];

export default function ManageNotices() {
  const [searchTerm, setSearchTerm] = useState('');
  const [audienceFilter, setAudienceFilter] = useState('all');
  const [notices, setNotices] = useState(initialNotices);

  // View Modal State
  const [selectedNotice, setSelectedNotice] = useState<any | null>(null);

  // Form Modal State (Handles BOTH Add and Edit)
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [formMode, setFormMode] = useState<'add' | 'edit'>('add');
  const [editingNoticeId, setEditingNoticeId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    title: '', audience: '', priority: 'Normal', author: '', content: ''
  });
  
  // Filter Logic
  const filteredNotices = notices.filter(notice => {
    const matchesSearch = notice.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesAudience = audienceFilter === 'all' || notice.audience.toLowerCase().includes(audienceFilter.toLowerCase());
    return matchesSearch && matchesAudience;
  });

  // --- HANDLERS ---
  const openAddModal = () => {
    setFormMode('add');
    setEditingNoticeId(null);
    setFormData({ title: '', audience: '', priority: 'Normal', author: '', content: '' });
    setIsFormModalOpen(true);
  };

  const openEditModal = (notice: any) => {
    setFormMode('edit');
    setEditingNoticeId(notice.id);
    setFormData({
      title: notice.title, audience: notice.audience, priority: notice.priority, 
      author: notice.author, content: notice.content || ''
    });
    setIsFormModalOpen(true);
  };

  const handleDeleteNotice = (id: string) => {
    if(window.confirm("Are you sure you want to delete this notice? This cannot be undone.")) {
      setNotices(notices.filter(n => n.id !== id));
    }
  };

  const handleSaveNotice = (targetStatus: 'Draft' | 'Published') => {
    // Basic validation
    if(!formData.title || !formData.content || !formData.audience || !formData.author) {
      alert("Please fill in all required fields before saving.");
      return;
    }

    const today = new Date().toISOString().split('T')[0]; // Format: YYYY-MM-DD

    const submittedNotice = {
      id: formMode === 'edit' && editingNoticeId ? editingNoticeId : `NOT-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`,
      title: formData.title,
      date: formMode === 'edit' ? (notices.find(n => n.id === editingNoticeId)?.date || today) : today,
      priority: formData.priority,
      audience: formData.audience,
      author: formData.author,
      content: formData.content,
      status: targetStatus
    };

    if (formMode === 'edit') {
      setNotices(notices.map(n => n.id === editingNoticeId ? submittedNotice : n));
    } else {
      setNotices([submittedNotice, ...notices]);
    }
    
    setIsFormModalOpen(false);
  };

  return (
    <div className="space-y-6 relative">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Notices & Announcements</h1>
          <p className="text-sm text-slate-500 font-medium">Broadcast messages to students, parents, and teaching staff.</p>
        </div>
        <button 
          onClick={openAddModal}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors shadow-sm"
        >
          <Plus size={18} /> New Notice
        </button>
      </div>

      {/* Search and Filters */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search notices by title..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all text-sm"
          />
        </div>
        <select 
          value={audienceFilter}
          onChange={(e) => setAudienceFilter(e.target.value)}
          className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 text-slate-700 font-medium text-sm"
        >
          <option value="all">All Audiences</option>
          <option value="parents">Parents</option>
          <option value="students">Students</option>
          <option value="grade 10">Grade 10</option>
          <option value="staff">Staff</option>
        </select>
      </div>

      {/* Notices Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-sm border-b border-slate-200">
                <th className="p-4 font-semibold">Notice Title & Details</th>
                <th className="p-4 font-semibold">Target Audience</th>
                <th className="p-4 font-semibold text-center">Status</th>
                <th className="p-4 font-semibold text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredNotices.map((notice) => (
                <tr key={notice.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                  <td className="p-4">
                    <div className="flex items-start gap-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center border shrink-0 ${
                        notice.priority === 'High' ? 'bg-red-50 text-red-600 border-red-100' :
                        notice.priority === 'Normal' ? 'bg-purple-50 text-purple-600 border-purple-100' :
                        'bg-slate-50 text-slate-500 border-slate-200'
                      }`}>
                        <Megaphone size={18} />
                      </div>
                      <div>
                        <p className="font-bold text-slate-800 line-clamp-1">{notice.title}</p>
                        <div className="flex items-center gap-3 mt-1.5 text-xs font-medium text-slate-500">
                          <span className="flex items-center gap-1"><CalendarDays size={12} className="text-slate-400" /> {notice.date}</span>
                          <span className="flex items-center gap-1"><Users size={12} className="text-slate-400" /> {notice.author}</span>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <span className="text-sm font-semibold text-slate-700">{notice.audience}</span>
                  </td>
                  <td className="p-4 text-center">
                    <div className="flex flex-col items-center gap-1.5">
                      {/* Status Badge */}
                      {notice.status === 'Published' ? (
                        <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-bold uppercase tracking-wider">
                          <CheckCircle2 size={10} /> Published
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-slate-500 text-[10px] font-bold uppercase tracking-wider">
                          Draft
                        </span>
                      )}
                      
                      {/* Priority Tag */}
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded w-max ${
                        notice.priority === 'High' ? 'text-red-600 bg-red-50' : 
                        notice.priority === 'Normal' ? 'text-blue-600 bg-blue-50' : 'text-slate-500 bg-slate-100'
                      }`}>
                        {notice.priority} Priority
                      </span>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center justify-center gap-2">
                      <button onClick={() => setSelectedNotice(notice)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-md transition-colors" title="View Notice">
                        <Eye size={18} />
                      </button>
                      <button onClick={() => openEditModal(notice)} className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-md transition-colors" title="Edit Notice">
                        <Edit2 size={18} />
                      </button>
                      <button onClick={() => handleDeleteNotice(notice.id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-md transition-colors" title="Delete Notice">
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredNotices.length === 0 && (
            <div className="p-8 text-center text-slate-500 flex flex-col items-center gap-2">
              <Megaphone size={32} className="text-slate-300" />
              <p>No notices found matching your filters.</p>
            </div>
          )}
        </div>
      </div>

      {/* --- VIEW NOTICE MODAL --- */}
      {selectedNotice && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="bg-slate-50 border-b border-slate-100 p-6 flex justify-between items-start shrink-0">
              <div className="flex items-center gap-4">
                <div className={`w-14 h-14 rounded-xl flex items-center justify-center border-2 border-white shadow-sm shrink-0 ${
                  selectedNotice.priority === 'High' ? 'bg-red-100 text-red-600' :
                  selectedNotice.priority === 'Normal' ? 'bg-blue-100 text-blue-600' :
                  'bg-slate-100 text-slate-500'
                }`}>
                  <FileText size={28} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-800 leading-tight">{selectedNotice.title}</h2>
                  <div className="flex items-center gap-3 mt-2 text-xs font-semibold text-slate-500">
                    <span className="flex items-center gap-1"><CalendarDays size={14} className="text-slate-400" /> {selectedNotice.date}</span>
                    <span className="flex items-center gap-1"><Users size={14} className="text-slate-400" /> {selectedNotice.audience}</span>
                    <span className="text-slate-300">|</span>
                    <span>Ref: {selectedNotice.id}</span>
                  </div>
                </div>
              </div>
              <button onClick={() => setSelectedNotice(null)} className="text-slate-400 hover:text-slate-600 hover:bg-slate-200 p-2 rounded-full transition-colors"><X size={20} /></button>
            </div>

            {/* Notice Body */}
            <div className="p-8 overflow-y-auto flex-1 bg-white">
              <div className="bg-amber-50/50 border border-amber-100 p-8 rounded-xl min-h-[250px]">
                <p className="text-slate-800 text-sm leading-relaxed whitespace-pre-wrap font-medium">
                  {selectedNotice.content || "No content provided for this notice."}
                </p>
              </div>
              
              {/* Footer Meta */}
              <div className="mt-6 flex justify-between items-center text-xs font-medium text-slate-500 border-t border-slate-100 pt-4">
                <p>Issued By: <span className="font-bold text-slate-700">{selectedNotice.author}</span></p>
                <div className="flex gap-2">
                  <span className={`px-2 py-1 rounded ${selectedNotice.status === 'Published' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                    {selectedNotice.status}
                  </span>
                  <span className={`px-2 py-1 rounded ${selectedNotice.priority === 'High' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
                    {selectedNotice.priority} Priority
                  </span>
                </div>
              </div>
            </div>
            
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3 shrink-0">
              <button onClick={() => { setSelectedNotice(null); openEditModal(selectedNotice); }} className="px-4 py-2 text-slate-600 text-sm font-medium hover:bg-slate-200 rounded-lg transition-colors flex items-center gap-2">
                <Edit2 size={16} /> Edit
              </button>
              <button onClick={() => setSelectedNotice(null)} className="bg-slate-800 hover:bg-slate-900 text-white px-6 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- ADD / EDIT NOTICE MODAL --- */}
      {isFormModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[60] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
            
            <div className="bg-slate-50 border-b border-slate-100 p-5 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${formMode === 'add' ? 'bg-blue-100 text-blue-600' : 'bg-amber-100 text-amber-600'}`}>
                  {formMode === 'add' ? <Megaphone size={20} /> : <Edit2 size={20} />}
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-800">
                    {formMode === 'add' ? 'Draft New Notice' : 'Edit Notice'}
                  </h2>
                  <p className="text-xs text-slate-500 font-medium">
                    {formMode === 'add' ? 'Create a new broadcast message for the school' : 'Update existing announcement details'}
                  </p>
                </div>
              </div>
              <button onClick={() => setIsFormModalOpen(false)} className="text-slate-400 hover:text-slate-600 hover:bg-slate-200 p-2 rounded-full transition-colors"><X size={20} /></button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1">
              <div className="space-y-6">
                
                {/* Title & Metadata Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5 sm:col-span-2">
                    <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Notice Title</label>
                    <input type="text" required placeholder="e.g. End of Term Holiday Announcement" value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-500 text-sm" />
                  </div>
                  
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Target Audience</label>
                    <select required value={formData.audience} onChange={(e) => setFormData({...formData, audience: e.target.value})} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-500 text-sm text-slate-700">
                      <option value="" disabled>Select Audience</option>
                      <option value="All Students & Parents">All Students & Parents</option>
                      <option value="All Students">All Students</option>
                      <option value="All Parents">All Parents</option>
                      <option value="Teaching Staff">Teaching Staff</option>
                      <option value="Grade 10 Students">Grade 10 Students</option>
                      <option value="Grade 11 Students">Grade 11 Students</option>
                      <option value="Grade 12 Students">Grade 12 Students</option>
                      <option value="Grade 13 Students">Grade 13 Students</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Issuing Authority / Author</label>
                    <select required value={formData.author} onChange={(e) => setFormData({...formData, author: e.target.value})} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-500 text-sm text-slate-700">
                      <option value="" disabled>Select Authority</option>
                      <option value="Principal's Office">Principal's Office</option>
                      <option value="Admin Office">Admin Office</option>
                      <option value="Examination Unit">Examination Unit</option>
                      <option value="Sports Department">Sports Department</option>
                      <option value="Science Department">Science Department</option>
                      <option value="Library Department">Library Department</option>
                      <option value="IT Department">IT Department</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-1.5 sm:col-span-2">
                    <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Importance Level</label>
                    <div className="flex gap-4">
                      {['Low', 'Normal', 'High'].map(level => (
                        <label key={level} className="flex items-center gap-2 cursor-pointer bg-slate-50 border border-slate-200 px-4 py-2 rounded-lg flex-1 hover:bg-slate-100 transition-colors">
                          <input 
                            type="radio" 
                            name="priority" 
                            value={level} 
                            checked={formData.priority === level}
                            onChange={(e) => setFormData({...formData, priority: e.target.value})}
                            className="text-blue-600 focus:ring-blue-500 w-4 h-4" 
                          />
                          <span className={`text-sm font-semibold ${
                            level === 'High' ? 'text-red-600' : level === 'Normal' ? 'text-blue-600' : 'text-slate-600'
                          }`}>{level} Priority</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Content Editor */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Notice Body</label>
                    <span className="text-xs text-slate-400">Supports plain text formatting</span>
                  </div>
                  <div className="relative">
                    <AlignLeft size={16} className="absolute left-3 top-3 text-slate-400" />
                    <textarea 
                      required 
                      placeholder="Type the full announcement here..." 
                      rows={8} 
                      value={formData.content} 
                      onChange={(e) => setFormData({...formData, content: e.target.value})} 
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all text-sm text-slate-800 resize-none font-medium leading-relaxed" 
                    />
                  </div>
                </div>

              </div>
            </div>

            {/* Action Footer */}
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-between items-center shrink-0">
              <button 
                onClick={() => handleSaveNotice('Draft')} 
                className="text-slate-500 text-sm font-semibold hover:text-slate-800 transition-colors px-2 py-2"
              >
                {formMode === 'add' ? 'Save as Draft' : 'Revert to Draft'}
              </button>
              
              <div className="flex gap-3">
                <button onClick={() => setIsFormModalOpen(false)} className="px-4 py-2 text-slate-600 text-sm font-medium hover:bg-slate-200 rounded-lg transition-colors">
                  Cancel
                </button>
                <button 
                  onClick={() => handleSaveNotice('Published')} 
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm flex items-center gap-2"
                >
                  <Megaphone size={16} /> 
                  {formMode === 'add' ? 'Publish Notice' : 'Update & Publish'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}