const axios = require('axios');
const { google } = require('googleapis');
const analyticsData = require('@google-analytics/data');

/**
 * Service for interacting with Google Analytics API
 */
class GoogleAnalyticsService {
  constructor(redisClient, pgPool) {
    this.redisClient = redisClient;
    this.pgPool = pgPool;
    this.clientId = process.env.GOOGLE_CLIENT_ID;
    this.clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    this.redirectUri = process.env.FRONTEND_URL + '/auth/google/callback';
    this.scope = [
      'https://www.googleapis.com/auth/analytics.readonly',
      'https://www.googleapis.com/auth/analytics',
      'https://www.googleapis.com/auth/analytics.edit'
    ];
    // Inicializando APIs de forma correta
    this.analyticsAdmin = google.analyticsadmin({ version: 'v1alpha' });
    // Inicializando o cliente de dados do GA4
    this.analyticsDataClient = new analyticsData.BetaAnalyticsDataClient();
  }

  /**
   * Get OAuth2 client
   * @returns {OAuth2Client} OAuth2 client
   */
  getOAuth2Client() {
    return new google.auth.OAuth2(
      this.clientId,
      this.clientSecret,
      this.redirectUri
    );
  }

  /**
   * Generate authorization URL
   * @returns {string} Authorization URL
   */
  getAuthUrl() {
    const oauth2Client = this.getOAuth2Client();
    return oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: this.scope,
      prompt: 'consent'
    });
  }

  /**
   * Exchange authorization code for access token
   * @param {string} code - Authorization code from Google Login
   * @returns {Promise<Object>} Token information
   */
  async exchangeCodeForToken(code) {
    try {
      const oauth2Client = this.getOAuth2Client();
      const { tokens } = await oauth2Client.getToken(code);
      return tokens;
    } catch (error) {
      console.error('Error exchanging code for token:', error.message);
      throw new Error('Falha ao trocar código por token do Google');
    }
  }

  /**
   * Save user token to database
   * @param {number} userId - User ID
   * @param {Object} tokens - Token information
   */
  async saveUserToken(userId, tokens) {
    try {
      // Check if we already have credentials for this user
      const result = await this.pgPool.query(
        'SELECT id FROM google_credentials WHERE user_id = $1',
        [userId]
      );

      const now = new Date();
      const expiryDate = new Date(now.getTime() + tokens.expires_in * 1000);

      if (result.rows.length > 0) {
        // Update existing credentials
        await this.pgPool.query(
          'UPDATE google_credentials SET access_token = $1, refresh_token = $2, expiry_date = $3, updated_at = NOW() WHERE user_id = $4',
          [tokens.access_token, tokens.refresh_token || result.rows[0].refresh_token, expiryDate, userId]
        );
      } else {
        // Insert new credentials
        await this.pgPool.query(
          'INSERT INTO google_credentials (user_id, access_token, refresh_token, expiry_date, created_at, updated_at) VALUES ($1, $2, $3, $4, NOW(), NOW())',
          [userId, tokens.access_token, tokens.refresh_token, expiryDate]
        );
      }

      // Cache the access token for 1 hour or until it expires (whichever is less)
      const cacheTime = Math.min(tokens.expires_in, 3600);
      await this.redisClient.set(`google:token:${userId}`, tokens.access_token, 'EX', cacheTime);

    } catch (error) {
      console.error('Error saving user token:', error);
      throw new Error('Falha ao salvar token do usuário');
    }
  }

  /**
   * Get user token from database or cache
   * @param {number} userId - User ID
   * @returns {Promise<string>} Access token
   */
  async getUserToken(userId) {
    try {
      // Try to get from cache first
      const cachedToken = await this.redisClient.get(`google:token:${userId}`);
      if (cachedToken) {
        return cachedToken;
      }

      // Get from database
      const result = await this.pgPool.query(
        'SELECT access_token, refresh_token, expiry_date FROM google_credentials WHERE user_id = $1',
        [userId]
      );

      if (result.rows.length === 0) {
        throw new Error('Usuário não autenticado no Google Analytics');
      }

      const credentials = result.rows[0];
      const now = new Date();
      const expiryDate = new Date(credentials.expiry_date);

      // Check if token is expired
      if (now > expiryDate && credentials.refresh_token) {
        // Refresh the token
        const oauth2Client = this.getOAuth2Client();
        oauth2Client.setCredentials({
          refresh_token: credentials.refresh_token
        });

        const { tokens } = await oauth2Client.refreshAccessToken();
        await this.saveUserToken(userId, tokens);
        return tokens.access_token;
      }

      // Cache the token
      const secondsToExpiry = Math.max(0, Math.floor((expiryDate - now) / 1000));
      const cacheTime = Math.min(secondsToExpiry, 3600); // Cache for 1 hour or until expiry
      if (cacheTime > 0) {
        await this.redisClient.set(`google:token:${userId}`, credentials.access_token, 'EX', cacheTime);
      }

      return credentials.access_token;
    } catch (error) {
      console.error('Error getting user token:', error);
      throw new Error('Falha ao obter token do usuário');
    }
  }

  /**
   * Get list of Google Analytics accounts
   * @param {number} userId - User ID
   * @returns {Promise<Array>} List of accounts
   */
  async getAccounts(userId) {
    try {
      const token = await this.getUserToken(userId);
      const cacheKey = `google:accounts:${userId}`;
      
      // Try to get from cache
      const cachedAccounts = await this.redisClient.get(cacheKey);
      if (cachedAccounts) {
        return JSON.parse(cachedAccounts);
      }
      
      // Configure auth
      const oauth2Client = this.getOAuth2Client();
      oauth2Client.setCredentials({ access_token: token });
      
      // Call the Analytics Admin API
      const response = await this.analyticsAdmin.accounts.list({
        auth: oauth2Client
      });
      
      const accounts = response.data.accounts || [];
      
      // Cache for 30 minutes
      await this.redisClient.set(cacheKey, JSON.stringify(accounts), 'EX', 1800);
      
      // Save to database
      for (const account of accounts) {
        try {
          await this.pgPool.query(
            'INSERT INTO google_accounts (user_id, account_id, display_name, created_at, updated_at) ' +
            'VALUES ($1, $2, $3, NOW(), NOW()) ' +
            'ON CONFLICT (user_id, account_id) DO UPDATE SET ' +
            'display_name = $3, updated_at = NOW()',
            [userId, account.name, account.displayName]
          );
        } catch (err) {
          console.error(`Erro ao salvar conta ${account.name}:`, err.message);
          // Continue with other accounts even if one fails
        }
      }
      
      return accounts;
    } catch (error) {
      console.error('Error getting Google Analytics accounts:', error);
      throw new Error('Falha ao obter contas do Google Analytics');
    }
  }

  /**
   * Get properties for a Google Analytics account
   * @param {number} userId - User ID
   * @param {string} accountId - Account ID
   * @returns {Promise<Array>} List of properties
   */
  async getProperties(userId, accountId) {
    try {
      const token = await this.getUserToken(userId);
      const cacheKey = `google:properties:${accountId}:${userId}`;
      
      // Try to get from cache
      const cachedProperties = await this.redisClient.get(cacheKey);
      if (cachedProperties) {
        return JSON.parse(cachedProperties);
      }
      
      // Configure auth
      const oauth2Client = this.getOAuth2Client();
      oauth2Client.setCredentials({ access_token: token });
      
      // Call the Analytics Admin API
      const response = await this.analyticsAdmin.properties.list({
        auth: oauth2Client,
        filter: `parent:${accountId}`
      });
      
      const properties = response.data.properties || [];
      
      // Cache for 30 minutes
      await this.redisClient.set(cacheKey, JSON.stringify(properties), 'EX', 1800);
      
      // Save to database
      for (const property of properties) {
        try {
          await this.pgPool.query(
            'INSERT INTO google_properties (user_id, account_id, property_id, display_name, created_at, updated_at) ' +
            'VALUES ($1, $2, $3, $4, NOW(), NOW()) ' +
            'ON CONFLICT (user_id, property_id) DO UPDATE SET ' +
            'display_name = $4, updated_at = NOW()',
            [userId, accountId, property.name, property.displayName]
          );
        } catch (err) {
          console.error(`Erro ao salvar propriedade ${property.name}:`, err.message);
          // Continue with other properties even if one fails
        }
      }
      
      return properties;
    } catch (error) {
      console.error('Error getting Google Analytics properties:', error);
      throw new Error('Falha ao obter propriedades do Google Analytics');
    }
  }

  /**
   * Get report data for a Google Analytics property
   * @param {number} userId - User ID
   * @param {string} propertyId - Property ID
   * @param {Object} dateRange - Date range for the report
   * @returns {Promise<Object>} Report data
   */
  async getReportData(userId, propertyId, dateRange) {
    try {
      const token = await this.getUserToken(userId);
      const cacheKey = `google:report:${propertyId}:${dateRange.startDate}-${dateRange.endDate}:${userId}`;
      
      // Try to get from cache
      const cachedReport = await this.redisClient.get(cacheKey);
      if (cachedReport) {
        return JSON.parse(cachedReport);
      }
      
      // Configure auth
      const oauth2Client = this.getOAuth2Client();
      oauth2Client.setCredentials({ access_token: token });
      
      // Call the Analytics Data API using the proper client
      const [response] = await this.analyticsDataClient.runReport({
        // BetaAnalyticsDataClient usa autenticação diferente
        parent: propertyId,
        dateRanges: [
          {
            startDate: dateRange.startDate,
            endDate: dateRange.endDate
          }
        ],
        dimensions: [
          {
            name: 'date'
          }
        ],
        metrics: [
          {
            name: 'sessions'
          },
          {
            name: 'activeUsers'
          },
          {
            name: 'newUsers'
          },
          {
            name: 'engagementRate'
          },
          {
            name: 'conversions'
          }
        ]
      });
      
      const report = response.data;
      
      // Cache for 1 hour
      await this.redisClient.set(cacheKey, JSON.stringify(report), 'EX', 3600);
      
      // Save to database (simplified for example)
      if (report.rows && report.rows.length > 0) {
        try {
          for (const row of report.rows) {
            const dateValue = row.dimensionValues[0].value;
            const sessions = row.metricValues[0].value;
            const activeUsers = row.metricValues[1].value;
            const newUsers = row.metricValues[2].value;
            const engagementRate = row.metricValues[3].value;
            const conversions = row.metricValues[4].value;

            await this.pgPool.query(
              'INSERT INTO google_analytics_data (user_id, property_id, date, sessions, active_users, new_users, engagement_rate, conversions, created_at, updated_at) ' +
              'VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW()) ' +
              'ON CONFLICT (user_id, property_id, date) DO UPDATE SET ' +
              'sessions = $4, active_users = $5, new_users = $6, engagement_rate = $7, conversions = $8, updated_at = NOW()',
              [
                userId,
                propertyId,
                dateValue,
                sessions || 0,
                activeUsers || 0,
                newUsers || 0,
                engagementRate || 0,
                conversions || 0
              ]
            );
          }
        } catch (err) {
          console.error('Erro ao salvar dados do relatório:', err.message);
          // We'll still return the report even if saving to the database fails
        }
      }
      
      return report;
    } catch (error) {
      console.error('Error getting Google Analytics report:', error);
      throw new Error('Falha ao obter relatório do Google Analytics');
    }
  }
}

module.exports = GoogleAnalyticsService;
