const db = require('../config/db');
const bcrypt = require('bcryptjs');

// 1. Dashboard Stats
exports.getSchoolDashboardStats = async (req, res) => {
  try {
    const { email } = req.params;

    const schoolResult = await db.query('SELECT * FROM schools WHERE email = $1', [email]);
    if (schoolResult.rows.length === 0) {
      return res.status(404).json({ error: "School not found" });
    }
    
    const schoolName = schoolResult.rows[0].name;

    let totalTeachers = 0;
    try {
      const teacherCount = await db.query('SELECT COUNT(*) FROM teachers WHERE school_name = $1', [schoolName]);
      totalTeachers = parseInt(teacherCount.rows[0].count, 10);
    } catch (e) { console.error("Teacher query error"); }

    let totalStudents = 0;
    try {
      const studentCount = await db.query('SELECT COUNT(*) FROM students WHERE school_name = $1', [schoolName]); 
      totalStudents = parseInt(studentCount.rows[0].count, 10);
    } catch (e) { console.error("Student query error"); }

    let totalParents = 0;
    try {
      const parentCount = await db.query('SELECT COUNT(*) FROM parents');
      totalParents = parseInt(parentCount.rows[0].count, 10);
    } catch (e) { console.error("Parent query error"); }

    res.json({
      overallStats: {
        students: totalStudents,
        teachers: totalTeachers,
        parents: totalParents,
        classes: Math.floor(totalStudents / 30) || 0 
      },
      dailyStats: {
        studentAttendance: { present: 0, total: totalStudents, percentage: 0 },
        teacherAttendance: { present: 0, total: totalTeachers, percentage: 0 },
        staffLeave: { approved: 0, pending: 0 },
        eventsToday: { count: 0, nextEvent: "No events scheduled" }
      },
      notices: [], 
      events: []   
    });

  } catch (error) {
    console.error("School Dashboard Error:", error.message);
    res.status(500).json({ error: "Server error fetching dashboard data." });
  }
};

// 2. Get all teachers for a specific school
exports.getTeachers = async (req, res) => {
  try {
    const { email } = req.params;

    const schoolResult = await db.query('SELECT id, name FROM schools WHERE email = $1', [email]);
    if (schoolResult.rows.length === 0) return res.status(404).json({ error: "School not found" });
    
    const school = schoolResult.rows[0];

    const teachersResult = await db.query(
      'SELECT id, full_name, email, phone_number, staff_id, department, subject, medium, status, created_at FROM teachers WHERE school_id = $1 ORDER BY created_at DESC', 
      [school.id]
    );

    res.json(teachersResult.rows);
  } catch (error) {
    console.error("Get Teachers Error:", error.message);
    res.status(500).json({ error: "Failed to fetch teachers." });
  }
};

// 3. Add a new teacher to a specific school
exports.addTeacher = async (req, res) => {
  try {
    const { email } = req.params; 
    const { fullName, teacherEmail, phone, staffId, department, subject, medium, password } = req.body;

    const schoolResult = await db.query('SELECT id, name FROM schools WHERE email = $1', [email]);
    if (schoolResult.rows.length === 0) return res.status(404).json({ error: "School not found" });
    
    const school = schoolResult.rows[0];

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const result = await db.query(
      `INSERT INTO teachers (full_name, email, phone_number, password, staff_id, department, subject, medium, school_name, school_id) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id, full_name, email`,
      [fullName, teacherEmail.toLowerCase().trim(), phone, hashedPassword, staffId, department, subject, medium, school.name, school.id]
    );

    res.status(201).json({ message: "Teacher added successfully!", teacher: result.rows[0] });
  } catch (error) {
    console.error("Add Teacher Error:", error.message);
    if (error.code === '23505') {
      return res.status(400).json({ error: "A teacher with this Email or Staff ID already exists." });
    }
    res.status(500).json({ error: "Failed to add teacher." });
  }
};

// 4. Update an existing teacher's profile
exports.updateTeacher = async (req, res) => {
  try {
    const { email, teacherId } = req.params; 
    const { fullName, teacherEmail, phone, staffId, department, subject, medium, status } = req.body;

    const schoolResult = await db.query('SELECT id FROM schools WHERE email = $1', [email]);
    if (schoolResult.rows.length === 0) return res.status(404).json({ error: "School not found" });
    const schoolId = schoolResult.rows[0].id;

    const result = await db.query(
      `UPDATE teachers 
       SET full_name = $1, email = $2, phone_number = $3, staff_id = $4, department = $5, subject = $6, medium = $7, status = $8
       WHERE id = $9 AND school_id = $10 RETURNING *`,
      [fullName, teacherEmail.toLowerCase().trim(), phone, staffId, department, subject, medium, status, teacherId, schoolId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Teacher not found or unauthorized." });
    }

    res.json({ message: "Teacher updated successfully!", teacher: result.rows[0] });
  } catch (error) {
    console.error("Update Teacher Error:", error.message);
    res.status(500).json({ error: "Failed to update teacher." });
  }
};