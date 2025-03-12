const express = require('express');
const GoogleAnalyticsController = require('../controllers/googleAnalyticsController');
const { authMiddleware } = require('../middleware/authMiddleware');

const router = express.Router();

/**
 * Create routes for Google Analytics
 * @param {Object} params - Parameters
 * @param {Object} params.redisClient - Redis client
 * @param {Object} params.pgPool - PostgreSQL connection pool
 * @returns {Object} Express router
 */
module.exports = function(redisClient, pgPool) {
  const googleAnalyticsController = new GoogleAnalyticsController(redisClient, pgPool);

  // Auth routes
  router.get('/auth-url', authMiddleware, googleAnalyticsController.getAuthUrl.bind(googleAnalyticsController));
  router.post('/exchange-token', authMiddleware, googleAnalyticsController.exchangeToken.bind(googleAnalyticsController));

  // Data routes
  router.get('/accounts', authMiddleware, googleAnalyticsController.getAccounts.bind(googleAnalyticsController));
  router.get('/properties/:accountId', authMiddleware, googleAnalyticsController.getProperties.bind(googleAnalyticsController));
  router.post('/report/:propertyId', authMiddleware, googleAnalyticsController.getReportData.bind(googleAnalyticsController));

  return router;
};
