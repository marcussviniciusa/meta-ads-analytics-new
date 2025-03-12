const axios = require('axios');

/**
 * Service for interacting with Meta Ads API
 */
class MetaService {
  constructor(redisClient, pgPool) {
    this.redisClient = redisClient;
    this.pgPool = pgPool;
    this.appId = process.env.META_APP_ID;
    this.appSecret = process.env.META_APP_SECRET;
    this.apiVersion = 'v22.0'; // Update as needed
  }

  /**
   * Exchange authorization code for access token
   * @param {string} code - Authorization code from Facebook Login
   * @param {string} redirectUri - Redirect URI used in the login flow
   * @returns {Promise<Object>} Token information
   */
  async exchangeCodeForToken(code, redirectUri) {
    try {
      const tokenResponse = await axios.get(
        `https://graph.facebook.com/${this.apiVersion}/oauth/access_token`,
        {
          params: {
            client_id: this.appId,
            client_secret: this.appSecret,
            redirect_uri: redirectUri,
            code
          }
        }
      );

      const { access_token, expires_in } = tokenResponse.data;
      return { access_token, expires_in };
    } catch (error) {
      console.error('Error exchanging code for token:', error.response?.data || error.message);
      throw new Error('Falha ao trocar código por token');
    }
  }

  /**
   * Store user's Meta access token
   * @param {number} userId - User ID
   * @param {string} token - Meta access token
   * @param {number} expiresIn - Token expiration time in seconds
   */
  async storeUserToken(userId, token, expiresIn) {
    try {
      // Store in Redis for fast access
      await this.redisClient.set(
        `user:${userId}:meta_token`,
        token,
        'EX',
        expiresIn
      );

      // Store in PostgreSQL for persistence
      const expiresAt = new Date(Date.now() + expiresIn * 1000);
      await this.pgPool.query(
        'INSERT INTO user_tokens (user_id, access_token, expires_at) VALUES ($1, $2, $3) ' +
        'ON CONFLICT (user_id) DO UPDATE SET access_token = $2, expires_at = $3',
        [userId, token, expiresAt]
      );
    } catch (error) {
      console.error('Error storing user token:', error);
      throw new Error('Falha ao armazenar token de acesso');
    }
  }

  /**
   * Get user's Meta access token
   * @param {number} userId - User ID
   * @returns {Promise<string>} Access token
   */
  async getUserToken(userId) {
    try {
      console.log(`Buscando token para o usuário ${userId}`);
      
      // Try to get from Redis first
      const redisKey = `meta_access_token:${userId}`;
      console.log(`Verificando cache Redis: ${redisKey}`);
      
      // Verificando se o cliente Redis está disponível
      if (!this.redisClient) {
        console.error('Cliente Redis não inicializado');
        throw new Error('Falha na configuração do Redis');
      }
      
      const cachedToken = await this.redisClient.get(redisKey);
      
      if (cachedToken) {
        console.log('Token encontrado no Redis');
        const tokenData = JSON.parse(cachedToken);
        return tokenData.access_token;
      }

      // Se não estiver no Redis, buscar da tabela user_integrations
      console.log('Token não encontrado no Redis, buscando no PostgreSQL');
      const result = await this.pgPool.query(
        'SELECT credentials FROM user_integrations WHERE user_id = $1 AND source_id = (SELECT id FROM integration_sources WHERE name = $2)',
        [userId, 'meta_ads']
      );

      if (result.rows.length === 0) {
        console.log('Nenhum token encontrado no banco de dados');
        throw new Error('Token não encontrado');
      }

      const credentials = result.rows[0].credentials;
      if (!credentials || !credentials.access_token) {
        console.log('Credenciais inválidas no banco de dados');
        throw new Error('Token inválido');
      }
      
      const access_token = credentials.access_token;
      const expires_at = new Date(credentials.expires_at);
      const now = new Date();
      
      // Check if token is expired
      if (expires_at <= now) {
        console.log('Token expirado');
        throw new Error('Token expirado');
      }

      console.log(`Token válido, expira em: ${expires_at}`);
      
      // Calculate remaining time and store in Redis
      const expiresIn = Math.floor((expires_at - now) / 1000);
      if (expiresIn > 0) {
        // Armazenar o objeto completo de credenciais no Redis
        await this.redisClient.set(
          `meta_access_token:${userId}`,
          JSON.stringify(credentials),
          'EX',
          expiresIn
        );
        console.log(`Token armazenado no Redis com expiração em ${expiresIn} segundos`);
      }

      return access_token;
    } catch (error) {
      console.error('Error getting user token:', error);
      throw new Error('Falha ao recuperar token de acesso');
    }
  }

  /**
   * Get user's Meta ad accounts
   * @param {number} userId - User ID
   * @returns {Promise<Array>} List of ad accounts
   */
  async getAdAccounts(userId) {
    try {
      const token = await this.getUserToken(userId);
      const cacheKey = `user:${userId}:ad_accounts`;
      
      // Try to get from cache
      const cachedAccounts = await this.redisClient.get(cacheKey);
      if (cachedAccounts) {
        return JSON.parse(cachedAccounts);
      }

      // Fetch from Meta API
      const response = await axios.get(
        `https://graph.facebook.com/${this.apiVersion}/me/adaccounts`,
        {
          params: {
            access_token: token,
            fields: 'id,name,account_status,amount_spent,currency,business_name'
          }
        }
      );

      const accounts = response.data.data;
      
      // Cache for 1 hour
      await this.redisClient.set(cacheKey, JSON.stringify(accounts), 'EX', 3600);
      
      // Save to database
      for (const account of accounts) {
        await this.pgPool.query(
          'INSERT INTO ad_accounts (user_id, account_id, name, status, business_name) ' +
          'VALUES ($1, $2, $3, $4, $5) ' + 
          'ON CONFLICT (user_id, account_id) DO UPDATE SET ' +
          'name = $3, status = $4, business_name = $5',
          [userId, account.id, account.name, account.account_status, account.business_name]
        );
      }
      
      return accounts;
    } catch (error) {
      console.error('Error getting ad accounts:', error.response?.data || error.message);
      throw new Error('Falha ao obter contas de anúncios');
    }
  }

  /**
   * Get campaigns for an ad account
   * @param {number} userId - User ID
   * @param {string} accountId - Ad account ID
   * @returns {Promise<Array>} List of campaigns
   */
  async getCampaigns(userId, accountId) {
    try {
      const token = await this.getUserToken(userId);
      const cacheKey = `account:${accountId}:campaigns`;
      
      // Try to get from cache
      const cachedCampaigns = await this.redisClient.get(cacheKey);
      if (cachedCampaigns) {
        return JSON.parse(cachedCampaigns);
      }

      // Fetch from Meta API
      const response = await axios.get(
        `https://graph.facebook.com/${this.apiVersion}/${accountId}/campaigns`,
        {
          params: {
            access_token: token,
            fields: 'id,name,objective,status,created_time,start_time,stop_time,daily_budget,lifetime_budget'
          }
        }
      );

      const campaigns = response.data.data;
      
      // Cache for 30 minutes
      await this.redisClient.set(cacheKey, JSON.stringify(campaigns), 'EX', 1800);
      
      // Save to database
      for (const campaign of campaigns) {
        try {
          // Verificar se a tabela campaigns tem a coluna ad_account_id ou account_id
          const columnCheckResult = await this.pgPool.query(
            `SELECT EXISTS (
              SELECT FROM information_schema.columns 
              WHERE table_schema = 'public' 
              AND table_name = 'campaigns' 
              AND column_name = 'ad_account_id'
            );`
          );
          
          const useAdAccountId = columnCheckResult.rows[0].exists;
          const accountIdColumn = useAdAccountId ? 'ad_account_id' : 'account_id';
          
          // Inserir o registro com o nome de coluna correto
          const result = await this.pgPool.query(
            `INSERT INTO campaigns (${accountIdColumn}, campaign_id, name, objective, status) 
             VALUES ($1, $2, $3, $4, $5) 
             ON CONFLICT (${accountIdColumn}, campaign_id) DO UPDATE SET 
             name = $3, objective = $4, status = $5 
             RETURNING id`,
            [accountId, campaign.id, campaign.name || '', campaign.objective || '', campaign.status || '']
          );
          
          // Importante: armazenar o ID do registro para uso posterior
          campaign.db_id = result.rows[0]?.id;
          
        } catch (err) {
          console.error(`Erro ao salvar campanha ${campaign.id}:`, err.message);
          // Continuamos o loop mesmo com erro para tentar processar as outras campanhas
        }
      }
      
      return campaigns;
    } catch (error) {
      console.error('Error getting campaigns:', error.response?.data || error.message);
      throw new Error('Falha ao obter campanhas');
    }
  }

  /**
   * Get ad sets for a campaign
   * @param {number} userId - User ID
   * @param {string} campaignId - Campaign ID
   * @returns {Promise<Array>} List of ad sets
   */
  async getAdSets(userId, campaignId) {
    try {
      const token = await this.getUserToken(userId);
      const cacheKey = `campaign:${campaignId}:adsets`;
      
      // Try to get from cache
      const cachedAdSets = await this.redisClient.get(cacheKey);
      if (cachedAdSets) {
        return JSON.parse(cachedAdSets);
      }

      // Fetch from Meta API
      const response = await axios.get(
        `https://graph.facebook.com/${this.apiVersion}/${campaignId}/adsets`,
        {
          params: {
            access_token: token,
            fields: 'id,name,status,daily_budget,lifetime_budget,bid_strategy,start_time,end_time'
          }
        }
      );

      const adSets = response.data.data;
      
      // Cache for 30 minutes
      await this.redisClient.set(cacheKey, JSON.stringify(adSets), 'EX', 1800);
      
      // Save to database
      for (const adSet of adSets) {
        await this.pgPool.query(
          'INSERT INTO ad_sets (campaign_id, ad_set_id, name, status, bid_strategy, daily_budget, lifetime_budget, start_time, end_time) ' +
          'VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) ' +
          'ON CONFLICT (campaign_id, ad_set_id) DO UPDATE SET ' +
          'name = $3, status = $4, bid_strategy = $5, daily_budget = $6, lifetime_budget = $7, start_time = $8, end_time = $9',
          [
            campaignId, 
            adSet.id, 
            adSet.name, 
            adSet.status, 
            adSet.bid_strategy, 
            adSet.daily_budget, 
            adSet.lifetime_budget, 
            adSet.start_time, 
            adSet.end_time
          ]
        );
      }
      
      return adSets;
    } catch (error) {
      console.error('Error getting ad sets:', error.response?.data || error.message);
      throw new Error('Falha ao obter conjuntos de anúncios');
    }
  }

  /**
   * Get ads for an ad set
   * @param {number} userId - User ID
   * @param {string} adSetId - Ad set ID
   * @returns {Promise<Array>} List of ads
   */
  async getAds(userId, adSetId) {
    try {
      const token = await this.getUserToken(userId);
      const cacheKey = `adset:${adSetId}:ads`;
      
      // Try to get from cache
      const cachedAds = await this.redisClient.get(cacheKey);
      if (cachedAds) {
        return JSON.parse(cachedAds);
      }

      // Fetch from Meta API
      const response = await axios.get(
        `https://graph.facebook.com/${this.apiVersion}/${adSetId}/ads`,
        {
          params: {
            access_token: token,
            fields: 'id,name,status,created_time'
          }
        }
      );

      const ads = response.data.data;
      
      // Cache for 30 minutes
      await this.redisClient.set(cacheKey, JSON.stringify(ads), 'EX', 1800);
      
      // Save to database
      for (const ad of ads) {
        await this.pgPool.query(
          'INSERT INTO ads (ad_set_id, ad_id, name, status, created_time) ' +
          'VALUES ($1, $2, $3, $4, $5) ' +
          'ON CONFLICT (ad_set_id, ad_id) DO UPDATE SET ' +
          'name = $3, status = $4, created_time = $5',
          [adSetId, ad.id, ad.name, ad.status, ad.created_time]
        );
      }
      
      return ads;
    } catch (error) {
      console.error('Error getting ads:', error.response?.data || error.message);
      throw new Error('Falha ao obter anúncios');
    }
  }

  /**
   * Get insights for a campaign
   * @param {number} userId - User ID
   * @param {string} campaignId - Campaign ID
   * @param {Object} dateRange - Date range for insights
   * @returns {Promise<Array>} Campaign insights
   */
  async getCampaignInsights(userId, campaignId, dateRange) {
    try {
      const token = await this.getUserToken(userId);
      const cacheKey = `campaign:${campaignId}:insights:${dateRange.start}-${dateRange.end}`;
      
      // Try to get from cache
      const cachedInsights = await this.redisClient.get(cacheKey);
      if (cachedInsights) {
        return JSON.parse(cachedInsights);
      }

      // Primeiro, buscamos o ID interno da campanha no banco
      let campaignDbId = null;
      try {
        // Verificar se a tabela tem as colunas corretas
        const result = await this.pgPool.query(
          `SELECT id FROM campaigns WHERE campaign_id = $1 LIMIT 1`,
          [campaignId]
        );
        
        if (result.rows.length > 0) {
          campaignDbId = result.rows[0].id;
          console.log(`ID interno da campanha ${campaignId} encontrado: ${campaignDbId}`);
        } else {
          console.log(`Campanha ${campaignId} não encontrada no banco. Ignorando insights.`);
          // Se não encontrar a campanha, retornamos insights vazios
          return [];
        }
      } catch (err) {
        console.error('Erro ao buscar ID da campanha:', err.message);
        // Sem o ID da campanha, retornamos insights vazios em vez de gerar erro
        return [];
      }
      
      // Fetch from Meta API
      const response = await axios.get(
        `https://graph.facebook.com/${this.apiVersion}/${campaignId}/insights`,
        {
          params: {
            access_token: token,
            fields: 'impressions,clicks,spend,cpc,ctr,reach,frequency,unique_clicks,cost_per_unique_click',
            time_range: JSON.stringify({
              since: dateRange.start,
              until: dateRange.end
            }),
            time_increment: 1
          }
        }
      );

      const insights = response.data.data || [];
      
      // Cache for 2 hours
      await this.redisClient.set(cacheKey, JSON.stringify(insights), 'EX', 7200);
      
      // Save to database apenas se temos o ID da campanha válido
      if (campaignDbId) {
        for (const insight of insights) {
          try {
            // Verificar a estrutura da tabela para saber as colunas corretas
            const columnInfo = await this.pgPool.query(
              `SELECT column_name FROM information_schema.columns 
               WHERE table_schema = 'public' 
               AND table_name = 'campaign_insights' 
               AND column_name IN ('date', 'date_start')`
            );
            
            // Determinar qual nome de coluna usar para data
            const dateColumn = columnInfo.rows.find(row => row.column_name === 'date_start') ? 'date_start' : 'date';
            
            await this.pgPool.query(
              `INSERT INTO campaign_insights (campaign_db_id, campaign_id, ${dateColumn}, impressions, clicks, ctr, cpc, spend, reach, frequency, unique_clicks, cost_per_unique_click) 
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) 
               ON CONFLICT (campaign_id, ${dateColumn}) DO UPDATE SET 
               campaign_db_id = $1,
               impressions = $4, clicks = $5, ctr = $6, cpc = $7, spend = $8, reach = $9, frequency = $10, unique_clicks = $11, cost_per_unique_click = $12`,
              [
                campaignDbId,
                campaignId,
                insight.date_start,
                insight.impressions || 0,
                insight.clicks || 0,
                insight.ctr || 0,
                insight.cpc || 0,
                insight.spend || 0,
                insight.reach || 0,
                insight.frequency || 0,
                insight.unique_clicks || 0,
                insight.cost_per_unique_click || 0
              ]
            );
          } catch (err) {
            console.error(`Erro ao salvar insight para campanha ${campaignId}:`, err.message);
            // Continuamos o loop mesmo em caso de erro para processar outros insights
          }
        }
      }
      
      return insights;
    } catch (error) {
      console.error('Error getting campaign insights:', error.response?.data || error.message);
      throw new Error('Falha ao obter insights da campanha');
    }
  }
}

module.exports = MetaService;
