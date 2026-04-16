import { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, GraduationCap, BookOpen, CalendarDays, Bell, Settings, LogOut, Library } from 'lucide-react';

export default function SchoolAdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [adminData, setAdminData] = useState<any>(null);

  // Fetch data from local storage when the layout loads
  useEffect(() => {
    const storedUser = localStorage.getItem('schoolConnectUser');
    if (storedUser) {
      setAdminData(JSON.parse(storedUser));
    }
  }, []);

  const handleLogout = () => {
    // SECURITY: Clear the session data when logging out!
    localStorage.removeItem('schoolConnectUser');
    navigate('/login');
  };

  // Helper function to dynamically generate initials (e.g., "Principal Perera" -> "PP")
  const getInitials = (name: string) => {
    if (!name) return 'A'; // Default Admin initial
    const nameParts = name.trim().split(' ');
    if (nameParts.length >= 2) {
      return `${nameParts[0][0]}${nameParts[1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const navItems = [
    { name: 'Dashboard', path: '/school-admin', icon: LayoutDashboard },
    { name: 'Teachers', path: '/school-admin/teachers', icon: Users },
    { name: 'Students', path: '/school-admin/students', icon: GraduationCap },
    { name: 'Classes', path: '/school-admin/classes', icon: BookOpen },
    { name: 'Calendar', path: '/school-admin/calendar', icon: CalendarDays },
    { name: 'Notices', path: '/school-admin/notices', icon: Bell },
  ];

  return (
    <div className="flex h-screen bg-slate-50 font-sans overflow-hidden">
      
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 text-white flex flex-col hidden md:flex">
        <div className="p-6 flex items-center gap-3 border-b border-slate-800">
          <div className="bg-blue-600 p-2.5 rounded-xl shadow-lg shadow-blue-600/20">
            <Library size={24} className="text-white" />
          </div>
          <div className="overflow-hidden">
            <span className="text-lg font-bold tracking-wide block">Admin Portal</span>
            {/* DYNAMIC SCHOOL NAME */}
            <span className="text-xs text-blue-400 font-medium truncate block w-full" title={adminData?.school_name}>
              {adminData?.school_name || 'School Portal'}
            </span>
          </div>
        </div>

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
              {/* DYNAMIC ADMIN NAME */}
              <p className="text-sm font-bold text-slate-800">{adminData?.admin_name || 'Administrator'}</p>
              <p className="text-xs text-slate-500 font-medium">System Administrator</p>
            </div>
            {/* DYNAMIC INITIALS */}
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

    </div>
  );
}