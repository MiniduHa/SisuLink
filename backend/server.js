const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Database Initialization
const initDB = require('./config/dbInit');
initDB();

// Authentication Middleware (verifyToken)
const verifyToken = (req, res, next) => {
  // Public Routes Bypass
  const publicExactRoutes = [
    '/api/auth/login',
    '/api/schools/register',
    '/api/schools/list'
  ];

  if (publicExactRoutes.includes(req.path) || 
      req.path.match(/^\/api\/schools\/[^\/]+\/grades/) || 
      req.path.match(/^\/api\/schools\/[^\/]+\/rooms/) ||
      req.path.match(/^\/api\/school\/profile-by-user\//)) {
    return next();
  }

  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(401).json({ error: "Access denied. No token provided." });

  try {
    const verified = jwt.verify(token, process.env.JWT_SECRET || 'SisuLink_Secret_Key_2026');
    req.user = verified;
    next();
  } catch (err) {
    res.status(403).json({ error: "Invalid or expired token." });
  }
};

app.use(verifyToken);

// Import Modular Routes
const authRoutes = require('./routes/authRoutes');
const studentRoutes = require('./routes/studentRoutes');
const teacherRoutes = require('./routes/teacherRoutes');
const parentRoutes = require('./routes/parentRoutes');
const industryRoutes = require('./routes/industryRoutes');
const messageRoutes = require('./routes/messageRoutes');
const profileRoutes = require('./routes/profileRoutes');
const superAdminRoutes = require('./routes/superAdminRoutes');
const schoolRoutes = require('./routes/schoolRoutes');
const schoolAdminRoutes = require('./routes/schoolAdminRoutes');
const publicRoutes = require('./routes/publicRoutes');

// Register Modular Routes
app.use('/api/auth', authRoutes);
app.use('/api/student', studentRoutes);
app.use('/api/teacher', teacherRoutes);
app.use('/api/parent', parentRoutes);
app.use('/api/parents', parentRoutes); // Compatibility alias
app.use('/api/industry', industryRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/superadmin', superAdminRoutes);
app.use('/api/superadmin/schools', schoolRoutes);
app.use('/api/school-admin', schoolAdminRoutes);
app.use('/api/schools', publicRoutes);
app.use('/api/school', publicRoutes); // Compatibility alias

// Start the Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 SisuLink Backend is running on port ${PORT}`);
});

module.exports = app;
