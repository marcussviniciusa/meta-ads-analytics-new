import React, { useState } from 'react';
import { 
  Button, 
  Typography, 
  Box, 
  Paper, 
  Alert,
  CircularProgress
} from '@mui/material';
import { useNavigate, useLocation } from 'react-router-dom';
import googleAnalyticsService from '../services/googleAnalyticsService';

/**
 * Componente para conectar conta do Google Analytics
 */
const GoogleAnalyticsConnect = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const location = useLocation();

  // Verificar se estamos retornando do OAuth do Google
  React.useEffect(() => {
    const handleOAuthCallback = async () => {
      const params = new URLSearchParams(location.search);
      const code = params.get('code');
      
      if (code) {
        setLoading(true);
        try {
          await googleAnalyticsService.exchangeToken(code);
          // Limpar URL após troca bem-sucedida
          window.history.replaceState({}, document.title, window.location.pathname);
          navigate('/dashboard');
        } catch (err) {
          console.error('Erro ao trocar código por token:', err);
          setError('Falha ao conectar conta do Google Analytics. Por favor, tente novamente.');
        } finally {
          setLoading(false);
        }
      }
    };

    handleOAuthCallback();
  }, [location, navigate]);

  const handleConnectGoogle = async () => {
    setLoading(true);
    try {
      const authUrl = await googleAnalyticsService.getAuthUrl();
      window.location.href = authUrl;
    } catch (err) {
      console.error('Erro ao obter URL de autenticação:', err);
      setError('Falha ao iniciar processo de autenticação. Por favor, tente novamente.');
      setLoading(false);
    }
  };

  return (
    <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
      <Typography variant="h6" gutterBottom>
        Conectar Google Analytics
      </Typography>
      
      <Typography variant="body2" color="text.secondary" paragraph>
        Conecte sua conta do Google Analytics para visualizar métricas importantes diretamente na plataforma.
      </Typography>
      
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      
      <Box sx={{ mt: 2 }}>
        <Button
          variant="contained"
          color="primary"
          onClick={handleConnectGoogle}
          disabled={loading}
          startIcon={loading ? <CircularProgress size={20} /> : null}
        >
          {loading ? 'Conectando...' : 'Conectar Google Analytics'}
        </Button>
      </Box>
    </Paper>
  );
};

export default GoogleAnalyticsConnect;
