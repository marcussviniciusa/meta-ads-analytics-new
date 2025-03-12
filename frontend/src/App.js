import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { ptBR } from '@mui/material/locale';
import { AuthProvider, useAuth } from './context/AuthContext';

// Pages
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import ConnectMeta from './pages/ConnectMeta';
import MetaAccounts from './pages/MetaAccounts';
import Navigation from './components/Navigation';

// Tema personalizado
const theme = createTheme({
  palette: {
    primary: {
      main: '#1877F2', // Cor do Facebook/Meta
    },
    secondary: {
      main: '#42B72A', // Verde do Facebook/Meta
    },
  },
  typography: {
    fontFamily: [
      '-apple-system',
      'BlinkMacSystemFont',
      '"Segoe UI"',
      'Roboto',
      '"Helvetica Neue"',
      'Arial',
      'sans-serif',
    ].join(','),
  },
}, ptBR);

// Componente para rotas protegidas
const PrivateRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  
  // Mostrar nada enquanto verifica autenticação
  if (loading) {
    return null;
  }
  
  return isAuthenticated ? children : <Navigate to="/login" />;
};

const App = () => {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <Router>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route 
              path="/" 
              element={
                <PrivateRoute>
                  <>
                    <Navigation />
                    <Dashboard />
                  </>
                </PrivateRoute>
              } 
            />
            <Route 
              path="/dashboard" 
              element={
                <PrivateRoute>
                  <>
                    <Navigation />
                    <Dashboard />
                  </>
                </PrivateRoute>
              } 
            />
            <Route 
              path="/connect-meta" 
              element={
                <PrivateRoute>
                  <>
                    <Navigation />
                    <ConnectMeta />
                  </>
                </PrivateRoute>
              } 
            />
            <Route 
              path="/connect-meta/callback" 
              element={
                <PrivateRoute>
                  <>
                    <Navigation />
                    <ConnectMeta />
                  </>
                </PrivateRoute>
              } 
            />
            <Route 
              path="/meta-accounts" 
              element={
                <PrivateRoute>
                  <>
                    <Navigation />
                    <MetaAccounts />
                  </>
                </PrivateRoute>
              } 
            />
            <Route 
              path="/reports/meta/:accountId" 
              element={
                <PrivateRoute>
                  <>
                    <Navigation />
                    <div>Reports Page (Em desenvolvimento)</div>
                  </>
                </PrivateRoute>
              } 
            />
            {/* Redirecionar para dashboard se a rota não for encontrada */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App;
