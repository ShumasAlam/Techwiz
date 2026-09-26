const express = require('express');
const router = express.Router();
const {
  handleChat,
  getSuggestions
} = require('../controllers/aiController');

router.post('/chat', handleChat);
router.get('/suggestions', getSuggestions);

module.exports = router;
