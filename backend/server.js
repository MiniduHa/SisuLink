const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs'); 
const multer = require('multer'); 
const { createClient } = require('@supabase/supabase-js'); 
const nodemailer = require('nodemailer'); // <-- NEW: Imported Nodemailer for sending OTP emails
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

// ---> NEW: Fetch list of active registered schools for mobile app dropdown
app.get('/api/schools/list', async (req, res) => {
  try {
    const result = await db.query("SELECT name FROM schools WHERE status = 'Active'");
    res.json(result.rows); 
  } catch (error) {
    console.error("Fetch Schools Error:", error.message);
    res.status(500).json({ error: "Failed to fetch schools." });
  }
});

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

// 9. School Admin Calendar Management
app.get('/api/school-admin/:email/events', schoolAdminController.getEvents);
app.post('/api/school-admin/:email/events', schoolAdminController.addEvent);
app.put('/api/school-admin/:email/events/:eventId', schoolAdminController.updateEvent);
app.delete('/api/school-admin/:email/events/:eventId', schoolAdminController.deleteEvent);

// 10. School Admin Notice Management
app.get('/api/school-admin/:email/notices', schoolAdminController.getNotices);
app.post('/api/school-admin/:email/notices', schoolAdminController.addNotice);
app.put('/api/school-admin/:email/notices/:noticeId', schoolAdminController.updateNotice);
app.delete('/api/school-admin/:email/notices/:noticeId', schoolAdminController.deleteNotice);

// 11. School Admin Parent Management
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

// Public Application Registration Route (Mobile App)
app.post('/api/auth/register', async (req, res) => {
  try {
    const { role, email, password } = req.body;
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    if (role === 'Student') {
      const { first_name, last_name, grade_level, index_number, school_name } = req.body;
      
      // Match the school name from the dropdown to the actual School ID in the database
      let school_id = null;
      if (school_name) {
        const schoolRes = await db.query('SELECT id FROM schools WHERE name = $1', [school_name]);
        if (schoolRes.rows.length > 0) school_id = schoolRes.rows[0].id;
      }

      const result = await db.query(
        `INSERT INTO students (first_name, last_name, email, password, grade_level, index_number, school_name, school_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id, first_name, last_name, email`,
        [first_name, last_name, email, hashedPassword, grade_level, index_number, school_name, school_id]
      );
      return res.status(201).json({ message: "Student registered successfully!", user: result.rows[0] });
      
    } else if (role === 'Parent') {
      const { full_name, phone_number, child_student_ids } = req.body;
      
      // FIXED: Safely convert the incoming child_student_ids into a proper Postgres Array
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
      const { full_name, phone_number, staff_id, department, medium, school_name } = req.body;
      
      // Match the school name from the dropdown to the actual School ID in the database
      let school_id = null;
      if (school_name) {
        const schoolRes = await db.query('SELECT id FROM schools WHERE name = $1', [school_name]);
        if (schoolRes.rows.length > 0) school_id = schoolRes.rows[0].id;
      }

      const result = await db.query(
        `INSERT INTO teachers (full_name, email, phone_number, password, staff_id, department, medium, school_name, school_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id, full_name, email`,
        [full_name, email, phone_number, hashedPassword, staff_id, department, medium, school_name, school_id]
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


// ---> NEW: PASSWORD RESET ROUTES <---

// In-memory storage for OTPs (Clears if server restarts, which is fine for now)
const otpStore = new Map(); 

// 1. Send OTP
app.post('/api/auth/forgot-password', async (req, res) => {
  try {
    const { email, role } = req.body;
    let tableToUpdate = null;
    
    // Safely map the role to your exact database tables
    if (role === 'Student') tableToUpdate = 'students';
    else if (role === 'Parent') tableToUpdate = 'parents';
    else if (role === 'Teacher') tableToUpdate = 'teachers';
    // Add 'Company' or 'Industry' here later if needed
    
    if (!tableToUpdate) return res.status(400).json({ error: "Invalid role for password reset." });

    const cleanEmail = email.toLowerCase().trim();

    // Check if user exists in the correct table
    const userResult = await db.query(`SELECT id FROM ${tableToUpdate} WHERE email = $1`, [cleanEmail]);
    if (userResult.rows.length === 0) return res.status(404).json({ error: "Account not found." });

    // Generate random 6 digit code
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Save to memory with 15 minute expiration
    otpStore.set(cleanEmail, { otp, expires: Date.now() + 15 * 60000 });

    // Setup NodeMailer (Use your .env variables or hardcode for testing)
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

    // Attempt to send email. If credentials aren't set, it logs the OTP to terminal so you can still test the mobile app!
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

// 2. Verify OTP
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

// 3. Reset Password
app.post('/api/auth/reset-password', async (req, res) => {
  try {
    const { email, role, newPassword } = req.body;
    const cleanEmail = email.toLowerCase().trim();
    
    let tableToUpdate = null;
    if (role === 'Student') tableToUpdate = 'students';
    else if (role === 'Parent') tableToUpdate = 'parents';
    else if (role === 'Teacher') tableToUpdate = 'teachers';

    if (!tableToUpdate) return res.status(400).json({ error: "Invalid role." });

    // Verify they actually completed the OTP step recently
    const record = otpStore.get(cleanEmail);
    if (!record) return res.status(400).json({ error: "Session expired. Try again." });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Update the password in the correct database table
    await db.query(`UPDATE ${tableToUpdate} SET password = $1 WHERE email = $2`, [hashedPassword, cleanEmail]);
    
    // Clear OTP so it can't be reused
    otpStore.delete(cleanEmail);

    res.json({ message: "Password updated successfully." });
  } catch (error) {
    console.error("Reset Password Error:", error.message);
    res.status(500).json({ error: "Server error updating password." });
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

// --- START THE SERVER ---
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
});