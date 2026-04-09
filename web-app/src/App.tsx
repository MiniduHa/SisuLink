import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

// --- BASE PAGES ---
import AdminLogin from './pages/AdminLogin';
import SchoolRegistration from './pages/SchoolRegistration';

// --- SUPER ADMIN IMPORTS ---
import SuperAdminLayout from './pages/super-admin/SuperAdminLayout';
import SuperAdminDashboard from './pages/super-admin/SuperAdminDashboard';
import ManageSchools from './pages/super-admin/ManageSchools';
import PlatformSettings from './pages/super-admin/PlatformSettings';

// Placeholder for School Admin (exactly as you had it!)
const SchoolAdminDashboard = () => <div className="p-8 text-2xl font-bold">School Admin Dashboard (Coming Soon)</div>;

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        
        {/* --- AUTH & REGISTRATION ROUTES --- */}
        <Route path="/login" element={<AdminLogin />} />
        <Route path="/register" element={<SchoolRegistration />} /> {/* NEW ROUTE */}

        {/* --- SUPER ADMIN ROUTES --- */}
        <Route path="/super-admin" element={<SuperAdminLayout />}>
          <Route index element={<SuperAdminDashboard />} />
          <Route path="schools" element={<ManageSchools />} />
          <Route path="settings" element={<PlatformSettings />} />
        </Route>

        {/* --- SCHOOL ADMIN ROUTES --- */}
        <Route path="/school-admin/*" element={<SchoolAdminDashboard />} />
      </Routes>
    </Router>
  );
}

export default App;