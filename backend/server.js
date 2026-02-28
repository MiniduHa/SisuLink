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

// Initialize Supabase Client for Storage using the SERVICE ROLE KEY to bypass RLS
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY; 
const supabase = createClient(supabaseUrl, supabaseKey);

// Configure Multer to keep the file in memory temporarily before sending to Supabase
const upload = multer({ storage: multer.memoryStorage() });

// --- ROUTES ---

// 1. REGISTER STUDENT ROUTE
app.post('/api/auth/register', async (req, res) => {
  try {
    const { first_name, last_name, email, password, grade_level, index_number } = req.body;
    
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const result = await db.query(
      `INSERT INTO students (first_name, last_name, email, password, grade_level, index_number) 
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, first_name, last_name, email`,
      [first_name, last_name, email, hashedPassword, grade_level, index_number]
    );

    res.status(201).json({ 
      message: "Student registered successfully! 🎉", 
      student: result.rows[0] 
    });
  } catch (error) {
    console.error("❌ Registration Error:", error.message);
    if (error.code === '23505') return res.status(400).json({ error: "Email already exists." });
    res.status(500).json({ error: "Server error during registration." });
  }
});

// 2. LOGIN STUDENT ROUTE
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const result = await db.query('SELECT * FROM students WHERE email = $1', [email.toLowerCase().trim()]);

    if (result.rows.length === 0) return res.status(400).json({ error: "No account found." });

    const student = result.rows[0];
    const isMatch = await bcrypt.compare(password, student.password);
    
    if (!isMatch) return res.status(400).json({ error: "Invalid password." });

    res.json({
      message: "Login successful!",
      student: {
        first_name: student.first_name,
        last_name: student.last_name,
        email: student.email,
        grade_level: student.grade_level,
        studentId: student.index_number,
        profile_photo: student.profile_photo_url 
      }
    });
  } catch (error) {
    console.error("❌ Login Error:", error.message);
    res.status(500).json({ error: "Server error during login." });
  }
});

// 3. UPLOAD PROFILE PHOTO ROUTE
app.post('/api/profile/upload-avatar', upload.single('photo'), async (req, res) => {
  try {
    const { studentId } = req.body;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: "No photo uploaded." });
    }

    // A. Create a unique filename (e.g., STU-90214_169000000.jpg)
    const fileExt = file.originalname ? file.originalname.split('.').pop() : 'jpg';
    const fileName = `${studentId}_${Date.now()}.${fileExt}`;

    // B. Upload the file directly to the Supabase "avatars" bucket
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(fileName, file.buffer, {
        contentType: file.mimetype,
        upsert: true // Overwrite if a file with this name exists
      });

    if (uploadError) throw uploadError;

    // C. Get the public URL for the uploaded image
    const { data: { publicUrl } } = supabase.storage
      .from('avatars')
      .getPublicUrl(fileName);

    // D. Save the URL to the student's database record
    await db.query(
      'UPDATE students SET profile_photo_url = $1 WHERE index_number = $2',
      [publicUrl, studentId]
    );

    // E. Send the URL back to the mobile app
    res.json({ message: "Photo uploaded successfully", photoUrl: publicUrl });

  } catch (error) {
    console.error("❌ Upload Error:", error.message);
    res.status(500).json({ error: "Server error during photo upload." });
  }
});

// 4. FETCH LATEST PROFILE DATA ROUTE (Keeps the Home Screen Updated)
app.get('/api/profile/:studentId', async (req, res) => {
  try {
    const { studentId } = req.params;
    
    // Fetch the latest profile data for this specific student
    const result = await db.query(
      'SELECT first_name, last_name, email, grade_level, profile_photo_url FROM students WHERE index_number = $1',
      [studentId]
    );

    if (result.rows.length === 0) return res.status(404).json({ error: "Student not found" });

    // Send the data back to the frontend
    res.json(result.rows[0]);
  } catch (error) {
    console.error("❌ Fetch Profile Error:", error.message);
    res.status(500).json({ error: "Server error fetching profile." });
  }
});

// --- START THE SERVER ---
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
});