import { useState, useEffect, useRef } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, Users, GraduationCap, BookOpen, CalendarDays, 
  Bell, Settings, LogOut, Library, UserSquare, X, Upload, 
  Phone, Mail, Globe, MapPin 
} from 'lucide-react';

// --- CUSTOM SVG BRAND LOGOS ---
const FacebookIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path>
  </svg>
);

const InstagramIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
  </svg>
);

const LinkedinIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"></path>
    <rect x="2" y="9" width="4" height="12"></rect>
    <circle cx="4" cy="4" r="2"></circle>
  </svg>
);

export default function SchoolAdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [adminData, setAdminData] = useState<any>(null);

  // --- Modal & Form State for School Profile ---
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null); 

  const [schoolProfile, setSchoolProfile] = useState({
    logo: null as any,
    slogan: '',
    bio: '',
    phone: '',
    email: '',
    website: '',
    address: '',
    facebook: '',
    instagram: '',
    linkedin: ''
  });

  useEffect(() => {
    const storedUser = localStorage.getItem('schoolConnectUser');
    if (storedUser) {
      const parsed = JSON.parse(storedUser);
      setAdminData(parsed);
      fetchSchoolProfile(parsed.email);
    }
  }, []);

  const fetchSchoolProfile = async (email: string) => {
    try {
      const response = await fetch(`http://localhost:5000/api/school-admin/${email}/profile`);
      if (response.ok) {
        const data = await response.json();
        setSchoolProfile({
          logo: data.logo_url || null,
          slogan: data.slogan || '',
          bio: data.bio || '',
          phone: data.phone || '',
          email: data.email || email, 
          website: data.website || '',
          address: data.address || '',
          facebook: data.facebook_url || '',
          instagram: data.instagram_url || '',
          linkedin: data.linkedin_url || ''
        });
        
        if (data.logo_url) {
          setLogoPreview(data.logo_url);
        }
      }
    } catch (error) {
      console.error("Error fetching school profile:", error);
    }
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSchoolProfile(prev => ({ ...prev, logo: file }));
      setLogoPreview(URL.createObjectURL(file)); 
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminData || !adminData.email) return;

    try {
      let uploadedLogoUrl = schoolProfile.logo;

      if (schoolProfile.logo instanceof File) {
        const formData = new FormData();
        formData.append('image', schoolProfile.logo);

        const uploadRes = await fetch('http://localhost:5000/api/school-admin/upload-event-image', {
          method: 'POST',
          body: formData
        });

        if (uploadRes.ok) {
          const uploadData = await uploadRes.json();
          uploadedLogoUrl = uploadData.imageUrl;
        } else {
          alert("Failed to upload logo image.");
          return;
        }
      }

      const payload = {
        logo_url: uploadedLogoUrl, 
        slogan: schoolProfile.slogan,
        bio: schoolProfile.bio,
        phone: schoolProfile.phone,
        website: schoolProfile.website,
        address: schoolProfile.address,
        facebook: schoolProfile.facebook,
        instagram: schoolProfile.instagram,
        linkedin: schoolProfile.linkedin
      };

      const response = await fetch(`http://localhost:5000/api/school-admin/${adminData.email}/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        alert("School Profile Settings Saved Successfully!");
        setIsProfileModalOpen(false);
      } else {
        const errData = await response.json();
        alert(errData.error || "Failed to update profile.");
      }
    } catch (error) {
      console.error("Error updating profile:", error);
      alert("Network error updating profile.");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('schoolConnectUser');
    navigate('/login');
  };

  const getInitials = (name: string) => {
    if (!name) return 'A'; 
    const nameParts = name.trim().split(' ');
    if (nameParts.length >= 2) return `${nameParts[0][0]}${nameParts[1][0]}`.toUpperCase();
    return name.substring(0, 2).toUpperCase();
  };

  const navItems = [
    { name: 'Dashboard', path: '/school-admin', icon: LayoutDashboard },
    { name: 'Teachers', path: '/school-admin/teachers', icon: Users },
    { name: 'Students', path: '/school-admin/students', icon: GraduationCap },
    { name: 'Parents', path: '/school-admin/parents', icon: UserSquare }, 
    { name: 'Classes', path: '/school-admin/classes', icon: BookOpen },
    { name: 'Calendar', path: '/school-admin/calendar', icon: CalendarDays },
    { name: 'Notices', path: '/school-admin/notices', icon: Bell },
  ];

  return (
    <div className="flex h-screen bg-slate-50 font-sans overflow-hidden relative">
      
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 text-white flex flex-col hidden md:flex z-10">
        
        {/* Clickable Header */}
        <button 
          onClick={() => setIsProfileModalOpen(true)}
          className="p-6 flex items-center gap-3 border-b border-slate-800 text-left hover:bg-slate-800/50 transition-colors focus:outline-none group"
        >
          {/* FIXED: Removed the blue box when a logo is uploaded! */}
          {logoPreview ? (
            <img 
              src={logoPreview} 
              alt="School Logo" 
              className="w-11 h-11 object-contain rounded-lg shadow-sm group-hover:scale-105 transition-transform bg-white/10" 
            />
          ) : (
            <div className="bg-blue-600 p-2.5 rounded-xl shadow-lg shadow-blue-600/20 group-hover:scale-105 transition-transform">
              <Library size={24} className="text-white" />
            </div>
          )}
          
          <div className="overflow-hidden flex-1">
            <span className="text-lg font-bold tracking-wide truncate block w-full text-white" title={adminData?.school_name}>
              {adminData?.school_name || 'School Portal'}
            </span>
            <span className="text-xs text-blue-400 font-medium block">
              Admin Portal
            </span>
          </div>
        </button>

        <nav className="flex-1 py-6 px-4 flex flex-col gap-1.5 overflow-y-auto">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 px-2">Main Menu</p>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path || (location.pathname === '/school-admin' && item.path === '/school-admin');
            return (
              <button
                key={item.name}
                onClick={() => navigate(item.path)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all w-full text-left font-medium ${
                  isActive 
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/10' 
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <Icon size={20} />
                {item.name}
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-800 flex flex-col gap-1.5">
          <button className="flex items-center gap-3 px-3 py-2.5 text-slate-400 hover:bg-slate-800 hover:text-white w-full text-left rounded-lg transition-colors font-medium">
            <Settings size={20} /> Settings
          </button>
          <button 
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2.5 text-red-400 hover:bg-red-500/10 hover:text-red-300 w-full text-left rounded-lg transition-colors font-medium"
          >
            <LogOut size={20} /> Log Out
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 z-10 shadow-sm shrink-0">
          <h2 className="text-xl font-bold text-slate-800">
            {navItems.find(item => item.path === location.pathname)?.name || 'Dashboard'}
          </h2>
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-bold text-slate-800">{adminData?.admin_name || 'Administrator'}</p>
              <p className="text-xs text-slate-500 font-medium">System Administrator</p>
            </div>
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 font-bold border-2 border-white shadow-sm">
              {getInitials(adminData?.admin_name)}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-auto p-4 sm:p-8">
          <Outlet />
        </div>
      </main>

      {/* --- SCHOOL PROFILE SETTINGS MODAL --- */}
      {isProfileModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col animate-in zoom-in-95 duration-200">
            
            {/* Modal Header */}
            <div className="px-6 py-5 border-b border-slate-200 flex justify-between items-center bg-slate-50 rounded-t-2xl shrink-0">
              <div>
                <h2 className="text-xl font-bold text-slate-800">School Profile Settings</h2>
                <p className="text-sm text-slate-500 font-medium mt-1">Update how your school appears across the platform</p>
              </div>
              <button 
                onClick={() => setIsProfileModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-full transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            {/* Scrollable Form Body */}
            <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
              <form id="school-profile-form" onSubmit={handleSaveProfile} className="space-y-8">
                
                {/* 1. Logo & Basic Info Section */}
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2">Branding & Identity</h3>
                  
                  <div className="flex flex-col sm:flex-row gap-6 items-start">
                    
                    <div className="flex flex-col gap-2">
                      <span className="text-sm font-semibold text-slate-700">School Logo</span>
                      
                      <div 
                        onClick={() => fileInputRef.current?.click()}
                        className="w-32 h-32 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 flex flex-col items-center justify-center text-slate-400 hover:bg-slate-100 hover:border-blue-400 hover:text-blue-500 transition-colors cursor-pointer group relative overflow-hidden"
                      >
                        {logoPreview ? (
                          <img src={logoPreview} alt="School Logo" className="w-full h-full object-contain p-2" />
                        ) : (
                          <>
                            <Upload size={28} className="mb-2 group-hover:-translate-y-1 transition-transform" />
                            <span className="text-xs font-medium">Upload Image</span>
                          </>
                        )}
                        <input 
                          type="file" 
                          accept="image/*"
                          ref={fileInputRef} 
                          onChange={handleLogoChange}
                          className="hidden" 
                        />
                      </div>
                    </div>

                    <div className="flex-1 w-full space-y-4">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-sm font-semibold text-slate-700">School Name</label>
                        <input 
                          type="text" 
                          disabled
                          value={adminData?.school_name || ''} 
                          className="w-full px-4 py-2.5 bg-slate-100 border border-slate-200 rounded-lg text-sm text-slate-500 cursor-not-allowed" 
                        />
                        <p className="text-xs text-slate-400">School name is permanently registered.</p>
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-sm font-semibold text-slate-700">School Slogan / Motto</label>
                        <input 
                          type="text" 
                          placeholder="e.g., Knowledge is Power" 
                          value={schoolProfile.slogan}
                          onChange={(e) => setSchoolProfile({...schoolProfile, slogan: e.target.value})}
                          className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all text-sm" 
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-semibold text-slate-700">About the School (Bio)</label>
                    <textarea 
                      placeholder="Write a brief history or description of the school..." 
                      rows={4}
                      value={schoolProfile.bio}
                      onChange={(e) => setSchoolProfile({...schoolProfile, bio: e.target.value})}
                      className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all text-sm resize-none" 
                    />
                  </div>
                </div>

                {/* 2. Contact Information */}
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2">Contact Information</h3>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.5 relative">
                      <label className="text-sm font-semibold text-slate-700">Phone Number</label>
                      <div className="relative">
                        <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input type="tel" placeholder="+94 00 000 0000" value={schoolProfile.phone} onChange={(e) => setSchoolProfile({...schoolProfile, phone: e.target.value})} className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all text-sm" />
                      </div>
                    </div>
                    <div className="flex flex-col gap-1.5 relative">
                      <label className="text-sm font-semibold text-slate-700">Official Email</label>
                      <div className="relative">
                        <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input type="email" placeholder="admin@school.edu" value={schoolProfile.email} onChange={(e) => setSchoolProfile({...schoolProfile, email: e.target.value})} className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all text-sm" />
                      </div>
                    </div>
                    <div className="flex flex-col gap-1.5 relative sm:col-span-2">
                      <label className="text-sm font-semibold text-slate-700">Website URL</label>
                      <div className="relative">
                        <Globe size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input type="url" placeholder="https://www.schoolname.edu.lk" value={schoolProfile.website} onChange={(e) => setSchoolProfile({...schoolProfile, website: e.target.value})} className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all text-sm" />
                      </div>
                    </div>
                    <div className="flex flex-col gap-1.5 relative sm:col-span-2">
                      <label className="text-sm font-semibold text-slate-700">Physical Address</label>
                      <div className="relative">
                        <MapPin size={16} className="absolute left-3 top-3 text-slate-400" />
                        <textarea placeholder="Full school address..." rows={2} value={schoolProfile.address} onChange={(e) => setSchoolProfile({...schoolProfile, address: e.target.value})} className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all text-sm resize-none" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* 3. Social Media (USING CUSTOM BRAND SVGS) */}
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2">Social Media Links</h3>
                  
                  <div className="space-y-3">
                    <div className="relative">
                      <FacebookIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-[#1877F2]" />
                      <input type="url" placeholder="Facebook Page URL" value={schoolProfile.facebook} onChange={(e) => setSchoolProfile({...schoolProfile, facebook: e.target.value})} className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#1877F2]/20 focus:border-[#1877F2] transition-all text-sm" />
                    </div>
                    <div className="relative">
                      <InstagramIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-[#E4405F]" />
                      <input type="url" placeholder="Instagram Profile URL" value={schoolProfile.instagram} onChange={(e) => setSchoolProfile({...schoolProfile, instagram: e.target.value})} className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#E4405F]/20 focus:border-[#E4405F] transition-all text-sm" />
                    </div>
                    <div className="relative">
                      <LinkedinIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-[#0A66C2]" />
                      <input type="url" placeholder="LinkedIn Page URL" value={schoolProfile.linkedin} onChange={(e) => setSchoolProfile({...schoolProfile, linkedin: e.target.value})} className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#0A66C2]/20 focus:border-[#0A66C2] transition-all text-sm" />
                    </div>
                  </div>
                </div>

              </form>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 rounded-b-2xl flex justify-end gap-3 shrink-0">
              <button 
                type="button"
                onClick={() => setIsProfileModalOpen(false)}
                className="px-5 py-2.5 text-slate-600 text-sm font-bold hover:bg-slate-200 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button 
                type="submit"
                form="school-profile-form"
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl text-sm font-bold transition-all shadow-md shadow-blue-600/20 active:scale-95"
              >
                Save Changes
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}