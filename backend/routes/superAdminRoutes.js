const express = require('express');
const router = express.Router();
const superAdminController = require('../controllers/superAdminController');

router.get('/industry', superAdminController.getIndustryPartners);
router.put('/industry/:id/status', superAdminController.updateIndustryStatus);

module.exports = router;
