import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';

export default function Register() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [codigoConvite, setCodigoConvite] = useState('');
  const [erroLocal, setErroLocal] = useState('');
  const [carregando, setCarregando] = useState(false);
  
  const navigate = useNavigate();
  const { lidarComRegistro } = useAuth();

  const submeterRegistro = async (e) => {
    e.preventDefault();
    setErroLocal('');
    setCarregando(true);
    
    const resultado = await lidarComRegistro(username, password, codigoConvite);
    if (resultado.sucesso) {
      // Fim do window.alert()!
      toast.success("Credencial criada com sucesso.", { 
        description: "Você já pode acessar a plataforma operacional." 
      });
      navigate('/login');
    } else {
      setErroLocal(resultado.erro);
      setCarregando(false);
    }
  };

  return (
    <div className="flex h-screen bg-slate-100 items-center justify-center font-sans">
      <div className="bg-white p-10 rounded-xl shadow-lg w-[420px] border border-slate-200">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Novo Operador</h1>
          <p className="text-sm text-slate-500 mt-1">Autorização Corporativa</p>
        </div>
        
        <form onSubmit={submeterRegistro} className="flex flex-col gap-4">
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">Usuário de Rede</label>
            <div className="relative">
               <svg className="w-5 h-5 text-slate-400 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
              <input 
                type="text" value={username} onChange={e => setUsername(e.target.value)} required
                className="w-full pl-10 pr-3 py-2.5 rounded bg-slate-50 border border-slate-300 outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-all text-sm text-slate-800"
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">Senha Segura</label>
            <div className="relative">
              <svg className="w-5 h-5 text-slate-400 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
              <input 
                type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={8}
                className="w-full pl-10 pr-3 py-2.5 rounded bg-slate-50 border border-slate-300 outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-all text-sm text-slate-800"
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">Token de Aprovação (Env)</label>
            <div className="relative">
               <svg className="w-5 h-5 text-slate-400 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path></svg>
              <input 
                type="password" value={codigoConvite} onChange={e => setCodigoConvite(e.target.value)} required
                className="w-full pl-10 pr-3 py-2.5 rounded bg-slate-50 border border-slate-300 outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-all text-sm text-slate-800"
                placeholder="Código de segurança..."
              />
            </div>
          </div>

          {erroLocal && <p className="text-rose-600 text-xs font-bold text-center bg-rose-50 border border-rose-100 p-2.5 rounded">{erroLocal}</p>}
          
          <button type="submit" disabled={carregando} className="mt-2 bg-slate-900 text-white font-bold py-3 rounded hover:bg-slate-800 transition-colors shadow-sm text-sm flex justify-center items-center gap-2">
            {carregando ? 'Validando servidor...' : 'Registrar Operador'}
          </button>
        </form>

        <div className="mt-6 text-center border-t border-slate-100 pt-5">
          <Link to="/login" className="text-xs text-slate-500 hover:text-slate-800 font-semibold transition-colors">
            Cancelar e retornar
          </Link>
        </div>
      </div>
    </div>
  );
}