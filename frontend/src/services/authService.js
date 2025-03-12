import api from './api';

/**
 * Serviço para gerenciar a autenticação de usuários
 */
const authService = {
  /**
   * Registrar um novo usuário
   * @param {Object} userData - Dados do usuário (nome, email, senha)
   * @returns {Promise} Promessa com resposta da API
   */
  register: async (userData) => {
    const response = await api.post('/auth/register', userData);
    if (response.data.token) {
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
    }
    return response.data;
  },

  /**
   * Fazer login com email e senha
   * @param {Object} credentials - Credenciais do usuário (email, senha)
   * @returns {Promise} Promessa com resposta da API
   */
  login: async (credentials) => {
    const response = await api.post('/auth/login', credentials);
    if (response.data.token) {
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
    }
    return response.data;
  },

  /**
   * Fazer login via Facebook
   * @param {Object} facebookResponse - Resposta da autenticação do Facebook
   * @returns {Promise} Promessa com resposta da API
   */
  facebookLogin: async (facebookResponse) => {
    const { accessToken, userID } = facebookResponse;
    const response = await api.post('/auth/facebook', { accessToken, userID });
    
    if (response.data.token) {
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
    }
    return response.data;
  },

  /**
   * Fazer logout do usuário
   */
  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  },

  /**
   * Obter o token JWT atual
   * @returns {string|null} Token JWT ou null se não estiver autenticado
   */
  getToken: () => {
    return localStorage.getItem('token');
  },

  /**
   * Obter os dados do usuário atual
   * @returns {Object|null} Dados do usuário ou null se não estiver autenticado
   */
  getCurrentUser: () => {
    const userStr = localStorage.getItem('user');
    if (!userStr) return null;
    try {
      return JSON.parse(userStr);
    } catch (e) {
      localStorage.removeItem('user');
      return null;
    }
  },

  /**
   * Verificar se o usuário está autenticado
   * @returns {boolean} True se o usuário estiver autenticado
   */
  isAuthenticated: () => {
    return !!localStorage.getItem('token');
  },

  /**
   * Verificar status da integração com Meta Ads
   * @returns {Promise} Promessa com resposta da API
   */
  checkMetaIntegration: async () => {
    try {
      const response = await api.get('/integrations');
      const metaIntegration = response.data.find(
        integration => integration.name === 'meta_ads'
      );
      return {
        isConnected: metaIntegration ? metaIntegration.is_connected : false,
        integration: metaIntegration
      };
    } catch (error) {
      console.error('Erro ao verificar integração com Meta Ads:', error);
      return { isConnected: false, integration: null };
    }
  },

  /**
   * Obter URL de autorização para Meta Ads
   * @returns {Promise} Promessa com URL de autorização
   */
  getMetaAuthUrl: async () => {
    try {
      const response = await api.get('/integrations/meta-ads/auth-url');
      return response.data.authUrl;
    } catch (error) {
      console.error('Erro ao obter URL de autorização do Meta:', error);
      throw error;
    }
  },

  /**
   * Processar callback de autorização do Meta Ads
   * @param {Object} data - Dados do callback (code, state)
   * @returns {Promise} Promessa com resposta da API
   */
  processMetaCallback: async (data) => {
    try {
      const response = await api.post('/integrations/meta-ads/callback', data);
      return response.data;
    } catch (error) {
      console.error('Erro ao processar callback do Meta:', error);
      throw error;
    }
  },

  /**
   * Desconectar integração com Meta Ads
   * @returns {Promise} Promessa com resposta da API
   */
  disconnectMeta: async () => {
    try {
      // Obter ID da fonte de integração Meta Ads
      const sourcesResponse = await api.get('/integrations/sources');
      const metaSource = sourcesResponse.data.find(
        source => source.name === 'meta_ads'
      );
      
      if (metaSource) {
        const response = await api.delete(`/integrations/${metaSource.id}`);
        return response.data;
      } else {
        throw new Error('Fonte de integração Meta Ads não encontrada');
      }
    } catch (error) {
      console.error('Erro ao desconectar do Meta Ads:', error);
      throw error;
    }
  }
};

export default authService;
