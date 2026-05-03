import { useState, useEffect } from 'react';
import { Users, GraduationCap, BookOpen, Calendar as CalendarIcon, Megaphone, ChevronRight, ClipboardCheck, UserMinus, Clock, UserCheck, X, BarChart3, Inbox, TrendingUp, Activity, Building2 } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

export default function SchoolAdminDashboard() {
  const [selectedStatBreakdown, setSelectedStatBreakdown] = useState<any | null>(null);
  const [adminData, setAdminData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [trendData, setTrendData] = useState<any[]>([]);
  const [attendanceData, setAttendanceData] = useState<any[]>([]);

  // Master State for all Dashboard Data
  const [dashboardData, setDashboardData] = useState({
    overallStats: { students: 0, teachers: 0, parents: 0, industry: 0, classes: 0 },
    dailyStats: {
      studentAttendance: { present: 0, total: 0, percentage: 0 },
      teacherAttendance: { present: 0, total: 0, percentage: 0 },
      staffLeave: { approved: 0, pending: 0 },
      eventsToday: { count: 0, nextEvent: "No events scheduled" },
      pendingInternships: 0
    },
    notices: [] as any[],
    events: [] as any[]
  });

  // Fetch data on load
  useEffect(() => {
    const storedUser = localStorage.getItem('sisuLinkUser');
    if (storedUser) {
      const parsedUser = JSON.parse(storedUser);
      setAdminData(parsedUser);
      fetchDashboardData(parsedUser.email);
    }
  }, []);

  const fetchDashboardData = async (email: string) => {
    try {
      const response = await fetch(`http://localhost:5000/api/school-admin/${email}/dashboard`);
      const data = await response.json();
      
      if (response.ok) {
        setDashboardData(data);
      }

      // Also fetch academic trends
      const trendResponse = await fetch(`http://localhost:5000/api/school-admin/${email}/analytics/academic-trends`);
      const trendResult = await trendResponse.json();
      if (trendResponse.ok) {
        setTrendData(trendResult);
      }

      // Fetch attendance health data
      const attendanceResponse = await fetch(`http://localhost:5000/api/school-admin/${email}/analytics/attendance-health`);
      if (attendanceResponse.ok) {
        const attendanceResult = await attendanceResponse.json();
        setAttendanceData(attendanceResult);
      }
    } catch (error) {
      console.error("Failed to fetch dashboard stats", error);
    } finally {
      setIsLoading(false);
    }
  };

  // --- DYNAMICALLY BUILT ARRAYS FOR RENDERING ---
  const dynamicOverallStats = [
    { 
      id: 'students', title: "Total Students", value: dashboardData.overallStats.students.toLocaleString(), 
      icon: GraduationCap, color: "bg-blue-500", breakdownTitle: "Student Population",
      breakdown: [ { label: "Data synced from database", count: dashboardData.overallStats.students, percentage: 100 } ]
    },
    { 
      id: 'teachers', title: "Teaching Staff", value: dashboardData.overallStats.teachers.toLocaleString(), 
      icon: Users, color: "bg-cyan-500", breakdownTitle: "Staff Overview",
      breakdown: [ { label: "Data synced from database", count: dashboardData.overallStats.teachers, percentage: 100 } ]
    },
    { 
      id: 'parents', title: "Registered Parents", value: dashboardData.overallStats.parents.toLocaleString(), 
      icon: UserCheck, color: "bg-purple-500", breakdownTitle: "Parent App Onboarding",
      breakdown: [ { label: "Data synced from database", count: dashboardData.overallStats.parents, percentage: 100 } ]
    },
    { 
      id: 'classes', title: "Active Classes", value: dashboardData.overallStats.classes.toLocaleString(), 
      icon: BookOpen, color: "bg-amber-500", breakdownTitle: "Classrooms Overview",
      breakdown: [ { label: "Estimated from student count", count: dashboardData.overallStats.classes, percentage: 100 } ]
    },
    { 
      id: 'industry', title: "Industry Partners", value: dashboardData.overallStats.industry.toLocaleString(), 
      icon: Building2, color: "bg-indigo-500", breakdownTitle: "Industry Collaborations",
      breakdown: [ { label: "Registered companies", count: dashboardData.overallStats.industry, percentage: 100 } ]
    },
  ];

  const dynamicDailyStats = [
    { 
      id: 'student_attendance', title: "Student Attendance", value: `${dashboardData.dailyStats.studentAttendance.percentage}%`, 
      subtext: `${dashboardData.dailyStats.studentAttendance.present} / ${dashboardData.dailyStats.studentAttendance.total} Present`, 
      icon: ClipboardCheck, color: "bg-emerald-500", breakdownTitle: "Today's Student Attendance",
      breakdown: [ { label: "Module pending implementation", count: "0", percentage: 0 } ]
    },
    { 
      id: 'teacher_attendance', title: "Teacher Attendance", value: `${dashboardData.dailyStats.teacherAttendance.percentage}%`, 
      subtext: `${dashboardData.dailyStats.teacherAttendance.present} / ${dashboardData.dailyStats.teacherAttendance.total} Present`, 
      icon: Users, color: "bg-teal-500", breakdownTitle: "Today's Staff Attendance",
      breakdown: [ { label: "Module pending implementation", count: "0", percentage: 0 } ]
    },
    { 
      id: 'pending_internships', title: "Job Approvals", value: dashboardData.dailyStats.pendingInternships.toString(), 
      subtext: "Pending Industry Posts", 
      icon: Building2, color: "bg-orange-500", breakdownTitle: "Internship Approvals",
      breakdown: [ { label: "Waiting for review", count: dashboardData.dailyStats.pendingInternships, percentage: 100 } ]
    },
    { 
      id: 'staff_leave', title: "Staff on Leave", value: dashboardData.dailyStats.staffLeave.approved.toString(), 
      subtext: `Pending Requests: ${dashboardData.dailyStats.staffLeave.pending}`, 
      icon: UserMinus, color: "bg-rose-500", breakdownTitle: "Leave Status",
      breakdown: [ { label: "Module pending implementation", count: "0", percentage: 0 } ]
    },
    { 
      id: 'today_events', title: "Today's Events", value: dashboardData.dailyStats.eventsToday.count.toString(), 
      subtext: `Next: ${dashboardData.dailyStats.eventsToday.nextEvent}`, 
      icon: Clock, color: "bg-orange-500", breakdownTitle: "Event Schedule",
      breakdown: [ { label: "Module pending implementation", count: "0", percentage: 0 } ]
    },
  ];

  const todayDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });

  if (isLoading) {
    return <div className="flex h-full items-center justify-center text-slate-500">Loading dashboard data...</div>;
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8 relative">
      
      {/* Welcome Section */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Welcome back, {adminData?.admin_name || 'Principal'}!</h1>
          <p className="text-sm text-slate-500 font-medium mt-1">
            Here is what is happening at <span className="font-bold text-blue-600">{adminData?.school_name || 'your institution'}</span> today.
          </p>
        </div>
        <div className="bg-slate-50 px-4 py-2 rounded-lg border border-slate-100 text-sm font-bold text-slate-600">
          {todayDate}
        </div>
      </div>

      {/* --- GRID 1: OVERALL STATISTICS --- */}
      <div>
        <h2 className="text-lg font-bold text-slate-800 mb-4 px-1">Platform Statistics</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          {dynamicOverallStats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <div 
                key={index} 
                onClick={() => setSelectedStatBreakdown(stat)}
                className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex items-center justify-between hover:shadow-md hover:border-blue-200 hover:ring-2 hover:ring-blue-50 cursor-pointer transition-all group"
              >
                <div className="flex items-center gap-4">
                  <div className={`${stat.color} bg-opacity-10 w-12 h-12 rounded-xl flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform`}>
                    <Icon size={24} className={`text-${stat.color.split('-')[1]}-600`} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{stat.title}</p>
                    <h3 className="text-xl font-black text-slate-800">{stat.value}</h3>
                  </div>
                </div>
                <ChevronRight size={20} className="text-slate-300 group-hover:text-blue-500 transition-colors" />
              </div>
            );
          })}
        </div>
      </div>

      {/* --- GRID 2: TODAY'S SNAPSHOT --- */}
      <div>
        <h2 className="text-lg font-bold text-slate-800 mb-4 px-1">Today's Overview</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {dynamicDailyStats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <div 
                key={index} 
                onClick={() => setSelectedStatBreakdown(stat)}
                className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm flex flex-col justify-between hover:shadow-md hover:border-blue-200 hover:ring-2 hover:ring-blue-50 cursor-pointer transition-all group relative overflow-hidden"
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{stat.title}</p>
                    <h3 className="text-3xl font-black text-slate-800 mt-1">{stat.value}</h3>
                  </div>
                  <div className={`${stat.color} w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0 shadow-inner group-hover:scale-110 transition-transform`}>
                    <Icon size={20} />
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-slate-500 bg-slate-50 inline-block px-2.5 py-1 rounded-md border border-slate-100 w-max">
                    {stat.subtext}
                  </p>
                  <ChevronRight size={18} className="text-slate-300 group-hover:text-blue-500 transition-colors" />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* --- ANALYTICS SECTION: SIDE BY SIDE CHARTS --- */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* ACADEMIC TREND ANALYSIS CHART */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="bg-blue-100 p-2 rounded-xl text-blue-600">
                <TrendingUp size={22} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-800">Academic Trend Analysis</h2>
                <p className="text-sm text-slate-500 font-medium">Student performance by level</p>
              </div>
            </div>
            <div className="flex items-center gap-4 text-xs font-bold">
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-blue-500"></div>
                <span className="text-slate-600">O/L</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div>
                <span className="text-slate-600">A/L</span>
              </div>
            </div>
          </div>

          <div className="h-[300px] w-full mt-auto">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={trendData}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="term" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#64748b', fontSize: 11, fontWeight: 600 }}
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#64748b', fontSize: 11, fontWeight: 600 }}
                  domain={[0, 100]}
                />
                <Tooltip 
                  contentStyle={{ 
                    borderRadius: '12px', 
                    border: 'none', 
                    boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                    padding: '12px'
                  }}
                />
                <Line 
                  type="monotone" 
                  dataKey="OL" 
                  stroke="#3b82f6" 
                  strokeWidth={3} 
                  dot={{ r: 4, fill: '#3b82f6', strokeWidth: 2, stroke: '#fff' }}
                  activeDot={{ r: 6, strokeWidth: 0 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="AL" 
                  stroke="#10b981" 
                  strokeWidth={3} 
                  dot={{ r: 4, fill: '#10b981', strokeWidth: 2, stroke: '#fff' }}
                  activeDot={{ r: 6, strokeWidth: 0 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* ATTENDANCE HEALTH BAR CHART */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="bg-teal-100 p-2 rounded-xl text-teal-600">
                <Activity size={22} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-800">Attendance Health</h2>
                <p className="text-sm text-slate-500 font-medium">Overall attendance percentage by grade</p>
              </div>
            </div>
            <div className="bg-slate-50 px-3 py-1 rounded-full border border-slate-100">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Target: 95%+</span>
            </div>
          </div>

          <div className="h-[300px] w-full mt-auto">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={attendanceData}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="grade" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#64748b', fontSize: 11, fontWeight: 600 }}
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#64748b', fontSize: 11, fontWeight: 600 }}
                  domain={[0, 100]}
                />
                <Tooltip 
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ 
                    borderRadius: '12px', 
                    border: 'none', 
                    boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                    padding: '12px'
                  }}
                />
                <Bar 
                  dataKey="attendance" 
                  radius={[6, 6, 0, 0]} 
                  barSize={32}
                  animationDuration={1500}
                >
                  {attendanceData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.attendance >= 90 ? '#14b8a6' : entry.attendance >= 75 ? '#0d9488' : '#0f766e'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* LOWER GRIDS: NOTICES & EVENTS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
        
        {/* Recent Notices */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">
          <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
            <div className="flex items-center gap-2">
              <div className="bg-purple-100 p-1.5 rounded-lg text-purple-600"><Megaphone size={18} /></div>
              <h3 className="text-lg font-bold text-slate-800">Recent Notices</h3>
            </div>
            <button className="text-sm font-bold text-blue-600 hover:text-blue-700 flex items-center">
              View All <ChevronRight size={16} />
            </button>
          </div>
          <div className="p-5 flex-1 flex flex-col gap-4">
            {dashboardData.notices.length > 0 ? (
              dashboardData.notices.map((notice: any, idx: number) => (
                <div key={idx} className="p-4 border border-slate-100 rounded-xl">
                  {notice.title} {/* Map actual fields when built */}
                </div>
              ))
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-400 py-8">
                <Inbox size={48} className="text-slate-200 mb-3" />
                <p className="font-medium text-sm">No recent notices broadcasted yet.</p>
              </div>
            )}
          </div>
        </div>

        {/* Upcoming Events */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">
          <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
            <div className="flex items-center gap-2">
              <div className="bg-blue-100 p-1.5 rounded-lg text-blue-600"><CalendarIcon size={18} /></div>
              <h3 className="text-lg font-bold text-slate-800">Upcoming Events</h3>
            </div>
            <button className="text-sm font-bold text-blue-600 hover:text-blue-700 flex items-center">
              Calendar <ChevronRight size={16} />
            </button>
          </div>
          <div className="p-5 flex-1 flex flex-col gap-4">
            {dashboardData.events.length > 0 ? (
              dashboardData.events.map((evt: any, idx: number) => (
                <div key={idx} className="p-4 border border-slate-100 rounded-xl">
                  {evt.title} {/* Map actual fields when built */}
                </div>
              ))
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-400 py-8">
                <CalendarIcon size={48} className="text-slate-200 mb-3" />
                <p className="font-medium text-sm">Your school calendar is empty.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* --- ADVANCED BREAKDOWN MODAL --- */}
      {selectedStatBreakdown && (() => {
        const Icon = selectedStatBreakdown.icon;
        return (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
              <div className="bg-slate-50 border-b border-slate-100 p-5 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className={`${selectedStatBreakdown.color} w-10 h-10 rounded-lg flex items-center justify-center text-white shadow-sm`}>
                    <Icon size={20} />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-800">{selectedStatBreakdown.title} Breakdown</h2>
                    <p className="text-xs text-slate-500 font-medium">Metric Value: {selectedStatBreakdown.value}</p>
                  </div>
                </div>
              <button onClick={() => setSelectedStatBreakdown(null)} className="text-slate-400 hover:text-slate-600 bg-slate-100 hover:bg-slate-200 p-2 rounded-full transition-colors">
                <X size={18} />
              </button>
            </div>
            <div className="p-6">
              <div className="flex items-center gap-2 mb-6 text-slate-800 border-b border-slate-100 pb-3">
                <BarChart3 size={18} className="text-blue-500" />
                <h3 className="font-bold">{selectedStatBreakdown.breakdownTitle}</h3>
              </div>
              <div className="space-y-5">
                {selectedStatBreakdown.breakdown.map((item: any, idx: number) => (
                  <div key={idx}>
                    <div className="flex justify-between items-center mb-1.5">
                      <span className="text-sm font-semibold text-slate-700">{item.label}</span>
                      <span className="text-sm font-bold text-slate-900">{item.count} <span className="text-slate-400 text-xs font-medium">({item.percentage}%)</span></span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                      <div className={`${selectedStatBreakdown.color} h-2 rounded-full transition-all duration-1000 ease-out`} style={{ width: `${item.percentage}%` }}></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="p-4 bg-slate-50 border-t border-slate-100 text-center">
              <p className="text-xs text-slate-500 font-medium">Data synced live from Supabase database.</p>
            </div>
          </div>
        </div>
        );
      })()}

    </div>
  );
}