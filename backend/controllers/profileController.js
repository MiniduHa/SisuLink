const db = require('../config/db');
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

exports.uploadAvatar = async (req, res) => {
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
};

exports.uploadResume = async (req, res) => {
  try {
    const { studentId, industry } = req.body;
    const file = req.file;
    if (!file) return res.status(400).json({ error: "No file uploaded." });

    const fileExt = file.originalname ? file.originalname.split('.').pop() : 'pdf';
    const industrySuffix = industry && industry !== 'All' ? `_${industry.replace(/[^a-zA-Z0-9]/g, '')}` : '';
    const fileName = `resume_${studentId}${industrySuffix}_${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage.from('avatars').upload(fileName, file.buffer, {
      contentType: file.mimetype,
      upsert: true
    });

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(fileName);

    if (industry && industry !== 'All') {
      // Update JSONB column for specific industry
      await db.query(`
        UPDATE students 
        SET industry_resumes = COALESCE(industry_resumes, '{}'::jsonb) || jsonb_build_object($1::text, $2::text)
        WHERE index_number = $3
      `, [industry, publicUrl, studentId]);
    } else {
      await db.query('UPDATE students SET resume_url = $1 WHERE index_number = $2', [publicUrl, studentId]);
    }

    res.json({ message: "Resume uploaded successfully", resumeUrl: publicUrl });
  } catch (error) {
    console.error("Resume Upload Error:", error);
    res.status(500).json({ error: "Server error during resume upload." });
  }
};

exports.removeResume = async (req, res) => {
  try {
    const { studentId, industry } = req.body;
    if (industry && industry !== 'All') {
      await db.query(`
        UPDATE students 
        SET industry_resumes = industry_resumes - $1
        WHERE index_number = $2
      `, [industry, studentId]);
    } else {
      await db.query('UPDATE students SET resume_url = NULL WHERE index_number = $1', [studentId]);
    }
    res.json({ message: "Resume removed successfully" });
  } catch (error) {
    console.error("Resume Remove Error:", error);
    res.status(500).json({ error: "Server error removing resume." });
  }
};

exports.getProfile = async (req, res) => {
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
};

exports.updateProfile = async (req, res) => {
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
};

