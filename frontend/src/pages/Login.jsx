import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [erroLocal, setErroLocal] = useState('');
  const [carregando, setCarregando] = useState(false);
  
  const navigate = useNavigate();
  const { lidarComLogin } = useAuth();

  const submeterLogin = async (e) => {
    e.preventDefault();
    setErroLocal('');
    setCarregando(true);
    
    const resultado = await lidarComLogin(username, password);
    if (resultado.sucesso) {
      navigate('/dashboard');
    } else {
      setErroLocal(resultado.erro);
      setCarregando(false);
    }
  };

  return (
    <div className="flex h-screen bg-slate-100 items-center justify-center font-sans">
      <div className="bg-white p-10 rounded-xl shadow-lg w-[420px] border border-slate-200">
        <div className="mb-8 text-center">
          <div className="bg-slate-900 h-12 w-12 rounded-lg flex items-center justify-center mx-auto mb-4 shadow-sm">
             <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path></svg>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Duvasmap Logistics</h1>
          <p className="text-sm text-slate-500 mt-1">Autenticação de Operador</p>
        </div>
        
        <form onSubmit={submeterLogin} className="flex flex-col gap-5">
          <div className="relative">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">Usuário Operacional</label>
            <div className="relative">
              <svg className="w-5 h-5 text-slate-400 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
              <input 
                type="text" value={username} onChange={e => setUsername(e.target.value)} required
                className="w-full pl-10 pr-3 py-2.5 rounded bg-slate-50 border border-slate-300 outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-all text-sm text-slate-800"
              />
            </div>
          </div>

          <div className="relative">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">Senha de Acesso</label>
            <div className="relative">
              <svg className="w-5 h-5 text-slate-400 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
              <input 
                type="password" value={password} onChange={e => setPassword(e.target.value)} required
                className="w-full pl-10 pr-3 py-2.5 rounded bg-slate-50 border border-slate-300 outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-all text-sm text-slate-800"
              />
            </div>
          </div>

          {erroLocal && <p className="text-rose-600 text-xs font-bold text-center bg-rose-50 border border-rose-100 p-2.5 rounded">{erroLocal}</p>}
          
          <button type="submit" disabled={carregando} className="mt-2 bg-slate-900 text-white font-bold py-3 rounded hover:bg-slate-800 transition-colors shadow-sm text-sm flex items-center justify-center gap-2 disabled:opacity-70">
            {carregando ? (
              <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
            ) : 'Acessar Plataforma'}
          </button>
        </form>

        <div className="mt-6 text-center border-t border-slate-100 pt-5">
          <Link to="/register" className="text-xs text-blue-600 hover:text-blue-800 font-semibold transition-colors">
            Solicitar credencial de operação
          </Link>
        </div>
      </div>
    </div>
  );
}