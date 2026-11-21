const express = require('express');
const doctorController = require('../controllers/doctorController');
const {
  validateCreateDoctor,
  validateUpdateDoctor,
} = require('../middleware/validateDoctor');

const router = express.Router();

router.post('/', validateCreateDoctor, doctorController.createDoctor);
router.get('/', doctorController.listDoctors);
router.get('/:id', doctorController.getDoctor);
router.put('/:id', validateUpdateDoctor, doctorController.updateDoctor);
router.delete('/:id', doctorController.deleteDoctor);

module.exports = router;
