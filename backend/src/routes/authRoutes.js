const express = require('express');
const { body } = require('express-validator');
const AuthController = require('../controllers/authController');
const { authMiddleware } = require('../middleware/authMiddleware');

const router = express.Router();

/**
 * Create routes for authentication
 * @param {Object} pgPool - PostgreSQL connection pool
 * @returns {Object} Express router
 */
module.exports = function(pgPool) {
  const authController = new AuthController(pgPool);

  // Register a new user
  router.post(
    '/register',
    [
      body('email').isEmail().withMessage('Forneça um email válido'),
      body('password').isLength({ min: 6 }).withMessage('A senha deve ter pelo menos 6 caracteres'),
      body('name').notEmpty().withMessage('O nome é obrigatório')
    ],
    authController.register.bind(authController)
  );

  // Login a user
  router.post(
    '/login',
    [
      body('email').isEmail().withMessage('Forneça um email válido'),
      body('password').notEmpty().withMessage('A senha é obrigatória')
    ],
    authController.login.bind(authController)
  );

  // Get current user
  router.get('/me', authMiddleware, authController.getMe.bind(authController));

  return router;
};
