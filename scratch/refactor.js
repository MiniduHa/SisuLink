const fs = require('fs');

const file = 'c:/Users/lenovo/OneDrive - NSBM/SisuLink/backend/server.js';
let content = fs.readFileSync(file, 'utf8');

// Insert the require statement near the top
const requireRegex = /const schoolRoutes = require\('\.\/routes\/schoolRoutes'\);/;
if (content.match(requireRegex)) {
  content = content.replace(requireRegex, "const authRoutes = require('./routes/authRoutes');\nconst schoolRoutes = require('./routes/schoolRoutes');");
} else {
  console.log('requireRegex not matched');
}

// Extract the auth block
const startMarker = '// Smart Cascading Login Route - Now with Role Enforcement';
const endMarker = `app.post('/api/auth/reset-password', async (req, res) => {`;
const endMarker2 = `// --- REAL DB STUDENT DASHBOARD ROUTE ---`;

const startIndex = content.indexOf(startMarker);
const endIndex = content.indexOf(endMarker2);

if (startIndex !== -1 && endIndex !== -1) {
  const before = content.substring(0, startIndex);
  const after = content.substring(endIndex);
  
  content = before + "// --- AUTH ROUTES ---\napp.use('/api/auth', authRoutes);\n\n" + after;
  
  fs.writeFileSync(file, content, 'utf8');
  console.log('Successfully refactored server.js');
} else {
  console.log('Could not find markers');
  console.log('startIndex:', startIndex);
  console.log('endIndex:', endIndex);
}
