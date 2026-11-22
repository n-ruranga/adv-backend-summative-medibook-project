require('dotenv').config();

const { popConfirmation } = require('./services/confirmationQueue');
const { appendAudit } = require('./services/auditLog');

let running = true;

process.on('SIGINT', () => {
  running = false;
});
process.on('SIGTERM', () => {
  running = false;
});

/**
 * Process confirmation SMS/email jobs by writing them to the audit log.
 */
async function processConfirmations() {
  const job = await popConfirmation(2);
  if (!job) {
    return;
  }

  await appendAudit('confirmation', {
    appointmentId: job.appointmentId,
    patientId: job.patientId,
    doctorId: job.doctorId,
    apptDatetime: job.apptDatetime,
    message: job.message,
  });
  console.log(`Processed confirmation for appointment ${job.appointmentId}`);
}

async function loop() {
  console.log('MediBook worker started (confirmations)');
  while (running) {
    try {
      await processConfirmations();
    } catch (err) {
      console.error('Worker confirmation error:', err.message);
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }
  console.log('MediBook worker stopped');
  process.exit(0);
}

loop();
