import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';

const AuthContext = createContext();
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8020';

export function AuthProvider({ children }) {
  const [token, setToken] = useState(localStorage.getItem('duvasmap_token'));

  const atualizarToken = useCallback((novoToken) => {
    if (novoToken) {
      localStorage.setItem('duvasmap_token', novoToken);
    } else {
      localStorage.removeItem('duvasmap_token');
    }
    setToken(novoToken);
  }, []);

  const lidarComLogout = useCallback(() => {
    atualizarToken(null);
  }, [atualizarToken]);

  useEffect(() => {
    const fetchOriginal = window.fetch;
    
    window.fetch = async (...args) => {
      
        const resposta = await fetchOriginal(...args);
      const url = typeof args[0] === 'string' ? args[0] : (args[0]?.url || '');
      const rotaLivre = url.includes('/api/token') || url.includes('/api/register');
      
      if (resposta.status === 401 && !rotaLivre && token) {
        lidarComLogout();
        toast.error("Sessão Expirada", {
          description: "Por segurança corporativa, sua credencial de 24h foi invalidada. Autentique-se novamente."
        });
      }
      
      return resposta;
    };

    return () => {
      window.fetch = fetchOriginal;
    };
  }, [token, lidarComLogout]);

  const lidarComLogin = async (username, password) => {
    const formData = new URLSearchParams();
    formData.append('username', username);
    formData.append('password', password);

    const resposta = await fetch(`${API_URL}/api/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formData
    });

    if (resposta.ok) {
      const dados = await resposta.json();
      atualizarToken(dados.access_token);
      return { sucesso: true };
    } else {
      return { sucesso: false, erro: "Credenciais inválidas. Verifique usuário e senha." };
    }
  };

  const lidarComRegistro = async (username, password, codigoConvite) => {
    const formData = new URLSearchParams();
    formData.append('username', username);
    formData.append('password', password);
    formData.append('client_secret', codigoConvite);

    const resposta = await fetch(`${API_URL}/api/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formData
    });

    if (resposta.ok) {
      return { sucesso: true };
    } else {
      const erro = await resposta.json();
      return { sucesso: false, erro: erro.detail || "Não foi possível cadastrar o operador." };
    }
  };

  return (
    <AuthContext.Provider value={{ token, lidarComLogin, lidarComRegistro, lidarComLogout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}