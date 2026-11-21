const express = require('express');
const patientController = require('../controllers/patientController');
const {
  validateCreatePatient,
  validateUpdatePatient,
} = require('../middleware/validatePatient');

const router = express.Router();

router.post('/', validateCreatePatient, patientController.createPatient);
router.get('/', patientController.listPatients);
router.get('/:id', patientController.getPatient);
router.put('/:id', validateUpdatePatient, patientController.updatePatient);
router.delete('/:id', patientController.deletePatient);

module.exports = router;
