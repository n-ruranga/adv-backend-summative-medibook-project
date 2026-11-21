const express = require('express');
const errorHandler = require('./middleware/errorHandler');
const patientRoutes = require('./routes/patientRoutes');

const app = express();

app.use(express.json());

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

app.use('/api/patients', patientRoutes);

app.use(errorHandler);

module.exports = app;
