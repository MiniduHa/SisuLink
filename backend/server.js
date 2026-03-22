const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs'); 
const multer = require('multer'); 
const { createClient } = require('@supabase/supabase-js'); 
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json()); 

// Connect to Database
const db = require('./config/db');

// Initialize Supabase Client for Storage using the SERVICE ROLE KEY
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY; 
const supabase = createClient(supabaseUrl, supabaseKey);

// Configure Multer
const upload = multer({ storage: multer.memoryStorage() });

// --- ROUTES ---

// 1. REGISTER ROUTE (Handles both Students and Parents)
app.post('/api/auth/register', async (req, res) => {
  try {
    const { role, email, password } = req.body;
    
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    if (role === 'Student') {
      const { first_name, last_name, grade_level, index_number } = req.body;
      const result = await db.query(
        `INSERT INTO students (first_name, last_name, email, password, grade_level, index_number) 
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, first_name, last_name, email`,
        [first_name, last_name, email, hashedPassword, grade_level, index_number]
      );
      return res.status(201).json({ message: "Student registered successfully! ", user: result.rows[0] });
    } 
    
    else if (role === 'Parent') {
      const { full_name, phone_number, child_student_ids } = req.body;
      const result = await db.query(
        `INSERT INTO parents (full_name, email, phone_number, password, child_student_ids) 
         VALUES ($1, $2, $3, $4, $5) RETURNING id, full_name, email`,
        [full_name, email, phone_number, hashedPassword, child_student_ids]
      );
      return res.status(201).json({ message: "Parent registered successfully! ", user: result.rows[0] });
    } 
    
    else {
      return res.status(400).json({ error: "Invalid role selected." });
    }

  } catch (error) {
    console.error(" Registration Error:", error.message);
    if (error.code === '23505') return res.status(400).json({ error: "Email already exists." });
    res.status(500).json({ error: "Server error during registration." });
  }
});

// 2. LOGIN ROUTE (UPDATED to handle Students AND Parents)
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password, role } = req.body;
    let result;

    // Check which table to look in based on the role sent from the mobile app
    if (role === 'Parent') {
      result = await db.query('SELECT * FROM parents WHERE email = $1', [email.toLowerCase().trim()]);
    } else {
      // Default to checking students table (keeps your old student login working)
      result = await db.query('SELECT * FROM students WHERE email = $1', [email.toLowerCase().trim()]);
    }

    if (result.rows.length === 0) return res.status(400).json({ error: "No account found." });

    const user = result.rows[0];
    const isMatch = await bcrypt.compare(password, user.password);
    
    if (!isMatch) return res.status(400).json({ error: "Invalid password." });

    // Send back different data depending on who logged in
    if (role === 'Parent') {
      res.json({
        message: "Login successful!",
        user: {
          id: user.id,
          full_name: user.full_name,
          email: user.email,
          child_student_ids: user.child_student_ids
        }
      });
    } else {
      res.json({
        message: "Login successful!",
        student: {
          first_name: user.first_name,
          last_name: user.last_name,
          email: user.email,
          grade_level: user.grade_level,
          studentId: user.index_number,
          profile_photo: user.profile_photo_url 
        }
      });
    }
  } catch (error) {
    console.error(" Login Error:", error.message);
    res.status(500).json({ error: "Server error during login." });
  }
});

// 3. UPLOAD PROFILE PHOTO ROUTE (Unchanged)
app.post('/api/profile/upload-avatar', upload.single('photo'), async (req, res) => {
  try {
    const { studentId } = req.body;
    const file = req.file;

    if (!file) return res.status(400).json({ error: "No photo uploaded." });

    const fileExt = file.originalname ? file.originalname.split('.').pop() : 'jpg';
    const fileName = `${studentId}_${Date.now()}.${fileExt}`;

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(fileName, file.buffer, {
        contentType: file.mimetype,
        upsert: true
      });

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from('avatars')
      .getPublicUrl(fileName);

    await db.query(
      'UPDATE students SET profile_photo_url = $1 WHERE index_number = $2',
      [publicUrl, studentId]
    );

    res.json({ message: "Photo uploaded successfully", photoUrl: publicUrl });

  } catch (error) {
    console.error(" Upload Error:", error.message);
    res.status(500).json({ error: "Server error during photo upload." });
  }
});

// 4. FETCH LATEST PROFILE DATA ROUTE (Unchanged)
app.get('/api/profile/:studentId', async (req, res) => {
  try {
    const { studentId } = req.params;
    
    const result = await db.query(
      'SELECT first_name, last_name, email, grade_level, profile_photo_url FROM students WHERE index_number = $1',
      [studentId]
    );

    if (result.rows.length === 0) return res.status(404).json({ error: "Student not found" });

    res.json(result.rows[0]);
  } catch (error) {
    console.error(" Fetch Profile Error:", error.message);
    res.status(500).json({ error: "Server error fetching profile." });
  }
});

// --- START THE SERVER ---
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(` Server is running on port ${PORT}`);
});