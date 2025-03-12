import React, { useState, useEffect } from 'react';
import { 
  Container, Grid, Paper, Typography, Box, CircularProgress,
  Button, Card, CardContent, Divider, TextField, MenuItem,
  Alert, Tab, Tabs
} from '@mui/material';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import { format, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  Chart as ChartJS, 
  CategoryScale, LinearScale, 
  PointElement, LineElement, 
  BarElement, Title, 
  Tooltip, Legend, ArcElement 
} from 'chart.js';
import { Line, Bar, Pie } from 'react-chartjs-2';
import adAccountService from '../services/adAccountService';
import googleAnalyticsService from '../services/googleAnalyticsService';
import { useAuth } from '../context/AuthContext';
import GoogleAnalyticsData from '../components/GoogleAnalyticsData';
import GoogleAnalyticsConnect from '../components/GoogleAnalyticsConnect';

// Registrar componentes do Chart.js
ChartJS.register(
  CategoryScale, LinearScale, 
  PointElement, LineElement, 
  BarElement, Title, 
  Tooltip, Legend, ArcElement
);

const Dashboard = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [adAccounts, setAdAccounts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState('');
  const [startDate, setStartDate] = useState(subDays(new Date(), 30));
  const [endDate, setEndDate] = useState(new Date());
  const [overviewData, setOverviewData] = useState(null);
  const [tabValue, setTabValue] = useState(0);
  const [analyticsTab, setAnalyticsTab] = useState(0); // 0 = Meta Ads, 1 = Google Analytics
  const [hasGoogleAnalytics, setHasGoogleAnalytics] = useState(false);
  const { user } = useAuth();

  // Carregar contas de anúncios ao montar o componente
  // Verificar se o usuário tem Google Analytics conectado
  useEffect(() => {
    const checkGoogleAnalytics = async () => {
      try {
        const accounts = await googleAnalyticsService.getAccounts();
        setHasGoogleAnalytics(accounts && accounts.length > 0);
      } catch (err) {
        console.log('Usuário não conectou Google Analytics ainda:', err);
        setHasGoogleAnalytics(false);
      }
    };
    
    checkGoogleAnalytics();
  }, []);
  
  useEffect(() => {
    const fetchAdAccounts = async () => {
      try {
        const accounts = await adAccountService.getAdAccounts();
        setAdAccounts(accounts);
        
        if (accounts.length > 0) {
          setSelectedAccount(accounts[0].id);
        }
      } catch (err) {
        setError('Não foi possível carregar as contas de anúncios. Verifique sua conexão com o Meta Ads.');
        console.error('Error fetching ad accounts:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAdAccounts();
  }, []);

  // Carregar dados de visão geral quando a conta ou datas mudarem
  useEffect(() => {
    if (selectedAccount) {
      fetchOverviewData();
    }
  }, [selectedAccount, startDate, endDate, analyticsTab]);

  // Buscar dados de visão geral
  const fetchOverviewData = async () => {
    if (analyticsTab === 1) {
      // Não precisamos carregar dados do Meta Ads quando estamos na aba do Google Analytics
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    
    try {
      const formattedStartDate = format(startDate, 'yyyy-MM-dd');
      const formattedEndDate = format(endDate, 'yyyy-MM-dd');
      
      const data = await adAccountService.getAccountOverview(
        selectedAccount,
        formattedStartDate,
        formattedEndDate
      );
      
      setOverviewData(data);
    } catch (err) {
      setError('Não foi possível carregar os dados da conta. Tente novamente mais tarde.');
      console.error('Error fetching overview data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Criar dados para o gráfico de gastos diários
  const createDailySpendChartData = () => {
    if (!overviewData || !overviewData.performanceByDay) {
      return null;
    }
    
    const labels = overviewData.performanceByDay.map(day => format(new Date(day.date), 'dd/MM'));
    const spendData = overviewData.performanceByDay.map(day => day.spend);
    
    return {
      labels,
      datasets: [
        {
          label: 'Gastos Diários (R$)',
          data: spendData,
          borderColor: 'rgb(54, 162, 235)',
          backgroundColor: 'rgba(54, 162, 235, 0.5)',
          tension: 0.2,
        }
      ]
    };
  };

  // Criar dados para o gráfico de impressões e cliques
  const createPerformanceChartData = () => {
    if (!overviewData || !overviewData.performanceByDay) {
      return null;
    }
    
    const labels = overviewData.performanceByDay.map(day => format(new Date(day.date), 'dd/MM'));
    const impressionsData = overviewData.performanceByDay.map(day => day.impressions);
    const clicksData = overviewData.performanceByDay.map(day => day.clicks);
    
    return {
      labels,
      datasets: [
        {
          label: 'Impressões',
          data: impressionsData,
          borderColor: 'rgb(75, 192, 192)',
          backgroundColor: 'rgba(75, 192, 192, 0.5)',
          yAxisID: 'y',
        },
        {
          label: 'Cliques',
          data: clicksData,
          borderColor: 'rgb(255, 99, 132)',
          backgroundColor: 'rgba(255, 99, 132, 0.5)',
          yAxisID: 'y1',
        }
      ]
    };
  };

  // Criar dados para o gráfico de distribuição de gastos
  const createSpendDistributionChartData = () => {
    if (!overviewData || !overviewData.campaigns || overviewData.campaigns.length === 0) {
      return null;
    }
    
    // Pegar as 5 principais campanhas por gasto
    const topCampaigns = [...overviewData.campaigns]
      .sort((a, b) => b.totalSpend - a.totalSpend)
      .slice(0, 5);
    
    // Calcular outros gastos
    const otherSpend = overviewData.campaigns.length > 5 
      ? overviewData.totalSpend - topCampaigns.reduce((sum, camp) => sum + camp.totalSpend, 0)
      : 0;
    
    const labels = [...topCampaigns.map(camp => camp.name), otherSpend > 0 ? 'Outros' : null].filter(Boolean);
    const data = [...topCampaigns.map(camp => camp.totalSpend), otherSpend > 0 ? otherSpend : null].filter(Boolean);
    
    return {
      labels,
      datasets: [
        {
          data,
          backgroundColor: [
            'rgba(255, 99, 132, 0.7)',
            'rgba(54, 162, 235, 0.7)',
            'rgba(255, 206, 86, 0.7)',
            'rgba(75, 192, 192, 0.7)',
            'rgba(153, 102, 255, 0.7)',
            'rgba(255, 159, 64, 0.7)',
          ],
          borderColor: [
            'rgba(255, 99, 132, 1)',
            'rgba(54, 162, 235, 1)',
            'rgba(255, 206, 86, 1)',
            'rgba(75, 192, 192, 1)',
            'rgba(153, 102, 255, 1)',
            'rgba(255, 159, 64, 1)',
          ],
          borderWidth: 1,
        }
      ]
    };
  };

  // Formatar valor monetário
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  // Formatar número com separador de milhares
  const formatNumber = (value) => {
    return new Intl.NumberFormat('pt-BR').format(value);
  };

  // Mudar a aba
  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  // Renderizar KPIs
  const renderKPIs = () => {
    if (!overviewData) return null;
    
    return (
      <Grid container spacing={3}>
        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={2}>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Gasto Total
              </Typography>
              <Typography variant="h4" component="div">
                {formatCurrency(overviewData.totalSpend)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={2}>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Impressões
              </Typography>
              <Typography variant="h4" component="div">
                {formatNumber(overviewData.totalImpressions)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={2}>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Cliques
              </Typography>
              <Typography variant="h4" component="div">
                {formatNumber(overviewData.totalClicks)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={2}>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                CTR Médio
              </Typography>
              <Typography variant="h4" component="div">
                {overviewData.avgCTR.toFixed(2)}%
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    );
  };

  // Renderizar filtros
  const renderFilters = () => {
    return (
      <Box sx={{ mb: 4 }}>
        <Grid container spacing={3} alignItems="center">
          <Grid item xs={12} md={4}>
            <TextField
              select
              label="Conta de Anúncios"
              value={selectedAccount}
              onChange={(e) => setSelectedAccount(e.target.value)}
              fullWidth
              variant="outlined"
              disabled={loading || adAccounts.length === 0}
            >
              {adAccounts.map((account) => (
                <MenuItem key={account.id} value={account.id}>
                  {account.name}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          
          <Grid item xs={12} md={3}>
            <DatePicker
              selected={startDate}
              onChange={date => setStartDate(date)}
              selectsStart
              startDate={startDate}
              endDate={endDate}
              maxDate={endDate}
              locale={ptBR}
              dateFormat="dd/MM/yyyy"
              customInput={
                <TextField 
                  label="Data Inicial" 
                  fullWidth 
                  variant="outlined"
                  disabled={loading}
                />
              }
            />
          </Grid>
          
          <Grid item xs={12} md={3}>
            <DatePicker
              selected={endDate}
              onChange={date => setEndDate(date)}
              selectsEnd
              startDate={startDate}
              endDate={endDate}
              minDate={startDate}
              maxDate={new Date()}
              locale={ptBR}
              dateFormat="dd/MM/yyyy"
              customInput={
                <TextField 
                  label="Data Final" 
                  fullWidth 
                  variant="outlined"
                  disabled={loading}
                />
              }
            />
          </Grid>
          
          <Grid item xs={12} md={2}>
            <Button
              variant="contained"
              fullWidth
              onClick={fetchOverviewData}
              disabled={loading || !selectedAccount}
            >
              {loading ? <CircularProgress size={24} /> : 'Atualizar'}
            </Button>
          </Grid>
        </Grid>
      </Box>
    );
  };

  // Alternar entre as plataformas de análise (Meta Ads / Google Analytics)
  const handleAnalyticsTabChange = (event, newValue) => {
    setAnalyticsTab(newValue);
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4 }}>
      <Typography variant="h4" gutterBottom>
        Dashboard
      </Typography>
      
      {/* Tabs para escolher entre Meta Ads e Google Analytics */}
      <Box sx={{ width: '100%', mb: 3 }}>
        <Tabs 
          value={analyticsTab} 
          onChange={handleAnalyticsTabChange} 
          aria-label="plataformas de análise"
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab label="Meta Ads" />
          <Tab label="Google Analytics" />
        </Tabs>
      </Box>
      
      {/* Conteúdo do Google Analytics */}
      {analyticsTab === 1 && (
        <>
          {hasGoogleAnalytics ? (
            <GoogleAnalyticsData
              startDate={startDate}
              endDate={endDate}
            />
          ) : (
            <GoogleAnalyticsConnect />
          )}
        </>
      )}
      
      {/* Conteúdo do Meta Ads */}
      {analyticsTab === 0 && (
        <>
          {!user && (
            <Alert severity="warning" sx={{ mb: 3 }}>
              Você precisa fazer login para visualizar suas contas de anúncios.
            </Alert>
          )}
          
          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}
          
          {user && adAccounts.length === 0 && !loading && (
            <Paper sx={{ p: 3, mb: 4 }}>
              <Typography variant="h6" gutterBottom>
                Nenhuma conta de anúncios encontrada
              </Typography>
              <Typography paragraph>
                Você precisa conectar sua conta do Meta Ads para visualizar suas campanhas e relatórios.
              </Typography>
              <Button 
                variant="contained" 
                color="primary"
                href="/connect-meta"
              >
                Conectar Meta Ads
              </Button>
            </Paper>
          )}
      
          {user && adAccounts.length > 0 && (
            <>
              {renderFilters()}
              
              {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', my: 8 }}>
                  <CircularProgress />
                </Box>
              ) : (
                <>
                  {overviewData && (
                    <>
                      {renderKPIs()}
                      
                      <Box sx={{ mt: 4 }}>
                        <Tabs 
                          value={tabValue} 
                          onChange={handleTabChange} 
                          variant="fullWidth"
                          sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}
                        >
                      <Tab label="Visão Geral" />
                      <Tab label="Campanhas" />
                      <Tab label="Análise" />
                    </Tabs>
                    
                    {tabValue === 0 && (
                      <Grid container spacing={4}>
                        <Grid item xs={12} md={8}>
                          <Paper sx={{ p: 3 }}>
                            <Typography variant="h6" gutterBottom>
                              Gastos Diários
                            </Typography>
                            <Divider sx={{ mb: 2 }} />
                            {createDailySpendChartData() && (
                              <Line 
                                data={createDailySpendChartData()} 
                                options={{
                                  responsive: true,
                                  plugins: {
                                    legend: {
                                      position: 'top',
                                    },
                                  },
                                  scales: {
                                    y: {
                                      beginAtZero: true,
                                      ticks: {
                                        callback: function(value) {
                                          return 'R$ ' + value;
                                        }
                                      }
                                    }
                                  }
                                }}
                              />
                            )}
                          </Paper>
                        </Grid>
                        
                        <Grid item xs={12} md={4}>
                          <Paper sx={{ p: 3 }}>
                            <Typography variant="h6" gutterBottom>
                              Distribuição de Gastos
                            </Typography>
                            <Divider sx={{ mb: 2 }} />
                            {createSpendDistributionChartData() && (
                              <Pie 
                                data={createSpendDistributionChartData()} 
                                options={{
                                  responsive: true,
                                  plugins: {
                                    legend: {
                                      position: 'bottom',
                                    },
                                    tooltip: {
                                      callbacks: {
                                        label: function(context) {
                                          const label = context.label || '';
                                          const value = context.raw || 0;
                                          const total = context.chart._metasets[0].total;
                                          const percentage = Math.round((value / total) * 100);
                                          return `${label}: ${formatCurrency(value)} (${percentage}%)`;
                                        }
                                      }
                                    }
                                  }
                                }}
                              />
                            )}
                          </Paper>
                        </Grid>
                        
                        <Grid item xs={12}>
                          <Paper sx={{ p: 3 }}>
                            <Typography variant="h6" gutterBottom>
                              Impressões e Cliques
                            </Typography>
                            <Divider sx={{ mb: 2 }} />
                            {createPerformanceChartData() && (
                              <Line 
                                data={createPerformanceChartData()} 
                                options={{
                                  responsive: true,
                                  interaction: {
                                    mode: 'index',
                                    intersect: false,
                                  },
                                  plugins: {
                                    legend: {
                                      position: 'top',
                                    },
                                  },
                                  scales: {
                                    y: {
                                      type: 'linear',
                                      display: true,
                                      position: 'left',
                                      title: {
                                        display: true,
                                        text: 'Impressões'
                                      }
                                    },
                                    y1: {
                                      type: 'linear',
                                      display: true,
                                      position: 'right',
                                      grid: {
                                        drawOnChartArea: false,
                                      },
                                      title: {
                                        display: true,
                                        text: 'Cliques'
                                      }
                                    },
                                  }
                                }}
                              />
                            )}
                          </Paper>
                        </Grid>
                      </Grid>
                    )}
                    
                    {tabValue === 1 && (
                      <Paper sx={{ p: 3 }}>
                        <Typography variant="h6" gutterBottom>
                          Desempenho das Campanhas
                        </Typography>
                        <Divider sx={{ mb: 2 }} />
                        <Box sx={{ overflowX: 'auto' }}>
                          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                              <tr style={{ borderBottom: '2px solid #e0e0e0' }}>
                                <th style={{ padding: '12px 8px', textAlign: 'left' }}>Campanha</th>
                                <th style={{ padding: '12px 8px', textAlign: 'right' }}>Status</th>
                                <th style={{ padding: '12px 8px', textAlign: 'right' }}>Gasto</th>
                                <th style={{ padding: '12px 8px', textAlign: 'right' }}>Impressões</th>
                                <th style={{ padding: '12px 8px', textAlign: 'right' }}>Cliques</th>
                                <th style={{ padding: '12px 8px', textAlign: 'right' }}>CTR</th>
                                <th style={{ padding: '12px 8px', textAlign: 'right' }}>CPC</th>
                              </tr>
                            </thead>
                            <tbody>
                              {overviewData.campaigns.map((campaign) => (
                                <tr key={campaign.id} style={{ borderBottom: '1px solid #e0e0e0' }}>
                                  <td style={{ padding: '12px 8px' }}>{campaign.name}</td>
                                  <td style={{ padding: '12px 8px', textAlign: 'right' }}>
                                    <span 
                                      style={{ 
                                        padding: '4px 8px', 
                                        borderRadius: '4px',
                                        backgroundColor: campaign.status === 'ACTIVE' ? '#e6f7ea' : '#f7e6e6',
                                        color: campaign.status === 'ACTIVE' ? '#2e7d32' : '#d32f2f'
                                      }}
                                    >
                                      {campaign.status === 'ACTIVE' ? 'Ativo' : 'Inativo'}
                                    </span>
                                  </td>
                                  <td style={{ padding: '12px 8px', textAlign: 'right' }}>
                                    {formatCurrency(campaign.totalSpend)}
                                  </td>
                                  <td style={{ padding: '12px 8px', textAlign: 'right' }}>
                                    {formatNumber(campaign.totalImpressions)}
                                  </td>
                                  <td style={{ padding: '12px 8px', textAlign: 'right' }}>
                                    {formatNumber(campaign.totalClicks)}
                                  </td>
                                  <td style={{ padding: '12px 8px', textAlign: 'right' }}>
                                    {campaign.avgCTR.toFixed(2)}%
                                  </td>
                                  <td style={{ padding: '12px 8px', textAlign: 'right' }}>
                                    {formatCurrency(campaign.avgCPC)}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </Box>
                      </Paper>
                    )}
                    
                    {tabValue === 2 && (
                      <Paper sx={{ p: 3 }}>
                        <Typography variant="h6" gutterBottom>
                          Análise de Desempenho
                        </Typography>
                        <Divider sx={{ mb: 3 }} />
                        
                        <Grid container spacing={3}>
                          <Grid item xs={12} md={6}>
                            <Typography variant="subtitle1" gutterBottom fontWeight="bold">
                              Resumo
                            </Typography>
                            <Typography paragraph>
                              No período de {format(startDate, 'dd/MM/yyyy')} a {format(endDate, 'dd/MM/yyyy')}, 
                              sua conta gastou um total de {formatCurrency(overviewData.totalSpend)} em {overviewData.campaignCount} campanhas.
                            </Typography>
                            <Typography paragraph>
                              Suas campanhas geraram {formatNumber(overviewData.totalImpressions)} impressões e {formatNumber(overviewData.totalClicks)} cliques, 
                              resultando em uma taxa de cliques (CTR) média de {overviewData.avgCTR.toFixed(2)}%.
                            </Typography>
                            <Typography paragraph>
                              O custo médio por clique (CPC) foi de {formatCurrency(overviewData.avgCPC)}.
                            </Typography>
                          </Grid>
                          
                          <Grid item xs={12} md={6}>
                            <Typography variant="subtitle1" gutterBottom fontWeight="bold">
                              Campanhas de Destaque
                            </Typography>
                            {overviewData.campaigns.length > 0 ? (
                              <>
                                <Typography variant="body2" gutterBottom>
                                  <strong>Campanha com maior gasto:</strong> {overviewData.campaigns[0].name} ({formatCurrency(overviewData.campaigns[0].totalSpend)})
                                </Typography>
                                
                                {overviewData.campaigns.filter(c => c.totalClicks > 0).length > 0 && (
                                  <Typography variant="body2" gutterBottom>
                                    <strong>Campanha com melhor CTR:</strong> {
                                      overviewData.campaigns
                                        .filter(c => c.totalClicks > 0)
                                        .sort((a, b) => b.avgCTR - a.avgCTR)[0].name
                                    } ({
                                      overviewData.campaigns
                                        .filter(c => c.totalClicks > 0)
                                        .sort((a, b) => b.avgCTR - a.avgCTR)[0].avgCTR.toFixed(2)
                                    }%)
                                  </Typography>
                                )}
                                
                                {overviewData.campaigns.filter(c => c.totalClicks > 0).length > 0 && (
                                  <Typography variant="body2" gutterBottom>
                                    <strong>Campanha com melhor CPC:</strong> {
                                      overviewData.campaigns
                                        .filter(c => c.totalClicks > 0)
                                        .sort((a, b) => a.avgCPC - b.avgCPC)[0].name
                                    } ({
                                      formatCurrency(overviewData.campaigns
                                        .filter(c => c.totalClicks > 0)
                                        .sort((a, b) => a.avgCPC - b.avgCPC)[0].avgCPC)
                                    })
                                  </Typography>
                                )}
                              </>
                            ) : (
                              <Typography variant="body2">
                                Não há dados suficientes para análise.
                              </Typography>
                            )}
                          </Grid>
                        </Grid>
                      </Paper>
                    )}
                  </Box>
                    </>
                  )}
                </>
              )}
            </>
          )}
        </>
      )}
    </Container>
  );
};

export default Dashboard;
