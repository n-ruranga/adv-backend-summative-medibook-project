const reportModel = require('../models/reportModel');

async function getDoctorsReport(req, res, next) {
  try {
    const report = await reportModel.getDoctorsReport();
    return res.status(200).json(report);
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  getDoctorsReport,
};
