import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  CircularProgress, 
  Alert, 
  FormControl, 
  InputLabel, 
  Select, 
  MenuItem,
  Grid,
  Paper
} from '@mui/material';
import { format } from 'date-fns';
import { Line, Bar } from 'react-chartjs-2';
import googleAnalyticsService from '../services/googleAnalyticsService';

/**
 * Componente para exibir dados do Google Analytics
 * @param {Object} props
 * @param {Date} props.startDate - Data inicial para os relatórios
 * @param {Date} props.endDate - Data final para os relatórios
 */
const GoogleAnalyticsData = ({ startDate, endDate }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [accounts, setAccounts] = useState([]);
  const [properties, setProperties] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState('');
  const [selectedProperty, setSelectedProperty] = useState('');
  const [reportData, setReportData] = useState(null);

  // Carregar contas ao montar o componente
  useEffect(() => {
    const fetchAccounts = async () => {
      try {
        setLoading(true);
        const accountsData = await googleAnalyticsService.getAccounts();
        setAccounts(accountsData);
        
        if (accountsData && accountsData.length > 0) {
          setSelectedAccount(accountsData[0].name);
        }
      } catch (err) {
        console.error('Erro ao carregar contas do Google Analytics:', err);
        setError('Falha ao carregar contas. Verifique se você está conectado ao Google Analytics.');
      } finally {
        setLoading(false);
      }
    };

    fetchAccounts();
  }, []);

  // Carregar propriedades quando uma conta for selecionada
  useEffect(() => {
    const fetchProperties = async () => {
      if (!selectedAccount) return;
      
      try {
        setLoading(true);
        const propertiesData = await googleAnalyticsService.getProperties(selectedAccount);
        setProperties(propertiesData);
        
        if (propertiesData && propertiesData.length > 0) {
          setSelectedProperty(propertiesData[0].name);
        } else {
          setSelectedProperty('');
        }
      } catch (err) {
        console.error('Erro ao carregar propriedades:', err);
        setError('Falha ao carregar propriedades para esta conta.');
      } finally {
        setLoading(false);
      }
    };

    fetchProperties();
  }, [selectedAccount]);

  // Carregar dados do relatório quando propriedade, data inicial ou data final mudar
  useEffect(() => {
    const fetchReportData = async () => {
      if (!selectedProperty) return;
      
      try {
        setLoading(true);
        const formattedStartDate = format(startDate, 'yyyy-MM-dd');
        const formattedEndDate = format(endDate, 'yyyy-MM-dd');
        
        const data = await googleAnalyticsService.getReportData(
          selectedProperty, 
          formattedStartDate, 
          formattedEndDate
        );
        
        setReportData(data);
      } catch (err) {
        console.error('Erro ao carregar dados do relatório:', err);
        setError('Falha ao carregar dados do relatório para esta propriedade.');
      } finally {
        setLoading(false);
      }
    };

    fetchReportData();
  }, [selectedProperty, startDate, endDate]);

  const handleAccountChange = (event) => {
    setSelectedAccount(event.target.value);
    setSelectedProperty('');
    setReportData(null);
  };

  const handlePropertyChange = (event) => {
    setSelectedProperty(event.target.value);
    setReportData(null);
  };

  if (loading && !accounts.length) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error && !accounts.length) {
    return (
      <Alert severity="error" sx={{ my: 2 }}>
        {error}
      </Alert>
    );
  }

  if (!accounts.length) {
    return (
      <Alert severity="info" sx={{ my: 2 }}>
        Você ainda não conectou uma conta do Google Analytics. Acesse a página de integrações para conectar.
      </Alert>
    );
  }

  // Preparar dados para gráficos se disponíveis
  const renderCharts = () => {
    if (!reportData) return null;

    // Exemplo de dados para gráficos - ajuste conforme o formato real de resposta da API
    const visitorChart = {
      labels: reportData.dates || [],
      datasets: [
        {
          label: 'Visitantes',
          data: reportData.visitors || [],
          fill: false,
          borderColor: 'rgb(75, 192, 192)',
          tension: 0.1
        }
      ]
    };

    const pageViewsChart = {
      labels: reportData.dates || [],
      datasets: [
        {
          label: 'Visualizações de Página',
          data: reportData.pageViews || [],
          backgroundColor: 'rgba(54, 162, 235, 0.5)',
        }
      ]
    };

    return (
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Visitantes
            </Typography>
            <Line data={visitorChart} options={{ maintainAspectRatio: false }} height={300} />
          </Paper>
        </Grid>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Visualizações de Página
            </Typography>
            <Bar data={pageViewsChart} options={{ maintainAspectRatio: false }} height={300} />
          </Paper>
        </Grid>
      </Grid>
    );
  };

  return (
    <Box>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} md={6}>
          <FormControl fullWidth>
            <InputLabel id="ga-account-label">Conta</InputLabel>
            <Select
              labelId="ga-account-label"
              value={selectedAccount}
              label="Conta"
              onChange={handleAccountChange}
              disabled={loading}
            >
              {accounts.map((account) => (
                <MenuItem key={account.name} value={account.name}>
                  {account.displayName}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12} md={6}>
          <FormControl fullWidth disabled={!selectedAccount || loading}>
            <InputLabel id="ga-property-label">Propriedade</InputLabel>
            <Select
              labelId="ga-property-label"
              value={selectedProperty}
              label="Propriedade"
              onChange={handlePropertyChange}
            >
              {properties.map((property) => (
                <MenuItem key={property.name} value={property.name}>
                  {property.displayName}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
      </Grid>

      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
          <CircularProgress />
        </Box>
      )}

      {!loading && selectedProperty && renderCharts()}
    </Box>
  );
};

export default GoogleAnalyticsData;
