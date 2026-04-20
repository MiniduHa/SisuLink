import { useState, useEffect } from 'react';
import { Search, Plus, Mail, Phone, X, Users, CheckCircle, XCircle, Eye, User, Edit2, MessageSquare, Send, AlignLeft, GraduationCap } from 'lucide-react';

// Safe initials generator to prevent .split() crashes on null/empty names
const getInitials = (name: string) => {
  if (!name) return 'U';
  const parts = name.trim().split(' ').filter(Boolean);
  if (parts.length === 0) return 'U';
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
};

export default function ManageParents() {
  const [adminEmail, setAdminEmail] = useState('');
  const [parents, setParents] = useState<any[]>([]);
  const [allStudents, setAllStudents] = useState<any[]>([]); // NEW: Store students for cross-referencing
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Modal States
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingDbId, setEditingDbId] = useState<string | null>(null);
  
  const [selectedParent, setSelectedParent] = useState<any | null>(null);
  
  const [isMessageModalOpen, setIsMessageModalOpen] = useState(false);
  const [messageForm, setMessageForm] = useState({ recipientType: 'individual', targetParentId: '', subject: '', messageBody: '' });
  
  const [formData, setFormData] = useState({ fullName: '', parentEmail: '', phone: '', childStudentIds: '', status: 'Active', password: '' });

  useEffect(() => {
    const storedUser = localStorage.getItem('schoolConnectUser');
    if (storedUser) {
      const parsedUser = JSON.parse(storedUser);
      setAdminEmail(parsedUser.email);
      fetchParents(parsedUser.email);
      fetchStudents(parsedUser.email); // Fetch students on load
    }
  }, []);

  const fetchParents = async (email: string) => {
    try {
      const response = await fetch(`http://localhost:5000/api/school-admin/${email}/parents`);
      if (response.ok) {
        const data = await response.json();
        const formattedParents = data.map((p: any) => ({
          dbId: p.id,
          name: p.full_name || "Unknown Parent",
          email: p.email || "No Email",
          phone: p.phone_number || "N/A",
          childStudentIds: Array.isArray(p.child_student_ids) 
            ? p.child_student_ids.join(', ') 
            : (p.child_student_ids ? String(p.child_student_ids) : ""),
          status: p.status || "Active",
          joined: p.created_at ? new Date(p.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : "Recently"
        }));
        setParents(formattedParents);
      }
    } catch (err) {
      console.error("Failed to fetch parents", err);
    } finally {
      setIsLoading(false);
    }
  };

  // NEW: Fetch all students to match IDs to names
  const fetchStudents = async (email: string) => {
    try {
      const response = await fetch(`http://localhost:5000/api/school-admin/${email}/students`);
      if (response.ok) {
        const data = await response.json();
        setAllStudents(data);
      }
    } catch (err) {
      console.error("Failed to fetch students", err);
    }
  };

  const handleAddParent = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const payload = { ...formData, password: "welcome123" };
    try {
      const response = await fetch(`http://localhost:5000/api/school-admin/${adminEmail}/parents`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      });
      if (response.ok) {
        setIsAddModalOpen(false);
        setFormData({ fullName: '', parentEmail: '', phone: '', childStudentIds: '', status: 'Active', password: '' });
        fetchParents(adminEmail);
      } else {
        const data = await response.json();
        setError(data.error || "Failed to add parent.");
      }
    } catch (err) { setError("Server connection error."); }
  };

  const handleOpenEditModal = (parent: any) => {
    setEditingDbId(parent.dbId);
    setFormData({
      fullName: parent.name, parentEmail: parent.email, phone: parent.phone === "N/A" ? "" : parent.phone,
      childStudentIds: parent.childStudentIds, status: parent.status, password: ''
    });
    setIsEditModalOpen(true);
  };

  const handleUpdateParent = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const response = await fetch(`http://localhost:5000/api/school-admin/${adminEmail}/parents/${editingDbId}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(formData),
      });
      if (response.ok) {
        setIsEditModalOpen(false);
        setEditingDbId(null);
        setFormData({ fullName: '', parentEmail: '', phone: '', childStudentIds: '', status: 'Active', password: '' });
        fetchParents(adminEmail); 
      } else {
        const data = await response.json();
        setError(data.error || "Failed to update parent.");
      }
    } catch (err) { setError("Server connection error."); }
  };

  const handleStatusToggle = async (dbId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'Active' ? 'Inactive' : 'Active';
    setParents(parents.map(p => p.dbId === dbId ? { ...p, status: newStatus } : p));
    const parentToUpdate = parents.find(p => p.dbId === dbId);
    if (!parentToUpdate) return;
    try {
      await fetch(`http://localhost:5000/api/school-admin/${adminEmail}/parents/${dbId}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: parentToUpdate.name, parentEmail: parentToUpdate.email, phone: parentToUpdate.phone === "N/A" ? "" : parentToUpdate.phone,
          childStudentIds: parentToUpdate.childStudentIds, status: newStatus 
        }),
      });
    } catch (err) { console.error("Failed to update status", err); }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch(`http://localhost:5000/api/school-admin/${adminEmail}/messages/send`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(messageForm),
      });
      if (response.ok) {
        setIsMessageModalOpen(false);
        setMessageForm({ recipientType: 'individual', targetParentId: '', subject: '', messageBody: '' });
        alert("Message dispatched to parent successfully!"); 
      }
    } catch (err) { alert("Server connection error."); }
  };

  // Safe filtering logic
  const filteredParents = parents.filter(parent => {
    const safeName = parent.name || "";
    const safeEmail = parent.email || "";
    const safeIds = parent.childStudentIds || "";
    const safeStatus = parent.status || "";

    const matchesSearch = safeName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          safeEmail.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          safeIds.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || safeStatus.toLowerCase() === statusFilter.toLowerCase();
    
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6 relative">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Manage Parents & Guardians</h1>
          <p className="text-sm text-slate-500 font-medium">Add, update, and manage parent profiles and their linked students.</p>
        </div>
        <button onClick={() => { setFormData({ fullName: '', parentEmail: '', phone: '', childStudentIds: '', status: 'Active', password: '' }); setIsAddModalOpen(true); }} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-colors shadow-sm w-full sm:w-auto">
          <Plus size={18} /> Add Parent
        </button>
      </div>

      {/* Search and Filters */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input type="text" placeholder="Search by name, email, or Student ID..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all text-sm" />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 text-slate-700 font-medium text-sm">
          <option value="all">All Statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      {/* Parents Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-sm border-b border-slate-200">
                <th className="p-4 font-semibold">Parent Profile</th>
                <th className="p-4 font-semibold">Contact Details</th>
                <th className="p-4 font-semibold">Linked Students</th>
                <th className="p-4 font-semibold text-center">Status</th>
                <th className="p-4 font-semibold text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={5} className="p-12 text-center text-slate-500"><p className="font-medium animate-pulse">Loading parent data...</p></td></tr>
              ) : filteredParents.length > 0 ? (
                filteredParents.map((parent) => (
                  <tr key={parent.dbId} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-700 font-bold border-2 border-white shadow-sm shrink-0 uppercase">
                          {getInitials(parent.name)}
                        </div>
                        <div>
                          <p className="font-bold text-slate-800">{parent.name}</p>
                          <p className="text-xs font-medium text-slate-500 mt-0.5">Joined {parent.joined}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2 text-sm text-slate-600 mb-1"><Mail size={14} className="text-slate-400" /> {parent.email}</div>
                      <div className="flex items-center gap-2 text-sm text-slate-600"><Phone size={14} className="text-slate-400" /> {parent.phone}</div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                        <GraduationCap size={16} className="text-blue-500" />
                        {parent.childStudentIds ? (
                          <div className="flex flex-wrap gap-1">
                            {parent.childStudentIds.split(',').map((id: string, idx: number) => (
                              <span key={idx} className="bg-slate-100 border border-slate-200 px-2 py-0.5 rounded text-xs">{id.trim()}</span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-slate-400 italic text-xs">No Students Linked</span>
                        )}
                      </div>
                    </td>
                    <td className="p-4 text-center">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        parent.status === 'Active' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {parent.status}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => {setSelectedParent(parent);}} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors" title="View Profile">
                          <Eye size={18} />
                        </button>
                        <button onClick={() => {setMessageForm({...messageForm, targetParentId: parent.dbId}); setIsMessageModalOpen(true);}} className="p-1.5 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded-md transition-colors" title="Message Parent">
                          <MessageSquare size={18} />
                        </button>
                        <button onClick={() => handleOpenEditModal(parent)} className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-md transition-colors" title="Edit Parent">
                          <Edit2 size={18} />
                        </button>
                        <button onClick={() => handleStatusToggle(parent.dbId, parent.status)} className={`p-1.5 rounded-md transition-colors ${parent.status === 'Active' ? 'text-red-400 hover:text-red-600 hover:bg-red-50' : 'text-emerald-400 hover:text-emerald-600 hover:bg-emerald-50'}`} title={parent.status === 'Active' ? 'Deactivate Account' : 'Activate Account'}>
                          {parent.status === 'Active' ? <XCircle size={18} /> : <CheckCircle size={18} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="p-12 text-center text-slate-500">
                    <Users size={48} className="mx-auto text-slate-300 mb-3" />
                    <p className="font-medium text-sm">No parents found.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- ADD / EDIT PARENT MODAL --- */}
      {(isAddModalOpen || isEditModalOpen) && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="bg-slate-50 border-b border-slate-100 p-5 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="bg-blue-100 text-blue-600 p-2 rounded-lg">{isEditModalOpen ? <Edit2 size={20} /> : <Users size={20} />}</div>
                <div>
                  <h2 className="text-lg font-bold text-slate-800">{isEditModalOpen ? "Edit Parent Profile" : "Register New Parent"}</h2>
                  <p className="text-xs text-slate-500 font-medium">{isEditModalOpen ? "Update details and student links" : "Create a portal account for a guardian"}</p>
                </div>
              </div>
              <button onClick={() => { setIsAddModalOpen(false); setIsEditModalOpen(false); }} className="text-slate-400 hover:text-slate-600 hover:bg-slate-200 p-2 rounded-full transition-colors"><X size={20} /></button>
            </div>
            
            <div className="p-6">
              {error && <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm font-medium border border-red-200">{error}</div>}
              
              <form id="parent-form" onSubmit={isEditModalOpen ? handleUpdateParent : handleAddParent} className="space-y-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Full Name</label>
                  <input type="text" required placeholder="e.g. Michael Fernando" value={formData.fullName} onChange={(e) => setFormData({...formData, fullName: e.target.value})} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all text-sm" />
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Email Address</label>
                    <input type="email" required placeholder="parent@email.com" value={formData.parentEmail} onChange={(e) => setFormData({...formData, parentEmail: e.target.value})} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all text-sm" />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Phone Number</label>
                    <input type="tel" required placeholder="+94 77 000 0000" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all text-sm" />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Linked Student IDs</label>
                    <span className="text-[10px] text-slate-400">Comma separated (e.g. STU-101, STU-102)</span>
                  </div>
                  <input type="text" required placeholder="STU-XXXXX, STU-YYYYY" value={formData.childStudentIds} onChange={(e) => setFormData({...formData, childStudentIds: e.target.value})} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all text-sm" />
                </div>
                
                {isEditModalOpen && (
                  <div className="flex flex-col gap-1.5 pt-2">
                    <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Account Status</label>
                    <select required value={formData.status} onChange={(e) => setFormData({...formData, status: e.target.value})} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all text-sm text-slate-700">
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                    </select>
                  </div>
                )}
              </form>
            </div>
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
              <button onClick={() => { setIsAddModalOpen(false); setIsEditModalOpen(false); }} className="px-4 py-2 text-slate-600 text-sm font-medium hover:bg-slate-200 rounded-lg transition-colors">Cancel</button>
              <button type="submit" form="parent-form" className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm">
                {isEditModalOpen ? "Update Parent" : "Register Parent"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- VIEW PARENT PROFILE MODAL --- */}
      {selectedParent && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="bg-slate-50 border-b border-slate-100 p-6 flex justify-between items-start shrink-0">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 text-2xl font-bold border-4 border-white shadow-sm shrink-0 uppercase">
                  {getInitials(selectedParent.name)}
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-800">{selectedParent.name}</h2>
                  <span className={`inline-block mt-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                    selectedParent.status === 'Active' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                  }`}>
                    {selectedParent.status}
                  </span>
                </div>
              </div>
              <button onClick={() => setSelectedParent(null)} className="text-slate-400 hover:text-slate-600 hover:bg-slate-200 p-2 rounded-full transition-colors"><X size={20} /></button>
            </div>

            <div className="p-6 space-y-6 bg-white overflow-y-auto">
              <div>
                <h3 className="text-sm font-bold text-slate-800 mb-3 border-b border-slate-100 pb-2 flex items-center gap-2">
                  <User size={16} className="text-blue-500" /> Contact Information
                </h3>
                <div className="bg-slate-50 rounded-xl border border-slate-100 p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <Mail size={16} className="text-slate-400" />
                    <div>
                      <p className="text-xs text-slate-500 font-medium">Email Address</p>
                      <p className="text-sm font-bold text-slate-800">{selectedParent.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Phone size={16} className="text-slate-400" />
                    <div>
                      <p className="text-xs text-slate-500 font-medium">Phone Number</p>
                      <p className="text-sm font-bold text-slate-800">{selectedParent.phone}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-bold text-slate-800 mb-3 border-b border-slate-100 pb-2 flex items-center gap-2">
                  <GraduationCap size={16} className="text-emerald-500" /> Enrolled Students
                </h3>
                <div className="bg-slate-50 rounded-xl border border-slate-100 p-4">
                  {selectedParent.childStudentIds ? (
                    <div className="flex flex-col gap-3">
                      {/* NEW: Smart mapping over student IDs to pull real database info */}
                      {selectedParent.childStudentIds.split(',').map((idString: string, idx: number) => {
                        const id = idString.trim();
                        const studentDetails = allStudents.find(s => s.index_number === id);

                        return (
                          <div key={idx} className="flex justify-between items-center bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 shrink-0">
                                <User size={14} />
                              </div>
                              <div>
                                {studentDetails ? (
                                  <>
                                    <p className="text-sm font-bold text-slate-800">{studentDetails.first_name} {studentDetails.last_name}</p>
                                    <p className="text-[10px] font-medium text-slate-500 mt-0.5">
                                      {studentDetails.grade_level} - {studentDetails.section || 'Unassigned'} <span className="mx-1 text-slate-300">|</span> ID: {id}
                                    </p>
                                  </>
                                ) : (
                                  <>
                                    <p className="text-sm font-bold text-slate-800">{id}</p>
                                    <p className="text-[10px] font-medium text-amber-600 mt-0.5">Student profile not found in database</p>
                                  </>
                                )}
                              </div>
                            </div>
                            <span className="text-[10px] text-blue-600 font-bold bg-blue-50 border border-blue-100 px-2.5 py-1 rounded-full uppercase tracking-wide">Linked</span>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-500 italic text-center py-2">No student IDs currently linked to this profile.</p>
                  )}
                </div>
              </div>
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
                  <h2 className="text-lg font-bold text-slate-800">Send Direct Message</h2>
                  <p className="text-xs text-slate-500 font-medium">Message will be sent to the parent's portal</p>
                </div>
              </div>
              <button onClick={() => setIsMessageModalOpen(false)} className="text-slate-400 hover:text-slate-600 hover:bg-slate-200 p-2 rounded-full transition-colors"><X size={20} /></button>
            </div>
            <div className="p-6">
              <form id="compose-message-form" onSubmit={handleSendMessage} className="space-y-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Message Subject</label>
                  <input type="text" required placeholder="e.g. Student Progress Update" value={messageForm.subject} onChange={(e) => setMessageForm({...messageForm, subject: e.target.value})} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-100 focus:border-purple-500 transition-all text-sm text-slate-800" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Message Details</label>
                  <div className="relative">
                    <AlignLeft size={16} className="absolute left-3 top-3 text-slate-400" />
                    <textarea required placeholder="Type your message here..." rows={5} value={messageForm.messageBody} onChange={(e) => setMessageForm({...messageForm, messageBody: e.target.value})} className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-100 focus:border-purple-500 transition-all text-sm text-slate-800 resize-none" />
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