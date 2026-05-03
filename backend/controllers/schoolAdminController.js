const db = require('../config/db');
const bcrypt = require('bcryptjs');

// 1. Dashboard Stats
exports.getSchoolDashboardStats = async (req, res) => {
  try {
    const { email } = req.params;

    const schoolResult = await db.query('SELECT * FROM schools WHERE email = $1', [email.toLowerCase().trim()]);
    if (schoolResult.rows.length === 0) return res.status(404).json({ error: "School not found" });
    
    const schoolName = schoolResult.rows[0].name;
    const schoolId = schoolResult.rows[0].id;

    let totalTeachers = 0, totalStudents = 0, totalParents = 0, totalIndustry = 0;
    try {
      const teacherCount = await db.query('SELECT COUNT(*) FROM teachers WHERE school_id = $1', [schoolId]);
      totalTeachers = parseInt(teacherCount.rows[0].count, 10);
      const studentCount = await db.query('SELECT COUNT(*) FROM students WHERE school_id = $1', [schoolId]); 
      totalStudents = parseInt(studentCount.rows[0].count, 10);
      const parentCount = await db.query('SELECT COUNT(*) FROM parents WHERE school_id = $1', [schoolId]);
      totalParents = parseInt(parentCount.rows[0].count, 10);
      const industryCount = await db.query('SELECT COUNT(*) FROM industry_partners');
      totalIndustry = parseInt(industryCount.rows[0].count, 10);
      
      const pendingJobsCount = await db.query("SELECT COUNT(*) FROM internships WHERE status = 'Pending'");
      const totalPendingJobs = parseInt(pendingJobsCount.rows[0].count, 10);

      res.json({
        overallStats: { students: totalStudents, teachers: totalTeachers, parents: totalParents, industry: totalIndustry, classes: Math.floor(totalStudents / 30) || 0 },
        dailyStats: { 
          studentAttendance: { present: 0, total: totalStudents, percentage: 0 }, 
          teacherAttendance: { present: 0, total: totalTeachers, percentage: 0 }, 
          staffLeave: { approved: 0, pending: 0 }, 
          eventsToday: { count: 0, nextEvent: "No events scheduled" },
          pendingInternships: totalPendingJobs
        },
        industryPartners: totalIndustry,
        notices: [], events: []   
      });
    } catch (e) { 
      console.error("Query error", e); 
      res.status(500).json({ error: "Database query error" });
    }
  } catch (error) { 
    console.error("Dashboard Stats Error:", error);
    res.status(500).json({ error: "Server error fetching dashboard data." }); 
  }
};

// 2. Get Teachers
exports.getTeachers = async (req, res) => {
  try {
    const { email } = req.params;
    const schoolResult = await db.query('SELECT id FROM schools WHERE email = $1', [email.toLowerCase().trim()]);
    if (schoolResult.rows.length === 0) return res.status(404).json({ error: "School not found" });
    
    // FIXED: Added is_class_teacher to the query
    const teachersResult = await db.query(
      'SELECT id, full_name, email, phone_number, staff_id, department, subject, medium, status, school_id, profile_photo_url, is_class_teacher, created_at FROM teachers WHERE school_id = $1 ORDER BY created_at DESC', 
      [schoolResult.rows[0].id]
    );
    res.json(teachersResult.rows);
  } catch (error) { res.status(500).json({ error: "Failed to fetch teachers." }); }
};

// 3. Add Teacher
exports.addTeacher = async (req, res) => {
  try {
    const { email } = req.params; 
    // FIXED: Added isClassTeacher to the destructured body
    const { fullName, teacherEmail, phone, staffId, department, subject, medium, password, isClassTeacher } = req.body;
    const schoolResult = await db.query('SELECT id, name FROM schools WHERE email = $1', [email.toLowerCase().trim()]);
    if (schoolResult.rows.length === 0) return res.status(404).json({ error: "School not found" });
    
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // FIXED: Added is_class_teacher into the insert statement
    const result = await db.query(
      `INSERT INTO teachers (full_name, email, phone_number, password, staff_id, department, subject, medium, school_name, school_id, is_class_teacher) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING id, full_name, email`,
      [fullName, teacherEmail.toLowerCase().trim(), phone, hashedPassword, staffId, department, subject, medium, schoolResult.rows[0].name, schoolResult.rows[0].id, isClassTeacher || false]
    );
    res.status(201).json({ message: "Teacher added successfully!", teacher: result.rows[0] });
  } catch (error) {
    if (error.code === '23505') return res.status(400).json({ error: "A teacher with this Email or Staff ID already exists." });
    res.status(500).json({ error: "Failed to add teacher." });
  }
};

// 4. Update Teacher
exports.updateTeacher = async (req, res) => {
  try {
    const { email, teacherId } = req.params; 
    // FIXED: Added isClassTeacher to the destructured body
    const { fullName, teacherEmail, phone, staffId, department, subject, medium, status, isClassTeacher } = req.body;
    const schoolResult = await db.query('SELECT id FROM schools WHERE email = $1', [email.toLowerCase().trim()]);
    if (schoolResult.rows.length === 0) return res.status(404).json({ error: "School not found" });

    // FIXED: Added is_class_teacher into the update statement
    const result = await db.query(
      `UPDATE teachers SET full_name = $1, email = $2, phone_number = $3, staff_id = $4, department = $5, subject = $6, medium = $7, status = $8, is_class_teacher = $9 WHERE id = $10 AND school_id = $11 RETURNING *`,
      [fullName, teacherEmail.toLowerCase().trim(), phone, staffId, department, subject, medium, status, isClassTeacher || false, teacherId, schoolResult.rows[0].id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: "Teacher not found or unauthorized." });
    res.json({ message: "Teacher updated successfully!", teacher: result.rows[0] });
  } catch (error) { res.status(500).json({ error: "Failed to update teacher." }); }
};

// --- CLASS MANAGEMENT ---

// 5. Get Classes
exports.getClasses = async (req, res) => {
  try {
    const { email } = req.params;
    const schoolResult = await db.query('SELECT id FROM schools WHERE email = $1', [email.toLowerCase().trim()]);
    if (schoolResult.rows.length === 0) return res.status(404).json({ error: "School not found" });
    
    const classesResult = await db.query(
      `SELECT c.*, t.full_name as class_teacher_name 
       FROM classes c LEFT JOIN teachers t ON c.class_teacher_id = t.id 
       WHERE c.school_id = $1 ORDER BY c.grade, c.section`,
      [schoolResult.rows[0].id]
    );
    res.json(classesResult.rows);
  } catch (error) { res.status(500).json({ error: "Failed to fetch classes." }); }
};

// 6. Add Class
exports.addClass = async (req, res) => {
  try {
    const { email } = req.params;
    const { grade, section, classTeacherId, roomNumber, capacity } = req.body;
    const schoolResult = await db.query('SELECT id FROM schools WHERE email = $1', [email.toLowerCase().trim()]);
    if (schoolResult.rows.length === 0) return res.status(404).json({ error: "School not found" });
    
    const teacherId = classTeacherId && classTeacherId.trim() !== '' ? classTeacherId : null;

    const result = await db.query(
      `INSERT INTO classes (school_id, grade, section, class_teacher_id, room_number, capacity) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [schoolResult.rows[0].id, grade, section, teacherId, roomNumber, capacity || 40]
    );
    res.status(201).json({ message: "Class added successfully!", classData: result.rows[0] });
  } catch (error) {
    if (error.code === '23505') return res.status(400).json({ error: "This class section already exists." });
    res.status(500).json({ error: "Failed to add class." });
  }
};

// 6.5 Delete Class
exports.deleteClass = async (req, res) => {
  try {
    const { email, classId } = req.params;

    const schoolResult = await db.query('SELECT id FROM schools WHERE email = $1', [email.toLowerCase().trim()]);
    if (schoolResult.rows.length === 0) return res.status(404).json({ error: "School not found" });

    const result = await db.query(
      `DELETE FROM classes WHERE id = $1 AND school_id = $2 RETURNING *`,
      [classId, schoolResult.rows[0].id]
    );

    if (result.rows.length === 0) return res.status(404).json({ error: "Class not found or unauthorized." });

    res.json({ message: "Class deleted successfully!" });
  } catch (error) {
    console.error("Delete Class Error:", error.message);
    res.status(500).json({ error: "Failed to delete class." });
  }
};

// --- TIMETABLE MANAGEMENT ---

// 7. Get Class Timetable
exports.getClassTimetable = async (req, res) => {
  try {
    const { classId } = req.params;
    const result = await db.query(
      `SELECT ct.*, t.full_name as teacher_name 
       FROM class_timetables ct LEFT JOIN teachers t ON ct.teacher_id = t.id 
       WHERE ct.class_id = $1`, [classId]
    );
    res.json(result.rows);
  } catch (error) { res.status(500).json({ error: "Failed to fetch timetable." }); }
};

// 8. Save Timetable Slot
exports.saveTimetableSlot = async (req, res) => {
  try {
    const { email, classId } = req.params;
    const { dayOfWeek, periodNumber, timeSlot, subject, teacherId } = req.body;
    const schoolResult = await db.query('SELECT id FROM schools WHERE email = $1', [email.toLowerCase().trim()]);
    if (schoolResult.rows.length === 0) return res.status(404).json({ error: "School not found" });

    const tId = teacherId && teacherId.trim() !== '' ? teacherId : null;

    const result = await db.query(
      `INSERT INTO class_timetables (school_id, class_id, day_of_week, period_number, time_slot, subject, teacher_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (class_id, day_of_week, period_number) 
       DO UPDATE SET subject = EXCLUDED.subject, teacher_id = EXCLUDED.teacher_id, time_slot = EXCLUDED.time_slot
       RETURNING *`,
      [schoolResult.rows[0].id, classId, dayOfWeek, periodNumber, timeSlot, subject, tId]
    );
    res.json({ message: "Slot updated successfully", slot: result.rows[0] });
  } catch (error) { res.status(500).json({ error: "Failed to save slot." }); }
};

// 9. Get Teacher Timetable
exports.getTeacherTimetable = async (req, res) => {
  try {
    const { teacherId } = req.params;
    const result = await db.query(
      `SELECT ct.day_of_week, ct.period_number, ct.time_slot, ct.subject, c.grade, c.section, c.room_number 
       FROM class_timetables ct JOIN classes c ON ct.class_id = c.id 
       WHERE ct.teacher_id = $1`, [teacherId]
    );
    res.json(result.rows);
  } catch (error) { res.status(500).json({ error: "Failed to fetch teacher timetable." }); }
};

// --- SMART MESSAGING SYSTEM ---

// 10. Send a message from Admin to Staff OR Students
exports.sendStaffMessage = async (req, res) => {
  try {
    const { email } = req.params;
    const { recipientType, targetSection, targetTeacherId, targetGrade, targetStudentId, subject, messageBody } = req.body;

    const schoolResult = await db.query('SELECT id, admin_name FROM schools WHERE email = $1', [email.toLowerCase().trim()]);
    if (schoolResult.rows.length === 0) return res.status(404).json({ error: "School not found" });
    const school = schoolResult.rows[0];

    let targetGroup = null;
    if (recipientType === 'section') targetGroup = targetSection;
    if (recipientType === 'grade') targetGroup = targetGrade;
    if (recipientType === 'individual') targetGroup = targetTeacherId || targetStudentId;

    const result = await db.query(
      `INSERT INTO internal_messages (school_id, sender_name, recipient_type, target_group, subject, message_body)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [school.id, school.admin_name || 'Admin', recipientType, targetGroup, subject, messageBody]
    );

    res.status(201).json({ message: "Message sent successfully!", data: result.rows[0] });
  } catch (error) {
    console.error("Send Message Error:", error.message);
    res.status(500).json({ error: "Failed to send message." });
  }
};

// 11. Fetch messages for a specific Teacher
exports.getTeacherMessages = async (req, res) => {
  try {
    const { teacherId } = req.params;

    const teacherResult = await db.query('SELECT school_id, department FROM teachers WHERE id = $1', [teacherId]);
    if (teacherResult.rows.length === 0) return res.status(404).json({ error: "Teacher not found" });
    const teacher = teacherResult.rows[0];

    const messagesResult = await db.query(
      `SELECT * FROM internal_messages 
       WHERE school_id = $1 
       AND (
         recipient_type = 'all' 
         OR (recipient_type = 'section' AND target_group = $2) 
         OR (recipient_type = 'individual' AND target_group = $3)
       )
       ORDER BY created_at DESC`,
      [teacher.school_id, teacher.department, teacherId]
    );

    res.json(messagesResult.rows);
  } catch (error) {
    console.error("Get Messages Error:", error.message);
    res.status(500).json({ error: "Failed to fetch messages." });
  }
};

// --- STUDENT MANAGEMENT ---

// 12. Get all students
exports.getStudents = async (req, res) => {
  try {
    const { email } = req.params;
    const schoolResult = await db.query('SELECT id FROM schools WHERE email = $1', [email.toLowerCase().trim()]);
    if (schoolResult.rows.length === 0) return res.status(404).json({ error: "School not found" });

    const studentsResult = await db.query(
      'SELECT * FROM students WHERE school_id = $1 ORDER BY created_at DESC', 
      [schoolResult.rows[0].id]
    );

    res.json(studentsResult.rows);
  } catch (error) {
    console.error("Get Students Error:", error.message);
    res.status(500).json({ error: "Failed to fetch students." });
  }
};

// 13. Add a new student
exports.addStudent = async (req, res) => {
  try {
    const { email } = req.params;
    const { firstName, lastName, studentId, studentEmail, grade, section, medium, subjects, parentEmail, parentPhone } = req.body;

    const schoolResult = await db.query('SELECT id, name FROM schools WHERE email = $1', [email.toLowerCase().trim()]);
    if (schoolResult.rows.length === 0) return res.status(404).json({ error: "School not found" });
    const school = schoolResult.rows[0];

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('welcome123', salt);

    const result = await db.query(
      `INSERT INTO students (school_id, school_name, first_name, last_name, index_number, email, password, grade_level, section, medium, subjects, parent_email, parent_phone)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING *`,
      [school.id, school.name, firstName, lastName, studentId, studentEmail.toLowerCase().trim(), hashedPassword, grade, section, medium, JSON.stringify(subjects), parentEmail, parentPhone]
    );

    res.status(201).json({ message: "Student added successfully!", student: result.rows[0] });
  } catch (error) {
    console.error("Add Student Error:", error.message);
    if (error.code === '23505') return res.status(400).json({ error: "A student with this ID or Email already exists." });
    res.status(500).json({ error: "Failed to add student." });
  }
};

// 14. Update an existing student
exports.updateStudent = async (req, res) => {
  try {
    const { email, studentId } = req.params;
    const { firstName, lastName, studentEmail, grade, section, medium, subjects, parentEmail, parentPhone, status } = req.body;

    const schoolResult = await db.query('SELECT id FROM schools WHERE email = $1', [email.toLowerCase().trim()]);
    if (schoolResult.rows.length === 0) return res.status(404).json({ error: "School not found" });

    const result = await db.query(
      `UPDATE students 
       SET first_name = $1, last_name = $2, email = $3, grade_level = $4, section = $5, medium = $6, subjects = $7, parent_email = $8, parent_phone = $9, status = $10
       WHERE id = $11 AND school_id = $12 RETURNING *`,
      [firstName, lastName, studentEmail.toLowerCase().trim(), grade, section, medium, JSON.stringify(subjects), parentEmail, parentPhone, status, studentId, schoolResult.rows[0].id]
    );

    res.json({ message: "Student updated successfully!", student: result.rows[0] });
  } catch (error) {
    console.error("Update Student Error:", error.message);
    res.status(500).json({ error: "Failed to update student." });
  }
};

// 15. Get Dynamic Student Timetable
exports.getStudentTimetable = async (req, res) => {
  try {
    const { email, studentId } = req.params;
    
    const studentQuery = await db.query('SELECT grade_level, section FROM students WHERE id = $1', [studentId]);
    if (studentQuery.rows.length === 0) return res.status(404).json({ error: "Student not found" });
    const student = studentQuery.rows[0];

    const result = await db.query(
      `SELECT ct.day_of_week, ct.period_number, ct.time_slot, ct.subject, t.full_name as teacher_name, c.room_number 
       FROM class_timetables ct 
       JOIN classes c ON ct.class_id = c.id 
       LEFT JOIN teachers t ON ct.teacher_id = t.id
       WHERE c.grade = $1 AND c.section = $2`, 
      [student.grade_level, student.section]
    );

    res.json(result.rows);
  } catch (error) {
    console.error("Get Student Timetable Error:", error.message);
    res.status(500).json({ error: "Failed to fetch timetable." });
  }
};

// --- CALENDAR MANAGEMENT ---

exports.getEvents = async (req, res) => {
  try {
    const { email } = req.params;
    const schoolResult = await db.query('SELECT id FROM schools WHERE email = $1', [email.toLowerCase().trim()]);
    if (schoolResult.rows.length === 0) return res.status(404).json({ error: "School not found" });

    const result = await db.query('SELECT * FROM events WHERE school_id = $1 ORDER BY event_date ASC, time_from ASC', [schoolResult.rows[0].id]);
    res.json(result.rows);
  } catch (error) { res.status(500).json({ error: "Failed to fetch events." }); }
};

exports.addEvent = async (req, res) => {
  try {
    const { email } = req.params;
    const { title, date, timeFrom, timeTo, location, type, status, isSpecial, imageUrl } = req.body;
    const audience = 'All'; // Hardcoded as per business rules
    
    const schoolResult = await db.query('SELECT id FROM schools WHERE email = $1', [email.toLowerCase().trim()]);
    if (schoolResult.rows.length === 0) return res.status(404).json({ error: "School not found" });

    const result = await db.query(
      `INSERT INTO events (school_id, title, event_date, time_from, time_to, location, type, audience, status, is_special, image_url)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
      [schoolResult.rows[0].id, title, date, timeFrom, timeTo, location, type, audience, status, isSpecial, imageUrl || null]
    );
    res.status(201).json({ message: "Event added successfully!", event: result.rows[0] });
  } catch (error) { res.status(500).json({ error: "Failed to add event." }); }
};

exports.updateEvent = async (req, res) => {
  try {
    const { email, eventId } = req.params;
    const { title, date, timeFrom, timeTo, location, type, status, isSpecial, imageUrl } = req.body;
    const audience = 'All'; // Hardcoded as per business rules
    
    const schoolResult = await db.query('SELECT id FROM schools WHERE email = $1', [email.toLowerCase().trim()]);
    if (schoolResult.rows.length === 0) return res.status(404).json({ error: "School not found" });

    const result = await db.query(
      `UPDATE events SET title = $1, event_date = $2, time_from = $3, time_to = $4, location = $5, type = $6, audience = $7, status = $8, is_special = $9, image_url = $10 WHERE id = $11 AND school_id = $12 RETURNING *`,
      [title, date, timeFrom, timeTo, location, type, audience, status, isSpecial, imageUrl || null, eventId, schoolResult.rows[0].id]
    );
    res.json({ message: "Event updated successfully!", event: result.rows[0] });
  } catch (error) { res.status(500).json({ error: "Failed to update event." }); }
};

exports.deleteEvent = async (req, res) => {
  try {
    const { email, eventId } = req.params;
    const schoolResult = await db.query('SELECT id FROM schools WHERE email = $1', [email.toLowerCase().trim()]);
    if (schoolResult.rows.length === 0) return res.status(404).json({ error: "School not found" });

    await db.query('DELETE FROM events WHERE id = $1 AND school_id = $2', [eventId, schoolResult.rows[0].id]);
    res.json({ message: "Event deleted successfully!" });
  } catch (error) { res.status(500).json({ error: "Failed to delete event." }); }
};

// --- NOTICE MANAGEMENT ---

exports.getNotices = async (req, res) => {
  try {
    const { email } = req.params;
    const schoolResult = await db.query('SELECT id FROM schools WHERE email = $1', [email.toLowerCase().trim()]);
    if (schoolResult.rows.length === 0) return res.status(404).json({ error: "School not found" });

    const result = await db.query('SELECT * FROM notices WHERE school_id = $1 ORDER BY created_at DESC', [schoolResult.rows[0].id]);
    res.json(result.rows);
  } catch (error) { res.status(500).json({ error: "Failed to fetch notices." }); }
};

exports.addNotice = async (req, res) => {
  try {
    const { email } = req.params;
    const { title, content, priority, audience, author, status } = req.body;
    
    const schoolResult = await db.query('SELECT id FROM schools WHERE email = $1', [email.toLowerCase().trim()]);
    if (schoolResult.rows.length === 0) return res.status(404).json({ error: "School not found" });

    const result = await db.query(
      `INSERT INTO notices (school_id, title, content, priority, audience, posted_by, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [schoolResult.rows[0].id, title, content, priority, audience, author, status]
    );
    res.status(201).json({ message: "Notice added successfully!", notice: result.rows[0] });
  } catch (error) { res.status(500).json({ error: "Failed to add notice." }); }
};

exports.updateNotice = async (req, res) => {
  try {
    const { email, noticeId } = req.params;
    const { title, content, priority, audience, author, status } = req.body;
    
    const schoolResult = await db.query('SELECT id FROM schools WHERE email = $1', [email.toLowerCase().trim()]);
    if (schoolResult.rows.length === 0) return res.status(404).json({ error: "School not found" });

    const result = await db.query(
      `UPDATE notices SET title = $1, content = $2, priority = $3, audience = $4, posted_by = $5, status = $6 WHERE id = $7 AND school_id = $8 RETURNING *`,
      [title, content, priority, audience, author, status, noticeId, schoolResult.rows[0].id]
    );
    res.json({ message: "Notice updated successfully!", notice: result.rows[0] });
  } catch (error) { res.status(500).json({ error: "Failed to update notice." }); }
};

exports.deleteNotice = async (req, res) => {
  try {
    const { email, noticeId } = req.params;
    const schoolResult = await db.query('SELECT id FROM schools WHERE email = $1', [email.toLowerCase().trim()]);
    if (schoolResult.rows.length === 0) return res.status(404).json({ error: "School not found" });

    await db.query('DELETE FROM notices WHERE id = $1 AND school_id = $2', [noticeId, schoolResult.rows[0].id]);
    res.json({ message: "Notice deleted successfully!" });
  } catch (error) { res.status(500).json({ error: "Failed to delete notice." }); }
};

// --- PARENT MANAGEMENT ---

// 24. Get all parents
exports.getParents = async (req, res) => {
  try {
    const { email } = req.params;
    const schoolResult = await db.query('SELECT id FROM schools WHERE email = $1', [email.toLowerCase().trim()]);
    if (schoolResult.rows.length === 0) return res.status(404).json({ error: "School not found" });

    const result = await db.query('SELECT * FROM parents WHERE school_id = $1 ORDER BY created_at DESC', [schoolResult.rows[0].id]);
    res.json(result.rows);
  } catch (error) {
    console.error("Get Parents Error:", error.message);
    res.status(500).json({ error: "Failed to fetch parents." });
  }
};

// 25. Add a parent 
exports.addParent = async (req, res) => {
  try {
    const { email } = req.params;
    const { fullName, parentEmail, phone, childStudentIds, password } = req.body;
    
    const schoolResult = await db.query('SELECT id FROM schools WHERE email = $1', [email.toLowerCase().trim()]);
    if (schoolResult.rows.length === 0) return res.status(404).json({ error: "School not found" });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password || 'welcome123', salt);

    let childIdsArray = [];
    if (childStudentIds && typeof childStudentIds === 'string') {
        childIdsArray = childStudentIds.split(',').map(id => id.trim()).filter(id => id !== '');
    }

    const result = await db.query(
      `INSERT INTO parents (school_id, full_name, email, phone_number, password, child_student_ids) 
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, full_name, email`,
      [schoolResult.rows[0].id, fullName, parentEmail.toLowerCase().trim(), phone, hashedPassword, childIdsArray]
    );

    res.status(201).json({ message: "Parent added successfully!", parent: result.rows[0] });
  } catch (error) {
    console.error("Add Parent Error:", error.message);
    if (error.code === '23505') return res.status(400).json({ error: "A parent with this email already exists." });
    res.status(500).json({ error: "Failed to add parent." });
  }
};

// 26. Update a parent 
exports.updateParent = async (req, res) => {
  try {
    const { email, parentId } = req.params;
    const { fullName, parentEmail, phone, childStudentIds, status } = req.body;
    
    const schoolResult = await db.query('SELECT id FROM schools WHERE email = $1', [email.toLowerCase().trim()]);
    if (schoolResult.rows.length === 0) return res.status(404).json({ error: "School not found" });

    let childIdsArray = [];
    if (childStudentIds && typeof childStudentIds === 'string') {
        childIdsArray = childStudentIds.split(',').map(id => id.trim()).filter(id => id !== '');
    } else if (Array.isArray(childStudentIds)) {
        childIdsArray = childStudentIds; 
    }

    const result = await db.query(
      `UPDATE parents 
       SET full_name = $1, email = $2, phone_number = $3, child_student_ids = $4, status = $5
       WHERE id = $6 AND school_id = $7 RETURNING *`,
      [fullName, parentEmail.toLowerCase().trim(), phone, childIdsArray, status, parentId, schoolResult.rows[0].id]
    );

    if (result.rows.length === 0) return res.status(404).json({ error: "Parent not found." });
    res.json({ message: "Parent updated successfully!", parent: result.rows[0] });
  } catch (error) {
    console.error("Update Parent Error:", error.message);
    res.status(500).json({ error: "Failed to update parent." });
  }
};

// 27. Delete a parent
exports.deleteParent = async (req, res) => {
  try {
    const { email, parentId } = req.params;
    const schoolResult = await db.query('SELECT id FROM schools WHERE email = $1', [email.toLowerCase().trim()]);
    if (schoolResult.rows.length === 0) return res.status(404).json({ error: "School not found" });

    await db.query('DELETE FROM parents WHERE id = $1 AND school_id = $2', [parentId, schoolResult.rows[0].id]);
    res.json({ message: "Parent deleted successfully!" });
  } catch (error) {
    console.error("Delete Parent Error:", error.message);
    res.status(500).json({ error: "Failed to delete parent." });
  }
};

// 28. Academic Trend Analysis
exports.getAcademicTrends = async (req, res) => {
  try {
    const { email } = req.params;
    
    // Find school ID from admin email
    const schoolResult = await db.query('SELECT id FROM schools WHERE email = $1', [email.toLowerCase().trim()]);
    if (schoolResult.rows.length === 0) return res.status(404).json({ error: "School not found" });
    const schoolId = schoolResult.rows[0].id;

    // Fetch average marks grouped by assessment type and level
    // We pivot the levels (OL, AL) into columns for Recharts
    const result = await db.query(
      `SELECT 
        assessment_type as term,
        ROUND(AVG(CASE WHEN level = 'OL' THEN marks END), 2) as "OL",
        ROUND(AVG(CASE WHEN level = 'AL' THEN marks END), 2) as "AL"
       FROM student_grades 
       WHERE school_id = $1 
       GROUP BY assessment_type 
       ORDER BY 
         CASE 
           WHEN assessment_type ILIKE '%Term 1%' THEN 1
           WHEN assessment_type ILIKE '%Term 2%' THEN 2
           WHEN assessment_type ILIKE '%Term 3%' THEN 3
           ELSE 4
         END`,
      [schoolId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error("Get Academic Trends Error:", error.message);
    res.status(500).json({ error: "Failed to fetch academic trends." });
  }
};

// 29. Attendance Health Analysis
exports.getAttendanceHealth = async (req, res) => {
  try {
    const { email } = req.params;
    
    // Find school ID from admin email
    const schoolResult = await db.query('SELECT id FROM schools WHERE email = $1', [email.toLowerCase().trim()]);
    if (schoolResult.rows.length === 0) return res.status(404).json({ error: "School not found" });
    const schoolId = schoolResult.rows[0].id;

    // Calculate attendance percentage grouped by grade level
    const result = await db.query(
      `SELECT 
        s.grade_level as grade,
        ROUND((COUNT(CASE WHEN sa.status = 'Present' THEN 1 END) * 100.0) / NULLIF(COUNT(sa.id), 0), 2) as attendance
       FROM students s
       JOIN student_attendance sa ON s.id = sa.student_id
       WHERE s.school_id = $1
       GROUP BY s.grade_level
       ORDER BY 
         CASE 
           WHEN s.grade_level ILIKE 'Grade 1' THEN 1
           WHEN s.grade_level ILIKE 'Grade 2' THEN 2
           WHEN s.grade_level ILIKE 'Grade 3' THEN 3
           WHEN s.grade_level ILIKE 'Grade 4' THEN 4
           WHEN s.grade_level ILIKE 'Grade 5' THEN 5
           WHEN s.grade_level ILIKE 'Grade 6' THEN 6
           WHEN s.grade_level ILIKE 'Grade 7' THEN 7
           WHEN s.grade_level ILIKE 'Grade 8' THEN 8
           WHEN s.grade_level ILIKE 'Grade 9' THEN 9
           WHEN s.grade_level ILIKE 'Grade 10' THEN 10
           WHEN s.grade_level ILIKE 'Grade 11' THEN 11
           WHEN s.grade_level ILIKE 'Grade 12' THEN 12
           WHEN s.grade_level ILIKE 'Grade 13' THEN 13
           ELSE 14
         END`,
      [schoolId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error("Get Attendance Health Error:", error.message);
    res.status(500).json({ error: "Failed to fetch attendance health data." });
  }
};

// 30. Get Industry Partners
exports.getIndustryPartners = async (req, res) => {
  try {
    const { email } = req.params;
    const schoolResult = await db.query('SELECT id FROM schools WHERE email = $1', [email.toLowerCase().trim()]);
    if (schoolResult.rows.length === 0) return res.status(404).json({ error: "School not found" });

    const result = await db.query('SELECT * FROM industry_partners ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (error) {
    console.error("Get Industry Partners Error:", error.message);
    res.status(500).json({ error: "Failed to fetch industry partners." });
  }
};

// 31. Update Industry Partner Status
exports.updateIndustryPartner = async (req, res) => {
  try {
    const { partnerId } = req.params;
    const { status } = req.body;
    
    const result = await db.query(
      'UPDATE industry_partners SET status = $1 WHERE id = $2 RETURNING *',
      [status, partnerId]
    );

    if (result.rows.length === 0) return res.status(404).json({ error: "Partner not found." });
    res.json({ message: "Partner status updated successfully!", partner: result.rows[0] });
  } catch (error) {
    console.error("Update Industry Partner Error:", error.message);
    res.status(500).json({ error: "Failed to update industry partner." });
  }
};
