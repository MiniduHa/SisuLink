const express = require('express');
const router = express.Router();
const schoolAdminController = require('../controllers/schoolAdminController');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });

// Dashboard Data
router.get('/:email/dashboard', schoolAdminController.getSchoolDashboardStats);

// Teacher Management
router.get('/:email/teachers', schoolAdminController.getTeachers);
router.post('/:email/teachers', schoolAdminController.addTeacher);
router.put('/:email/teachers/:teacherId', schoolAdminController.updateTeacher);

// Class Management
router.get('/:email/classes', schoolAdminController.getClasses);
router.post('/:email/classes', schoolAdminController.addClass);
router.delete('/:email/classes/:classId', schoolAdminController.deleteClass);

// Timetable Management
router.get('/:email/classes/:classId/timetable', schoolAdminController.getClassTimetable);
router.post('/:email/classes/:classId/timetable', schoolAdminController.saveTimetableSlot);
router.get('/:email/teachers/:teacherId/timetable', schoolAdminController.getTeacherTimetable);

// Messaging System
router.post('/:email/messages/send', schoolAdminController.sendStaffMessage);

// Student Management
router.get('/:email/students', schoolAdminController.getStudents);
router.post('/:email/students', schoolAdminController.addStudent);
router.put('/:email/students/:studentId', schoolAdminController.updateStudent);
router.get('/:email/students/:studentId/timetable', schoolAdminController.getStudentTimetable);

// Calendar Management
router.get('/:email/events', schoolAdminController.getEvents);
router.post('/:email/events', schoolAdminController.addEvent);
router.put('/:email/events/:eventId', schoolAdminController.updateEvent);
router.delete('/:email/events/:eventId', schoolAdminController.deleteEvent);

// Notice Management
router.get('/:email/notices', schoolAdminController.getNotices);
router.post('/:email/notices', schoolAdminController.addNotice);
router.put('/:email/notices/:noticeId', schoolAdminController.updateNotice);
router.delete('/:email/notices/:noticeId', schoolAdminController.deleteNotice);

// Parent Management
router.get('/:email/parents', schoolAdminController.getParents);
router.post('/:email/parents', schoolAdminController.addParent);
router.put('/:email/parents/:parentId', schoolAdminController.updateParent);
router.delete('/:email/parents/:parentId', schoolAdminController.deleteParent);

// Industry Management
router.get('/:email/industry', schoolAdminController.getIndustryPartners);
router.put('/:email/industry/:partnerId', schoolAdminController.updateIndustryPartner);

// Analytics
router.get('/:email/analytics/academic-trends', schoolAdminController.getAcademicTrends);
router.get('/:email/analytics/attendance-health', schoolAdminController.getAttendanceHealth);

// Internship & Announcements Approval
router.get('/:email/internships/pending', schoolAdminController.getPendingInternships);
router.get('/:email/announcements/pending', schoolAdminController.getPendingAnnouncements);

router.put('/internships/:id/status', schoolAdminController.updateInternshipStatus);
router.put('/announcements/:id/status', schoolAdminController.updateAnnouncementStatus);

// Profile
router.get('/:email/profile', schoolAdminController.getProfile);
router.put('/:email/profile', schoolAdminController.updateProfile);

// Utilities
router.post('/upload-event-image', upload.single('image'), schoolAdminController.uploadEventImage);

module.exports = router;
