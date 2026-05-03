import { useState, useEffect } from 'react';
import { Search, Mail, Phone, X, Building2, CheckCircle, XCircle, Eye, Briefcase, CalendarDays, MapPin, BadgeCheck, Clock, AlertCircle } from 'lucide-react';

export default function InternshipApprovals() {
  const [adminEmail, setAdminEmail] = useState('');
  const [internships, setInternships] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // View Details State
  const [selectedInternship, setSelectedInternship] = useState<any | null>(null);

  useEffect(() => {
    const storedUser = localStorage.getItem('sisuLinkUser');
    if (storedUser) {
      const parsedUser = JSON.parse(storedUser);
      setAdminEmail(parsedUser.email);
      fetchPendingInternships(parsedUser.email);
    }
  }, []);

  const fetchPendingInternships = async (email: string) => {
    try {
      const res = await fetch(`http://localhost:5000/api/school-admin/${email}/internships/pending`);
      if (res.ok) {
        const data = await res.json();
        setInternships(data);
      }
    } catch (err) { console.error(err); } finally { setIsLoading(false); }
  };

  const handleStatusUpdate = async (id: number, newStatus: string) => {
    try {
      const res = await fetch(`http://localhost:5000/api/school-admin/internships/${id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) {
        setInternships(internships.filter(i => i.id !== id));
        setSelectedInternship(null);
        alert(`Internship post has been ${newStatus === 'Active' ? 'approved and is now visible to students' : 'rejected'}.`);
      }
    } catch (err) { console.error(err); }
  };

  const filteredInternships = internships.filter(i => 
    i.company_name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    i.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    i.location.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Internship Approvals</h1>
          <p className="text-slate-500">Review and approve industry opportunities for your students</p>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="bg-blue-600 rounded-2xl p-6 mb-8 text-white flex flex-col md:flex-row justify-between items-center shadow-lg shadow-blue-100">
        <div className="flex items-center gap-4 mb-4 md:mb-0">
          <div className="p-3 bg-white/20 rounded-xl">
            <Briefcase className="w-8 h-8 text-white" />
          </div>
          <div>
            <h3 className="text-xl font-bold">Pending Reviews</h3>
            <p className="text-blue-100 text-sm">There are {internships.length} internship posts waiting for your approval</p>
          </div>
        </div>
        <div className="bg-white/10 px-6 py-3 rounded-xl border border-white/20">
          <span className="text-sm font-medium">Students can only see approved posts.</span>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative mb-6">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
        <input 
          type="text" 
          placeholder="Search by job title, company, or location..."
          className="w-full pl-12 pr-4 py-3 bg-white border border-slate-100 rounded-2xl shadow-sm focus:ring-2 focus:ring-blue-500 transition-all outline-none"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Internship Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          <div className="col-span-full py-12 text-center text-slate-400 font-medium">Loading pending opportunities...</div>
        ) : filteredInternships.length === 0 ? (
          <div className="col-span-full bg-white rounded-3xl p-12 border border-slate-100 shadow-sm text-center flex flex-col items-center">
             <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                <BadgeCheck className="w-10 h-10 text-slate-200" />
             </div>
             <h3 className="text-xl font-bold text-slate-800">No Pending Approvals</h3>
             <p className="text-slate-500 mt-1 max-w-sm">All internship posts have been reviewed. New posts from industry partners will appear here.</p>
          </div>
        ) : (
          filteredInternships.map((internship) => (
            <div key={internship.id} className="bg-white rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-all overflow-hidden flex flex-col">
              <div className="p-6 flex-1">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 font-bold text-xl">
                    {internship.company_name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 line-clamp-1">{internship.title}</h3>
                    <p className="text-xs font-semibold text-blue-600">{internship.company_name}</p>
                  </div>
                </div>

                <div className="space-y-3 mb-4">
                  <div className="flex items-center gap-2 text-sm text-slate-500">
                    <MapPin className="w-4 h-4" /> {internship.location}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-500">
                    <Clock className="w-4 h-4" /> {internship.employment_type}
                  </div>
                </div>

                <p className="text-sm text-slate-600 line-clamp-2 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100">
                  {internship.description}
                </p>
              </div>

              <div className="px-6 py-4 bg-slate-50/50 border-t border-slate-100 flex gap-2">
                <button 
                  onClick={() => setSelectedInternship(internship)}
                  className="flex-1 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl font-bold text-sm hover:bg-slate-50 transition-colors shadow-sm"
                >
                  Review Details
                </button>
                <button 
                  onClick={() => handleStatusUpdate(internship.id, 'Active')}
                  className="p-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors shadow-md shadow-blue-100"
                  title="Quick Approve"
                >
                  <CheckCircle className="w-5 h-5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Details Modal */}
      {selectedInternship && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-xl text-blue-600">
                  <Briefcase className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-800">Internship Review</h2>
                  <p className="text-sm text-slate-500">Review before student publication</p>
                </div>
              </div>
              <button onClick={() => setSelectedInternship(null)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            
            <div className="p-8 max-h-[70vh] overflow-y-auto">
              <div className="mb-8">
                <h3 className="text-2xl font-extrabold text-slate-800 mb-2">{selectedInternship.title}</h3>
                <div className="flex items-center gap-4 flex-wrap">
                  <span className="flex items-center gap-1 text-sm font-bold text-blue-600">
                    <Building2 className="w-4 h-4" /> {selectedInternship.company_name}
                  </span>
                  <span className="flex items-center gap-1 text-sm font-medium text-slate-500">
                    <MapPin className="w-4 h-4" /> {selectedInternship.location}
                  </span>
                  <span className="flex items-center gap-1 text-sm font-medium text-slate-500">
                    <CalendarDays className="w-4 h-4" /> Posted {new Date(selectedInternship.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>

              <div className="space-y-6">
                <div>
                  <h4 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-3">Job Description</h4>
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-slate-700 text-sm leading-relaxed whitespace-pre-wrap">
                    {selectedInternship.description}
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-3">Requirements</h4>
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-slate-700 text-sm leading-relaxed whitespace-pre-wrap italic">
                    {selectedInternship.requirements || 'No specific requirements listed.'}
                  </div>
                </div>

                <div className="bg-amber-50 p-4 rounded-2xl border border-amber-100 flex gap-3 items-start">
                   <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                   <p className="text-xs text-amber-700 font-medium">
                     <b>Note:</b> Approving this post will make it visible to all students in your school. Industry partners can see if you've approved or rejected their posts.
                   </p>
                </div>
              </div>
            </div>

            <div className="p-6 bg-slate-50 flex flex-col sm:flex-row justify-between gap-4 border-t border-slate-100">
              <button 
                onClick={() => handleStatusUpdate(selectedInternship.id, 'Rejected')}
                className="px-6 py-3 border-2 border-red-100 text-red-600 rounded-2xl font-bold hover:bg-red-50 transition-colors flex items-center justify-center gap-2"
              >
                <XCircle size={20} /> Reject Post
              </button>
              <div className="flex gap-3">
                <button 
                  onClick={() => setSelectedInternship(null)}
                  className="px-6 py-3 bg-white border border-slate-200 text-slate-600 rounded-2xl font-bold hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={() => handleStatusUpdate(selectedInternship.id, 'Active')}
                  className="px-8 py-3 bg-blue-600 text-white rounded-2xl font-extrabold hover:bg-blue-700 transition-all shadow-xl shadow-blue-200 flex items-center gap-2"
                >
                  <CheckCircle size={20} /> Approve for Students
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
