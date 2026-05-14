const express = require('express');
const router = express.Router();
const studentController = require('../controllers/studentController');

router.get('/jobs', studentController.getJobs);
router.post('/apply', studentController.applyJob);
router.get('/:studentId/dashboard', studentController.getDashboard);
router.get('/:studentId/attendance-history', studentController.getAttendanceHistory);
router.get('/:studentId/academic-report', studentController.getAcademicReport);
router.get('/profile-by-email/:email', studentController.getProfileByEmail);
router.get('/:studentId/materials', studentController.getMaterials);
router.get('/:email/contacts', studentController.getContacts);

module.exports = router;
