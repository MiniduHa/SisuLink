import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

// --- BASE PAGES ---
import AdminLogin from './pages/AdminLogin';
import SchoolRegistration from './pages/SchoolRegistration';

// --- SUPER ADMIN IMPORTS ---
import SuperAdminLayout from './pages/super-admin/SuperAdminLayout';
import SuperAdminDashboard from './pages/super-admin/SuperAdminDashboard';
import ManageSchools from './pages/super-admin/ManageSchools';
import ManageIndustry from './pages/super-admin/ManageIndustry';
import PlatformSettings from './pages/super-admin/PlatformSettings';

// --- SCHOOL ADMIN IMPORTS ---
import SchoolAdminLayout from './pages/school-admin/SchoolAdminLayout';
import SchoolAdminDashboard from './pages/school-admin/SchoolAdminDashboard';
import ManageTeachers from './pages/school-admin/ManageTeachers';
import ManageStudents from './pages/school-admin/ManageStudents';
import ManageClasses from './pages/school-admin/ManageClasses';
import ManageCalendar from './pages/school-admin/ManageCalendar';
import ManageNotices from './pages/school-admin/ManageNotices';
import ManageParents from './pages/school-admin/ManageParents';
import IndustryApprovals from './pages/school-admin/IndustryApprovals';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        
        {/* --- AUTH & REGISTRATION ROUTES --- */}
        <Route path="/login" element={<AdminLogin />} />
        <Route path="/register" element={<SchoolRegistration />} />

        {/* --- SUPER ADMIN ROUTES --- */}
        <Route path="/super-admin" element={<SuperAdminLayout />}>
          <Route index element={<SuperAdminDashboard />} />
          <Route path="schools" element={<ManageSchools />} />
          <Route path="industry" element={<ManageIndustry />} />
          <Route path="settings" element={<PlatformSettings />} />
        </Route>

        {/* --- SCHOOL ADMIN ROUTES --- */}
        <Route path="/school-admin" element={<SchoolAdminLayout />}>
          <Route index element={<SchoolAdminDashboard />} />
          <Route path="teachers" element={<ManageTeachers />} />
          <Route path="students" element={<ManageStudents />} />
          <Route path="classes" element={<ManageClasses />} />
          <Route path="calendar" element={<ManageCalendar />} />
          <Route path="notices" element={<ManageNotices />} />
          <Route path="parents" element={<ManageParents />} />
          <Route path="industry-posts" element={<IndustryApprovals />} />
        </Route>

      </Routes>
    </Router>
  );
}

export default App;