const express = require('express');
const router = express.Router();
const industryController = require('../controllers/industryController');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });

router.get('/:email/dashboard', industryController.getDashboard);
router.put('/:email/profile', industryController.updateProfile);
router.post('/upload-avatar', upload.single('photo'), industryController.uploadAvatar);
router.post('/remove-avatar', industryController.removeAvatar);
router.post('/:email/jobs', industryController.postJob);
router.post('/upload-cover', upload.single('photo'), industryController.uploadCover);
router.get('/schools', industryController.getSchools);
router.post('/:email/announcements', industryController.postAnnouncement);
router.get('/:email/announcements', industryController.getAnnouncements);
router.get('/:email/jobs', industryController.getJobs);
router.put('/jobs/:jobId', industryController.updateJob);
router.delete('/jobs/:jobId', industryController.deleteJob);
router.get('/jobs/:jobId/applicants', industryController.getJobApplicants);

router.put('/announcements/:annId', industryController.updateAnnouncement);
router.delete('/announcements/:annId', industryController.deleteAnnouncement);

module.exports = router;
