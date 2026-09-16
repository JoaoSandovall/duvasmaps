import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';

const RotaPrivada = ({ children }) => {
  const { token } = useAuth();
  return token ? children : <Navigate to="/login" replace />;
};

const RotaPublica = ({ children }) => {
  const { token } = useAuth();
  return token ? <Navigate to="/dashboard" replace /> : children;
};

export default function App() {
  return (
    <AuthProvider>
      <Toaster richColors position="top-right" theme="light" closeButton />
      
      <Router>
        <Routes>
          <Route path="/login" element={<RotaPublica><Login /></RotaPublica>} />
          <Route path="/register" element={<RotaPublica><Register /></RotaPublica>} />
          
          <Route path="/dashboard" element={
            <RotaPrivada>
              <Dashboard />
            </RotaPrivada>
          } />
          
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}