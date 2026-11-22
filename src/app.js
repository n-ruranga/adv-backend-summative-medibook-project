const express = require('express');
const errorHandler = require('./middleware/errorHandler');
const patientRoutes = require('./routes/patientRoutes');
const doctorRoutes = require('./routes/doctorRoutes');
const appointmentRoutes = require('./routes/appointmentRoutes');
const reportRoutes = require('./routes/reportRoutes');
const waitlistRoutes = require('./routes/waitlistRoutes');
const feedbackRoutes = require('./routes/feedbackRoutes');

const app = express();

app.use(express.json());

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

app.use('/api/patients', patientRoutes);
app.use('/api/doctors', doctorRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/waitlist', waitlistRoutes);
app.use('/feedback', feedbackRoutes);

app.use(errorHandler);

module.exports = app;
