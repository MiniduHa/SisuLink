const express = require('express');
const dns = require('node:dns');
dns.setDefaultResultOrder('ipv4first');
const cors = require('cors');
const bcrypt = require('bcryptjs'); 
const multer = require('multer'); 
const { createClient } = require('@supabase/supabase-js'); 
const nodemailer = require('nodemailer'); 
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json()); 

// Connect to Database
const db = require('./config/db');

// Import Controllers and Routes
const schoolRoutes = require('./routes/schoolRoutes');
const schoolController = require('./controllers/schoolController');
const schoolAdminController = require('./controllers/schoolAdminController');

// Initialize Supabase Client for Storage
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY; 
const supabase = createClient(supabaseUrl, supabaseKey);

// Storage Connectivity Check
supabase.storage.listBuckets().then(({ data, error }) => {
  if (error) console.error("⚠️ Supabase Storage Connectivity Issue:", error.message);
  else console.log("✅ Supabase Storage Connected. Available buckets:", data.map(b => b.name));
});

// Configure Multer
const upload = multer({ storage: multer.memoryStorage() });

// --- APPLY MODULAR ROUTES ---

// 1. Super Admin School Management
app.use('/api/superadmin/schools', schoolRoutes);

// 2. Public School Registration
app.post('/api/schools/register', schoolController.registerSchool);

// 3. Fetch list of active registered schools for mobile app dropdown
app.get('/api/schools/list', async (req, res) => {
  try {
    const result = await db.query("SELECT name FROM schools WHERE status = 'Active'");
    res.json(result.rows); 
  } catch (error) {
    console.error("Fetch Schools Error:", error.message);
    res.status(500).json({ error: "Failed to fetch schools." });
  }
});

// 4. School Admin Dashboard Data
app.get('/api/school-admin/:email/dashboard', schoolAdminController.getSchoolDashboardStats);

// 5. School Admin Teacher Management
app.get('/api/school-admin/:email/teachers', schoolAdminController.getTeachers);
app.post('/api/school-admin/:email/teachers', schoolAdminController.addTeacher);
app.put('/api/school-admin/:email/teachers/:teacherId', schoolAdminController.updateTeacher);

// 6. School Admin Class Management
app.get('/api/school-admin/:email/classes', schoolAdminController.getClasses);
app.post('/api/school-admin/:email/classes', schoolAdminController.addClass);
app.delete('/api/school-admin/:email/classes/:classId', schoolAdminController.deleteClass);

// 7. Master Timetable Management
app.get('/api/school-admin/:email/classes/:classId/timetable', schoolAdminController.getClassTimetable);
app.post('/api/school-admin/:email/classes/:classId/timetable', schoolAdminController.saveTimetableSlot);
app.get('/api/school-admin/:email/teachers/:teacherId/timetable', schoolAdminController.getTeacherTimetable);

// 8. Universal Messaging System
app.post('/api/school-admin/:email/messages/send', schoolAdminController.sendStaffMessage);
app.get('/api/teachers/:teacherId/messages', schoolAdminController.getTeacherMessages);

// 9. School Admin Student Management
app.get('/api/school-admin/:email/students', schoolAdminController.getStudents);
app.post('/api/school-admin/:email/students', schoolAdminController.addStudent);
app.put('/api/school-admin/:email/students/:studentId', schoolAdminController.updateStudent);
app.get('/api/school-admin/:email/students/:studentId/timetable', schoolAdminController.getStudentTimetable);

// 10. School Admin Calendar Management
app.get('/api/school-admin/:email/events', schoolAdminController.getEvents);
app.post('/api/school-admin/:email/events', schoolAdminController.addEvent);
app.put('/api/school-admin/:email/events/:eventId', schoolAdminController.updateEvent);
app.delete('/api/school-admin/:email/events/:eventId', schoolAdminController.deleteEvent);

// 11. School Admin Notice Management
app.get('/api/school-admin/:email/notices', schoolAdminController.getNotices);
app.post('/api/school-admin/:email/notices', schoolAdminController.addNotice);
app.put('/api/school-admin/:email/notices/:noticeId', schoolAdminController.updateNotice);
app.delete('/api/school-admin/:email/notices/:noticeId', schoolAdminController.deleteNotice);

// 12. School Admin Parent Management
app.get('/api/school-admin/:email/parents', schoolAdminController.getParents);
app.post('/api/school-admin/:email/parents', schoolAdminController.addParent);
app.put('/api/school-admin/:email/parents/:parentId', schoolAdminController.updateParent);
app.delete('/api/school-admin/:email/parents/:parentId', schoolAdminController.deleteParent);


// --- AUTHENTICATION ROUTES ---

// Smart Cascading Login Route
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body; 
    const cleanEmail = email.toLowerCase().trim();
    
    let user = null;
    let assignedRole = '';

    let result = await db.query('SELECT * FROM super_admins WHERE email = $1', [cleanEmail]);
    if (result.rows.length > 0) { user = result.rows[0]; assignedRole = 'SuperAdmin'; }

    if (!user) {
      result = await db.query('SELECT * FROM schools WHERE email = $1', [cleanEmail]);
      if (result.rows.length > 0) { user = result.rows[0]; assignedRole = 'SchoolAdmin'; }
    }

    if (!user) {
      result = await db.query('SELECT * FROM teachers WHERE email = $1', [cleanEmail]);
      if (result.rows.length > 0) { user = result.rows[0]; assignedRole = 'Teacher'; }
    }

    if (!user) {
      result = await db.query('SELECT * FROM parents WHERE email = $1', [cleanEmail]);
      if (result.rows.length > 0) { user = result.rows[0]; assignedRole = 'Parent'; }
    }

    if (!user) {
      result = await db.query('SELECT * FROM students WHERE email = $1', [cleanEmail]);
      if (result.rows.length > 0) { user = result.rows[0]; assignedRole = 'Student'; }
    }

    if (!user) return res.status(400).json({ error: "No account found with this email." });

    if (assignedRole === 'SchoolAdmin' && user.status !== 'Active') {
      return res.status(403).json({ error: `Login denied. Your account status is currently: ${user.status}. Please wait for Super Admin approval.` });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ error: "Invalid password." });

    if (assignedRole === 'SuperAdmin') {
      res.json({ message: "Login successful!", user: { id: user.id, full_name: user.full_name, email: user.email, role: 'SuperAdmin' }});
    } else if (assignedRole === 'SchoolAdmin') {
      res.json({ message: "Login successful!", user: { id: user.id, school_name: user.name, admin_name: user.admin_name, email: user.email, role: 'SchoolAdmin' }});
    } else if (assignedRole === 'Parent') {
      res.json({ message: "Login successful!", user: { id: user.id, full_name: user.full_name, email: user.email, role: 'Parent', child_student_ids: user.child_student_ids }});
    } else if (assignedRole === 'Teacher') {
      res.json({ message: "Login successful!", user: { id: user.id, full_name: user.full_name, email: user.email, role: 'Teacher', staff_id: user.staff_id, profile_photo_url: user.profile_photo_url }});
    } else {
      res.json({ message: "Login successful!", student: { first_name: user.first_name, last_name: user.last_name, email: user.email, role: 'Student', grade_level: user.grade_level, studentId: user.index_number, profile_photo: user.profile_photo_url }});
    }
  } catch (error) {
    console.error("Login Error:", error.message);
    res.status(500).json({ error: "Server error during login." });
  }
});

app.post('/api/auth/register', async (req, res) => {
  try {
    const { role, email, password } = req.body;
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    if (role === 'Student') {
      const { first_name, last_name, grade_level, index_number, school_name } = req.body;
      
      let school_id = null;
      if (school_name) {
        const schoolRes = await db.query('SELECT id FROM schools WHERE name ILIKE $1', [school_name.trim()]);
        if (schoolRes.rows.length > 0) school_id = schoolRes.rows[0].id;
      }

      if (!school_id) {
        return res.status(400).json({ error: `Could not verify the school: "${school_name}". Please check the spelling.` });
      }

      const result = await db.query(
        `INSERT INTO students (first_name, last_name, email, password, grade_level, index_number, school_name, school_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id, first_name, last_name, email`,
        [first_name, last_name, email, hashedPassword, grade_level, index_number, school_name.trim(), school_id]
      );
      return res.status(201).json({ message: "Student registered successfully!", user: result.rows[0] });
      
    } else if (role === 'Parent') {
      const { full_name, phone_number, child_student_ids } = req.body;
      
      let childIdsArray = [];
      if (child_student_ids && typeof child_student_ids === 'string') {
          childIdsArray = child_student_ids.split(',').map(id => id.trim()).filter(id => id !== '');
      } else if (Array.isArray(child_student_ids)) {
          childIdsArray = child_student_ids;
      }

      const result = await db.query(
        `INSERT INTO parents (full_name, email, phone_number, password, child_student_ids) VALUES ($1, $2, $3, $4, $5) RETURNING id, full_name, email`,
        [full_name, email, phone_number, hashedPassword, childIdsArray]
      );
      return res.status(201).json({ message: "Parent registered successfully!", user: result.rows[0] });

    } else if (role === 'Teacher') {
      const { full_name, phone_number, staff_id, department, medium, school_name, subject, is_class_teacher } = req.body;
      
      let school_id = null;
      if (school_name) {
        const schoolRes = await db.query('SELECT id FROM schools WHERE name ILIKE $1', [school_name.trim()]);
        if (schoolRes.rows.length > 0) school_id = schoolRes.rows[0].id;
      }

      if (!school_id) {
        return res.status(400).json({ error: `Could not verify the school: "${school_name}". Please check the spelling.` });
      }

      const result = await db.query(
        `INSERT INTO teachers (full_name, email, phone_number, password, staff_id, department, medium, school_name, school_id, subject, is_class_teacher) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING id, full_name, email`,
        [full_name, email, phone_number, hashedPassword, staff_id, department, medium, school_name.trim(), school_id, subject, is_class_teacher || false]
      );
      return res.status(201).json({ message: "Teacher registered successfully!", user: result.rows[0] });

    } else {
      return res.status(400).json({ error: "Invalid role selected." });
    }
  } catch (error) {
    if (error.code === '23505') return res.status(400).json({ error: "Email or ID already exists in the system." });
    console.error("Registration Error: ", error.message);
    res.status(500).json({ error: "Server error during registration." });
  }
});


// --- PASSWORD RESET ROUTES ---

const otpStore = new Map(); 

app.post('/api/auth/forgot-password', async (req, res) => {
  try {
    const { email, role } = req.body;
    let tableToUpdate = null;
    
    if (role === 'Student') tableToUpdate = 'students';
    else if (role === 'Parent') tableToUpdate = 'parents';
    else if (role === 'Teacher') tableToUpdate = 'teachers';
    
    if (!tableToUpdate) return res.status(400).json({ error: "Invalid role for password reset." });

    const cleanEmail = email.toLowerCase().trim();
    const userResult = await db.query(`SELECT id FROM ${tableToUpdate} WHERE email = $1`, [cleanEmail]);
    if (userResult.rows.length === 0) return res.status(404).json({ error: "Account not found." });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    otpStore.set(cleanEmail, { otp, expires: Date.now() + 15 * 60000 });

    const transporter = nodemailer.createTransport({
      service: 'gmail', 
      auth: {
        user: process.env.EMAIL_USER || 'your-email@gmail.com', 
        pass: process.env.EMAIL_PASS || 'your-app-password'    
      }
    });

    const mailOptions = {
      from: 'School Connect <no-reply@schoolconnect.com>',
      to: cleanEmail,
      subject: 'Your Password Reset Code',
      text: `Your password reset code is: ${otp}. It will expire in 15 minutes.`
    };

    try {
      await transporter.sendMail(mailOptions);
    } catch (mailErr) {
      console.log(`⚠️ Email failed (Check your .env credentials). Test OTP for ${cleanEmail} is: ${otp}`);
    }

    res.json({ message: "OTP sent successfully." });

  } catch (error) {
    console.error("Forgot Password Error:", error.message);
    res.status(500).json({ error: "Server error." });
  }
});

app.post('/api/auth/verify-otp', async (req, res) => {
  const { email, otp } = req.body;
  const cleanEmail = email.toLowerCase().trim();
  const record = otpStore.get(cleanEmail);

  if (!record) return res.status(400).json({ error: "Code expired or not requested." });
  if (record.expires < Date.now()) {
    otpStore.delete(cleanEmail);
    return res.status(400).json({ error: "Code has expired. Request a new one." });
  }
  if (record.otp !== otp) return res.status(400).json({ error: "Incorrect code." });

  res.json({ message: "OTP verified successfully." });
});

app.post('/api/auth/reset-password', async (req, res) => {
  try {
    const { email, role, newPassword } = req.body;
    const cleanEmail = email.toLowerCase().trim();
    
    let tableToUpdate = null;
    if (role === 'Student') tableToUpdate = 'students';
    else if (role === 'Parent') tableToUpdate = 'parents';
    else if (role === 'Teacher') tableToUpdate = 'teachers';

    if (!tableToUpdate) return res.status(400).json({ error: "Invalid role." });

    const record = otpStore.get(cleanEmail);
    if (!record) return res.status(400).json({ error: "Session expired. Try again." });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    await db.query(`UPDATE ${tableToUpdate} SET password = $1 WHERE email = $2`, [hashedPassword, cleanEmail]);
    otpStore.delete(cleanEmail);

    res.json({ message: "Password updated successfully." });
  } catch (error) {
    console.error("Reset Password Error:", error.message);
    res.status(500).json({ error: "Server error updating password." });
  }
});


// --- REAL DB STUDENT DASHBOARD ROUTE ---
app.get('/api/student/:studentId/dashboard', async (req, res) => {
  try {
    const { studentId } = req.params;
    
    const studentRes = await db.query('SELECT grade_level FROM students WHERE index_number = $1', [studentId]);
    if (studentRes.rows.length === 0) return res.status(404).json({ error: "Student not found" });
    
    const gradeLevel = studentRes.rows[0].grade_level;

    const subjectsRes = await db.query('SELECT * FROM subjects WHERE grade_level = $1', [gradeLevel]);
    const ongoingSubjects = subjectsRes.rows.map(sub => ({
      id: sub.id.toString(),
      name: sub.name,
      teacher: sub.teacher_name,
      icon: sub.icon_name,
      color: sub.theme_color,
      bg: sub.bg_color
    }));

    const gradesRes = await db.query('SELECT * FROM student_grades WHERE student_id = $1 ORDER BY created_at DESC LIMIT 3', [studentId]);
    const gradesData = gradesRes.rows.map(g => ({
      id: g.id.toString(),
      subject: g.subject_name,
      type: g.assessment_type,
      grade: g.grade,
      gradeColor: g.grade.includes('A') ? '#15803D' : '#4338CA',
      gradeBg: g.grade.includes('A') ? '#DCFCE7' : '#E0E7FF',
      icon: "book", 
      iconBg: "#E0F2FE",
      iconColor: "#2563EB",
      trend: g.trend,
      trendColor: g.trend === 'arrow-trend-up' ? '#22C55E' : '#9CA3AF'
    }));

    const internshipsRes = await db.query('SELECT * FROM internships ORDER BY created_at DESC LIMIT 5');
    const internshipsData = internshipsRes.rows.map(job => ({
      id: job.id.toString(),
      title: job.title,
      company: `${job.company_name} • ${job.location}`,
      type: job.employment_type,
      bg: job.bg_color
    }));

    const attendanceStats = {
      percentage: "85%",
      status: "On Track",
      message: "Excellent consistency this month.",
      present: 170,
      absent: 30
    };

    res.json({ ongoingSubjects, gradesData, internshipsData, attendanceStats });
  } catch (error) {
    console.error("Dashboard Fetch Error:", error.message);
    res.status(500).json({ error: "Server error fetching dashboard data." });
  }
});


// ---> REAL DB TEACHER DASHBOARD ROUTE <---
app.get('/api/teacher/:email/dashboard', async (req, res) => {
  try {
    const { email } = req.params;
    const cleanEmail = email.toLowerCase().trim();

    // 1. Fetch Teacher Info
    const teacherRes = await db.query('SELECT * FROM teachers WHERE email = $1', [cleanEmail]);
    if (teacherRes.rows.length === 0) return res.status(404).json({ error: "Teacher not found" });
    const teacher = teacherRes.rows[0];
    const teacherDbId = teacher.id;

    // Determine current day of the week 
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const todayName = days[new Date().getDay()];

    // Generate strict local boundary for "Today" so Postgres doesn't default to UTC yesterday
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    // 2. Query REAL Timetable from class_timetables
    const timetableRes = await db.query(
      `SELECT ct.id, ct.subject, ct.time_slot, c.grade, c.section, c.room_number 
       FROM class_timetables ct 
       JOIN classes c ON ct.class_id = c.id 
       WHERE ct.teacher_id = $1 AND ct.day_of_week = $2
       ORDER BY ct.time_slot ASC`, 
      [teacherDbId, todayName]
    );

    const todaysClasses = timetableRes.rows.map((cls, index) => {
      const colors = ["#DBEAFE", "#D1FAE5", "#FEF3C7", "#FCE7F3", "#E0E7FF"];
      const iconColors = ["#2563EB", "#059669", "#D97706", "#DB2777", "#4F46E5"];
      
      return {
        id: (cls.id || index).toString(),
        subject: cls.subject,
        grade: `${cls.grade} - ${cls.section}`,
        time: cls.time_slot,
        room: cls.room_number || "TBD",
        students: 40, 
        color: colors[index % colors.length],
        iconColor: iconColors[index % iconColors.length]
      };
    });

    // Fetch Special Events (Filtered against strict local boundary)
    let specialEvents = [];
    try {
      const specialRes = await db.query(
        `SELECT id, title, type, event_date, location, image_url 
         FROM events 
         WHERE school_id = $1 
         AND is_special = true 
         AND event_date < $2 
         AND event_date >= $2 - INTERVAL '14 days' 
         ORDER BY event_date DESC`,
        [teacher.school_id, todayStart]
      );
      if (specialRes.rows.length > 0) {
        specialEvents = specialRes.rows.map(evt => ({
          id: evt.id,
          title: evt.title,
          type: evt.type,
          date: new Date(evt.event_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
          location: evt.location,
          image: evt.image_url || "https://images.unsplash.com/photo-1523580494863-6f3031224c94?w=500&q=80"
        }));
      }
    } catch (err) {
      console.error("Failed to fetch special events:", err);
    }
    
    // Fetch Urgent Notice (NO date filter - keeps past active urgent notices visible)
    let urgentNoticeData = [];
    try {
      const noticeRes = await db.query(
        `SELECT id, title, content, created_at 
         FROM notices 
         WHERE school_id = $1 
         AND priority = 'High' 
         AND (audience = 'Teaching Staff' OR audience = 'All students, parents and teachers' OR audience = 'All') 
         AND status = 'Published' 
         ORDER BY created_at DESC`,
        [teacher.school_id]
      );

      if (noticeRes.rows.length > 0) {
        urgentNoticeData = noticeRes.rows.map(notice => {
          const createdDate = new Date(notice.created_at);
          const timeString = createdDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

          return {
            id: notice.id,
            icon: "alert-circle",
            title: notice.title,
            time: timeString,
            body: notice.content
          };
        });
      }
    } catch (err) {
      console.error("Failed to fetch urgent notice:", err);
    }

    // Fetch ALL Relevant Notices for Notification Dropdown (NO DATE FILTER)
    let allNotices = [];
    try {
      const allNoticesRes = await db.query(
        `SELECT id, title, content, priority, created_at 
         FROM notices 
         WHERE school_id = $1 
         AND (audience = 'Teaching Staff' OR audience = 'All students, parents and teachers' OR audience = 'All') 
         AND status = 'Published' 
         ORDER BY created_at DESC 
         LIMIT 15`,
        [teacher.school_id]
      );
      
      allNotices = allNoticesRes.rows.map(n => {
        const dateObj = new Date(n.created_at);
        return {
          id: n.id,
          title: n.title,
          body: n.content,
          priority: n.priority,
          time: dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + " at " + dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
      });
    } catch (err) {
      console.error("Failed to fetch all notices:", err);
    }

    // 4. Calculate actual total distinct students taught by this teacher
    let realTotalStudents = 0;
    try {
      const studentCountRes = await db.query(
        `SELECT COUNT(DISTINCT s.id) as count
         FROM students s
         WHERE s.school_id = $1
         AND EXISTS (
           SELECT 1 FROM class_timetables ct
           WHERE ct.teacher_id = $2
           AND s.subjects ? ct.subject
         )`, 
        [teacher.school_id, teacherDbId]
      );
      realTotalStudents = parseInt(studentCountRes.rows[0].count, 10);
    } catch (e) {
      console.error("Error fetching distinct student count:", e);
    } 

    const stats = {
      totalClassesToday: todaysClasses.length,
      totalStudents: realTotalStudents
    };

    res.json({
      teacher: { 
        full_name: teacher.full_name, 
        staff_id: teacher.staff_id, 
        email: teacher.email, 
        department: teacher.department, 
        profile_photo: teacher.profile_photo_url 
      },
      todaysClasses,
      urgentNoticeData,
      allNotices, 
      specialEvents,
      stats,
      currentDay: todayName 
    });

  } catch (error) {
    console.error("Teacher Dashboard Fetch Error:", error.message);
    res.status(500).json({ error: "Server error fetching teacher dashboard." });
  }
});

// ---> TEACHER ALL EVENTS ROUTE <---
app.get('/api/teacher/:email/events', async (req, res) => {
  try {
    const { email } = req.params;
    const cleanEmail = email.toLowerCase().trim();

    const teacherRes = await db.query('SELECT school_id FROM teachers WHERE email = $1', [cleanEmail]);
    if (teacherRes.rows.length === 0) return res.status(404).json({ error: "Teacher not found" });

    const result = await db.query(
      `SELECT id, title, description, event_date, time_from, time_to, location, type, is_special 
       FROM events 
       WHERE school_id = $1 
       ORDER BY event_date ASC, time_from ASC`,
      [teacherRes.rows[0].school_id]
    );

    res.json(result.rows);
  } catch (error) {
    console.error("Teacher Events Fetch Error:", error.message);
    res.status(500).json({ error: "Failed to fetch events." });
  }
});

// ---> TEACHER FULL TIMETABLE ROUTE <---
app.get('/api/teacher/:email/timetable', async (req, res) => {
  try {
    const { email } = req.params;
    const cleanEmail = email.toLowerCase().trim();

    const teacherRes = await db.query('SELECT id FROM teachers WHERE email = $1', [cleanEmail]);
    if (teacherRes.rows.length === 0) return res.status(404).json({ error: "Teacher not found" });
    const teacherDbId = teacherRes.rows[0].id;

    const result = await db.query(
      `SELECT ct.day_of_week, ct.period_number, ct.time_slot, ct.subject, c.grade, c.section, c.room_number 
       FROM class_timetables ct 
       JOIN classes c ON ct.class_id = c.id 
       WHERE ct.teacher_id = $1
       ORDER BY ct.time_slot ASC`, 
      [teacherDbId]
    );

    res.json(result.rows);
  } catch (error) { 
    console.error("Teacher Timetable error", error);
    res.status(500).json({ error: "Server error fetching teacher timetable." }); 
  }
});

// ---> TEACHER STUDENTS LIST ROUTE <---
app.get('/api/teacher/:email/students', async (req, res) => {
  try {
    const { email } = req.params;
    const cleanEmail = email.toLowerCase().trim();

    const teacherRes = await db.query('SELECT id, school_id FROM teachers WHERE email = $1', [cleanEmail]);
    if (teacherRes.rows.length === 0) return res.status(404).json({ error: "Teacher not found" });
    const teacherDbId = teacherRes.rows[0].id;
    const schoolId = teacherRes.rows[0].school_id;

    // Fetch distinct students associated with the subjects the teacher teaches
    const studentsRes = await db.query(
      `SELECT DISTINCT s.id, s.first_name, s.last_name, s.email, s.index_number, s.grade_level, s.section, s.profile_photo_url, s.parent_email, s.parent_phone
       FROM students s
       WHERE s.school_id = $1
       AND EXISTS (
         SELECT 1 FROM class_timetables ct
         WHERE ct.teacher_id = $2
         AND s.subjects ? ct.subject
       )
       ORDER BY s.grade_level, s.section, s.first_name`, 
      [schoolId, teacherDbId]
    );

    res.json(studentsRes.rows);
  } catch (error) { 
    console.error("Teacher Students App error", error);
    res.status(500).json({ error: "Server error fetching students connected to teacher." }); 
  }
});

// --- TEACHER PROFILE API ---
app.get('/api/teacher/profile/:email', async (req, res) => {
  try {
    const { email } = req.params;
    const cleanEmail = email.toLowerCase().trim();
    const result = await db.query(
      'SELECT id, staff_id, full_name, email, department, medium, subject, school_name, profile_photo_url FROM teachers WHERE email = $1',
      [cleanEmail]
    );

    if (result.rows.length === 0) return res.status(404).json({ error: "Teacher not found" });
    res.json(result.rows[0]);
  } catch (error) {
    console.error("Teacher Profile Error:", error);
    res.status(500).json({ error: "Server error fetching teacher profile." });
  }
});

app.post('/api/teacher/upload-avatar', upload.single('photo'), async (req, res) => {
  try {
    const { email } = req.body;
    const cleanEmail = email.toLowerCase().trim();

    const file = req.file;
    if (!file) return res.status(400).json({ error: "No photo uploaded." });

    const fileExt = file.originalname ? file.originalname.split('.').pop() : 'jpg';
    const fileName = `teacher_${cleanEmail.replace(/[@.]/g, '_')}_${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage.from('avatars').upload(fileName, file.buffer, { contentType: file.mimetype, upsert: true });
    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(fileName);
    await db.query('UPDATE teachers SET profile_photo_url = $1 WHERE email = $2', [publicUrl, cleanEmail]);

    res.json({ message: "Photo uploaded successfully", photoUrl: publicUrl });
  } catch (error) {
    console.error("Error uploading teacher avatar:", error);
    res.status(500).json({ error: "Server error during teacher photo upload." });
  }
});

app.post('/api/school-admin/upload-event-image', upload.single('image'), async (req, res) => {
  try {
    const file = req.file;
    if (!file) return res.status(400).json({ error: "No image uploaded." });

    const fileExt = file.originalname ? file.originalname.split('.').pop() : 'jpg';
    const fileName = `event_${Date.now()}.${fileExt}`;

    console.log(`[DEBUG] Attempting upload: ${fileName}, size: ${file.size} bytes, type: ${file.mimetype}`);

    const { error: uploadError } = await supabase.storage.from('avatars').upload(fileName, file.buffer, { 
      contentType: file.mimetype, 
      upsert: true 
    });
    
    if (uploadError) {
      console.error("[DEBUG] Supabase Upload Error Details:", uploadError);
      throw uploadError;
    }

    const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(fileName);

    res.json({ message: "Image uploaded successfully", imageUrl: publicUrl });
  } catch (error) {
    console.error("Error uploading event image:", error);
    res.status(500).json({ error: "Server error during event image upload." });
  }
});

app.post('/api/teacher/remove-avatar', async (req, res) => {
  try {
    const { email } = req.body;
    const cleanEmail = email.toLowerCase().trim();
    await db.query('UPDATE teachers SET profile_photo_url = NULL WHERE email = $1', [cleanEmail]);
    res.json({ message: "Photo removed successfully" });
  } catch (error) {
    console.error("Error removing teacher avatar:", error);
    res.status(500).json({ error: "Server error removing teacher photo." });
  }
});


// ---> SCHOOL PROFILE API ROUTES <---

// GET School Profile
app.get('/api/school-admin/:email/profile', async (req, res) => {
  try {
    const { email } = req.params;
    const result = await db.query('SELECT * FROM schools WHERE email = $1', [email.toLowerCase().trim()]);
    if (result.rows.length === 0) return res.status(404).json({ error: "School not found" });
    res.json(result.rows[0]);
  } catch (error) { 
    console.error("Fetch Profile Error:", error);
    res.status(500).json({ error: "Failed to fetch school profile." }); 
  }
});

// UPDATE School Profile
app.put('/api/school-admin/:email/profile', async (req, res) => {
  try {
    const { email } = req.params;
    const { logo_url, slogan, bio, phone, website, address, facebook, instagram, linkedin } = req.body;
    
    const result = await db.query(
      `UPDATE schools 
       SET logo_url = $1, slogan = $2, bio = $3, phone = $4, website = $5, address = $6, facebook_url = $7, instagram_url = $8, linkedin_url = $9
       WHERE email = $10 RETURNING *`,
      [logo_url, slogan, bio, phone, website, address, facebook, instagram, linkedin, email.toLowerCase().trim()]
    );

    if (result.rows.length === 0) return res.status(404).json({ error: "School not found" });
    res.json({ message: "School profile updated successfully!", school: result.rows[0] });
  } catch (error) { 
    console.error("Update Profile Error:", error);
    res.status(500).json({ error: "Failed to update profile." }); 
  }
});

// ---> FETCH PUBLIC SCHOOL PROFILE BY USER EMAIL (FOR MOBILE APP) <---
app.get('/api/school/profile-by-user/:email', async (req, res) => {
  try {
    const { email } = req.params;
    const cleanEmail = email.toLowerCase().trim();

    // 1. Determine which school this user belongs to
    let schoolId = null;

    let result = await db.query('SELECT school_id FROM students WHERE email = $1', [cleanEmail]);
    if (result.rows.length > 0) schoolId = result.rows[0].school_id;

    if (!schoolId) {
      result = await db.query('SELECT school_id FROM teachers WHERE email = $1', [cleanEmail]);
      if (result.rows.length > 0) schoolId = result.rows[0].school_id;
    }

    if (!schoolId) {
      result = await db.query('SELECT school_id FROM parents WHERE email = $1', [cleanEmail]);
      if (result.rows.length > 0) schoolId = result.rows[0].school_id;
    }

    if (!schoolId) return res.status(404).json({ error: "User or associated school not found." });

    // 2. Fetch the school profile
    const schoolRes = await db.query(
      `SELECT name, logo_url, slogan, bio, phone, email, website, address, facebook_url, instagram_url, linkedin_url 
       FROM schools WHERE id = $1`, 
      [schoolId]
    );

    if (schoolRes.rows.length === 0) return res.status(404).json({ error: "School profile not found." });

    res.json(schoolRes.rows[0]);
  } catch (error) {
    console.error("Fetch App School Profile Error:", error.message);
    res.status(500).json({ error: "Failed to fetch school profile." });
  }
});


// --- STUDENT PROFILE ROUTING ---
app.post('/api/profile/upload-avatar', upload.single('photo'), async (req, res) => {
  try {
    const { studentId } = req.body;
    const file = req.file;
    if (!file) return res.status(400).json({ error: "No photo uploaded." });

    const fileExt = file.originalname ? file.originalname.split('.').pop() : 'jpg';
    const fileName = `${studentId}_${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage.from('avatars').upload(fileName, file.buffer, { contentType: file.mimetype, upsert: true });
    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(fileName);
    await db.query('UPDATE students SET profile_photo_url = $1 WHERE index_number = $2', [publicUrl, studentId]);

    res.json({ message: "Photo uploaded successfully", photoUrl: publicUrl });
  } catch (error) { res.status(500).json({ error: "Server error during photo upload." }); }
});

app.get('/api/profile/:studentId', async (req, res) => {
  try {
    const { studentId } = req.params;
    const result = await db.query('SELECT first_name, last_name, email, grade_level, profile_photo_url FROM students WHERE index_number = $1', [studentId]);
    if (result.rows.length === 0) return res.status(404).json({ error: "Student not found" });
    res.json(result.rows[0]);
  } catch (error) { res.status(500).json({ error: "Server error fetching profile." }); }
});

app.get('/api/parents/:email', async (req, res) => {
  try {
    const { email } = req.params;
    const result = await db.query('SELECT full_name, email, phone_number, child_student_ids, profile_photo_url FROM parents WHERE email = $1', [email.toLowerCase().trim()]);
    if (result.rows.length === 0) return res.status(404).json({ error: "Parent not found" });
    res.json({ user: result.rows[0] });
  } catch (error) { res.status(500).json({ error: "Server error fetching parent profile." }); }
});

app.put('/api/parents/update', async (req, res) => {
  try {
    const { email, full_name, phone_number, child_student_ids, profile_photo_url } = req.body;
    const result = await db.query(
      `UPDATE parents SET full_name = $1, phone_number = $2, child_student_ids = $3, profile_photo_url = $4 WHERE email = $5 RETURNING *`,
      [full_name, phone_number, child_student_ids, profile_photo_url, email.toLowerCase().trim()]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: "Parent not found" });
    res.json({ message: "Profile updated successfully", user: result.rows[0] });
  } catch (error) { res.status(500).json({ error: "Server error updating parent profile." }); }
});

// ---> NEW: TEACHING MATERIALS MANAGEMENT <---

// 1. Upload Material File to Supabase
app.post('/api/teacher/upload-material', upload.single('file'), async (req, res) => {
  try {
    const file = req.file;
    if (!file) return res.status(400).json({ error: "No file uploaded." });

    const fileExt = file.originalname ? file.originalname.split('.').pop() : 'pdf';
    const fileName = `material_${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage.from('avatars').upload(fileName, file.buffer, { 
      contentType: file.mimetype, 
      upsert: true 
    });
    
    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(fileName);
    res.json({ message: "File uploaded successfully", fileUrl: publicUrl });
  } catch (error) {
    console.error("Error uploading material file:", error);
    res.status(500).json({ error: "Server error during file upload." });
  }
});

// 2. Save Material Metadata to Database
app.post('/api/teacher/:email/materials', async (req, res) => {
  try {
    const { email } = req.params;
    const { title, materialType, gradeLevel, subject, fileUrl, description } = req.body;

    const teacherRes = await db.query('SELECT id, school_id FROM teachers WHERE email = $1', [email.toLowerCase().trim()]);
    if (teacherRes.rows.length === 0) return res.status(404).json({ error: "Teacher not found" });
    
    const teacherDbId = teacherRes.rows[0].id;
    const schoolId = teacherRes.rows[0].school_id;

    const result = await db.query(
      `INSERT INTO teaching_materials (school_id, teacher_id, title, material_type, grade_level, subject, file_url, description) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [schoolId, teacherDbId, title, materialType, gradeLevel, subject, fileUrl, description]
    );

    res.status(201).json({ message: "Material added successfully!", material: result.rows[0] });
  } catch (error) {
    console.error("Add Material Error:", error.message);
    res.status(500).json({ error: "Failed to save material to database." });
  }
});

// 3. Fetch Teacher's Uploaded Materials
app.get('/api/teacher/:email/materials', async (req, res) => {
  try {
    const { email } = req.params;
    
    const teacherRes = await db.query('SELECT id FROM teachers WHERE email = $1', [email.toLowerCase().trim()]);
    if (teacherRes.rows.length === 0) return res.status(404).json({ error: "Teacher not found" });

    const result = await db.query(
      `SELECT * FROM teaching_materials WHERE teacher_id = $1 ORDER BY created_at DESC`,
      [teacherRes.rows[0].id]
    );

    res.json(result.rows);
  } catch (error) {
    console.error("Fetch Materials Error:", error.message);
    res.status(500).json({ error: "Failed to fetch materials." });
  }
});

// 4. Fetch Materials For a Specific Student (Based on Grade & Subject)
app.get('/api/student/:studentId/materials', async (req, res) => {
  try {
    const { studentId } = req.params;
    
    const studentRes = await db.query('SELECT school_id, grade_level, subjects FROM students WHERE index_number = $1', [studentId]);
    if (studentRes.rows.length === 0) return res.status(404).json({ error: "Student not found" });

    const student = studentRes.rows[0];
    
    let studentSubjects = [];
    try {
       studentSubjects = typeof student.subjects === 'string' ? JSON.parse(student.subjects) : student.subjects;
    } catch (e) {
       console.error("Could not parse student subjects", e);
    }

    const materialsRes = await db.query(
      `SELECT tm.*, t.full_name as teacher_name 
       FROM teaching_materials tm
       JOIN teachers t ON tm.teacher_id = t.id
       WHERE tm.school_id = $1 AND tm.grade_level = $2
       ORDER BY tm.created_at DESC`,
      [student.school_id, student.grade_level]
    );

    const relevantMaterials = materialsRes.rows.filter(mat => 
       mat.subject === 'General' || 
       (studentSubjects && studentSubjects.includes(mat.subject)) ||
       !studentSubjects || studentSubjects.length === 0 
    );

    res.json(relevantMaterials);
  } catch (error) {
    console.error("Student Materials Error:", error);
    res.status(500).json({ error: "Failed to fetch materials." });
  }
});


// --- START THE SERVER ---
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
});