const db = require('../config/db');
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

const matchesSubject = (sub1, sub2) => {
  if (!sub1 || !sub2) return false;
  const s1 = sub1.toLowerCase().trim();
  const s2 = sub2.toLowerCase().trim();
  if (s1 === s2) return true;
  
  // Subject alias mapping
  const aliases = {
    'ict': ['information technology', 'ict', 'git'],
    'information technology': ['ict', 'git', 'information technology'],
    'git': ['ict', 'information technology', 'git'],
    'general english': ['english', 'general english'],
    'english': ['general english', 'english'],
    'combined mathematics': ['mathematics', 'combined mathematics', 'combined maths', 'maths'],
    'maths': ['mathematics', 'combined mathematics', 'combined maths', 'maths'],
    'mathematics': ['mathematics', 'combined mathematics', 'combined maths', 'maths'],
    'physics': ['physics']
  };
  
  if (aliases[s1] && aliases[s1].includes(s2)) return true;
  if (aliases[s2] && aliases[s2].includes(s1)) return true;
  return false;
};

exports.getDashboard = async (req, res) => {
  try {
    const { email } = req.params;
    const cleanEmail = email.toLowerCase().trim();

    // 1. Fetch Teacher Info
    const teacherRes = await db.query('SELECT * FROM teachers WHERE email = $1', [cleanEmail]);
    if (teacherRes.rows.length === 0) return res.status(404).json({ error: "Teacher not found" });
    const teacher = teacherRes.rows[0];
    const teacherDbId = teacher.id;

    let managedClass = null;
    if (teacher.is_class_teacher) {
      try {
        const classRes = await db.query('SELECT id, grade, section FROM classes WHERE class_teacher_id = $1', [teacherDbId]);
        if (classRes.rows.length > 0) {
          managedClass = classRes.rows[0];
        }
      } catch (err) {
        console.error("Failed to fetch managed class:", err);
      }
    }

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
       WHERE ct.teacher_id = $1 AND ct.day_of_week = $2 AND ct.subject = $3
       ORDER BY ct.time_slot ASC`,
      [teacherDbId, todayName, teacher.subject]
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
      if (teacher.is_class_teacher && managedClass) {
        // COUNT STUDENTS IN THE MANAGED CLASS
        const classStudentCountRes = await db.query(
          `SELECT COUNT(*) as count FROM students WHERE school_id = $1 AND grade_level = $2 AND section = $3`,
          [teacher.school_id, managedClass.grade, managedClass.section]
        );
        realTotalStudents = parseInt(classStudentCountRes.rows[0].count, 10);
      } else {
        // COUNT DISTINCT STUDENTS TAUGHT BY THIS TEACHER
        const taughtStudentCountRes = await db.query(
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
        realTotalStudents = parseInt(taughtStudentCountRes.rows[0].count, 10);
      }
    } catch (e) {
      console.error("Error fetching student count:", e);
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
        profile_photo: teacher.profile_photo_url,
        is_class_teacher: teacher.is_class_teacher,
        managedClass: managedClass
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
};

exports.getEvents = async (req, res) => {
  try {
    const { email } = req.params;
    const cleanEmail = email.toLowerCase().trim();

    // Smart lookup: check teachers, then students, then parents to find the school_id
    let userRes = await db.query('SELECT school_id FROM teachers WHERE email = $1', [cleanEmail]);

    if (userRes.rows.length === 0) {
      userRes = await db.query('SELECT school_id FROM students WHERE email = $1', [cleanEmail]);
    }

    if (userRes.rows.length === 0) {
      userRes = await db.query('SELECT school_id, child_student_ids FROM parents WHERE email = $1', [cleanEmail]);
      if (userRes.rows.length > 0 && !userRes.rows[0].school_id) {
        const parent = userRes.rows[0];
        if (parent.child_student_ids && parent.child_student_ids.length > 0) {
          const childRes = await db.query('SELECT school_id FROM students WHERE index_number = ANY($1) AND school_id IS NOT NULL LIMIT 1', [parent.child_student_ids]);
          if (childRes.rows.length > 0) {
            userRes.rows[0].school_id = childRes.rows[0].school_id;
          }
        }
      }
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
};

exports.getTimetable = async (req, res) => {
  try {
    const { email } = req.params;
    const cleanEmail = email.toLowerCase().trim();

    const teacherRes = await db.query('SELECT id, subject FROM teachers WHERE email = $1', [cleanEmail]);
    if (teacherRes.rows.length === 0) return res.status(404).json({ error: "Teacher not found" });
    const teacher = teacherRes.rows[0];
    const teacherDbId = teacher.id;

    const result = await db.query(
      `SELECT ct.day_of_week, ct.period_number, ct.time_slot, ct.subject, c.grade, c.section, c.room_number 
       FROM class_timetables ct 
       JOIN classes c ON ct.class_id = c.id 
       WHERE ct.teacher_id = $1 AND ct.subject = $2
       ORDER BY ct.time_slot ASC`,
      [teacherDbId, teacher.subject]
    );

    res.json(result.rows);
  } catch (error) {
    console.error("Teacher Timetable error", error);
    res.status(500).json({ error: "Server error fetching teacher timetable." });
  }
};

exports.getStudents = async (req, res) => {
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
};

exports.getClassStudents = async (req, res) => {
  try {
    const { email } = req.params;
    const cleanEmail = email.toLowerCase().trim();

    const teacherRes = await db.query('SELECT id, school_id FROM teachers WHERE email = $1', [cleanEmail]);
    if (teacherRes.rows.length === 0) return res.status(404).json({ error: "Teacher not found" });
    const teacherDbId = teacherRes.rows[0].id;

    // Fetch students belonging to the class this teacher manages
    const studentsRes = await db.query(
      `SELECT s.id, s.first_name, s.last_name, s.index_number, s.grade_level, s.section, s.profile_photo_url 
       FROM students s
       JOIN classes c ON s.grade_level = c.grade AND s.section = c.section AND s.school_id = c.school_id
       WHERE c.class_teacher_id = $1
       ORDER BY s.first_name`,
      [teacherDbId]
    );

    res.json(studentsRes.rows);
  } catch (error) {
    console.error("Teacher Class Students error", error);
    res.status(500).json({ error: "Server error fetching class students." });
  }
};

exports.markAttendance = async (req, res) => {
  try {
    const { date, attendanceData } = req.body; 
    
    for (let record of attendanceData) {
      const studentRes = await db.query('SELECT school_id FROM students WHERE id = $1', [record.studentId]);
      if (studentRes.rows.length === 0) continue;
      const schoolId = studentRes.rows[0].school_id;

      await db.query(
        `INSERT INTO student_attendance (school_id, student_id, date, status)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (student_id, date) 
         DO UPDATE SET status = EXCLUDED.status, marked_at = CURRENT_TIMESTAMP`,
        [schoolId, record.studentId, date, record.status]
      );
    }

    res.json({ message: "Attendance marked successfully!" });
  } catch (error) {
    console.error("Teacher Mark Attendance error", error);
    res.status(500).json({ error: "Server error marking attendance." });
  }
};

exports.getProfile = async (req, res) => {
  try {
    const { email } = req.params;
    const cleanEmail = email.toLowerCase().trim();
    const result = await db.query(
      'SELECT id, staff_id, full_name, email, department, medium, subject, school_name, profile_photo_url FROM teachers WHERE email = $1',
      [cleanEmail]
    );

    if (result.rows.length === 0) return res.status(404).json({ error: "Teacher not found" });
    const teacher = result.rows[0];

    // FETCH DISTINCT GRADES TAUGHT BY THIS TEACHER
    const gradesRes = await db.query(
      `SELECT DISTINCT c.grade 
       FROM class_timetables ct 
       JOIN classes c ON ct.class_id = c.id 
       WHERE ct.teacher_id = $1 AND ct.subject = $2`,
      [teacher.id, teacher.subject]
    );
    teacher.teaching_grades = gradesRes.rows.map(row => row.grade);

    res.json(teacher);
  } catch (error) {
    console.error("Teacher Profile Error:", error);
    res.status(500).json({ error: "Server error fetching teacher profile." });
  }
};

exports.uploadAvatar = async (req, res) => {
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
};

exports.removeAvatar = async (req, res) => {
  try {
    const { email } = req.body;
    const cleanEmail = email.toLowerCase().trim();
    await db.query('UPDATE teachers SET profile_photo_url = NULL WHERE email = $1', [cleanEmail]);
    res.json({ message: "Photo removed successfully" });
  } catch (error) {
    console.error("Error removing teacher avatar:", error);
    res.status(500).json({ error: "Server error removing teacher photo." });
  }
};

exports.uploadMaterial = async (req, res) => {
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
};

exports.addMaterial = async (req, res) => {
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
};

exports.getMaterials = async (req, res) => {
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
};

exports.getContacts = async (req, res) => {
  try {
    const { email } = req.params;
    const cleanEmail = email.toLowerCase().trim();

    // 1. Get the teacher's ID and Subject
    const teacherRes = await db.query('SELECT id, subject FROM teachers WHERE email = $1', [cleanEmail]);
    if (teacherRes.rows.length === 0) return res.status(404).json({ error: "Teacher not found" });
    const teacherId = teacherRes.rows[0].id;
    const teacherSubject = teacherRes.rows[0].subject;

    // 2. Get students taught by this teacher (via timetables matching designated subject OR managed class)
    const studentsRes = await db.query(
      `SELECT DISTINCT 
        s.first_name || ' ' || s.last_name as name, 
        s.email, 
        s.grade_level || ' ' || s.section as role, 
        'student' as type,
        s.index_number
       FROM students s
       LEFT JOIN classes c_managed ON s.grade_level = c_managed.grade AND s.section = c_managed.section
       WHERE c_managed.class_teacher_id = $1
       OR EXISTS (
         SELECT 1 FROM class_timetables ct
         JOIN classes c ON ct.class_id = c.id
         WHERE ct.teacher_id = $1 
         AND ct.subject = $2 
         AND s.grade_level = c.grade 
         AND s.section = c.section
       )
       ORDER BY name`,
      [teacherId, teacherSubject]
    );

    // 3. Get parents of THESE specific students
    let parents = [];
    if (studentsRes.rows.length > 0) {
      const studentIndices = studentsRes.rows.map(s => s.index_number).filter(Boolean);
      
      if (studentIndices.length > 0) {
        const parentsRes = await db.query(
          `SELECT DISTINCT p.full_name as name, p.email, 'Parent' as role, 'parent' as type
           FROM parents p
           WHERE EXISTS (
             SELECT 1 FROM unnest(p.child_student_ids) as cid 
             WHERE cid = ANY($1)
           )
           ORDER BY name`,
          [studentIndices]
        );
        parents = parentsRes.rows;
      }
    }

    // Clean up student rows to remove index_number before sending to client
    const students = studentsRes.rows.map(({ index_number, ...rest }) => rest);

    res.json([...students, ...parents]);
  } catch (error) {
    console.error("Fetch Teacher Contacts Error:", error);
    res.status(500).json({ error: "Failed to fetch contacts." });
  }
};

exports.getAttendanceHistory = async (req, res) => {
  try {
    const { email } = req.params;
    const cleanEmail = email.toLowerCase().trim();

    // 1. Get teacher info and their class
    const teacherRes = await db.query('SELECT id, is_class_teacher FROM teachers WHERE email = $1', [cleanEmail]);
    if (teacherRes.rows.length === 0) return res.status(404).json({ error: "Teacher not found" });
    const teacher = teacherRes.rows[0];

    if (!teacher.is_class_teacher) return res.status(403).json({ error: "Access denied. Only class teachers can view history." });

    const classRes = await db.query('SELECT grade, section FROM classes WHERE class_teacher_id = $1', [teacher.id]);
    if (classRes.rows.length === 0) return res.status(404).json({ error: "No managed class found for this teacher." });
    const { grade, section } = classRes.rows[0];

    // 2. Fetch history grouped by date
    // We only show current academic year (from Jan 1st)
    const currentYear = new Date().getFullYear();
    const startDate = `${currentYear}-01-01`;

    const historyRes = await db.query(
      `SELECT 
        TO_CHAR(sa.date, 'YYYY-MM-DD') as date, 
        COUNT(CASE WHEN sa.status = 'Present' THEN 1 END) as present_count,
        COUNT(CASE WHEN sa.status = 'Absent' THEN 1 END) as absent_count
       FROM student_attendance sa
       JOIN students s ON sa.student_id = s.id
       WHERE s.grade_level = $1 AND s.section = $2 AND sa.date >= $3
       GROUP BY sa.date
       ORDER BY sa.date DESC`,
      [grade, section, startDate]
    );

    res.json(historyRes.rows);
  } catch (error) {
    console.error("Fetch Attendance History Error:", error.message);
    res.status(500).json({ error: "Failed to fetch attendance history." });
  }
};

exports.getAttendanceMonthlyReport = async (req, res) => {
  try {
    const { email, year, month } = req.params;
    const cleanEmail = email.toLowerCase().trim();

    // 1. Get teacher info and their class
    const teacherRes = await db.query('SELECT id FROM teachers WHERE email = $1', [cleanEmail]);
    if (teacherRes.rows.length === 0) return res.status(404).json({ error: "Teacher not found" });
    const teacherId = teacherRes.rows[0].id;

    const classRes = await db.query('SELECT grade, section FROM classes WHERE class_teacher_id = $1', [teacherId]);
    if (classRes.rows.length === 0) return res.status(404).json({ error: "No managed class found." });
    const { grade, section } = classRes.rows[0];

    // 2. Get all students in the class
    const studentsRes = await db.query(
      'SELECT id, first_name, last_name, index_number FROM students WHERE grade_level = $1 AND section = $2 ORDER BY first_name ASC',
      [grade, section]
    );
    const students = studentsRes.rows;

    // 3. Get all attendance records for the class in that month
    const startDate = `${year}-${month.padStart(2, '0')}-01`;
    const endD = new Date(parseInt(year), parseInt(month), 0);
    const endDate = endD.getFullYear() + '-' + String(endD.getMonth() + 1).padStart(2, '0') + '-' + String(endD.getDate()).padStart(2, '0');

    const attendanceRes = await db.query(
      `SELECT sa.student_id, TO_CHAR(sa.date, 'YYYY-MM-DD') as date, sa.status
       FROM student_attendance sa
       JOIN students s ON sa.student_id = s.id
       WHERE s.grade_level = $1 AND s.section = $2 
       AND sa.date >= $3 AND sa.date <= $4`,
      [grade, section, startDate, endDate]
    );

    // 4. Format into a matrix
    const attendanceMap = {};
    attendanceRes.rows.forEach(row => {
      const dateStr = row.date;
      if (!attendanceMap[row.student_id]) attendanceMap[row.student_id] = {};
      attendanceMap[row.student_id][dateStr] = row.status;
    });

    res.json({
      students,
      attendanceMap,
      startDate,
      endDate
    });
  } catch (error) {
    console.error("Fetch Monthly Report Error:", error.message);
    res.status(500).json({ error: "Failed to fetch monthly report." });
  }
};

exports.getClassStudents = async (req, res) => {
  try {
    const { email } = req.params;
    const cleanEmail = email.toLowerCase().trim();

    // 1. Get teacher info
    const teacherRes = await db.query('SELECT id, is_class_teacher FROM teachers WHERE email = $1', [cleanEmail]);
    if (teacherRes.rows.length === 0) return res.status(404).json({ error: "Teacher not found" });
    const teacher = teacherRes.rows[0];

    if (!teacher.is_class_teacher) return res.status(403).json({ error: "Access denied. Only class teachers can access this." });

    // 2. Get managed class
    const classRes = await db.query('SELECT grade, section FROM classes WHERE class_teacher_id = $1', [teacher.id]);
    if (classRes.rows.length === 0) return res.json([]); // No class assigned yet

    const { grade, section } = classRes.rows[0];

    // 3. Get students in that class
    const studentsRes = await db.query(
      'SELECT id, first_name, last_name, index_number, profile_photo_url FROM students WHERE grade_level = $1 AND section = $2 ORDER BY first_name ASC',
      [grade, section]
    );

    // 4. Get existing attendance for today
    const dNow = new Date();
    const today = dNow.getFullYear() + '-' + String(dNow.getMonth() + 1).padStart(2, '0') + '-' + String(dNow.getDate()).padStart(2, '0');
    const attendanceRes = await db.query(
      `SELECT student_id, status FROM student_attendance WHERE date = $1 AND student_id IN (
        SELECT id FROM students WHERE grade_level = $2 AND section = $3
      )`,
      [today, grade, section]
    );

    const existingAttendance = {};
    attendanceRes.rows.forEach(row => {
      existingAttendance[row.student_id] = row.status;
    });

    res.json({
      students: studentsRes.rows,
      existingAttendance
    });
  } catch (error) {
    console.error("Fetch Class Students Error:", error.message);
    res.status(500).json({ error: "Server error fetching class students." });
  }
};

exports.markAttendance = async (req, res) => {
  try {
    const { date, attendanceData } = req.body;

    if (!date || !attendanceData || !Array.isArray(attendanceData)) {
      return res.status(400).json({ error: "Invalid attendance data." });
    }

    // Use a transaction for safety
    await db.query('BEGIN');

    for (const item of attendanceData) {
      const { studentId, status } = item;
      
      // Get school_id for the student
      const studentRes = await db.query('SELECT school_id FROM students WHERE id = $1', [studentId]);
      if (studentRes.rows.length > 0) {
        const schoolId = studentRes.rows[0].school_id;
        
        await db.query(
          `INSERT INTO student_attendance (school_id, student_id, date, status)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (student_id, date) DO UPDATE SET status = EXCLUDED.status, marked_at = CURRENT_TIMESTAMP`,
          [schoolId, studentId, date, status]
        );
      }
    }

    await db.query('COMMIT');
    res.json({ message: "Attendance updated successfully!" });
  } catch (error) {
    await db.query('ROLLBACK');
    console.error("Attendance Submit Error:", error.message);
    res.status(500).json({ error: "Failed to submit attendance." });
  }
};

exports.getAssignments = async (req, res) => {
  try {
    const { email } = req.params;
    const cleanEmail = email.toLowerCase().trim();
    const teacherRes = await db.query('SELECT id, school_id, subject FROM teachers WHERE email = $1', [cleanEmail]);
    if (teacherRes.rows.length === 0) return res.status(404).json({ error: "Teacher not found" });
    const teacher = teacherRes.rows[0];
    const teacherId = teacher.id;
    const teacherSubject = teacher.subject;

    // 1. Get assignments from timetable (classes where this teacher has lessons)
    const timetableRes = await db.query(
      `SELECT DISTINCT c.grade, c.section
       FROM class_timetables ct
       JOIN classes c ON ct.class_id = c.id
       WHERE ct.teacher_id = $1`,
       [teacherId]
    );

    const timetableAssignments = timetableRes.rows.map(row => ({
      grade: row.grade,
      section: row.section,
      subject: teacherSubject
    }));

    // 2. Get from managed class (if they are a class teacher)
    const managedClassRes = await db.query(
      `SELECT grade, section 
       FROM classes 
       WHERE class_teacher_id = $1`,
       [teacherId]
    );

    const managedClassAssignments = managedClassRes.rows.map(row => ({
      grade: row.grade,
      section: row.section,
      subject: teacherSubject
    }));

    // Combine results and ensure uniqueness
    const combined = [...timetableAssignments, ...managedClassAssignments];
    const uniqueAssignments = Array.from(new Set(combined.map(a => JSON.stringify({
      grade: a.grade,
      section: a.section,
      subject: a.subject
    })))).map(s => JSON.parse(s));

    res.json(uniqueAssignments);
  } catch (error) {
    console.error("Fetch Assignments Error:", error);
    res.status(500).json({ error: "Server error fetching assignments." });
  }
};

exports.getClassMarks = async (req, res) => {
  try {
    const { grade, section, subject, term } = req.query;
    
    // 1. Fetch students in that class
    const studentsRes = await db.query(
      `SELECT id, first_name, last_name, index_number, profile_photo_url, subjects
       FROM students 
       WHERE grade_level = $1 AND section = $2 
       ORDER BY first_name ASC`,
      [grade, section]
    );

    // Filter students so that we only keep those enrolled in the selected subject
    const filteredStudents = studentsRes.rows.filter(student => {
      const studentSubjects = student.subjects || [];
      if (studentSubjects.length === 0) return true; // fallback if subjects array is empty/null, assume they study all subjects
      return studentSubjects.some(subName => matchesSubject(subName, subject));
    });

    // 2. Fetch existing marks for these students for the given subject and term
    const existingMarksRes = await db.query(
      `SELECT student_id, marks, grade, remarks 
       FROM student_grades 
       WHERE subject_name = $1 AND assessment_type = $2 AND student_id IN (
         SELECT index_number FROM students WHERE grade_level = $3 AND section = $4
       )`,
       [subject, term, grade, section]
    );

    const marksMap = {};
    existingMarksRes.rows.forEach(row => {
      marksMap[row.student_id] = { marks: row.marks, grade: row.grade, remarks: row.remarks };
    });

    res.json({
      students: filteredStudents,
      marks: marksMap
    });

  } catch (error) {
    console.error("Fetch Class Marks Error:", error);
    res.status(500).json({ error: "Server error fetching class marks." });
  }
};

exports.saveClassMarks = async (req, res) => {
  try {
    const { subject, term, marksData } = req.body;
    
    if (!subject || !term || !marksData || !Array.isArray(marksData)) {
      return res.status(400).json({ error: "Invalid marks data." });
    }

    await db.query('BEGIN');

    for (const item of marksData) {
      const { studentId, indexNumber, marks, grade, remarks } = item;
      
      // Get school_id
      const studentRes = await db.query('SELECT school_id FROM students WHERE index_number = $1', [indexNumber]);
      if (studentRes.rows.length > 0) {
        const schoolId = studentRes.rows[0].school_id;
        
        const existing = await db.query(
          'SELECT id FROM student_grades WHERE student_id = $1 AND subject_name = $2 AND assessment_type = $3',
          [indexNumber, subject, term]
        );
        
        if (existing.rows.length > 0) {
          await db.query(
            'UPDATE student_grades SET marks = $1, grade = $2, remarks = $3 WHERE id = $4',
            [marks, grade, remarks, existing.rows[0].id]
          );
        } else {
          await db.query(
            'INSERT INTO student_grades (school_id, student_id, subject_name, assessment_type, marks, grade, remarks) VALUES ($1, $2, $3, $4, $5, $6, $7)',
            [schoolId, indexNumber, subject, term, marks, grade, remarks]
          );
        }
      }
    }

    await db.query('COMMIT');
    res.json({ message: "Marks updated successfully!" });
  } catch (error) {
    await db.query('ROLLBACK');
    console.error("Submit Marks Error:", error);
    res.status(500).json({ error: "Failed to submit marks." });
  }
};

