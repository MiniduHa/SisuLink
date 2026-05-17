const db = require('../config/db');
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

const getOrdinal = (n) => {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return (s[(v - 20) % 10] || s[v] || s[0]);
};

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
    'combined mathematics': ['mathematics', 'combined mathematics', 'combined maths'],
    'physics': ['physics']
  };
  
  if (aliases[s1] && aliases[s1].includes(s2)) return true;
  if (aliases[s2] && aliases[s2].includes(s1)) return true;
  return false;
};


exports.getProfile = async (req, res) => {
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
};

exports.updateProfile = async (req, res) => {
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
};

exports.uploadAvatar = async (req, res) => {
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
};

exports.removeAvatar = async (req, res) => {
  try {
    const { email } = req.body;
    const cleanEmail = email.toLowerCase().trim();
    await db.query('UPDATE parents SET profile_photo_url = NULL WHERE email = $1', [cleanEmail]);
    res.json({ message: "Photo removed successfully" });
  } catch (error) {
    console.error("Error removing parent avatar:", error);
    res.status(500).json({ error: "Server error removing parent photo." });
  }
};

exports.getParent = async (req, res) => {
  try {
    const { email } = req.params;
    const result = await db.query('SELECT full_name, email, phone_number, child_student_ids, profile_photo_url FROM parents WHERE email = $1', [email.toLowerCase().trim()]);
    if (result.rows.length === 0) return res.status(404).json({ error: "Parent not found" });
    res.json({ user: result.rows[0] });
  } catch (error) { res.status(500).json({ error: "Server error fetching parent profile." }); }
};

exports.updateParent = async (req, res) => {
  try {
    const { email, full_name, phone_number, child_student_ids, profile_photo_url } = req.body;
    const result = await db.query(
      `UPDATE parents SET full_name = $1, phone_number = $2, child_student_ids = $3, profile_photo_url = $4 WHERE email = $5 RETURNING *`,
      [full_name, phone_number, child_student_ids, profile_photo_url, email.toLowerCase().trim()]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: "Parent not found" });
    res.json({ message: "Profile updated successfully", user: result.rows[0] });
  } catch (error) { res.status(500).json({ error: "Server error updating parent profile." }); }
};

exports.getDashboard = async (req, res) => {
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

    // 2. Fetch children details with academic summaries
    let children = [];
    let parentSchoolId = parent.school_id;

    if (parent.child_student_ids && parent.child_student_ids.length > 0) {
      const childrenRes = await db.query(
        'SELECT id, first_name, last_name, index_number, grade_level, section, school_id FROM students WHERE index_number = ANY($1)',
        [parent.child_student_ids]
      );

      if (childrenRes.rows.length > 0 && !parentSchoolId) {
        parentSchoolId = childrenRes.rows[0].school_id;
      }
      
      for (let child of childrenRes.rows) {
        // Fetch academic summary for each child
        const latestTermRes = await db.query(
          'SELECT assessment_type FROM student_grades WHERE student_id = $1 ORDER BY created_at DESC LIMIT 1',
          [child.index_number]
        );
        const term = latestTermRes.rows.length > 0 ? latestTermRes.rows[0].assessment_type : "Term 1";

        const gradesRes = await db.query(
          `SELECT subject_name as name, marks, grade, remarks
           FROM student_grades
           WHERE student_id = $1 AND assessment_type = $2`,
           [child.index_number, term]
        );

        let totalMarks = 0;
        const subjects = gradesRes.rows.map(g => {
          totalMarks += parseFloat(g.marks) || 0;
          return {
            name: g.name,
            marks: g.marks,
            grade: g.grade,
            remarks: g.remarks || "-"
          };
        });

        const avgGrade = subjects.length > 0 ? (totalMarks / subjects.length).toFixed(1) : "0.0";

        // Attendance
        const attRes = await db.query(
          'SELECT COUNT(*) as total, SUM(CASE WHEN status = \'Present\' THEN 1 ELSE 0 END) as present FROM student_attendance WHERE student_id = $1',
          [child.id]
        );
        const attendance = attRes.rows[0].total > 0 ? Math.round((attRes.rows[0].present / attRes.rows[0].total) * 100) + "%" : "0%";

        // Rank
        const ranksRes = await db.query(
          `SELECT student_id, SUM(marks) as total_marks
           FROM student_grades sg
           JOIN students s ON sg.student_id = s.index_number
           WHERE s.grade_level = $1 AND s.section = $2 AND sg.assessment_type = $3 AND s.school_id = $4
           GROUP BY student_id
           ORDER BY total_marks DESC`,
           [child.grade_level, child.section, term, child.school_id]
        );
        const studentRankIndex = ranksRes.rows.findIndex(r => r.student_id === child.index_number);
        const rank = studentRankIndex !== -1 ? (studentRankIndex + 1) + getOrdinal(studentRankIndex + 1) : "N/A";

        children.push({
          name: `${child.first_name} ${child.last_name}`,
          studentId: child.index_number,
          class: `${child.grade_level} - ${child.section}`,
          academics: {
            term,
            attendance,
            avgGrade,
            rank,
            subjects: subjects.slice(0, 3) // Show first 3 for summary
          }
        });
      }
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
        [parentSchoolId]
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
        [parentSchoolId]
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
};

exports.getAcademicProfile = async (req, res) => {
  try {
    const { studentId } = req.params;

    // 1. Fetch Student Details
    const studentRes = await db.query(
      'SELECT id, first_name, last_name, index_number, grade_level, section, profile_photo_url, school_id, subjects FROM students WHERE index_number = $1',
      [studentId]
    );
    if (studentRes.rows.length === 0) return res.status(404).json({ error: "Student not found" });
    const student = studentRes.rows[0];
    const internalId = student.id;
    const schoolId = student.school_id;

    // 2. Attendance Stats
    const attRes = await db.query(
      'SELECT date, status FROM student_attendance WHERE student_id = $1 ORDER BY date DESC',
      [internalId]
    );
    const presentCount = attRes.rows.filter(r => r.status === 'Present').length;
    const totalCount = attRes.rows.length;
    const attendancePercentage = totalCount > 0 ? Math.round((presentCount / totalCount) * 100) : 0;
    
    // Format absent dates for calendar
    const absentDates = attRes.rows
      .filter(r => r.status === 'Absent')
      .map(r => {
        const d = new Date(r.date);
        return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
      });

    const presentDates = attRes.rows
      .filter(r => r.status === 'Present')
      .map(r => {
        const d = new Date(r.date);
        return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
      });

    // Get class teacher ID for this class
    const classRes = await db.query(
      'SELECT class_teacher_id FROM classes WHERE grade = $1 AND section = $2 AND school_id = $3',
      [student.grade_level, student.section, schoolId]
    );
    const classTeacherId = classRes.rows.length > 0 ? classRes.rows[0].class_teacher_id : null;

    // 3. Teachers & Contacts
    const teachersRes = await db.query(
      `SELECT DISTINCT t.full_name as name, t.email, t.phone_number as phone, t.subject as role, t.is_class_teacher, t.id
       FROM teachers t
       JOIN classes c ON t.school_id = c.school_id
       WHERE c.grade = $1 AND c.section = $2 AND c.school_id = $3
       AND (t.is_class_teacher = true OR EXISTS (
         SELECT 1 FROM class_timetables ct WHERE ct.teacher_id = t.id AND ct.class_id = c.id
       ))`,
       [student.grade_level, student.section, schoolId]
    );

    // Filter teachers so that we only keep the designated Class Teacher and subject teachers teaching the child's subjects
    const studentSubjects = student.subjects || [];
    const filteredTeachers = teachersRes.rows.filter(teacher => {
      // 1. Keep the class teacher of this class
      if (classTeacherId && teacher.id === classTeacherId) {
        return true;
      }
      // 2. Keep subject teachers whose subject matches one of the student's subjects
      return studentSubjects.some(subName => matchesSubject(subName, teacher.role));
    });

    // 4. Timetable
    const timetableRes = await db.query(
      `SELECT ct.day_of_week as day, ct.time_slot as time, ct.subject, t.full_name as teacher
       FROM class_timetables ct
       JOIN classes c ON ct.class_id = c.id
       LEFT JOIN teachers t ON ct.teacher_id = t.id
       WHERE c.grade = $1 AND c.section = $2 AND c.school_id = $3
       ORDER BY ct.time_slot ASC`,
       [student.grade_level, student.section, schoolId]
    );
    
    const timetable = {
      "Mon": [], "Tue": [], "Wed": [], "Thu": [], "Fri": []
    };
    timetableRes.rows.forEach(row => {
      const dayShort = row.day.substring(0, 3);
      if (timetable[dayShort]) {
        timetable[dayShort].push({
          time: row.time,
          subject: row.subject,
          teacher: row.teacher || "TBD"
        });
      }
    });

    // 5. Grades & Class Average
    const latestTermRes = await db.query(
      'SELECT assessment_type FROM student_grades WHERE student_id = $1 ORDER BY created_at DESC LIMIT 1',
      [studentId]
    );
    const term = latestTermRes.rows.length > 0 ? latestTermRes.rows[0].assessment_type : "Current Term";

    const gradesRes = await db.query(
      `SELECT subject_name as name, marks, grade, remarks
       FROM student_grades
       WHERE student_id = $1 AND assessment_type = $2`,
       [studentId, term]
    );

    const subjectsWithAvg = [];
    for (let g of gradesRes.rows) {
      const avgRes = await db.query(
        'SELECT ROUND(AVG(marks), 1) as average FROM student_grades WHERE subject_name = $1 AND assessment_type = $2 AND school_id = $3',
        [g.name, term, schoolId]
      );
      subjectsWithAvg.push({
        name: g.name,
        marks: parseFloat(g.marks),
        grade: g.grade,
        remarks: g.remarks || "-",
        average: parseFloat(avgRes.rows[0].average) || 0
      });
    }

    // 6. Rank calculation
    const ranksRes = await db.query(
      `SELECT student_id, SUM(marks) as total_marks
       FROM student_grades sg
       JOIN students s ON sg.student_id = s.index_number
       WHERE s.grade_level = $1 AND s.section = $2 AND sg.assessment_type = $3 AND s.school_id = $4
       GROUP BY student_id
       ORDER BY total_marks DESC`,
       [student.grade_level, student.section, term, schoolId]
    );
    
    let rank = "N/A";
    const totalStudentsInClass = ranksRes.rows.length;
    const studentRankIndex = ranksRes.rows.findIndex(r => r.student_id === studentId);
    if (studentRankIndex !== -1) {
      rank = `${studentRankIndex + 1}${getOrdinal(studentRankIndex + 1)} out of ${totalStudentsInClass}`;
    }

    res.json({
      student: {
        name: `${student.first_name} ${student.last_name}`,
        studentId: student.index_number,
        grade: `${student.grade_level} - ${student.section}`,
        avatarUrl: student.profile_photo_url,
      },
      academics: {
        attendance: attendancePercentage,
        absentDates,
        presentDates,
        rank,
        term,
        subjects: subjectsWithAvg,
        behavior: gradesRes.rows.length > 0 ? gradesRes.rows[0].remarks : "Excellent conduct. Very active in class discussions."
      },
      teachers: filteredTeachers,
      timetable
    });
  } catch (error) {
    console.error("Academic Profile Error:", error);
    res.status(500).json({ error: "Server error fetching academic profile." });
  }
};

exports.getContacts = async (req, res) => {
  try {
    const { email } = req.params;
    const cleanEmail = email.toLowerCase().trim();

    // 1. Get the parent and their children's student IDs
    const parentRes = await db.query('SELECT child_student_ids FROM parents WHERE email = $1', [cleanEmail]);
    if (parentRes.rows.length === 0) return res.status(404).json({ error: "Parent not found" });

    const studentIds = parentRes.rows[0].child_student_ids;
    if (!studentIds || studentIds.length === 0) return res.json([]);

    // 2. Get teachers assigned to those students' classes (Subject teachers & Class teachers)
    const result = await db.query(
      `SELECT DISTINCT id, name, email, role, type FROM (
         -- Subject teachers from timetable matching enrolled subjects
         SELECT t.id, t.full_name as name, t.email, t.subject as role, 'teacher' as type
         FROM teachers t
         INNER JOIN class_timetables ct ON t.id = ct.teacher_id
         INNER JOIN classes c ON ct.class_id = c.id
         INNER JOIN students s ON s.grade_level = c.grade AND s.section = c.section AND s.school_id = c.school_id
         WHERE s.index_number = ANY($1) AND (s.subjects ? ct.subject)
         
         UNION
         
         -- Class teachers
         SELECT t.id, t.full_name as name, t.email, 'Class Teacher' as role, 'teacher' as type
         FROM teachers t
         INNER JOIN classes c ON t.id = c.class_teacher_id
         INNER JOIN students s ON s.grade_level = c.grade AND s.section = c.section AND s.school_id = c.school_id
         WHERE s.index_number = ANY($1)
       ) as all_teachers`,
      [studentIds]
    );

    res.json(result.rows);
  } catch (error) {
    console.error("Fetch Parent Contacts Error:", error);
    res.status(500).json({ error: "Failed to fetch contacts." });
  }
};

