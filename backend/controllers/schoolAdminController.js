const db = require('../config/db');

exports.getSchoolDashboardStats = async (req, res) => {
  try {
    const { email } = req.params;

    // 1. Authenticate the school
    const schoolResult = await db.query('SELECT * FROM schools WHERE email = $1', [email]);
    if (schoolResult.rows.length === 0) {
      return res.status(404).json({ error: "School not found" });
    }
    
    const schoolName = schoolResult.rows[0].name;

    // 2. Query Real Data (Teachers, Students, Parents)
    let totalTeachers = 0;
    try {
      const teacherCount = await db.query('SELECT COUNT(*) FROM teachers WHERE school_name = $1', [schoolName]);
      totalTeachers = parseInt(teacherCount.rows[0].count, 10);
    } catch (e) { console.error("Teacher query error"); }

    let totalStudents = 0;
    try {
      // Assuming students will eventually be linked by school. Safely querying.
      const studentCount = await db.query('SELECT COUNT(*) FROM students'); 
      totalStudents = parseInt(studentCount.rows[0].count, 10);
    } catch (e) { console.error("Student query error"); }

    let totalParents = 0;
    try {
      const parentCount = await db.query('SELECT COUNT(*) FROM parents');
      totalParents = parseInt(parentCount.rows[0].count, 10);
    } catch (e) { console.error("Parent query error"); }

    // 3. Construct the Master Dashboard Payload
    // Notice how we structure the empty states for features not yet built!
    res.json({
      overallStats: {
        students: totalStudents,
        teachers: totalTeachers,
        parents: totalParents,
        classes: Math.floor(totalStudents / 30) || 0 // Rough estimate until classes table exists
      },
      dailyStats: {
        studentAttendance: { present: 0, total: totalStudents, percentage: 0 },
        teacherAttendance: { present: 0, total: totalTeachers, percentage: 0 },
        staffLeave: { approved: 0, pending: 0 },
        eventsToday: { count: 0, nextEvent: "No events scheduled" }
      },
      notices: [], // Empty array until Notices table is built
      events: []   // Empty array until Calendar table is built
    });

  } catch (error) {
    console.error("School Dashboard Error:", error.message);
    res.status(500).json({ error: "Server error fetching dashboard data." });
  }
};