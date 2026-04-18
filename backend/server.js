const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs'); 
const multer = require('multer'); 
const { createClient } = require('@supabase/supabase-js'); 
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

// Configure Multer
const upload = multer({ storage: multer.memoryStorage() });

// --- APPLY MODULAR ROUTES ---

// 1. Super Admin School Management
app.use('/api/superadmin/schools', schoolRoutes);

// 2. Public School Registration
app.post('/api/schools/register', schoolController.registerSchool);

// 3. School Admin Dashboard Data
app.get('/api/school-admin/:email/dashboard', schoolAdminController.getSchoolDashboardStats);

// 4. School Admin Teacher Management
app.get('/api/school-admin/:email/teachers', schoolAdminController.getTeachers);
app.post('/api/school-admin/:email/teachers', schoolAdminController.addTeacher);
app.put('/api/school-admin/:email/teachers/:teacherId', schoolAdminController.updateTeacher);

// 5. School Admin Class Management
app.get('/api/school-admin/:email/classes', schoolAdminController.getClasses);
app.post('/api/school-admin/:email/classes', schoolAdminController.addClass);
app.delete('/api/school-admin/:email/classes/:classId', schoolAdminController.deleteClass);

// 6. Master Timetable Management
app.get('/api/school-admin/:email/classes/:classId/timetable', schoolAdminController.getClassTimetable);
app.post('/api/school-admin/:email/classes/:classId/timetable', schoolAdminController.saveTimetableSlot);
app.get('/api/school-admin/:email/teachers/:teacherId/timetable', schoolAdminController.getTeacherTimetable);

// 7. Universal Messaging System
app.post('/api/school-admin/:email/messages/send', schoolAdminController.sendStaffMessage);
app.get('/api/teachers/:teacherId/messages', schoolAdminController.getTeacherMessages);

// 8. School Admin Student Management
app.get('/api/school-admin/:email/students', schoolAdminController.getStudents);
app.post('/api/school-admin/:email/students', schoolAdminController.addStudent);
app.put('/api/school-admin/:email/students/:studentId', schoolAdminController.updateStudent);
app.get('/api/school-admin/:email/students/:studentId/timetable', schoolAdminController.getStudentTimetable);


// --- AUTHENTICATION ROUTES ---

// Smart Cascading Login Route
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body; 
    const cleanEmail = email.toLowerCase().trim();
    
    let user = null;
    let assignedRole = '';

    // 1. Check Super Admins
    let result = await db.query('SELECT * FROM super_admins WHERE email = $1', [cleanEmail]);
    if (result.rows.length > 0) {
      user = result.rows[0];
      assignedRole = 'SuperAdmin';
    }

    // 2. Check School Admins
    if (!user) {
      result = await db.query('SELECT * FROM schools WHERE email = $1', [cleanEmail]);
      if (result.rows.length > 0) {
        user = result.rows[0];
        assignedRole = 'SchoolAdmin';
      }
    }

    // 3. Check Teachers
    if (!user) {
      result = await db.query('SELECT * FROM teachers WHERE email = $1', [cleanEmail]);
      if (result.rows.length > 0) {
        user = result.rows[0];
        assignedRole = 'Teacher';
      }
    }

    // 4. Check Parents
    if (!user) {
      result = await db.query('SELECT * FROM parents WHERE email = $1', [cleanEmail]);
      if (result.rows.length > 0) {
        user = result.rows[0];
        assignedRole = 'Parent';
      }
    }

    // 5. Check Students
    if (!user) {
      result = await db.query('SELECT * FROM students WHERE email = $1', [cleanEmail]);
      if (result.rows.length > 0) {
        user = result.rows[0];
        assignedRole = 'Student';
      }
    }

    if (!user) {
      return res.status(400).json({ error: "No account found with this email." });
    }

    if (assignedRole === 'SchoolAdmin' && user.status !== 'Active') {
      return res.status(403).json({ 
        error: `Login denied. Your account status is currently: ${user.status}. Please wait for Super Admin approval.` 
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: "Invalid password." });
    }

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

// Legacy Registration Route
app.post('/api/auth/register', async (req, res) => {
  try {
    const { role, email, password } = req.body;
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    if (role === 'Student') {
      const { first_name, last_name, grade_level, index_number } = req.body;
      const result = await db.query(
        `INSERT INTO students (first_name, last_name, email, password, grade_level, index_number) 
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, first_name, last_name, email`,
        [first_name, last_name, email, hashedPassword, grade_level, index_number]
      );
      return res.status(201).json({ message: "Student registered successfully!", user: result.rows[0] });
    } else if (role === 'Parent') {
      const { full_name, phone_number, child_student_ids } = req.body;
      const result = await db.query(
        `INSERT INTO parents (full_name, email, phone_number, password, child_student_ids) 
         VALUES ($1, $2, $3, $4, $5) RETURNING id, full_name, email`,
        [full_name, email, phone_number, hashedPassword, child_student_ids]
      );
      return res.status(201).json({ message: "Parent registered successfully!", user: result.rows[0] });
    } else if (role === 'Teacher') {
      const { full_name, phone_number, staff_id, department, medium, school_name } = req.body;
      const result = await db.query(
        `INSERT INTO teachers (full_name, email, phone_number, password, staff_id, department, medium, school_name) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id, full_name, email`,
        [full_name, email, phone_number, hashedPassword, staff_id, department, medium, school_name]
      );
      return res.status(201).json({ message: "Teacher registered successfully!", user: result.rows[0] });
    } else {
      return res.status(400).json({ error: "Invalid role selected." });
    }
  } catch (error) {
    if (error.code === '23505') return res.status(400).json({ error: "Email or ID already exists." });
    res.status(500).json({ error: "Server error during registration." });
  }
});

// --- PROFILE ROUTING ---
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
  } catch (error) {
    res.status(500).json({ error: "Server error during photo upload." });
  }
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

// --- START THE SERVER ---
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
});