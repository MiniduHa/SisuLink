const db = require('../config/db');

const getOrdinal = (n) => {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return (s[(v - 20) % 10] || s[v] || s[0]);
};

const matchesSubject = (subA, subB) => {
  if (!subA || !subB) return false;
  const a = subA.toLowerCase().trim();
  const b = subB.toLowerCase().trim();
  if (a === b) return true;
  const aliases = [
    ['ict', 'information technology'],
    ['general english', 'english'],
    ['combined mathematics', 'mathematics'],
    ['combined maths', 'mathematics'],
    ['git', 'information technology']
  ];
  for (const pair of aliases) {
    if (pair.includes(a) && pair.includes(b)) return true;
  }
  return a.includes(b) || b.includes(a);
};


exports.getJobs = async (req, res) => {
  try {
    const result = await db.query(`
      SELECT i.*, p.logo_url, p.industry_type 
      FROM internships i
      LEFT JOIN industry_partners p ON i.industry_id = p.id
      WHERE i.status = 'Active' 
      ORDER BY i.created_at DESC
    `);
    res.json(result.rows);
  } catch (error) { res.status(500).json({ error: "Failed to fetch jobs." }); }
};

exports.applyJob = async (req, res) => {
  try {
    const { job_id, student_id, student_name, student_email, cv_url } = req.body;
    const result = await db.query(
      `INSERT INTO job_applications (job_id, student_id, student_name, student_email, cv_url) 
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [job_id, student_id, student_name, student_email, cv_url]
    );
    res.status(201).json({ message: "Application submitted successfully!", application: result.rows[0] });
  } catch (error) {
    console.error("Apply Error:", error);
    res.status(500).json({ error: "Failed to submit application." });
  }
};

exports.getDashboard = async (req, res) => {
  try {
    const { studentId } = req.params;
    const studentRes = await db.query('SELECT school_id, grade_level, section, subjects FROM students WHERE index_number = $1', [studentId]);
    if (studentRes.rows.length === 0) return res.status(404).json({ error: "Student not found" });

    const student = studentRes.rows[0];
    const { school_id: schoolId, grade_level: gradeLevel, section, subjects: enrolledSubjectsData } = student;

    // Check grade for industry visibility
    const gradeMatch = gradeLevel.match(/\d+/);
    const gradeNum = gradeMatch ? parseInt(gradeMatch[0], 10) : 0;
    const isIndustryVisible = gradeNum >= 10;

    // Parse subjects from student record (stored as JSON array)
    let enrolledSubjects = [];
    try {
      if (enrolledSubjectsData) {
        enrolledSubjects = typeof enrolledSubjectsData === 'string' ? JSON.parse(enrolledSubjectsData) : enrolledSubjectsData;
      }
    } catch (e) {
      console.error("Error parsing student subjects:", e);
    }

    // 1. Get all timetable slots for this student's classroom
    const timetablesRes = await db.query(
      `SELECT DISTINCT ct.subject, t.full_name 
       FROM class_timetables ct 
       JOIN teachers t ON ct.teacher_id = t.id 
       JOIN classes c ON ct.class_id = c.id 
       WHERE c.grade = $1 AND c.section = $2`,
      [gradeLevel, section]
    );

    // 2. Get all teachers for global subject-based mapping fallback
    const teachersRes = await db.query('SELECT full_name, subject FROM teachers');

    // 3. Get all subject details for the student's grade (for styles/icons)
    const subjectsRes = await db.query('SELECT * FROM subjects WHERE grade_level = $1', [gradeLevel]);
    const subjectDetailsMap = {};
    subjectsRes.rows.forEach(sub => {
      subjectDetailsMap[sub.name] = sub;
    });

    // Create ongoing subjects list based on student's enrollment
    const ongoingSubjects = enrolledSubjects.map((subjectName, index) => {
      const detail = subjectDetailsMap[subjectName];
      
      // Resolve teacher name
      let teacherName = "Subject Teacher";
      const timetableMatch = timetablesRes.rows.find(row => matchesSubject(row.subject, subjectName));
      if (timetableMatch) {
        teacherName = timetableMatch.full_name;
      } else {
        if (detail && detail.teacher_name) {
          teacherName = detail.teacher_name;
        } else {
          const teacherMatch = teachersRes.rows.find(t => matchesSubject(t.subject, subjectName));
          if (teacherMatch) {
            teacherName = teacherMatch.full_name;
          }
        }
      }

      return {
        id: detail ? detail.id.toString() : `enrolled-${index}`,
        name: subjectName,
        teacher: teacherName,
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

    // 5. Recommended Internships (only for Grade 10-13)
    let internshipsData = [];
    if (isIndustryVisible) {
      const internshipsRes = await db.query("SELECT * FROM internships WHERE status = 'Active' ORDER BY created_at DESC LIMIT 5");
      internshipsData = internshipsRes.rows.map(job => ({
        id: job.id.toString(),
        title: job.title,
        company: `${job.company_name} • ${job.location}`,
        type: job.employment_type,
        bg: job.bg_color || "#F1F5F9"
      }));
    }

    // Fetch Real Attendance Stats
    let attendanceStats = {
      percentage: "0%",
      status: "No Data",
      message: "Attendance tracking has not started.",
      present: 0,
      absent: 0
    };

    try {
      const studentInternalRes = await db.query('SELECT id FROM students WHERE index_number = $1', [studentId]);
      if (studentInternalRes.rows.length > 0) {
        const internalId = studentInternalRes.rows[0].id;
        const attRes = await db.query(
          `SELECT status, COUNT(*) as count 
           FROM student_attendance 
           WHERE student_id = $1 
           GROUP BY status`, 
          [internalId]
        );
        
        let presentCount = 0;
        let absentCount = 0;
        attRes.rows.forEach(row => {
          if (row.status === 'Present') presentCount = parseInt(row.count, 10);
          if (row.status === 'Absent') absentCount = parseInt(row.count, 10);
        });
        
        const totalCount = presentCount + absentCount;
        if (totalCount > 0) {
          const percentage = Math.round((presentCount / totalCount) * 100);
          attendanceStats.percentage = `${percentage}%`;
          attendanceStats.present = presentCount;
          attendanceStats.absent = absentCount;
          
          if (percentage >= 80) {
            attendanceStats.status = "Excellent";
            attendanceStats.message = "Great consistency this term.";
          } else if (percentage >= 60) {
            attendanceStats.status = "Average";
            attendanceStats.message = "Try to attend more regularly.";
          } else {
            attendanceStats.status = "Low";
            attendanceStats.message = "Your attendance needs improvement.";
          }
        }
      }
    } catch (err) {
      console.error("Error fetching student attendance stats:", err);
    }

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

    // Fetch Industry Announcements (only for Grade 10-13)
    let industryAnnouncements = [];
    if (isIndustryVisible) {
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
};

exports.getAttendanceHistory = async (req, res) => {
  try {
    const { studentId } = req.params;
    
    // First get the internal UUID
    const studentRes = await db.query('SELECT id FROM students WHERE index_number = $1', [studentId]);
    if (studentRes.rows.length === 0) return res.status(404).json({ error: "Student not found" });
    const internalId = studentRes.rows[0].id;

    // Fetch attendance records for the last 30 days
    const result = await db.query(
      `SELECT TO_CHAR(date, 'YYYY-MM-DD') as date, status 
       FROM student_attendance 
       WHERE student_id = $1 
       AND date >= CURRENT_DATE - INTERVAL '30 days'
       ORDER BY date DESC`,
      [internalId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error("Attendance History Fetch Error:", error.message);
    res.status(500).json({ error: "Server error fetching attendance history." });
  }
};

exports.getAcademicReport = async (req, res) => {
  try {
    const { studentId } = req.params;
    const requestedTerm = req.query.term;

    // 1. Fetch Student Details & Enrolled Subjects
    const studentRes = await db.query(
      'SELECT first_name, last_name, index_number, grade_level, section, school_id, subjects FROM students WHERE index_number = $1',
      [studentId]
    );
    if (studentRes.rows.length === 0) return res.status(404).json({ error: "Student not found" });
    const { first_name, last_name, index_number, grade_level, section, school_id: schoolId, subjects: enrolledSubjectsData } = studentRes.rows[0];
    const studentFullName = `${first_name} ${last_name}`;

    let enrolledSubjects = [];
    try {
      if (enrolledSubjectsData) {
        enrolledSubjects = typeof enrolledSubjectsData === 'string' ? JSON.parse(enrolledSubjectsData) : enrolledSubjectsData;
      }
    } catch (e) {
      console.error("Error parsing student subjects:", e);
    }

    // 2. Determine Term
    let term = requestedTerm;
    if (!term || term === 'null') {
      const latestTermRes = await db.query(
        'SELECT assessment_type FROM student_grades WHERE student_id = $1 ORDER BY created_at DESC LIMIT 1',
        [studentId]
      );
      if (latestTermRes.rows.length === 0) {
        term = "Term 1"; // Default if no grades exist
      } else {
        term = latestTermRes.rows[0].assessment_type;
      }
    }

    // 3. Fetch Student's Grades for this term
    const gradesRes = await db.query(
      `SELECT subject_name as name, marks, grade, remarks
       FROM student_grades
       WHERE student_id = $1 AND assessment_type = $2`,
       [studentId, term]
    );

    let totalMarks = 0;
    let subjectsWithMarksCount = 0;
    const finalSubjects = [];

    // 4. Map enrolled subjects to grades
    for (let subjName of enrolledSubjects) {
      const gradeRecord = gradesRes.rows.find(g => matchesSubject(g.name, subjName));
      
      let marksVal = "-";
      let grade = "-";
      let remarks = "-";
      
      if (gradeRecord) {
        const parsedMarks = parseFloat(gradeRecord.marks) || 0;
        marksVal = parsedMarks;
        grade = gradeRecord.grade;
        remarks = gradeRecord.remarks || "No remarks";
        totalMarks += parsedMarks;
        subjectsWithMarksCount++;
      }

      // Calculate class average supporting cross-aliases seamlessly
      const avgRes = await db.query(
        `SELECT ROUND(AVG(marks), 1) as average 
         FROM student_grades 
         WHERE assessment_type = $2 AND school_id = $3 
         AND (
           LOWER(subject_name) = LOWER($1) OR
           (LOWER($1) IN ('ict', 'git', 'information technology') AND LOWER(subject_name) IN ('ict', 'git', 'information technology')) OR
           (LOWER($1) IN ('english', 'general english') AND LOWER(subject_name) IN ('english', 'general english')) OR
           (LOWER($1) IN ('mathematics', 'combined mathematics', 'combined maths', 'maths') AND LOWER(subject_name) IN ('mathematics', 'combined mathematics', 'combined maths', 'maths'))
         )`,
        [subjName, term, schoolId]
      );

      finalSubjects.push({
        subject: subjName,
        marks: marksVal,
        grade: grade,
        remarks: remarks,
        classAverage: parseFloat(avgRes.rows[0].average) || 0
      });
    }

    // If no enrolled subjects, just return what grades we found (fallback)
    if (enrolledSubjects.length === 0) {
      for (let g of gradesRes.rows) {
        const marksVal = parseFloat(g.marks) || 0;
        totalMarks += marksVal;
        subjectsWithMarksCount++;
        
        // Calculate class average supporting cross-aliases seamlessly
        const avgRes = await db.query(
          `SELECT ROUND(AVG(marks), 1) as average 
           FROM student_grades 
           WHERE assessment_type = $2 AND school_id = $3 
           AND (
             LOWER(subject_name) = LOWER($1) OR
             (LOWER($1) IN ('ict', 'git', 'information technology') AND LOWER(subject_name) IN ('ict', 'git', 'information technology')) OR
             (LOWER($1) IN ('english', 'general english') AND LOWER(subject_name) IN ('english', 'general english')) OR
             (LOWER($1) IN ('mathematics', 'combined mathematics', 'combined maths', 'maths') AND LOWER(subject_name) IN ('mathematics', 'combined mathematics', 'combined maths', 'maths'))
           )`,
          [g.name, term, schoolId]
        );
        
        finalSubjects.push({
          subject: g.name,
          marks: marksVal,
          grade: g.grade,
          remarks: g.remarks || "No remarks",
          classAverage: parseFloat(avgRes.rows[0].average) || 0
        });
      }
    }

    const studentAverage = subjectsWithMarksCount > 0 ? (totalMarks / subjectsWithMarksCount).toFixed(1) : "0.0";

    // 5. Calculate Class Average (Overall average of all students in the class for this term)
    const classOverallAvgRes = await db.query(
      `SELECT ROUND(AVG(marks), 1) as average 
       FROM student_grades sg
       JOIN students s ON sg.student_id = s.index_number
       WHERE s.grade_level = $1 AND s.section = $2 AND sg.assessment_type = $3 AND s.school_id = $4`,
       [grade_level, section, term, schoolId]
    );
    const classAverage = parseFloat(classOverallAvgRes.rows[0].average) || 0;

    // 6. Rank calculation
    const ranksRes = await db.query(
      `SELECT student_id, SUM(marks) as total_marks
       FROM student_grades sg
       JOIN students s ON sg.student_id = s.index_number
       WHERE s.grade_level = $1 AND s.section = $2 AND sg.assessment_type = $3 AND s.school_id = $4
       GROUP BY student_id
       ORDER BY total_marks DESC`,
       [grade_level, section, term, schoolId]
    );
    
    let rank = "N/A";
    const totalStudentsInClass = ranksRes.rows.length;
    const studentRankIndex = ranksRes.rows.findIndex(r => r.student_id === studentId);
    if (studentRankIndex !== -1) {
      const rankNum = studentRankIndex + 1;
      const ordinal = getOrdinal(rankNum);
      rank = `${rankNum}${ordinal} of ${totalStudentsInClass}`;
    }

    res.json({
      studentName: studentFullName,
      studentGrade: grade_level,
      studentIndex: index_number,
      subjects: finalSubjects,
      studentAverage,
      classAverage,
      classRank: rank,
      term
    });
  } catch (error) {
    console.error("Academic Report API Error:", error);
    res.status(500).json({ error: "Failed to fetch academic report." });
  }
};

exports.getProfileByEmail = async (req, res) => {
  try {
    const { email } = req.params;
    const cleanEmail = email.toLowerCase().trim();

    const studentRes = await db.query('SELECT * FROM students WHERE email = $1', [cleanEmail]);
    if (studentRes.rows.length === 0) return res.status(404).json({ error: "Student not found" });
    const student = studentRes.rows[0];
    const studentId = student.index_number;

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
    console.error("Fetch Profile by Email Error:", error);
    res.status(500).json({ error: "Server error fetching profile by email." });
  }
};

exports.getMaterials = async (req, res) => {
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
      (studentSubjects && studentSubjects.some(subName => matchesSubject(subName, mat.subject))) ||
      !studentSubjects || studentSubjects.length === 0
    );

    res.json(relevantMaterials);
  } catch (error) {
    console.error("Student Materials Error:", error);
    res.status(500).json({ error: "Failed to fetch materials." });
  }
};

exports.getContacts = async (req, res) => {
  try {
    const { email } = req.params;
    const cleanEmail = email.toLowerCase().trim();

    // 1. Get the student's class
    const studentRes = await db.query('SELECT grade_level, section FROM students WHERE email = $1', [cleanEmail]);
    if (studentRes.rows.length === 0) return res.status(404).json({ error: "Student not found" });
    const { grade_level, section } = studentRes.rows[0];

    // 2. Get teachers matching child's enrolled subjects + class teacher
    const result = await db.query(
      `SELECT DISTINCT t.full_name as name, t.email, t.subject as role, 'teacher' as type
       FROM teachers t
       INNER JOIN class_timetables ct ON t.id = ct.teacher_id
       INNER JOIN classes c ON ct.class_id = c.id
       INNER JOIN students s ON s.grade_level = c.grade AND s.section = c.section AND s.school_id = c.school_id
       WHERE s.email = $1 AND (s.subjects ? ct.subject)

       UNION

       SELECT DISTINCT t.full_name as name, t.email, t.subject as role, 'teacher' as type
       FROM teachers t
       INNER JOIN classes c ON t.id = c.class_teacher_id
       INNER JOIN students s ON s.grade_level = c.grade AND s.section = c.section AND s.school_id = c.school_id
       WHERE s.email = $1`,
      [cleanEmail]
    );

    res.json(result.rows);
  } catch (error) {
    console.error("Fetch Student Contacts Error:", error);
    res.status(500).json({ error: "Failed to fetch contacts." });
  }
};

