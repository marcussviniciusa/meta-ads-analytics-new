import api from './api';

/**
 * Serviço para interagir com as APIs do Google Analytics no backend
 */
const googleAnalyticsService = {
  /**
   * Obter URL de autenticação do Google Analytics
   * @returns {Promise<string>} URL de autenticação
   */
  getAuthUrl: async () => {
    const response = await api.get('/api/google-analytics/auth-url');
    return response.data.authUrl;
  },
  
  /**
   * Trocar código de autorização por token
   * @param {string} code - Código de autorização do Google
   * @returns {Promise<Object>} Resposta da operação
   */
  exchangeToken: async (code) => {
    const response = await api.post('/api/google-analytics/exchange-token', { code });
    return response.data;
  },
  
  /**
   * Obter lista de contas do Google Analytics
   * @returns {Promise<Array>} Lista de contas
   */
  getAccounts: async () => {
    const response = await api.get('/api/google-analytics/accounts');
    return response.data.accounts;
  },
  
  /**
   * Obter propriedades para uma conta do Google Analytics
   * @param {string} accountId - ID da conta
   * @returns {Promise<Array>} Lista de propriedades
   */
  getProperties: async (accountId) => {
    const response = await api.get(`/api/google-analytics/accounts/${accountId}/properties`);
    return response.data.properties;
  },
  
  /**
   * Obter dados de relatório para uma propriedade
   * @param {string} propertyId - ID da propriedade
   * @param {string} startDate - Data inicial (YYYY-MM-DD)
   * @param {string} endDate - Data final (YYYY-MM-DD)
   * @returns {Promise<Object>} Dados do relatório
   */
  getReportData: async (propertyId, startDate, endDate) => {
    const formattedStartDate = startDate instanceof Date 
      ? format(startDate, 'yyyy-MM-dd')
      : startDate;
    
    const formattedEndDate = endDate instanceof Date 
      ? format(endDate, 'yyyy-MM-dd') 
      : endDate;
      
    const response = await api.post(`/api/google-analytics/properties/${propertyId}/report`, { 
      startDate: formattedStartDate, 
      endDate: formattedEndDate 
    });
    return response.data;
  }
};

export default googleAnalyticsService;
