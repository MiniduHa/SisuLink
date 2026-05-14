const express = require('express');
const router = express.Router();
const teacherController = require('../controllers/teacherController');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });

router.get('/:email/dashboard', teacherController.getDashboard);
router.get('/:email/events', teacherController.getEvents);
router.get('/:email/timetable', teacherController.getTimetable);
router.get('/:email/students', teacherController.getStudents);
router.get('/:email/class-students', teacherController.getClassStudents);
router.post('/attendance', teacherController.markAttendance);
router.get('/profile/:email', teacherController.getProfile);
router.post('/upload-avatar', upload.single('photo'), teacherController.uploadAvatar);
router.post('/remove-avatar', teacherController.removeAvatar);
router.post('/upload-material', upload.single('file'), teacherController.uploadMaterial);
router.post('/:email/materials', teacherController.addMaterial);
router.get('/:email/materials', teacherController.getMaterials);
router.get('/:email/contacts', teacherController.getContacts);
router.get('/:email/attendance-history', teacherController.getAttendanceHistory);
router.get('/:email/attendance-monthly-report/:year/:month', teacherController.getAttendanceMonthlyReport);
router.get('/:email/assignments', teacherController.getAssignments);
router.get('/:email/class-marks', teacherController.getClassMarks);
router.post('/:email/class-marks', teacherController.saveClassMarks);

module.exports = router;
