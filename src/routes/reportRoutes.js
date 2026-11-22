const express = require('express');
const reportController = require('../controllers/reportController');

const router = express.Router();

router.get('/doctors', reportController.getDoctorsReport);

module.exports = router;
