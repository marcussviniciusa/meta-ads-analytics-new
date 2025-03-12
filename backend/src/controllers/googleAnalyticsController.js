const GoogleAnalyticsService = require('../services/googleAnalyticsService');

/**
 * Controller for Google Analytics endpoints
 */
class GoogleAnalyticsController {
  /**
   * Create a new GoogleAnalyticsController
   * @param {Object} redisClient - Redis client
   * @param {Object} pgPool - PostgreSQL connection pool
   */
  constructor(redisClient, pgPool) {
    this.googleAnalyticsService = new GoogleAnalyticsService(redisClient, pgPool);
  }

  /**
   * Get Google authorization URL
   * @param {Object} req - Express request
   * @param {Object} res - Express response
   */
  async getAuthUrl(req, res) {
    try {
      const authUrl = this.googleAnalyticsService.getAuthUrl();
      res.json({ authUrl });
    } catch (error) {
      console.error('Error generating auth URL:', error);
      res.status(500).json({ error: 'Falha ao gerar URL de autenticação' });
    }
  }

  /**
   * Exchange authorization code for tokens
   * @param {Object} req - Express request
   * @param {Object} res - Express response
   */
  async exchangeToken(req, res) {
    try {
      const { code } = req.body;
      if (!code) {
        return res.status(400).json({ error: 'Código de autorização é obrigatório' });
      }

      const tokens = await this.googleAnalyticsService.exchangeCodeForToken(code);
      await this.googleAnalyticsService.saveUserToken(req.user.id, tokens);
      
      res.json({ success: true, message: 'Autenticação do Google Analytics concluída com sucesso' });
    } catch (error) {
      console.error('Error exchanging code for token:', error);
      res.status(500).json({ error: 'Falha ao trocar código por token' });
    }
  }

  /**
   * Get list of Google Analytics accounts
   * @param {Object} req - Express request
   * @param {Object} res - Express response
   */
  async getAccounts(req, res) {
    try {
      const accounts = await this.googleAnalyticsService.getAccounts(req.user.id);
      res.json({ accounts });
    } catch (error) {
      console.error('Error getting accounts:', error);
      res.status(500).json({ error: 'Falha ao obter contas do Google Analytics' });
    }
  }

  /**
   * Get properties for a Google Analytics account
   * @param {Object} req - Express request
   * @param {Object} res - Express response
   */
  async getProperties(req, res) {
    try {
      const { accountId } = req.params;
      if (!accountId) {
        return res.status(400).json({ error: 'ID da conta é obrigatório' });
      }

      const properties = await this.googleAnalyticsService.getProperties(req.user.id, accountId);
      res.json({ properties });
    } catch (error) {
      console.error('Error getting properties:', error);
      res.status(500).json({ error: 'Falha ao obter propriedades do Google Analytics' });
    }
  }

  /**
   * Get report data for a Google Analytics property
   * @param {Object} req - Express request
   * @param {Object} res - Express response
   */
  async getReportData(req, res) {
    try {
      const { propertyId } = req.params;
      const { startDate, endDate } = req.body;
      
      if (!propertyId) {
        return res.status(400).json({ error: 'ID da propriedade é obrigatório' });
      }
      
      if (!startDate || !endDate) {
        return res.status(400).json({ error: 'As datas de início e fim são obrigatórias' });
      }

      const reportData = await this.googleAnalyticsService.getReportData(req.user.id, propertyId, {
        startDate,
        endDate
      });
      
      res.json({ reportData });
    } catch (error) {
      console.error('Error getting report data:', error);
      res.status(500).json({ error: 'Falha ao obter dados do relatório' });
    }
  }
}

module.exports = GoogleAnalyticsController;
