import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, Building2, Settings, LogOut, GraduationCap } from 'lucide-react';

export default function SuperAdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    // In the future, clear tokens/session here
    navigate('/login');
  };

  const navItems = [
    { name: 'Dashboard', path: '/super-admin', icon: LayoutDashboard },
    { name: 'Manage Schools', path: '/super-admin/schools', icon: Building2 },
    { name: 'Manage Industry', path: '/super-admin/industry', icon: Building2 },
    { name: 'Platform Settings', path: '/super-admin/settings', icon: Settings },
  ];

  return (
    <div className="flex h-screen bg-slate-50 font-sans overflow-hidden">
      
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 text-white flex flex-col hidden md:flex">
        <div className="p-6 flex items-center gap-3 border-b border-slate-800">
          <div className="bg-blue-600 p-2 rounded-lg">
            <GraduationCap size={24} />
          </div>
          <span className="text-xl font-bold tracking-wide">Super Admin</span>
        </div>

        <nav className="flex-1 py-6 px-3 flex flex-col gap-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <button
                key={item.name}
                onClick={() => navigate(item.path)}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors w-full text-left ${
                  isActive 
                    ? 'bg-blue-600 text-white' 
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <Icon size={20} />
                <span className="font-medium">{item.name}</span>
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-800">
          <button 
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-3 text-red-400 hover:bg-slate-800 hover:text-red-300 w-full text-left rounded-lg transition-colors"
          >
            <LogOut size={20} />
            <span className="font-medium">Log Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 z-10">
          <h2 className="text-xl font-semibold text-slate-800">
            {navItems.find(item => item.path === location.pathname)?.name || 'Dashboard'}
          </h2>
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-slate-600">Admin User</span>
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 font-bold border-2 border-white shadow-sm">
              SA
            </div>
          </div>
        </header>

        {/* Page Content (This changes based on the URL) */}
        <div className="flex-1 overflow-auto p-8">
          <Outlet />
        </div>
      </main>

    </div>
  );
}