const express = require('express');
const appointmentController = require('../controllers/appointmentController');

const router = express.Router();

router.post('/', appointmentController.bookAppointment);

module.exports = router;
