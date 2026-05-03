import { useState, useEffect } from 'react';
import { Search, Mail, Phone, X, Building2, CheckCircle, XCircle, Eye, Globe, AlertCircle, Briefcase, CalendarDays } from 'lucide-react';

export default function ManageIndustry() {
  const [partners, setPartners] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // View Details State
  const [selectedPartner, setSelectedPartner] = useState<any | null>(null);

  useEffect(() => {
    fetchPartners();
  }, []);

  const fetchPartners = async () => {
    try {
      const res = await fetch(`http://localhost:5000/api/superadmin/industry`);
      if (res.ok) {
        const data = await res.json();
        setPartners(data);
      }
    } catch (err) { console.error(err); } finally { setIsLoading(false); }
  };

  const handleStatusUpdate = async (id: number, newStatus: string) => {
    try {
      const res = await fetch(`http://localhost:5000/api/superadmin/industry/${id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) {
        setPartners(partners.map(p => p.id === id ? { ...p, status: newStatus } : p));
        if (selectedPartner && selectedPartner.id === id) setSelectedPartner({ ...selectedPartner, status: newStatus });
        alert(`Partner status updated to ${newStatus}`);
      }
    } catch (err) { console.error(err); }
  };

  const filteredPartners = partners.filter(p => {
    const matchesSearch = p.company_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.brn.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="p-6">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Industry Partnerships</h1>
          <p className="text-slate-500">Global management of company collaborations</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-50 rounded-xl">
              <Building2 className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Total Partners</p>
              <h3 className="text-2xl font-bold text-slate-800">{partners.length}</h3>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-amber-50 rounded-xl">
              <AlertCircle className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Pending Approval</p>
              <h3 className="text-2xl font-bold text-slate-800">
                {partners.filter(p => p.status === 'Pending').length}
              </h3>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-green-50 rounded-xl">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Active Partners</p>
              <h3 className="text-2xl font-bold text-slate-800">
                {partners.filter(p => p.status === 'Active').length}
              </h3>
            </div>
          </div>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by company, email, or BRN..."
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-blue-500 transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <select
            className="px-4 py-2 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-blue-500 outline-none min-w-[150px]"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All Status</option>
            <option value="Active">Active</option>
            <option value="Pending">Pending</option>
            <option value="Suspended">Suspended</option>
          </select>
        </div>
      </div>

      {/* Partners List */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="px-6 py-4 text-sm font-semibold text-slate-600">Company</th>
                <th className="px-6 py-4 text-sm font-semibold text-slate-600">BRN & Industry</th>
                <th className="px-6 py-4 text-sm font-semibold text-slate-600">Contact</th>
                <th className="px-6 py-4 text-sm font-semibold text-slate-600">Status</th>
                <th className="px-6 py-4 text-sm font-semibold text-slate-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {isLoading ? (
                <tr><td colSpan={5} className="px-6 py-12 text-center text-slate-400">Loading industry partners...</td></tr>
              ) : filteredPartners.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-12 text-center text-slate-400">No industry partners found matching your criteria.</td></tr>
              ) : (
                filteredPartners.map((partner) => (
                  <tr key={partner.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600 font-bold overflow-hidden">
                          {partner.logo_url ? (
                            <img src={partner.logo_url} alt={partner.company_name} className="w-full h-full object-cover" />
                          ) : (
                            partner.company_name.charAt(0)
                          )}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-800">{partner.company_name}</p>
                          <p className="text-xs text-slate-500">Joined {new Date(partner.created_at).toLocaleDateString()}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-medium text-slate-700">{partner.brn}</p>
                      <p className="text-xs text-slate-500">{partner.industry_type}</p>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2 text-xs text-slate-600">
                          <Mail className="w-3.5 h-3.5" /> {partner.email}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-600">
                          <Phone className="w-3.5 h-3.5" /> {partner.phone || 'N/A'}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${partner.status === 'Active' ? 'bg-green-50 text-green-600' :
                          partner.status === 'Pending' ? 'bg-amber-50 text-amber-600' :
                            'bg-red-50 text-red-600'
                        }`}>
                        {partner.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setSelectedPartner(partner)}
                          className="p-2 hover:bg-white rounded-lg text-slate-400 hover:text-blue-600 transition-colors shadow-sm border border-transparent hover:border-slate-100"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {partner.status === 'Pending' && (
                          <button
                            onClick={() => handleStatusUpdate(partner.id, 'Active')}
                            className="p-2 hover:bg-white rounded-lg text-slate-400 hover:text-green-600 transition-colors shadow-sm border border-transparent hover:border-slate-100"
                            title="Approve Partner"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </button>
                        )}
                        {partner.status === 'Active' && (
                          <button
                            onClick={() => handleStatusUpdate(partner.id, 'Suspended')}
                            className="p-2 hover:bg-white rounded-lg text-slate-400 hover:text-red-600 transition-colors shadow-sm border border-transparent hover:border-slate-100"
                            title="Suspend Partner"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Partner Details Modal */}
      {selectedPartner && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-xl text-blue-600">
                  <Building2 className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-800">Partner Details</h2>
                  <p className="text-sm text-slate-500">Review company information</p>
                </div>
              </div>
              <button onClick={() => setSelectedPartner(null)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            <div className="p-8">
              <div className="flex flex-col md:flex-row gap-8 mb-8">
                <div className="w-24 h-24 rounded-3xl bg-blue-50 flex items-center justify-center text-3xl font-bold text-blue-600 border-4 border-white shadow-lg overflow-hidden">
                  {selectedPartner.logo_url ? (
                    <img src={selectedPartner.logo_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    selectedPartner.company_name.charAt(0)
                  )}
                </div>
                <div className="flex-1">
                  <h3 className="text-2xl font-bold text-slate-800 mb-1">{selectedPartner.company_name}</h3>
                  <p className="text-slate-500 flex items-center gap-2 mb-4">
                    <Briefcase className="w-4 h-4" /> {selectedPartner.industry_type} Partner
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <span className={`px-4 py-1.5 rounded-full text-xs font-semibold ${selectedPartner.status === 'Active' ? 'bg-green-100 text-green-700' :
                        selectedPartner.status === 'Pending' ? 'bg-amber-100 text-amber-700' :
                          'bg-red-100 text-red-700'
                      }`}>
                      {selectedPartner.status}
                    </span>
                    <span className="px-4 py-1.5 rounded-full bg-slate-100 text-slate-600 text-xs font-semibold">
                      BRN: {selectedPartner.brn}
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Contact Information</h4>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-2xl">
                      <Mail className="w-5 h-5 text-blue-600" />
                      <div>
                        <p className="text-xs text-slate-500">Email Address</p>
                        <p className="text-sm font-semibold text-slate-700">{selectedPartner.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-2xl">
                      <Phone className="w-5 h-5 text-blue-600" />
                      <div>
                        <p className="text-xs text-slate-500">Phone Number</p>
                        <p className="text-sm font-semibold text-slate-700">{selectedPartner.phone || 'Not Provided'}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Partnership Info</h4>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-2xl">
                      <CalendarDays className="w-5 h-5 text-blue-600" />
                      <div>
                        <p className="text-xs text-slate-500">Registration Date</p>
                        <p className="text-sm font-semibold text-slate-700">{new Date(selectedPartner.created_at).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-2xl">
                      <Globe className="w-5 h-5 text-blue-600" />
                      <div>
                        <p className="text-xs text-slate-500">Platform Access</p>
                        <p className="text-sm font-semibold text-slate-700">Mobile Enabled</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 bg-slate-50 flex justify-end gap-3">
              <button
                onClick={() => setSelectedPartner(null)}
                className="px-6 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl font-semibold hover:bg-slate-50 transition-colors"
              >
                Close
              </button>
              {selectedPartner.status !== 'Active' && (
                <button
                  onClick={() => handleStatusUpdate(selectedPartner.id, 'Active')}
                  className="px-6 py-2.5 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-all shadow-lg shadow-blue-200"
                >
                  Approve Partnership
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
