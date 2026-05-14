const db = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');

const otpStore = new Map();

exports.login = async (req, res) => {
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

    // Generate JWT Token
    const token = jwt.sign(
      { id: user.id, email: user.email, role: assignedRole },
      process.env.JWT_SECRET || 'SisuLink_Secret_Key_2026',
      { expiresIn: '24h' }
    );

    if (assignedRole === 'SuperAdmin') {
      res.json({ message: "Login successful!", token, user: { id: user.id, full_name: user.full_name, email: user.email, role: 'SuperAdmin' } });
    } else if (assignedRole === 'SchoolAdmin') {
      res.json({ message: "Login successful!", token, user: { id: user.id, school_name: user.name, admin_name: user.admin_name, email: user.email, role: 'SchoolAdmin' } });
    } else if (assignedRole === 'Parent') {
      res.json({ message: "Login successful!", token, user: { id: user.id, full_name: user.full_name, email: user.email, role: 'Parent', child_student_ids: user.child_student_ids } });
    } else if (assignedRole === 'Teacher') {
      res.json({ message: "Login successful!", token, user: { id: user.id, full_name: user.full_name, email: user.email, role: 'Teacher', staff_id: user.staff_id, profile_photo_url: user.profile_photo_url } });
    } else if (assignedRole === 'Industry') {
      res.json({ message: "Login successful!", token, user: { id: user.id, company_name: user.company_name, email: user.email, role: 'Industry', logo_url: user.logo_url, status: user.status } });
    } else {
      res.json({ message: "Login successful!", token, student: { first_name: user.first_name, last_name: user.last_name, email: user.email, role: 'Student', grade_level: user.grade_level, studentId: user.index_number, profile_photo: user.profile_photo_url } });
    }
  } catch (error) {
    console.error("Login Error:", error.message);
    res.status(500).json({ error: "Server error during login." });
  }
};

exports.register = async (req, res) => {
  try {
    const { role, email, password } = req.body;
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    if (role === 'Student') {
      const { first_name, last_name, grade_level, section, index_number, school_name, subjects } = req.body;

      let school_id = null;
      if (school_name) {
        const schoolRes = await db.query('SELECT id FROM schools WHERE name ILIKE $1', [school_name.trim()]);
        if (schoolRes.rows.length > 0) school_id = schoolRes.rows[0].id;
      }

      if (!school_id) {
        return res.status(400).json({ error: `Could not verify the school: "${school_name}". Please check the spelling.` });
      }

      const result = await db.query(
        `INSERT INTO students (first_name, last_name, email, password, grade_level, section, index_number, school_name, school_id, subjects) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id, first_name, last_name, email`,
        [first_name, last_name, email, hashedPassword, grade_level, section, index_number, school_name.trim(), school_id, subjects || []]
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
};

exports.forgotPassword = async (req, res) => {
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
};

exports.verifyOtp = async (req, res) => {
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
};

exports.resetPassword = async (req, res) => {
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
};
