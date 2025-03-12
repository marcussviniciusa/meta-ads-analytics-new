import api from './api';

/**
 * Service for handling ad account-related API calls
 */
class AdAccountService {
  /**
   * Get all ad accounts for the current user
   * @returns {Promise} - API response
   */
  async getAdAccounts() {
    const response = await api.get('/ad-accounts');
    return response.data;
  }

  /**
   * Get campaigns for a specific ad account
   * @param {string} accountId - The ad account ID
   * @returns {Promise} - API response
   */
  async getCampaigns(accountId) {
    const response = await api.get(`/ad-accounts/${accountId}/campaigns`);
    return response.data;
  }

  /**
   * Get ad sets for a specific campaign
   * @param {string} campaignId - The campaign ID
   * @returns {Promise} - API response
   */
  async getAdSets(campaignId) {
    const response = await api.get(`/ad-accounts/campaigns/${campaignId}/adsets`);
    return response.data;
  }

  /**
   * Get ads for a specific ad set
   * @param {string} adSetId - The ad set ID
   * @returns {Promise} - API response
   */
  async getAds(adSetId) {
    const response = await api.get(`/ad-accounts/adsets/${adSetId}/ads`);
    return response.data;
  }

  /**
   * Get account overview with performance data
   * @param {string} accountId - The ad account ID
   * @param {string} startDate - Start date (YYYY-MM-DD)
   * @param {string} endDate - End date (YYYY-MM-DD)
   * @returns {Promise} - API response
   */
  async getAccountOverview(accountId, startDate, endDate) {
    const response = await api.get(`/reports/account/${accountId}/overview`, {
      params: { startDate, endDate }
    });
    return response.data;
  }

  /**
   * Get campaign insights with performance data
   * @param {string} campaignId - The campaign ID
   * @param {string} startDate - Start date (YYYY-MM-DD)
   * @param {string} endDate - End date (YYYY-MM-DD)
   * @returns {Promise} - API response
   */
  async getCampaignInsights(campaignId, startDate, endDate) {
    const response = await api.get(`/reports/campaigns/${campaignId}/insights`, {
      params: { startDate, endDate }
    });
    return response.data;
  }
}

export default new AdAccountService();
