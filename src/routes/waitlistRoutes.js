const express = require('express');
const waitlistController = require('../controllers/waitlistController');

const router = express.Router();

router.post('/', waitlistController.joinWaitlist);

module.exports = router;
