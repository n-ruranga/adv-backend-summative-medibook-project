const express = require('express');
const appointmentController = require('../controllers/appointmentController');

const router = express.Router();

router.post('/', appointmentController.bookAppointment);
router.post('/:id/cancel', appointmentController.cancelAppointment);

module.exports = router;
