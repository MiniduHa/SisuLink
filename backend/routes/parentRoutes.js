const express = require('express');
const router = express.Router();
const parentController = require('../controllers/parentController');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });

router.get('/profile/:email', parentController.getProfile);
router.put('/profile/:email', parentController.updateProfile);
router.post('/upload-avatar', upload.single('photo'), parentController.uploadAvatar);
router.post('/remove-avatar', parentController.removeAvatar);
router.get('s/:email', parentController.getParent);
router.put('s/update', parentController.updateParent);
router.get('/:email/dashboard', parentController.getDashboard);
router.get('/student/:studentId/academic-profile', parentController.getAcademicProfile);
router.get('/:email/contacts', parentController.getContacts);

module.exports = router;
