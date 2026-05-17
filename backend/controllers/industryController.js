const db = require('../config/db');
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

exports.getDashboard = async (req, res) => {
  try {
    const { email } = req.params;
    const partner = await db.query('SELECT * FROM industry_partners WHERE email = $1', [email.toLowerCase().trim()]);
    if (partner.rows.length === 0) return res.status(404).json({ error: "Partner not found" });

    const partnerId = partner.rows[0].id;
    const jobs = await db.query('SELECT * FROM internships WHERE industry_id = $1 ORDER BY created_at DESC', [partnerId]);
    const announcements = await db.query('SELECT * FROM industry_announcements WHERE industry_email = $1 ORDER BY created_at DESC', [email.toLowerCase().trim()]);
    
    const applicantCountRes = await db.query(
      `SELECT COUNT(*) FROM job_applications WHERE job_id IN (SELECT id FROM internships WHERE industry_id = $1)`,
      [partnerId]
    );

    res.json({
      partner: partner.rows[0],
      stats: {
        activeJobs: jobs.rows.filter(j => j.status === 'Active').length,
        totalJobs: jobs.rows.length,
        applicants: parseInt(applicantCountRes.rows[0].count, 10),
        activeAnnouncements: announcements.rows.filter(a => a.status === 'Active').length
      },
      jobs: jobs.rows,
      announcements: announcements.rows
    });
  } catch (error) { res.status(500).json({ error: "Failed to fetch industry dashboard." }); }
};

exports.updateProfile = async (req, res) => {
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
};

exports.uploadAvatar = async (req, res) => {
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
};

exports.removeAvatar = async (req, res) => {
  try {
    const { email } = req.body;
    await db.query('UPDATE industry_partners SET logo_url = NULL WHERE email = $1', [email.toLowerCase().trim()]);
    res.json({ message: "Logo removed" });
  } catch (error) { res.status(500).json({ error: "Removal failed" }); }
};

exports.postJob = async (req, res) => {
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
      `INSERT INTO internships (industry_id, company_name, title, description, requirements, location, employment_type, cover_photo, status) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'Pending') RETURNING *`,
      [partner.rows[0].id, partner.rows[0].company_name, title, description, requirements, location, employment_type, finalCover]
    );

    res.status(201).json({ message: "Job posted successfully!", job: result.rows[0] });
  } catch (error) { 
    console.error("Job Post Error:", error.message);
    res.status(500).json({ error: "Failed to post job." }); 
  }
};

exports.uploadCover = async (req, res) => {
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
};

exports.getSchools = async (req, res) => {
  try {
    const result = await db.query('SELECT id, name FROM schools ORDER BY name ASC');
    res.json(result.rows);
  } catch (error) { res.status(500).json({ error: "Failed to fetch schools." }); }
};

exports.postAnnouncement = async (req, res) => {
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
          `INSERT INTO industry_announcements (industry_email, target_school_id, title, description, type, cover_photo, status) 
           VALUES ($1, $2, $3, $4, $5, $6, 'Pending') RETURNING *`,
          [cleanEmail, school.id, title, description, type, finalCover]
        );
        insertedRecords.push(result.rows[0]);
      }
    } else {
      // Specific school
      const result = await db.query(
        `INSERT INTO industry_announcements (industry_email, target_school_id, title, description, type, cover_photo, status) 
         VALUES ($1, $2, $3, $4, $5, $6, 'Pending') RETURNING *`,
        [cleanEmail, target_school_id, title, description, type, finalCover]
      );
      insertedRecords.push(result.rows[0]);
    }

    res.status(201).json({ message: "Announcement posted successfully!", announcements: insertedRecords });
  } catch (error) {
    console.error("Announcement Post Error:", error.message);
    res.status(500).json({ error: "Failed to post announcement." });
  }
};

exports.getAnnouncements = async (req, res) => {
  try {
    const { email } = req.params;
    const result = await db.query('SELECT * FROM industry_announcements WHERE industry_email = $1 ORDER BY created_at DESC', [email.toLowerCase().trim()]);
    res.json(result.rows);
  } catch (error) { res.status(500).json({ error: "Failed to fetch announcements." }); }
};

exports.getJobs = async (req, res) => {
  try {
    const { email } = req.params;
    const partner = await db.query('SELECT id FROM industry_partners WHERE email = $1', [email.toLowerCase().trim()]);
    if (partner.rows.length === 0) return res.status(404).json({ error: "Partner not found" });

    const result = await db.query('SELECT * FROM internships WHERE industry_id = $1 ORDER BY created_at DESC', [partner.rows[0].id]);
    res.json(result.rows);
  } catch (error) { res.status(500).json({ error: "Failed to fetch jobs." }); }
};

exports.getJobApplicants = async (req, res) => {
  try {
    const { jobId } = req.params;
    const result = await db.query('SELECT * FROM job_applications WHERE job_id = $1 ORDER BY applied_at DESC', [jobId]);
    res.json(result.rows);
  } catch (error) { res.status(500).json({ error: "Failed to fetch applicants." }); }
};

exports.updateJob = async (req, res) => {
  try {
    const { jobId } = req.params;
    const { title, description, requirements, location, employment_type, cover_photo } = req.body;
    
    const result = await db.query(
      `UPDATE internships 
       SET title = $1, description = $2, requirements = $3, location = $4, employment_type = $5, cover_photo = $6, status = 'Pending'
       WHERE id = $7 RETURNING *`,
      [title, description, requirements, location, employment_type, cover_photo || null, jobId]
    );

    if (result.rows.length === 0) return res.status(404).json({ error: "Job not found." });
    res.json({ message: "Job updated successfully! Pending admin approval.", job: result.rows[0] });
  } catch (error) {
    console.error("Update Job Error:", error.message);
    res.status(500).json({ error: "Failed to update job." });
  }
};

exports.deleteJob = async (req, res) => {
  try {
    const { jobId } = req.params;
    
    // Delete job applications first to satisfy foreign key constraint
    await db.query("DELETE FROM job_applications WHERE job_id = $1", [jobId]);
    
    // Delete internship post
    const result = await db.query("DELETE FROM internships WHERE id = $1 RETURNING *", [jobId]);
    
    if (result.rows.length === 0) return res.status(404).json({ error: "Job not found." });
    res.json({ message: "Job deleted successfully." });
  } catch (error) {
    console.error("Delete Job Error:", error.message);
    res.status(500).json({ error: "Failed to delete job." });
  }
};

exports.updateAnnouncement = async (req, res) => {
  try {
    const { annId } = req.params;
    const { title, description, type, cover_photo, target_school_id } = req.body;

    const result = await db.query(
      `UPDATE industry_announcements 
       SET title = $1, description = $2, type = $3, cover_photo = $4, target_school_id = $5, status = 'Pending'
       WHERE id = $6 RETURNING *`,
      [title, description, type, cover_photo || null, target_school_id, annId]
    );

    if (result.rows.length === 0) return res.status(404).json({ error: "Announcement not found." });
    res.json({ message: "Announcement updated successfully! Pending admin approval.", announcement: result.rows[0] });
  } catch (error) {
    console.error("Update Announcement Error:", error.message);
    res.status(500).json({ error: "Failed to update announcement." });
  }
};

exports.deleteAnnouncement = async (req, res) => {
  try {
    const { annId } = req.params;
    const result = await db.query("DELETE FROM industry_announcements WHERE id = $1 RETURNING *", [annId]);
    
    if (result.rows.length === 0) return res.status(404).json({ error: "Announcement not found." });
    res.json({ message: "Announcement deleted successfully." });
  } catch (error) {
    console.error("Delete Announcement Error:", error.message);
    res.status(500).json({ error: "Failed to delete announcement." });
  }
};


