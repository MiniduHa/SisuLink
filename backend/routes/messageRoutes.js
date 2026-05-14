const express = require('express');
const router = express.Router();
const messageController = require('../controllers/messageController');

router.post('/send', messageController.sendMessage);
router.get('/:role/:email', messageController.getMessages);
router.get('/:role/:email/history/:otherEmail', messageController.getMessageHistory);
router.put('/read/:messageId', messageController.markAsRead);

module.exports = router;
