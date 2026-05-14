const db = require('./db');

const initDB = async () => {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS schools (
        id VARCHAR(50) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        admin_name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        phone VARCHAR(50),
        school_category VARCHAR(100),
        student_type VARCHAR(100),
        password VARCHAR(255) NOT NULL,
        status VARCHAR(50) DEFAULT 'Pending',
        student_count INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS messages (
        id SERIAL PRIMARY KEY,
        sender_email VARCHAR(255) NOT NULL,
        sender_role VARCHAR(50) NOT NULL,
        sender_name VARCHAR(255) NOT NULL,
        receiver_email VARCHAR(255) NOT NULL,
        receiver_role VARCHAR(50) NOT NULL,
        content TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        is_read BOOLEAN DEFAULT FALSE
      )
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS student_grades (
        id SERIAL PRIMARY KEY,
        student_id VARCHAR(50) NOT NULL,
        school_id VARCHAR(50),
        subject_name VARCHAR(100) NOT NULL,
        assessment_type VARCHAR(100) NOT NULL,
        marks NUMERIC(5, 2),
        grade VARCHAR(5) NOT NULL,
        level VARCHAR(10),
        trend VARCHAR(20) DEFAULT 'arrow-trend-up',
        remarks TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Ensure all required columns exist (Migration logic)
    await db.query("ALTER TABLE student_grades ALTER COLUMN school_id TYPE VARCHAR(50)");
    await db.query("ALTER TABLE student_grades ADD COLUMN IF NOT EXISTS school_id VARCHAR(50)");
    await db.query("ALTER TABLE student_grades ADD COLUMN IF NOT EXISTS marks NUMERIC(5, 2)");
    await db.query("ALTER TABLE student_grades ADD COLUMN IF NOT EXISTS level VARCHAR(10)");
    await db.query("ALTER TABLE student_grades ADD COLUMN IF NOT EXISTS remarks TEXT");

    await db.query(`
      CREATE TABLE IF NOT EXISTS student_attendance (
        id SERIAL PRIMARY KEY,
        school_id VARCHAR(50) REFERENCES schools(id) ON DELETE CASCADE,
        student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
        date DATE NOT NULL,
        status VARCHAR(50) NOT NULL, 
        marked_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(student_id, date) 
      )
    `);

    try {
      await db.query(`ALTER TABLE student_attendance ALTER COLUMN student_id TYPE INTEGER USING (student_id::text::integer);`);
    } catch (err) {
      // Column might already be integer or table might not exist yet
    }

    await db.query(`
      CREATE TABLE IF NOT EXISTS industry_partners (
        id SERIAL PRIMARY KEY,
        company_name VARCHAR(255) NOT NULL,
        brn VARCHAR(100) UNIQUE NOT NULL,
        industry_type VARCHAR(100),
        email VARCHAR(255) UNIQUE NOT NULL,
        phone VARCHAR(50),
        password VARCHAR(255) NOT NULL,
        status VARCHAR(50) DEFAULT 'Pending',
        logo_url TEXT,
        school_id INTEGER,
        bio TEXT,
        website TEXT,
        linkedin TEXT,
        address TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Add missing columns if they don't exist
    try {
      await db.query(`ALTER TABLE industry_partners ADD COLUMN IF NOT EXISTS bio TEXT;`);
      await db.query(`ALTER TABLE industry_partners ADD COLUMN IF NOT EXISTS website TEXT;`);
      await db.query(`ALTER TABLE industry_partners ADD COLUMN IF NOT EXISTS linkedin TEXT;`);
      await db.query(`ALTER TABLE industry_partners ADD COLUMN IF NOT EXISTS address TEXT;`);
    } catch (err) {
      console.log("Could not alter industry_partners table:", err.message);
    }

    await db.query(`
      CREATE TABLE IF NOT EXISTS internships (
        id SERIAL PRIMARY KEY,
        industry_id INTEGER REFERENCES industry_partners(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        requirements TEXT,
        location VARCHAR(255),
        employment_type VARCHAR(100),
        status VARCHAR(50) DEFAULT 'Pending',
        bg_color VARCHAR(20) DEFAULT '#DBEAFE',
        company_name VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Alter internships to add missing columns
    try {
      await db.query(`ALTER TABLE internships ADD COLUMN IF NOT EXISTS industry_id INTEGER REFERENCES industry_partners(id) ON DELETE CASCADE;`);
      await db.query(`ALTER TABLE internships ADD COLUMN IF NOT EXISTS description TEXT;`);
      await db.query(`ALTER TABLE internships ADD COLUMN IF NOT EXISTS requirements TEXT;`);
      await db.query(`ALTER TABLE internships ADD COLUMN IF NOT EXISTS location VARCHAR(255);`);
      await db.query(`ALTER TABLE internships ADD COLUMN IF NOT EXISTS employment_type VARCHAR(100);`);
      await db.query(`ALTER TABLE internships ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'Pending';`);
      await db.query(`ALTER TABLE internships ADD COLUMN IF NOT EXISTS company_name VARCHAR(255);`);
      await db.query(`ALTER TABLE internships ADD COLUMN IF NOT EXISTS cover_photo TEXT;`);
    } catch (err) {
      console.log("Could not alter internships table:", err.message);
    }

    await db.query(`
      CREATE TABLE IF NOT EXISTS industry_announcements (
        id SERIAL PRIMARY KEY,
        industry_email VARCHAR(255) NOT NULL,
        target_school_id VARCHAR(50),
        title VARCHAR(255) NOT NULL,
        description TEXT,
        type VARCHAR(100),
        cover_photo TEXT,
        status VARCHAR(50) DEFAULT 'Pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Alter industry_announcements to add missing columns
    try {
      await db.query(`ALTER TABLE industry_announcements ADD COLUMN IF NOT EXISTS industry_email VARCHAR(255);`);
      await db.query(`ALTER TABLE industry_announcements ADD COLUMN IF NOT EXISTS target_school_id VARCHAR(50);`);
      await db.query(`ALTER TABLE industry_announcements ADD COLUMN IF NOT EXISTS description TEXT;`);
      await db.query(`ALTER TABLE industry_announcements ADD COLUMN IF NOT EXISTS type VARCHAR(100);`);
      await db.query(`ALTER TABLE industry_announcements ADD COLUMN IF NOT EXISTS cover_photo TEXT;`);
      await db.query(`ALTER TABLE industry_announcements ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'Pending';`);
    } catch (err) {
      console.log("Could not alter industry_announcements table:", err.message);
    }

    await db.query(`
      CREATE TABLE IF NOT EXISTS job_applications (
        id SERIAL PRIMARY KEY,
        job_id INTEGER REFERENCES internships(id) ON DELETE CASCADE,
        student_id VARCHAR(50),
        student_name VARCHAR(255),
        student_email VARCHAR(255),
        cv_url TEXT,
        applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        status VARCHAR(50) DEFAULT 'Pending'
      )
    `);

    try {
      await db.query(`ALTER TABLE students ADD COLUMN IF NOT EXISTS industry_resumes JSONB DEFAULT '{}'::jsonb;`);
    } catch (err) {
      console.log("Could not alter students table:", err.message);
    }

    console.log("✅ Database tables checked/initialized.");
  } catch (err) {
    console.error("Database Init Error:", err);
  }
};

module.exports = initDB;
