const express = require('express');
const router = express.Router();
const profileController = require('../controllers/profileController');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });

router.post('/upload-avatar', upload.single('photo'), profileController.uploadAvatar);
router.post('/upload-resume', upload.single('resume'), profileController.uploadResume);
router.post('/remove-resume', profileController.removeResume);
router.get('/:studentId', profileController.getProfile);
router.put('/:studentId', profileController.updateProfile);

module.exports = router;
