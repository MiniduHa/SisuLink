const express = require('express');
const dns = require('node:dns');
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

// 13. Industry Management (Admin)
app.get('/api/school-admin/:email/industry', schoolAdminController.getIndustryPartners);
app.put('/api/school-admin/:email/industry/:partnerId', schoolAdminController.updateIndustryPartner);

app.get('/api/school-admin/:email/analytics/academic-trends', schoolAdminController.getAcademicTrends);
app.get('/api/school-admin/:email/analytics/attendance-health', schoolAdminController.getAttendanceHealth);

// 15. Super Admin Industry Management
app.get('/api/superadmin/industry', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM industry_partners ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (error) { res.status(500).json({ error: "Failed to fetch industry partners." }); }
});

app.put('/api/superadmin/industry/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const result = await db.query('UPDATE industry_partners SET status = $1 WHERE id = $2 RETURNING *', [status, id]);

    if (result.rows.length > 0 && status === 'Active') {
      const partner = result.rows[0];
      // Send approval email
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
      });

      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: partner.email,
        subject: 'SisuLink - Industry Partner Account Approved!',
        html: `
          <div style="font-family: sans-serif; padding: 20px;">
            <h2 style="color: #2563EB;">Congratulations, ${partner.company_name}!</h2>
            <p>Your Industry Partner account on <b>SisuLink</b> has been approved by the Super Admin.</p>
            <p>You can now log in to the mobile app and start posting internship opportunities for students.</p>
            <p>Note: All posted jobs will require final approval from the respective school administration before becoming visible to students.</p>
            <br/>
            <p>Best Regards,<br/>SisuLink Team</p>
          </div>
        `
      };

      transporter.sendMail(mailOptions, (error) => {
        if (error) console.error("Email sending failed:", error);
      });
    }

    res.json({ message: `Status updated to ${status}`, partner: result.rows[0] });
  } catch (error) { res.status(500).json({ error: "Failed to update status." }); }
});

// 16. School Admin Internship Approval
app.get('/api/school-admin/:email/internships/pending', async (req, res) => {
  try {
    // For now, let's show all pending internships. 
    // In a more complex system, we might filter by linked schools.
    const result = await db.query("SELECT * FROM internships WHERE status = 'Pending' ORDER BY created_at DESC");
    res.json(result.rows);
  } catch (error) { res.status(500).json({ error: "Failed to fetch pending internships." }); }
});

app.put('/api/school-admin/internships/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // 'Active' or 'Rejected'
    const result = await db.query('UPDATE internships SET status = $1 WHERE id = $2 RETURNING *', [status, id]);
    res.json({ message: `Internship post ${status}`, internship: result.rows[0] });
  } catch (error) { res.status(500).json({ error: "Failed to update internship status." }); }
});

app.get('/api/school-admin/:email/announcements/pending', async (req, res) => {
  try {
    const { email } = req.params;
    const school = await db.query('SELECT id FROM schools WHERE email = $1', [email.toLowerCase().trim()]);
    if (school.rows.length === 0) return res.status(404).json({ error: "School not found" });

    const schoolId = school.rows[0].id;
    const result = await db.query(
      `SELECT a.*, p.company_name, p.logo_url 
       FROM industry_announcements a 
       JOIN industry_partners p ON a.industry_email = p.email 
       WHERE a.target_school_id = $1 AND a.status = 'Pending' 
       ORDER BY a.created_at DESC`,
      [schoolId]
    );
    res.json(result.rows);
  } catch (error) { res.status(500).json({ error: "Failed to fetch pending announcements." }); }
});

app.put('/api/school-admin/announcements/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // 'Active' or 'Rejected'
    const result = await db.query('UPDATE industry_announcements SET status = $1 WHERE id = $2 RETURNING *', [status, id]);
    res.json({ message: `Announcement ${status}`, announcement: result.rows[0] });
  } catch (error) { res.status(500).json({ error: "Failed to update announcement status." }); }
});

// 17. Student Internship View
app.get('/api/student/jobs', async (req, res) => {
  try {
    const result = await db.query("SELECT * FROM internships WHERE status = 'Active' ORDER BY created_at DESC");
    res.json(result.rows);
  } catch (error) { res.status(500).json({ error: "Failed to fetch jobs." }); }
});

// 17. Industry Partner Dashboard & Job Management
app.get('/api/industry/:email/dashboard', async (req, res) => {
  try {
    const { email } = req.params;
    const partner = await db.query('SELECT * FROM industry_partners WHERE email = $1', [email.toLowerCase().trim()]);
    if (partner.rows.length === 0) return res.status(404).json({ error: "Partner not found" });

    const partnerId = partner.rows[0].id;
    const jobs = await db.query('SELECT * FROM internships WHERE industry_id = $1 ORDER BY created_at DESC', [partnerId]);
    const announcements = await db.query('SELECT * FROM industry_announcements WHERE industry_email = $1 ORDER BY created_at DESC', [email.toLowerCase().trim()]);

    res.json({
      partner: partner.rows[0],
      stats: {
        activeJobs: jobs.rows.filter(j => j.status === 'Active').length,
        totalJobs: jobs.rows.length,
        applicants: 0,
        activeAnnouncements: announcements.rows.filter(a => a.status === 'Active').length
      },
      jobs: jobs.rows,
      announcements: announcements.rows
    });
  } catch (error) { res.status(500).json({ error: "Failed to fetch industry dashboard." }); }
});

app.put('/api/industry/:email/profile', async (req, res) => {
  try {
    const { email } = req.params;
    const { company_name, industry_type, phone, brn, logo_url, bio, website, linkedin, address } = req.body;
    
    const result = await db.query(
      `UPDATE industry_partners 
       SET company_name = $1, industry_type = $2, phone = $3, brn = $4, logo_url = $5, bio = $6, website = $7, linkedin = $8, address = $9
       WHERE email = $10 RETURNING *`,
      [company_name, industry_type, phone, brn, logo_url, bio, website, linkedin, address, email.toLowerCase().trim()]
    );

    if (result.rows.length === 0) return res.status(404).json({ error: "Partner not found" });
    res.json({ message: "Profile updated successfully!", partner: result.rows[0] });
  } catch (error) { 
    console.error("Update Profile Error:", error.message);
    res.status(500).json({ error: "Failed to update profile." }); 
  }
});

app.post('/api/industry/upload-avatar', upload.single('photo'), async (req, res) => {
  try {
    const { email } = req.body;
    const cleanEmail = email.toLowerCase().trim();
    const file = req.file;
    if (!file) return res.status(400).json({ error: "No photo uploaded." });

    const fileExt = file.originalname ? file.originalname.split('.').pop() : 'jpg';
    const fileName = `industry_${cleanEmail.replace(/[@.]/g, '_')}_${Date.now()}.${fileExt}`;

    const { data, error: uploadError } = await supabase.storage.from('avatars').upload(fileName, file.buffer, { contentType: file.mimetype, upsert: true });
    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(fileName);
    await db.query('UPDATE industry_partners SET logo_url = $1 WHERE email = $2', [publicUrl, cleanEmail]);

    res.json({ message: "Logo updated!", photoUrl: publicUrl });
  } catch (error) {
    console.error("Industry Upload Error:", error.message);
    res.status(500).json({ error: "Upload failed." });
  }
});

app.post('/api/industry/remove-avatar', async (req, res) => {
  try {
    const { email } = req.body;
    await db.query('UPDATE industry_partners SET logo_url = NULL WHERE email = $1', [email.toLowerCase().trim()]);
    res.json({ message: "Logo removed" });
  } catch (error) { res.status(500).json({ error: "Removal failed" }); }
});

app.post('/api/industry/:email/jobs', async (req, res) => {
  try {
    const { email } = req.params;
    const { title, description, requirements, location, employment_type, cover_photo } = req.body;

    const partner = await db.query('SELECT id, company_name FROM industry_partners WHERE email = $1', [email.toLowerCase().trim()]);
    if (partner.rows.length === 0) return res.status(404).json({ error: "Partner not found" });

    // Generate default cover if not provided
    let finalCover = cover_photo;
    if (!finalCover) {
      finalCover = `https://ui-avatars.com/api/?name=${encodeURIComponent(title)}&background=random&size=400&font-size=0.33`;
    }

    const result = await db.query(
      `INSERT INTO internships (industry_id, company_name, title, description, requirements, location, employment_type, cover_photo) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [partner.rows[0].id, partner.rows[0].company_name, title, description, requirements, location, employment_type, finalCover]
    );

    res.status(201).json({ message: "Job posted successfully!", job: result.rows[0] });
  } catch (error) { 
    console.error("Job Post Error:", error.message);
    res.status(500).json({ error: "Failed to post job." }); 
  }
});

app.post('/api/industry/upload-cover', upload.single('photo'), async (req, res) => {
  try {
    const file = req.file;
    if (!file) return res.status(400).json({ error: "No photo uploaded." });

    const fileExt = file.originalname ? file.originalname.split('.').pop() : 'jpg';
    const fileName = `cover_${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;

    const { data, error: uploadError } = await supabase.storage.from('avatars').upload(fileName, file.buffer, { contentType: file.mimetype, upsert: true });
    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(fileName);

    res.json({ message: "Cover uploaded!", photoUrl: publicUrl });
  } catch (error) {
    console.error("Cover Upload Error:", error.message);
    res.status(500).json({ error: "Upload failed." });
  }
});

app.get('/api/industry/schools', async (req, res) => {
  try {
    const result = await db.query('SELECT id, name FROM schools ORDER BY name ASC');
    res.json(result.rows);
  } catch (error) { res.status(500).json({ error: "Failed to fetch schools." }); }
});

app.post('/api/industry/:email/announcements', async (req, res) => {
  try {
    const { email } = req.params;
    const { title, description, type, target_school_id, cover_photo } = req.body;
    const cleanEmail = email.toLowerCase().trim();

    const partner = await db.query('SELECT id, company_name FROM industry_partners WHERE email = $1', [cleanEmail]);
    if (partner.rows.length === 0) return res.status(404).json({ error: "Partner not found" });

    let finalCover = cover_photo;
    if (!finalCover) {
      finalCover = `https://ui-avatars.com/api/?name=${encodeURIComponent(title)}&background=random&size=400&font-size=0.33`;
    }

    let insertedRecords = [];

    if (target_school_id === 'All' || !target_school_id) {
      // Duplicate for all schools
      const schools = await db.query('SELECT id FROM schools');
      for (let school of schools.rows) {
        const result = await db.query(
          `INSERT INTO industry_announcements (industry_email, target_school_id, title, description, type, cover_photo) 
           VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
          [cleanEmail, school.id, title, description, type, finalCover]
        );
        insertedRecords.push(result.rows[0]);
      }
    } else {
      // Specific school
      const result = await db.query(
        `INSERT INTO industry_announcements (industry_email, target_school_id, title, description, type, cover_photo) 
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
        [cleanEmail, target_school_id, title, description, type, finalCover]
      );
      insertedRecords.push(result.rows[0]);
    }

    res.status(201).json({ message: "Announcement posted successfully!", announcements: insertedRecords });
  } catch (error) {
    console.error("Announcement Post Error:", error.message);
    res.status(500).json({ error: "Failed to post announcement." });
  }
});

app.get('/api/industry/:email/announcements', async (req, res) => {
  try {
    const { email } = req.params;
    const result = await db.query('SELECT * FROM industry_announcements WHERE industry_email = $1 ORDER BY created_at DESC', [email.toLowerCase().trim()]);
    res.json(result.rows);
  } catch (error) { res.status(500).json({ error: "Failed to fetch announcements." }); }
});

app.get('/api/industry/:email/jobs', async (req, res) => {
  try {
    const { email } = req.params;
    const partner = await db.query('SELECT id FROM industry_partners WHERE email = $1', [email.toLowerCase().trim()]);
    if (partner.rows.length === 0) return res.status(404).json({ error: "Partner not found" });

    const result = await db.query('SELECT * FROM internships WHERE industry_id = $1 ORDER BY created_at DESC', [partner.rows[0].id]);
    res.json(result.rows);
  } catch (error) { res.status(500).json({ error: "Failed to fetch jobs." }); }
});


app.get('/api/industry/jobs/:jobId/applicants', async (req, res) => {
  try {
    const { jobId } = req.params;
    const result = await db.query('SELECT * FROM job_applications WHERE job_id = $1 ORDER BY applied_at DESC', [jobId]);
    res.json(result.rows);
  } catch (error) { res.status(500).json({ error: "Failed to fetch applicants." }); }
});

// --- AUTHENTICATION ROUTES ---

// Initialize Database Tables if they don't exist
const initDB = async () => {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS schools (
        id VARCHAR(50) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        admin_name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        phone VARCHAR(50),
        school_category VARCHAR(100),
        student_type VARCHAR(100),
        password VARCHAR(255) NOT NULL,
        status VARCHAR(50) DEFAULT 'Pending',
        student_count INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS messages (
        id SERIAL PRIMARY KEY,
        sender_email VARCHAR(255) NOT NULL,
        sender_role VARCHAR(50) NOT NULL,
        sender_name VARCHAR(255) NOT NULL,
        receiver_email VARCHAR(255) NOT NULL,
        receiver_role VARCHAR(50) NOT NULL,
        content TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        is_read BOOLEAN DEFAULT FALSE
      )
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS student_grades (
        id SERIAL PRIMARY KEY,
        student_id VARCHAR(50) NOT NULL,
        school_id VARCHAR(50),
        subject_name VARCHAR(100) NOT NULL,
        assessment_type VARCHAR(100) NOT NULL,
        marks NUMERIC(5, 2),
        grade VARCHAR(5) NOT NULL,
        level VARCHAR(10),
        trend VARCHAR(20) DEFAULT 'arrow-trend-up',
        remarks TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Ensure all required columns exist (Migration logic)
    await db.query("ALTER TABLE student_grades ALTER COLUMN school_id TYPE VARCHAR(50)");
    await db.query("ALTER TABLE student_grades ADD COLUMN IF NOT EXISTS school_id VARCHAR(50)");
    await db.query("ALTER TABLE student_grades ADD COLUMN IF NOT EXISTS marks NUMERIC(5, 2)");
    await db.query("ALTER TABLE student_grades ADD COLUMN IF NOT EXISTS level VARCHAR(10)");
    await db.query("ALTER TABLE student_grades ADD COLUMN IF NOT EXISTS remarks TEXT");

    await db.query(`
      CREATE TABLE IF NOT EXISTS student_attendance (
        id SERIAL PRIMARY KEY,
        school_id VARCHAR(50) REFERENCES schools(id) ON DELETE CASCADE,
        student_id UUID REFERENCES students(id) ON DELETE CASCADE,
        date DATE NOT NULL,
        status VARCHAR(50) NOT NULL, 
        marked_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(student_id, date) 
      )
    `);
    await db.query(`
      CREATE TABLE IF NOT EXISTS industry_partners (
        id SERIAL PRIMARY KEY,
        company_name VARCHAR(255) NOT NULL,
        brn VARCHAR(100) UNIQUE NOT NULL,
        industry_type VARCHAR(100),
        email VARCHAR(255) UNIQUE NOT NULL,
        phone VARCHAR(50),
        password VARCHAR(255) NOT NULL,
        status VARCHAR(50) DEFAULT 'Pending',
        logo_url TEXT,
        school_id INTEGER,
        bio TEXT,
        website TEXT,
        linkedin TEXT,
        address TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Add missing columns if they don't exist
    try {
      await db.query(`ALTER TABLE industry_partners ADD COLUMN IF NOT EXISTS bio TEXT;`);
      await db.query(`ALTER TABLE industry_partners ADD COLUMN IF NOT EXISTS website TEXT;`);
      await db.query(`ALTER TABLE industry_partners ADD COLUMN IF NOT EXISTS linkedin TEXT;`);
      await db.query(`ALTER TABLE industry_partners ADD COLUMN IF NOT EXISTS address TEXT;`);
    } catch (err) {
      console.log("Could not alter industry_partners table:", err.message);
    }

    await db.query(`
      CREATE TABLE IF NOT EXISTS internships (
        id SERIAL PRIMARY KEY,
        industry_id INTEGER REFERENCES industry_partners(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        requirements TEXT,
        location VARCHAR(255),
        employment_type VARCHAR(100),
        status VARCHAR(50) DEFAULT 'Pending',
        bg_color VARCHAR(20) DEFAULT '#DBEAFE',
        company_name VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Alter internships to add missing columns
    try {
      await db.query(`ALTER TABLE internships ADD COLUMN IF NOT EXISTS industry_id INTEGER REFERENCES industry_partners(id) ON DELETE CASCADE;`);
      await db.query(`ALTER TABLE internships ADD COLUMN IF NOT EXISTS description TEXT;`);
      await db.query(`ALTER TABLE internships ADD COLUMN IF NOT EXISTS requirements TEXT;`);
      await db.query(`ALTER TABLE internships ADD COLUMN IF NOT EXISTS location VARCHAR(255);`);
      await db.query(`ALTER TABLE internships ADD COLUMN IF NOT EXISTS employment_type VARCHAR(100);`);
      await db.query(`ALTER TABLE internships ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'Pending';`);
      await db.query(`ALTER TABLE internships ADD COLUMN IF NOT EXISTS company_name VARCHAR(255);`);
      await db.query(`ALTER TABLE internships ADD COLUMN IF NOT EXISTS cover_photo TEXT;`);
    } catch (err) {
      console.log("Could not alter internships table:", err.message);
    }

    await db.query(`
      CREATE TABLE IF NOT EXISTS industry_announcements (
        id SERIAL PRIMARY KEY,
        industry_email VARCHAR(255) NOT NULL,
        target_school_id VARCHAR(50),
        title VARCHAR(255) NOT NULL,
        description TEXT,
        type VARCHAR(100),
        cover_photo TEXT,
        status VARCHAR(50) DEFAULT 'Pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Alter industry_announcements to add missing columns
    try {
      await db.query(`ALTER TABLE industry_announcements ADD COLUMN IF NOT EXISTS industry_email VARCHAR(255);`);
      await db.query(`ALTER TABLE industry_announcements ADD COLUMN IF NOT EXISTS target_school_id VARCHAR(50);`);
      await db.query(`ALTER TABLE industry_announcements ADD COLUMN IF NOT EXISTS description TEXT;`);
      await db.query(`ALTER TABLE industry_announcements ADD COLUMN IF NOT EXISTS type VARCHAR(100);`);
      await db.query(`ALTER TABLE industry_announcements ADD COLUMN IF NOT EXISTS cover_photo TEXT;`);
      await db.query(`ALTER TABLE industry_announcements ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'Pending';`);
    } catch (err) {
      console.log("Could not alter industry_announcements table:", err.message);
    }

    await db.query(`
      CREATE TABLE IF NOT EXISTS job_applications (
        id SERIAL PRIMARY KEY,
        job_id INTEGER REFERENCES internships(id) ON DELETE CASCADE,
        student_id VARCHAR(50),
        student_name VARCHAR(255),
        student_email VARCHAR(255),
        cv_url TEXT,
        applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        status VARCHAR(50) DEFAULT 'Pending'
      )
    `);

    console.log("✅ Database tables checked/initialized.");
  } catch (err) {
    console.error("Database Init Error:", err);
  }
};
initDB();

// Smart Cascading Login Route - Now with Role Enforcement
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password, role } = req.body;
    const cleanEmail = email.toLowerCase().trim();

    let user = null;
    let assignedRole = '';

    // If role is provided, only check that specific table
    if (role === 'SuperAdmin') {
      const result = await db.query('SELECT * FROM super_admins WHERE email = $1', [cleanEmail]);
      if (result.rows.length > 0) { user = result.rows[0]; assignedRole = 'SuperAdmin'; }
    } else if (role === 'SchoolAdmin') {
      const result = await db.query('SELECT * FROM schools WHERE email = $1', [cleanEmail]);
      if (result.rows.length > 0) { user = result.rows[0]; assignedRole = 'SchoolAdmin'; }
    } else if (role === 'Teacher') {
      const result = await db.query('SELECT * FROM teachers WHERE email = $1', [cleanEmail]);
      if (result.rows.length > 0) { user = result.rows[0]; assignedRole = 'Teacher'; }
    } else if (role === 'Parent') {
      const result = await db.query('SELECT * FROM parents WHERE email = $1', [cleanEmail]);
      if (result.rows.length > 0) { user = result.rows[0]; assignedRole = 'Parent'; }
    } else if (role === 'Student') {
      const result = await db.query('SELECT * FROM students WHERE email = $1', [cleanEmail]);
      if (result.rows.length > 0) { user = result.rows[0]; assignedRole = 'Student'; }
    } else if (role === 'Industry') {
      const result = await db.query('SELECT * FROM industry_partners WHERE email = $1', [cleanEmail]);
      if (result.rows.length > 0) { user = result.rows[0]; assignedRole = 'Industry'; }
    } else {
      // Fallback for legacy calls or multi-role discovery
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

      if (!user) {
        result = await db.query('SELECT * FROM industry_partners WHERE email = $1', [cleanEmail]);
        if (result.rows.length > 0) { user = result.rows[0]; assignedRole = 'Industry'; }
      }
    }

    if (!user) return res.status(400).json({ error: `No ${role || 'user'} account found with this email.` });

    if (assignedRole === 'SchoolAdmin' && user.status !== 'Active') {
      return res.status(403).json({ error: `Login denied. Your account status is currently: ${user.status}. Please wait for Super Admin approval.` });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ error: "Invalid password." });

    if (assignedRole === 'SuperAdmin') {
      res.json({ message: "Login successful!", user: { id: user.id, full_name: user.full_name, email: user.email, role: 'SuperAdmin' } });
    } else if (assignedRole === 'SchoolAdmin') {
      res.json({ message: "Login successful!", user: { id: user.id, school_name: user.name, admin_name: user.admin_name, email: user.email, role: 'SchoolAdmin' } });
    } else if (assignedRole === 'Parent') {
      res.json({ message: "Login successful!", user: { id: user.id, full_name: user.full_name, email: user.email, role: 'Parent', child_student_ids: user.child_student_ids } });
    } else if (assignedRole === 'Teacher') {
      res.json({ message: "Login successful!", user: { id: user.id, full_name: user.full_name, email: user.email, role: 'Teacher', staff_id: user.staff_id, profile_photo_url: user.profile_photo_url } });
    } else if (assignedRole === 'Industry') {
      res.json({ message: "Login successful!", user: { id: user.id, company_name: user.company_name, email: user.email, role: 'Industry', logo_url: user.logo_url, status: user.status } });
    } else {
      res.json({ message: "Login successful!", student: { first_name: user.first_name, last_name: user.last_name, email: user.email, role: 'Student', grade_level: user.grade_level, studentId: user.index_number, profile_photo: user.profile_photo_url } });
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

    } else if (role === 'Industry') {
      const { company_name, brn, industry_type, phone_number } = req.body;
      const result = await db.query(
        `INSERT INTO industry_partners (company_name, brn, industry_type, email, phone, password) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, company_name, email`,
        [company_name, brn, industry_type, email, phone_number, hashedPassword]
      );
      return res.status(201).json({ message: "Industry partner registered successfully!", user: result.rows[0] });

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
    const { email } = req.body;

    if (!email) return res.status(400).json({ error: "Email is required." });
    const cleanEmail = email.toLowerCase().trim();

    let tableToUpdate = null;
    let userRecord = null;

    // Smart Cascade Search: Check Students first
    let result = await db.query('SELECT id FROM students WHERE email = $1', [cleanEmail]);
    if (result.rows.length > 0) { tableToUpdate = 'students'; userRecord = result.rows[0]; }

    // Check Parents if not found
    if (!userRecord) {
      result = await db.query('SELECT id FROM parents WHERE email = $1', [cleanEmail]);
      if (result.rows.length > 0) { tableToUpdate = 'parents'; userRecord = result.rows[0]; }
    }

    // Check Teachers if not found
    if (!userRecord) {
      result = await db.query('SELECT id FROM teachers WHERE email = $1', [cleanEmail]);
      if (result.rows.length > 0) { tableToUpdate = 'teachers'; userRecord = result.rows[0]; }
    }

    if (!userRecord) return res.status(404).json({ error: "Account not found." });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Store the table dynamically in memory!
    otpStore.set(cleanEmail, { otp, tableToUpdate, expires: Date.now() + 15 * 60000 });

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER || 'your-email@gmail.com',
        pass: process.env.EMAIL_PASS || 'your-app-password'
      }
    });

    const mailOptions = {
      from: 'SisuLink <no-reply@sisulink.com>',
      to: cleanEmail,
      subject: 'Your Password Reset Code',
      text: `Welcome to SisuLink! Your password reset code is: ${otp}. It will expire in 15 minutes.`
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
    const { email, newPassword } = req.body;
    const cleanEmail = email.toLowerCase().trim();

    const record = otpStore.get(cleanEmail);
    if (!record) return res.status(400).json({ error: "Session expired. Try again." });

    // Look up the correct table we saved during step 1
    const tableToUpdate = record.tableToUpdate;

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
    const studentRes = await db.query('SELECT school_id, grade_level, subjects FROM students WHERE index_number = $1', [studentId]);
    if (studentRes.rows.length === 0) return res.status(404).json({ error: "Student not found" });

    const { school_id: schoolId, grade_level: gradeLevel, subjects: enrolledSubjectsData } = studentRes.rows[0];

    // Parse subjects from student record (stored as JSON array)
    let enrolledSubjects = [];
    try {
      if (enrolledSubjectsData) {
        enrolledSubjects = typeof enrolledSubjectsData === 'string' ? JSON.parse(enrolledSubjectsData) : enrolledSubjectsData;
      }
    } catch (e) {
      console.error("Error parsing student subjects:", e);
    }

    // Fetch all subject details for the student's grade
    const subjectsRes = await db.query('SELECT * FROM subjects WHERE grade_level = $1', [gradeLevel]);
    const subjectDetailsMap = {};
    subjectsRes.rows.forEach(sub => {
      subjectDetailsMap[sub.name] = sub;
    });

    // Create ongoing subjects list based on student's enrollment
    const ongoingSubjects = enrolledSubjects.map((subjectName, index) => {
      const detail = subjectDetailsMap[subjectName];

      return {
        id: detail ? detail.id.toString() : `enrolled-${index}`,
        name: subjectName,
        teacher: detail ? detail.teacher_name : "Subject Teacher",
        icon: detail ? detail.icon_name : "book",
        color: detail ? detail.theme_color : "#4F46E5",
        bg: detail ? detail.bg_color : "#F5F3FF"
      };
    });

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

    // Fetch Special Events (Latest School News)
    let specialEvents = [];
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    try {
      const specialRes = await db.query(
        `SELECT id, title, type, event_date, location, image_url 
         FROM events 
         WHERE school_id = $1 
         AND is_special = true 
         AND event_date < $2 
         AND event_date >= $2 - INTERVAL '14 days' 
         ORDER BY event_date DESC`,
        [schoolId, todayStart]
      );
      specialEvents = specialRes.rows.map(evt => ({
        id: evt.id,
        title: evt.title,
        type: evt.type,
        date: new Date(evt.event_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        location: evt.location,
        image: evt.image_url || "https://images.unsplash.com/photo-1523580494863-6f3031224c94?w=500&q=80"
      }));
    } catch (err) {
      console.error("Failed to fetch special events for student:", err);
    }

    // Fetch Urgent Notices
    let urgentNoticeData = [];
    try {
      const noticeRes = await db.query(
        `SELECT id, title, content, created_at 
         FROM notices 
         WHERE school_id = $1 
         AND priority = 'High' 
         AND (audience = 'Student' OR audience = 'All students, parents and teachers' OR audience = 'All') 
         AND status = 'Published' 
         ORDER BY created_at DESC`,
        [schoolId]
      );

      urgentNoticeData = noticeRes.rows.map(notice => {
        const createdDate = new Date(notice.created_at);
        return {
          id: notice.id,
          icon: "alert-circle",
          title: notice.title,
          time: createdDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          body: notice.content
        };
      });
    } catch (err) {
      console.error("Failed to fetch urgent notices for student:", err);
    }

    // Fetch All Notices (for dropdown)
    let allNotices = [];
    try {
      const allNoticesRes = await db.query(
        `SELECT id, title, content, priority, created_at 
         FROM notices 
         WHERE school_id = $1 
         AND (audience = 'Student' OR audience = 'All students, parents and teachers' OR audience = 'All') 
         AND status = 'Published' 
         ORDER BY created_at DESC 
         LIMIT 15`,
        [schoolId]
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
      console.error("Failed to fetch all notices for student:", err);
    }

    // Fetch Industry Announcements
    let industryAnnouncements = [];
    try {
      const annRes = await db.query(
        `SELECT a.*, p.company_name, p.logo_url 
         FROM industry_announcements a 
         JOIN industry_partners p ON a.industry_email = p.email 
         WHERE (a.target_school_id = $1 OR a.target_school_id IS NULL) 
         AND a.status = 'Active' 
         ORDER BY a.created_at DESC LIMIT 5`,
        [schoolId]
      );
      industryAnnouncements = annRes.rows;
    } catch (err) {
      console.error("Failed to fetch industry announcements for student:", err);
    }

    res.json({
      ongoingSubjects,
      gradesData,
      internshipsData,
      attendanceStats,
      specialEvents,
      urgentNoticeData,
      allNotices,
      industryAnnouncements
    });
  } catch (error) {
    console.error("Dashboard Fetch Error:", error.message);
    res.status(500).json({ error: "Server error fetching dashboard data." });
  }
});


// ---> FETCH STUDENT GRADES ROUTE <---
app.get('/api/student/:studentId/grades', async (req, res) => {
  try {
    const { studentId } = req.params;

    // Fetch all grades for this specific student
    const result = await db.query(
      `SELECT subject_name as subject, marks, grade, assessment_type as term, level, remarks 
       FROM student_grades 
       WHERE student_id = $1 
       ORDER BY created_at DESC`,
      [studentId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error("Grades Fetch Error:", error.message);
    res.status(500).json({ error: "Server error fetching student grades." });
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

    // Smart lookup: check teachers, then students, then parents to find the school_id
    let userRes = await db.query('SELECT school_id FROM teachers WHERE email = $1', [cleanEmail]);

    if (userRes.rows.length === 0) {
      userRes = await db.query('SELECT school_id FROM students WHERE email = $1', [cleanEmail]);
    }

    if (userRes.rows.length === 0) {
      userRes = await db.query('SELECT school_id FROM parents WHERE email = $1', [cleanEmail]);
    }

    if (userRes.rows.length === 0) return res.status(404).json({ error: "User not found" });

    const result = await db.query(
      `SELECT id, title, description, event_date, time_from, time_to, location, type, is_special 
       FROM events 
       WHERE school_id = $1 
       ORDER BY event_date ASC, time_from ASC`,
      [userRes.rows[0].school_id]
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


// ---> PARENT PROFILE API ROUTES <---
app.get('/api/parent/profile/:email', async (req, res) => {
  try {
    const { email } = req.params;
    const cleanEmail = email.toLowerCase().trim();

    // 1. Fetch Parent
    const parentRes = await db.query(
      'SELECT id, full_name, email, phone_number, child_student_ids, profile_photo_url FROM parents WHERE email = $1',
      [cleanEmail]
    );

    if (parentRes.rows.length === 0) return res.status(404).json({ error: "Parent not found" });
    const parent = parentRes.rows[0];

    // 2. Fetch Children Details
    let childrenDetails = [];
    if (parent.child_student_ids && parent.child_student_ids.length > 0) {
      const childrenRes = await db.query(
        'SELECT first_name, last_name, index_number, grade_level, section FROM students WHERE index_number = ANY($1)',
        [parent.child_student_ids]
      );
      childrenDetails = childrenRes.rows.map(child => ({
        name: `${child.first_name} ${child.last_name}`,
        studentId: child.index_number,
        class: `${child.grade_level} - ${child.section}`
      }));
    }

    res.json({ ...parent, children: childrenDetails });
  } catch (error) {
    console.error("Parent Profile Error:", error);
    res.status(500).json({ error: "Server error fetching parent profile." });
  }
});

app.put('/api/parent/profile/:email', async (req, res) => {
  try {
    const { email } = req.params;
    const { full_name, phone_number, child_student_ids } = req.body;
    const cleanEmail = email.toLowerCase().trim();

    const result = await db.query(
      'UPDATE parents SET full_name = $1, phone_number = $2, child_student_ids = $3 WHERE email = $4 RETURNING *',
      [full_name, phone_number, child_student_ids, cleanEmail]
    );

    if (result.rows.length === 0) return res.status(404).json({ error: "Parent not found" });
    res.json({ message: "Profile updated successfully", parent: result.rows[0] });
  } catch (error) {
    console.error("Update Parent Profile Error:", error);
    res.status(500).json({ error: "Server error updating parent profile." });
  }
});

app.post('/api/parent/upload-avatar', upload.single('photo'), async (req, res) => {
  try {
    const { email } = req.body;
    const cleanEmail = email.toLowerCase().trim();

    const file = req.file;
    if (!file) return res.status(400).json({ error: "No photo uploaded." });

    const fileExt = file.originalname ? file.originalname.split('.').pop() : 'jpg';
    const fileName = `parent_${cleanEmail.replace(/[@.]/g, '_')}_${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage.from('avatars').upload(fileName, file.buffer, { contentType: file.mimetype, upsert: true });
    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(fileName);
    await db.query('UPDATE parents SET profile_photo_url = $1 WHERE email = $2', [publicUrl, cleanEmail]);

    res.json({ message: "Photo uploaded successfully", photoUrl: publicUrl });
  } catch (error) {
    console.error("Error uploading parent avatar:", error);
    res.status(500).json({ error: "Server error during parent photo upload." });
  }
});

app.post('/api/parent/remove-avatar', async (req, res) => {
  try {
    const { email } = req.body;
    const cleanEmail = email.toLowerCase().trim();
    await db.query('UPDATE parents SET profile_photo_url = NULL WHERE email = $1', [cleanEmail]);
    res.json({ message: "Photo removed successfully" });
  } catch (error) {
    console.error("Error removing parent avatar:", error);
    res.status(500).json({ error: "Server error removing parent photo." });
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

app.post('/api/profile/upload-resume', upload.single('resume'), async (req, res) => {
  try {
    const { studentId } = req.body;
    const file = req.file;
    if (!file) return res.status(400).json({ error: "No file uploaded." });

    const fileExt = file.originalname ? file.originalname.split('.').pop() : 'pdf';
    const fileName = `resume_${studentId}_${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage.from('avatars').upload(fileName, file.buffer, {
      contentType: file.mimetype,
      upsert: true
    });

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(fileName);
    await db.query('UPDATE students SET resume_url = $1 WHERE index_number = $2', [publicUrl, studentId]);

    res.json({ message: "Resume uploaded successfully", resumeUrl: publicUrl });
  } catch (error) {
    console.error("Resume Upload Error:", error);
    res.status(500).json({ error: "Server error during resume upload." });
  }
});

app.post('/api/profile/remove-resume', async (req, res) => {
  try {
    const { studentId } = req.body;
    await db.query('UPDATE students SET resume_url = NULL WHERE index_number = $1', [studentId]);
    res.json({ message: "Resume removed successfully" });
  } catch (error) {
    console.error("Resume Remove Error:", error);
    res.status(500).json({ error: "Server error removing resume." });
  }
});

app.get('/api/profile/:studentId', async (req, res) => {
  try {
    const { studentId } = req.params;

    // 1. Fetch Student
    const studentRes = await db.query('SELECT * FROM students WHERE index_number = $1', [studentId]);
    if (studentRes.rows.length === 0) return res.status(404).json({ error: "Student not found" });
    const student = studentRes.rows[0];

    // 2. Fetch Parent/Guardian info from parents table
    const parentRes = await db.query(
      'SELECT full_name, email, phone_number FROM parents WHERE $1 = ANY(child_student_ids) LIMIT 1',
      [studentId]
    );

    const guardian = parentRes.rows.length > 0 ? parentRes.rows[0] : {
      full_name: student.father_name || student.mother_name || "",
      email: student.father_email || student.mother_email || student.parent_email || "",
      phone_number: student.father_phone || student.mother_phone || student.parent_phone || ""
    };

    res.json({ ...student, guardian });
  } catch (error) {
    console.error("Fetch Student Profile Error:", error);
    res.status(500).json({ error: "Server error fetching profile." });
  }
});

app.put('/api/profile/:studentId', async (req, res) => {
  try {
    const { studentId } = req.params;
    const {
      mobile_number, home_phone, address, nic, date_of_birth,
      nationality, religion, district, province, stream,
      guardian_name, guardian_phone, guardian_email,
      ol_school, ol_year, ol_status, ol_scheme, ol_results
    } = req.body;

    const result = await db.query(
      `UPDATE students SET 
        mobile_number = $1, home_phone = $2, address = $3, nic = $4, date_of_birth = $5,
        nationality = $6, religion = $7, district = $8, province = $9, stream = $10,
        father_name = $11, parent_phone = $12, parent_email = $13,
        ol_school = $14, ol_year = $15, ol_status = $16, ol_scheme = $17, ol_results = $18
      WHERE index_number = $19 RETURNING *`,
      [
        mobile_number, home_phone, address, nic, date_of_birth,
        nationality, religion, district, province, stream,
        guardian_name, guardian_phone, guardian_email,
        ol_school, ol_year, ol_status, ol_scheme, ol_results,
        studentId
      ]
    );

    if (result.rows.length === 0) return res.status(404).json({ error: "Student not found" });
    res.json({ message: "Profile updated successfully", user: result.rows[0] });
  } catch (error) {
    console.error("Update Student Profile Error:", error);
    res.status(500).json({ error: "Server error updating student profile." });
  }
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


// --- PARENT DASHBOARD API ---
app.get('/api/parent/:email/dashboard', async (req, res) => {
  try {
    const { email } = req.params;
    const cleanEmail = email.toLowerCase().trim();

    // 1. Fetch parent details
    const parentRes = await db.query(
      'SELECT id, full_name, email, phone_number, child_student_ids, school_id, profile_photo_url FROM parents WHERE email = $1',
      [cleanEmail]
    );

    if (parentRes.rows.length === 0) return res.status(404).json({ error: "Parent not found" });
    const parent = parentRes.rows[0];

    // 2. Fetch children details
    let children = [];
    if (parent.child_student_ids && parent.child_student_ids.length > 0) {
      const childrenRes = await db.query(
        'SELECT first_name, last_name, index_number, grade_level, section FROM students WHERE index_number = ANY($1)',
        [parent.child_student_ids]
      );
      children = childrenRes.rows.map(child => ({
        name: `${child.first_name} ${child.last_name}`,
        studentId: child.index_number,
        class: `${child.grade_level} - ${child.section}`
      }));
    }

    // 3. Fetch urgent notices for parents
    let urgentNotices = [];
    try {
      const urgentNoticeRes = await db.query(
        `SELECT id, title, content, created_at, priority 
         FROM notices 
         WHERE school_id = $1 
         AND priority = 'High' 
         AND status = 'Published'
         AND (audience = 'Parents' OR audience = 'Parents and Students' OR audience = 'Teaching Staff, Parents and Students' OR audience = 'All' OR audience = 'All students, parents and teachers')
         ORDER BY created_at DESC 
         LIMIT 1`,
        [parent.school_id]
      );

      if (urgentNoticeRes.rows.length > 0) {
        const n = urgentNoticeRes.rows[0];
        const dateObj = new Date(n.created_at);
        urgentNotices = [{
          id: n.id,
          title: n.title,
          body: n.content,
          icon: "alert-circle",
          time: dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + " at " + dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }];
      }
    } catch (err) {
      console.error("Failed to fetch urgent notice for parent:", err);
    }

    // 4. Fetch special events (Latest School News)
    let specialEvents = [];
    try {
      const newsRes = await db.query(
        `SELECT id, title, event_date, image_url 
         FROM events 
         WHERE school_id = $1 
         AND is_special = true 
         AND event_date <= (CURRENT_DATE + INTERVAL '1 day')
         AND event_date >= (CURRENT_DATE - INTERVAL '14 days')
         ORDER BY event_date DESC 
         LIMIT 5`,
        [parent.school_id]
      );

      specialEvents = newsRes.rows.map(ev => {
        const d = new Date(ev.event_date);
        return {
          id: ev.id,
          title: ev.title,
          date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
          image: ev.image_url || "https://images.unsplash.com/photo-1546410531-bb4caa6b424d?q=80&w=2071&auto=format&fit=crop"
        };
      });
    } catch (err) {
      console.error("Failed to fetch special events for parent dashboard:", err);
    }

    res.json({
      parent: {
        full_name: parent.full_name,
        email: parent.email,
        phone_number: parent.phone_number,
        profile_photo: parent.profile_photo_url
      },
      children,
      urgentNotices,
      specialEvents
    });

  } catch (error) {
    console.error("Parent Dashboard Error:", error);
    res.status(500).json({ error: "Server error fetching parent dashboard." });
  }
});

// --- MESSAGING SYSTEM API ---

// Send a message
app.post('/api/messages/send', async (req, res) => {
  try {
    const { sender_email, sender_role, sender_name, receiver_email, receiver_role, content } = req.body;

    if (!sender_email || !receiver_email || !content) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const result = await db.query(
      `INSERT INTO messages (sender_email, sender_role, sender_name, receiver_email, receiver_role, content) 
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [sender_email, sender_role, sender_name, receiver_email, receiver_role, content]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error("Send Message Error:", error);
    res.status(500).json({ error: "Failed to send message." });
  }
});

// Get conversations list (summary) for a user
app.get('/api/messages/:role/:email', async (req, res) => {
  try {
    const { role, email } = req.params;
    const cleanEmail = email.toLowerCase().trim();

    const result = await db.query(
      `SELECT DISTINCT ON (other_email)
         CASE WHEN sender_email = $1 THEN receiver_email ELSE sender_email END as other_email,
         CASE WHEN sender_email = $1 THEN receiver_role ELSE sender_role END as other_role,
         CASE WHEN sender_email = $1 THEN 'Me' ELSE sender_name END as last_sender_name,
         content as snippet,
         created_at as time,
         is_read,
         id
       FROM messages
       WHERE sender_email = $1 OR receiver_email = $1
       ORDER BY other_email, created_at DESC`,
      [cleanEmail]
    );

    // Format the time for the frontend
    const conversations = result.rows.map(row => {
      const dateObj = new Date(row.time);
      let timeStr = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const now = new Date();
      if (dateObj.toDateString() === now.toDateString()) {
        timeStr = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      }

      return {
        id: row.id,
        other_email: row.other_email,
        other_role: row.other_role,
        sender: row.last_sender_name,
        time: timeStr,
        snippet: row.snippet,
        unread: !row.is_read && row.other_email === row.other_email // Simple logic for unread
      };
    });

    res.json(conversations);
  } catch (error) {
    console.error("Fetch Conversations Error:", error);
    res.status(500).json({ error: "Failed to fetch messages." });
  }
});

// Get chat history between two users
app.get('/api/messages/:role/:email/history/:otherEmail', async (req, res) => {
  try {
    const { email, otherEmail } = req.params;
    const cleanEmail = email.toLowerCase().trim();
    const cleanOtherEmail = otherEmail.toLowerCase().trim();

    const result = await db.query(
      `SELECT * FROM messages 
       WHERE (sender_email = $1 AND receiver_email = $2) 
          OR (sender_email = $2 AND receiver_email = $1)
       ORDER BY created_at ASC`,
      [cleanEmail, cleanOtherEmail]
    );

    res.json(result.rows);
  } catch (error) {
    console.error("Fetch Chat History Error:", error);
    res.status(500).json({ error: "Failed to fetch chat history." });
  }
});

// Mark messages as read
app.put('/api/messages/read/:messageId', async (req, res) => {
  try {
    const { messageId } = req.params;
    await db.query('UPDATE messages SET is_read = TRUE WHERE id = $1', [messageId]);
    res.json({ success: true });
  } catch (error) {
    console.error("Mark Read Error:", error);
    res.status(500).json({ error: "Failed to update message status." });
  }
});

// Get available contacts for a parent (their children's teachers)
app.get('/api/parent/:email/contacts', async (req, res) => {
  try {
    const { email } = req.params;
    const cleanEmail = email.toLowerCase().trim();

    // 1. Get the parent and their children's student IDs
    const parentRes = await db.query('SELECT child_student_ids FROM parents WHERE email = $1', [cleanEmail]);
    if (parentRes.rows.length === 0) return res.status(404).json({ error: "Parent not found" });

    const studentIds = parentRes.rows[0].child_student_ids;
    if (!studentIds || studentIds.length === 0) return res.json([]);

    // 2. Get teachers assigned to those students' classes via timetables
    const result = await db.query(
      `SELECT DISTINCT t.full_name as name, t.email, t.subject as role, 'teacher' as type
       FROM teachers t
       INNER JOIN class_timetables ct ON t.id = ct.teacher_id
       INNER JOIN classes c ON ct.class_id = c.id
       INNER JOIN students s ON s.grade_level = c.grade AND s.section = c.section
       WHERE s.index_number = ANY($1)`,
      [studentIds]
    );

    res.json(result.rows);
  } catch (error) {
    console.error("Fetch Parent Contacts Error:", error);
    res.status(500).json({ error: "Failed to fetch contacts." });
  }
});

// Get available contacts for a teacher (their students and students' parents)
app.get('/api/teacher/:email/contacts', async (req, res) => {
  try {
    const { email } = req.params;
    const cleanEmail = email.toLowerCase().trim();

    // 1. Get the teacher's ID
    const teacherRes = await db.query('SELECT id FROM teachers WHERE email = $1', [cleanEmail]);
    if (teacherRes.rows.length === 0) return res.status(404).json({ error: "Teacher not found" });
    const teacherId = teacherRes.rows[0].id;

    // 2. Get students taught by this teacher (via class_timetables)
    const studentsRes = await db.query(
      `SELECT DISTINCT s.first_name || ' ' || s.last_name as name, s.email, s.grade_level || ' ' || s.section as role, 'student' as type
       FROM students s
       INNER JOIN classes c ON s.grade_level = c.grade AND s.section = c.section
       INNER JOIN class_timetables ct ON ct.class_id = c.id
       WHERE ct.teacher_id = $1`,
      [teacherId]
    );

    // 3. Get parents of THESE specific students
    const taughtStudentIds = await db.query(
      `SELECT DISTINCT s.index_number
       FROM students s
       INNER JOIN classes c ON s.grade_level = c.grade AND s.section = c.section
       INNER JOIN class_timetables ct ON ct.class_id = c.id
       WHERE ct.teacher_id = $1`,
      [teacherId]
    );

    let parents = [];
    if (taughtStudentIds.rows.length > 0) {
      const ids = taughtStudentIds.rows.map(r => r.index_number);
      const parentsRes = await db.query(
        `SELECT DISTINCT p.full_name as name, p.email, 'Parent' as role, 'parent' as type
         FROM parents p
         WHERE EXISTS (
           SELECT 1 FROM unnest(p.child_student_ids) as cid 
           WHERE cid = ANY($1)
         )`,
        [ids]
      );
      parents = parentsRes.rows;
    }

    res.json([...studentsRes.rows, ...parents]);
  } catch (error) {
    console.error("Fetch Teacher Contacts Error:", error);
    res.status(500).json({ error: "Failed to fetch contacts." });
  }
});

// Get available contacts for a student (their teachers)
app.get('/api/student/:email/contacts', async (req, res) => {
  try {
    const { email } = req.params;
    const cleanEmail = email.toLowerCase().trim();

    // 1. Get the student's class
    const studentRes = await db.query('SELECT grade_level, section FROM students WHERE email = $1', [cleanEmail]);
    if (studentRes.rows.length === 0) return res.status(404).json({ error: "Student not found" });
    const { grade_level, section } = studentRes.rows[0];

    // 2. Get teachers assigned to this student's class
    const result = await db.query(
      `SELECT DISTINCT t.full_name as name, t.email, t.subject as role, 'teacher' as type
       FROM teachers t
       INNER JOIN class_timetables ct ON t.id = ct.teacher_id
       INNER JOIN classes c ON ct.class_id = c.id
       WHERE c.grade = $1 AND c.section = $2`,
      [grade_level, section]
    );

    res.json(result.rows);
  } catch (error) {
    console.error("Fetch Student Contacts Error:", error);
    res.status(500).json({ error: "Failed to fetch contacts." });
  }
});

// --- START THE SERVER ---
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
});