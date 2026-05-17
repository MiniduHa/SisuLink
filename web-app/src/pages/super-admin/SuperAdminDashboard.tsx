import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Users, UserCheck, TrendingUp, CheckCircle, XCircle, Clock, Eye, Mail, X, Phone, Calendar as CalendarIcon } from 'lucide-react';

export default function SuperAdminDashboard() {
  const navigate = useNavigate();
  
  // State for our live data
  const [dashboardStats, setDashboardStats] = useState([
    { title: "Total Schools", value: "0", icon: Building2, color: "bg-blue-500" },
    { title: "Total Students", value: "0", icon: Users, color: "bg-emerald-500" },
    { title: "Total Parents", value: "0", icon: UserCheck, color: "bg-amber-500" },
    { title: "System Health", value: "99.9%", icon: TrendingUp, color: "bg-purple-500" },
  ]);
  
  const [pendingApprovals, setPendingApprovals] = useState<any[]>([]);
  const [recentSchools, setRecentSchools] = useState<any[]>([]);
  const [selectedSchool, setSelectedSchool] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // --- FETCH LIVE DATA ON LOAD ---
  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      // UPDATED TO NEW MODULAR ROUTE
      const response = await fetch('http://localhost:5000/api/superadmin/schools/dashboard');
      const data = await response.json();

      if (response.ok) {
        setPendingApprovals(data.pendingApprovals);
        setRecentSchools(data.recentSchools);
        
        // Update the stats cards
        setDashboardStats([
          { title: "Total Schools", value: data.stats.totalSchools.toString(), icon: Building2, color: "bg-blue-500" },
          { title: "Total Students", value: data.stats.totalStudents.toString(), icon: Users, color: "bg-emerald-500" },
          { title: "Total Parents", value: data.stats.totalParents.toString(), icon: UserCheck, color: "bg-amber-500" },
          { title: "System Health", value: data.stats.systemHealth, icon: TrendingUp, color: "bg-purple-500" },
        ]);
      }
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // --- REAL ACTION LOGIC TO UPDATE DATABASE ---
  const updateSchoolStatus = async (schoolId: string, newStatus: string) => {
    try {
      // CALLING OUR NEW UPDATE ENDPOINT
      const response = await fetch(`http://localhost:5000/api/superadmin/schools/${schoolId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        // If successful, re-fetch the dashboard data to instantly update the UI!
        fetchDashboardData();
      } else {
        alert("Failed to update school status. Please try again.");
      }
    } catch (error) {
      console.error("Error updating status:", error);
    }
  };

  const handleApprove = (schoolId: string) => {
    updateSchoolStatus(schoolId, 'Active');
  };

  const handleDeclinePending = (schoolId: string) => {
    if (window.confirm("Are you sure you want to decline this school's registration?")) {
      updateSchoolStatus(schoolId, 'Declined');
    }
  };

  const handleStatusToggle = (schoolId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'Active' ? 'Declined' : 'Active';
    updateSchoolStatus(schoolId, newStatus);
  };

  if (isLoading) {
    return <div className="flex justify-center items-center h-64 text-slate-500 font-medium">Loading Dashboard Data...</div>;
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 relative">
      
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {dashboardStats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div key={index} className="bg-white rounded-xl p-6 border border-slate-100 shadow-sm flex items-center gap-4">
              <div className={`${stat.color} w-12 h-12 rounded-lg flex items-center justify-center text-white shrink-0`}>
                <Icon size={24} />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500">{stat.title}</p>
                <h3 className="text-2xl font-bold text-slate-800">{stat.value}</h3>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Action Required - Pending Approvals */}
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">
          <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
            <div className="flex items-center gap-2">
              <Clock size={18} className="text-amber-500" />
              <h3 className="text-lg font-bold text-slate-800">Action Required</h3>
            </div>
            <span className="bg-amber-100 text-amber-700 text-xs font-bold px-2.5 py-1 rounded-full">
              {pendingApprovals.length} Pending
            </span>
          </div>
          
          <div className="p-2 flex-1 overflow-y-auto">
            {pendingApprovals.length > 0 ? (
              pendingApprovals.map((school) => (
                <div key={school.id} className="p-4 border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors rounded-lg">
                  <h4 className="font-bold text-slate-800">{school.name}</h4>
                  <p className="text-xs text-slate-500 mt-1">{school.contact} • {school.email}</p>
                  <p className="text-xs text-slate-400 mt-1 mb-3">Requested: {new Date(school.date).toLocaleDateString()}</p>
                  
                  <div className="flex items-center gap-2 mt-2">
                    <button 
                      onClick={() => handleApprove(school.id)}
                      className="flex-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 py-1.5 rounded-lg text-sm font-semibold flex items-center justify-center gap-1.5 transition-colors border border-emerald-200"
                    >
                      <CheckCircle size={16} /> Approve
                    </button>
                    <button 
                      onClick={() => handleDeclinePending(school.id)}
                      className="flex-1 bg-red-50 hover:bg-red-100 text-red-700 py-1.5 rounded-lg text-sm font-semibold flex items-center justify-center gap-1.5 transition-colors border border-red-200"
                    >
                      <XCircle size={16} /> Decline
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 py-8">
                <CheckCircle size={32} className="mb-2 text-emerald-400" />
                <p className="text-sm font-medium">All caught up!</p>
                <p className="text-xs">No pending approvals.</p>
              </div>
            )}
          </div>
        </div>

        {/* Recent Schools Table */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex justify-between items-center">
            <h3 className="text-lg font-bold text-slate-800">Recently Onboarded Schools</h3>
            <button 
              onClick={() => navigate('/super-admin/schools')}
              className="text-sm font-medium text-blue-600 hover:text-blue-700"
            >
              View All
            </button>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-sm border-b border-slate-200">
                  <th className="p-4 font-semibold">School Name</th>
                  <th className="p-4 font-semibold">Joined Date</th>
                  <th className="p-4 font-semibold text-center">Status</th>
                  <th className="p-4 font-semibold text-center">Quick Actions</th>
                </tr>
              </thead>
              <tbody>
                {recentSchools.length > 0 ? (
                  recentSchools.map((school) => (
                    <tr key={school.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                      <td className="p-4">
                        <p className="font-medium text-slate-800">{school.name}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{school.students || 0} Students</p>
                      </td>
                      <td className="p-4 text-slate-600 text-sm">
                        {new Date(school.joined).toLocaleDateString()}
                      </td>
                      <td className="p-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold block w-max mx-auto ${
                          school.status === 'Active' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                        }`}>
                          {school.status}
                        </span>
                      </td>
                      
                      <td className="p-4">
                        <div className="flex items-center justify-center gap-2">
                          <button 
                            onClick={() => setSelectedSchool(school)}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                            title="View Profile"
                          >
                            <Eye size={18} />
                          </button>
                          
                          <button 
                            onClick={() => window.location.href = `mailto:${school.email}`}
                            className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-md transition-colors"
                            title="Email Admin"
                          >
                            <Mail size={18} />
                          </button>

                          <button 
                            onClick={() => handleStatusToggle(school.id, school.status)}
                            className={`p-1.5 rounded-md transition-colors ${
                              school.status === 'Active'
                                ? 'text-red-600 hover:bg-red-50' 
                                : 'text-emerald-600 hover:bg-emerald-50'
                            }`}
                            title={school.status === 'Active' ? 'Decline School' : 'Activate School'}
                          >
                            {school.status === 'Active' ? <XCircle size={18} /> : <CheckCircle size={18} />}
                          </button>
                        </div>
                      </td>
                      
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-slate-500">
                      No active schools found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* SCHOOL DETAILS POPUP MODAL */}
      {selectedSchool && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
            
            <div className="bg-slate-50 border-b border-slate-100 p-6 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center">
                  <Building2 size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-800">{selectedSchool.name}</h2>
                  <p className="text-sm text-slate-500 font-medium">System ID: {selectedSchool.id}</p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedSchool(null)}
                className="text-slate-400 hover:text-slate-600 bg-slate-100 hover:bg-slate-200 p-2 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-6">
              
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Status</p>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                    selectedSchool.status === 'Active' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                  }`}>
                    {selectedSchool.status}
                  </span>
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Total Students</p>
                  <p className="text-lg font-bold text-slate-800">{selectedSchool.students || 0}</p>
                </div>
              </div>

              <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 space-y-4">
                <h3 className="font-semibold text-slate-800 border-b border-slate-200 pb-2 mb-3">Primary Contact Details</h3>
                
                <div className="flex items-center gap-3">
                  <UserCheck size={18} className="text-slate-400" />
                  <div>
                    <p className="text-xs text-slate-500">Admin Name</p>
                    <p className="font-medium text-slate-800">{selectedSchool.contact}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <Mail size={18} className="text-slate-400" />
                  <div>
                    <p className="text-xs text-slate-500">Official Email</p>
                    <p className="font-medium text-slate-800">{selectedSchool.email}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Phone size={18} className="text-slate-400" />
                  <div>
                    <p className="text-xs text-slate-500">Contact Number</p>
                    <p className="font-medium text-slate-800">{selectedSchool.phone}</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 text-sm text-slate-500 pb-2">
                <CalendarIcon size={16} />
                <span>Onboarded on the platform: <span className="font-semibold">{new Date(selectedSchool.joined).toLocaleDateString()}</span></span>
              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  );
}