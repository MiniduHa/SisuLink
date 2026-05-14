const express = require('express');
const router = express.Router();
const schoolController = require('../controllers/schoolController');
const schoolAdminController = require('../controllers/schoolAdminController');
const db = require('../config/db');

// Public School Registration
router.post('/register', schoolController.registerSchool);

// Fetch list of active registered schools
router.get('/list', async (req, res) => {
  try {
    const result = await db.query("SELECT name FROM schools WHERE status = 'Active'");
    res.json(result.rows);
  } catch (error) {
    console.error("Fetch Schools Error:", error.message);
    res.status(500).json({ error: "Failed to fetch schools." });
  }
});

// Fetch distinct grades for a specific school
router.get('/:schoolName/grades', async (req, res) => {
  try {
    const { schoolName } = req.params;
    const result = await db.query(`
      SELECT grade FROM (
        SELECT DISTINCT grade 
        FROM classes c
        JOIN schools s ON c.school_id = s.id
        WHERE s.name = $1
      ) AS distinct_grades
      ORDER BY 
        CASE 
          WHEN grade ILIKE 'Grade 1' THEN 1
          WHEN grade ILIKE 'Grade 2' THEN 2
          WHEN grade ILIKE 'Grade 3' THEN 3
          WHEN grade ILIKE 'Grade 4' THEN 4
          WHEN grade ILIKE 'Grade 5' THEN 5
          WHEN grade ILIKE 'Grade 6' THEN 6
          WHEN grade ILIKE 'Grade 7' THEN 7
          WHEN grade ILIKE 'Grade 8' THEN 8
          WHEN grade ILIKE 'Grade 9' THEN 9
          WHEN grade ILIKE 'Grade 10' THEN 10
          WHEN grade ILIKE 'Grade 11' THEN 11
          WHEN grade ILIKE 'Grade 12' THEN 12
          WHEN grade ILIKE 'Grade 13' THEN 13
          ELSE 14
        END
    `, [schoolName]);
    res.json(result.rows.map(r => r.grade));
  } catch (error) {
    console.error("Fetch School Grades Error:", error.message);
    res.status(500).json({ error: "Failed to fetch school grades." });
  }
});

// Fetch rooms for a specific school and grade
router.get('/:schoolName/grades/:grade/rooms', async (req, res) => {
  try {
    const { schoolName, grade } = req.params;
    const result = await db.query(`
      SELECT room_number, section
      FROM classes c
      JOIN schools s ON c.school_id = s.id
      WHERE s.name = $1 AND c.grade = $2
      ORDER BY room_number ASC
    `, [schoolName, grade]);
    res.json(result.rows);
  } catch (error) {
    console.error("Fetch School Rooms Error:", error.message);
    res.status(500).json({ error: "Failed to fetch rooms." });
  }
});

// Profile by user email (used in mobile app)
router.get('/profile-by-user/:email', schoolAdminController.getSchoolProfileByUser);

module.exports = router;
