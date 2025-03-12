const MetaService = require('../services/metaService');

/**
 * Controller for ad account endpoints
 */
class AdAccountController {
  constructor(redisClient, pgPool) {
    this.metaService = new MetaService(redisClient, pgPool);
  }

  /**
   * Connect user account to Meta
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  async connectMeta(req, res, next) {
    try {
      const { code, redirectUri } = req.body;
      const userId = req.user.userId;
      
      // Exchange code for token
      const { access_token, expires_in } = await this.metaService.exchangeCodeForToken(code, redirectUri);
      
      // Store token
      await this.metaService.storeUserToken(userId, access_token, expires_in);
      
      res.status(200).json({ message: 'Conta do Meta conectada com sucesso' });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get user's ad accounts
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  async getAdAccounts(req, res, next) {
    try {
      console.log(`Tentando obter contas de anúncios para o usuário ${req.user.userId}`);
      const userId = req.user.userId;
      
      // Get ad accounts
      console.log('Chamando metaService.getAdAccounts');
      const adAccounts = await this.metaService.getAdAccounts(userId);
      console.log(`Contas de anúncios obtidas com sucesso: ${JSON.stringify(adAccounts).substring(0, 100)}...`);
      
      res.status(200).json(adAccounts);
    } catch (error) {
      console.error('Erro ao buscar contas de anúncios:', error);
      console.error('Stack trace completo:', error.stack);
      next(error);
    }
  }

  /**
   * Get campaigns for an ad account
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  async getCampaigns(req, res, next) {
    try {
      const userId = req.user.userId;
      const { accountId } = req.params;
      
      // Get campaigns
      const campaigns = await this.metaService.getCampaigns(userId, accountId);
      
      res.status(200).json(campaigns);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get ad sets for a campaign
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  async getAdSets(req, res, next) {
    try {
      const userId = req.user.userId;
      const { campaignId } = req.params;
      
      // Get ad sets
      const adSets = await this.metaService.getAdSets(userId, campaignId);
      
      res.status(200).json(adSets);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get ads for an ad set
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  async getAds(req, res, next) {
    try {
      const userId = req.user.userId;
      const { adSetId } = req.params;
      
      // Get ads
      const ads = await this.metaService.getAds(userId, adSetId);
      
      res.status(200).json(ads);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = AdAccountController;
