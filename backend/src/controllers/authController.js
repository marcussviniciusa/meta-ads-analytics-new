const { validationResult } = require('express-validator');
const AuthService = require('../services/authService');

/**
 * Controller for authentication endpoints
 */
class AuthController {
  constructor(pgPool) {
    this.authService = new AuthService(pgPool);
  }

  /**
   * Register a new user
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  async register(req, res, next) {
    try {
      // Validate request
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { email, password, name } = req.body;
      
      // Register user
      const userData = await this.authService.register(email, password, name);
      
      res.status(201).json(userData);
    } catch (error) {
      if (error.message === 'Usuário com este email já existe') {
        return res.status(400).json({ message: error.message });
      }
      
      next(error);
    }
  }

  /**
   * Login an existing user
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  async login(req, res, next) {
    try {
      // Validate request
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { email, password } = req.body;
      
      // Login user
      const userData = await this.authService.login(email, password);
      
      res.status(200).json(userData);
    } catch (error) {
      if (error.message === 'Credenciais inválidas') {
        return res.status(401).json({ message: error.message });
      }
      
      next(error);
    }
  }

  /**
   * Get current user information
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  async getMe(req, res, next) {
    try {
      const userId = req.user.userId;
      
      // Get user
      const user = await this.authService.getUserById(userId);
      
      res.status(200).json(user);
    } catch (error) {
      if (error.message === 'Usuário não encontrado') {
        return res.status(404).json({ message: error.message });
      }
      
      next(error);
    }
  }
}

module.exports = AuthController;
