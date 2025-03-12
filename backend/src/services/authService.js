const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

/**
 * Service for handling authentication-related functionality
 */
class AuthService {
  constructor(pgPool) {
    this.pgPool = pgPool;
  }

  /**
   * Register a new user
   * @param {string} email - User's email
   * @param {string} password - User's password
   * @param {string} name - User's name
   * @returns {Promise<Object>} User information and token
   */
  async register(email, password, name) {
    const client = await this.pgPool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Check if user already exists
      const existingUser = await client.query(
        'SELECT * FROM users WHERE email = $1',
        [email]
      );
      
      if (existingUser.rows.length > 0) {
        throw new Error('Usuário com este email já existe');
      }
      
      // Hash password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);
      
      // Create user
      const result = await client.query(
        'INSERT INTO users (email, password_hash, name) VALUES ($1, $2, $3) RETURNING id, email, name, created_at',
        [email, hashedPassword, name]
      );
      
      const user = result.rows[0];
      
      // Generate JWT token
      const token = this.generateToken(user.id, user.email);
      
      await client.query('COMMIT');
      
      return {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          created_at: user.created_at
        },
        token
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Login an existing user
   * @param {string} email - User's email
   * @param {string} password - User's password
   * @returns {Promise<Object>} User information and token
   */
  async login(email, password) {
    // Find user
    const result = await this.pgPool.query(
      'SELECT id, email, name, password_hash, created_at FROM users WHERE email = $1',
      [email]
    );
    
    if (result.rows.length === 0) {
      throw new Error('Credenciais inválidas');
    }
    
    const user = result.rows[0];
    
    // Verify password
    const isMatch = await bcrypt.compare(password, user.password_hash);
    
    if (!isMatch) {
      throw new Error('Credenciais inválidas');
    }
    
    // Generate JWT token
    const token = this.generateToken(user.id, user.email);
    
    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        created_at: user.created_at
      },
      token
    };
  }

  /**
   * Generate JWT token
   * @param {number} userId - User ID
   * @param {string} email - User's email
   * @returns {string} JWT token
   */
  generateToken(userId, email) {
    return jwt.sign(
      { userId, email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
  }

  /**
   * Get user by ID
   * @param {number} userId - User ID
   * @returns {Promise<Object>} User information
   */
  async getUserById(userId) {
    const result = await this.pgPool.query(
      'SELECT id, email, name, created_at FROM users WHERE id = $1',
      [userId]
    );
    
    if (result.rows.length === 0) {
      throw new Error('Usuário não encontrado');
    }
    
    return result.rows[0];
  }
}

module.exports = AuthService;
