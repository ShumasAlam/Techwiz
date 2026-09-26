const express = require('express');
const router = express.Router();
const {
  getReports,
  generateReport,
  exportReportCSV
} = require('../controllers/reportController');

router.get('/', getReports);
router.post('/generate', generateReport);
router.get('/export/:type', exportReportCSV);

module.exports = router;
