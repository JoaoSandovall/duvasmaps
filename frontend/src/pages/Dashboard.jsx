import React from 'react';
import SidebarLeft from '../components/SidebarLeft';
import InteractiveMap from '../components/InteractiveMap';
import SidebarRight from '../components/SidebarRight';
import { useAuth } from '../contexts/AuthContext';
import { useLeads } from '../hooks/useLeads';
import { useRouting } from '../hooks/useRouting';
import { useGPS } from '../hooks/useGPS';

export default function Dashboard() {
  const { token, lidarComLogout } = useAuth();
  
  const gps = useGPS(token);
  const leads = useLeads(token);
  const roteamento = useRouting(token, leads.leadsComCoordenadas, gps.localizacaoAtual);

  const executarBusca = () => leads.lidarComBusca(roteamento.limparRota);
  const executarUpload = () => leads.lidarComUpload(roteamento.limparRota);

  return (
    <div className="flex h-screen bg-slate-50 text-slate-800 font-sans overflow-hidden">
      <SidebarLeft 
        carregandoRota={roteamento.carregandoRota} 
        
        nichoBusca={leads.nichoBusca} aoMudarNicho={e => leads.setNichoBusca(e.target.value)}
        localidadeBusca={leads.localidadeBusca} aoMudarLocalidade={e => leads.setLocalidadeBusca(e.target.value)}
        maxResultados={leads.maxResultados} aoMudarMaxResultados={e => leads.setMaxResultados(Number(e.target.value))}
        custoTotalEstimado={leads.custoTotalEstimado} aoBuscar={executarBusca} carregandoBusca={leads.carregandoBusca}
        aoMudarArquivo={leads.lidarComMudancaArquivo} aoEnviarUpload={executarUpload} carregandoUpload={leads.carregandoUpload}
        dadosLeads={leads.dados} leadsFiltrados={leads.leadsFiltrados}
        filtroNotaMin={leads.filtroNotaMin} aoMudarFiltroNotaMin={e => leads.setFiltroNotaMin(e.target.value)}
        filtroAvaliacoesMin={leads.filtroAvaliacoesMin} aoMudarFiltroAvaliacoesMin={e => leads.setFiltroAvaliacoesMin(e.target.value)}
        filtroSite={leads.filtroSite} aoMudarFiltroSite={e => leads.setFiltroSite(e.target.value)}
        idsDesmarcados={leads.idsDesmarcados} aoAlternarSelecao={leads.alternarSelecao} aoAlternarTodos={leads.alternarTodos}
      />
      
      <div className="flex-1 flex flex-row relative z-0">
        <InteractiveMap 
          leadsComCoordenadas={leads.leadsComCoordenadas} 
          rotaOrdenada={roteamento.rota.ordenada} aoOtimizar={() => roteamento.lidarComOtimizacao()} carregandoRota={roteamento.carregandoRota}
          statusMensagem={roteamento.statusMensagem} /* A NOVA VARIÁVEL INJETADA AQUI */
          perfilRota={roteamento.perfilRota} aoMudarPerfil={roteamento.lidarComMudancaPerfil} geometriaRota={roteamento.geometriaRota}
          localizacaoAtual={gps.localizacaoAtual} aoBuscarLocalizacao={gps.obterLocalizacaoAtual} buscandoLocalizacao={gps.buscandoLocalizacao}
        />

        <button 
          onClick={lidarComLogout}
          title="Encerrar sessão operacional"
          className="absolute top-6 right-6 z-[1000] bg-white text-slate-700 font-bold px-4 py-2.5 rounded shadow-sm border border-slate-300 hover:bg-slate-100 hover:border-slate-400 transition-colors flex items-center gap-2 text-sm"
        >
          <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>
          Sair
        </button>

        <SidebarRight 
          rota={roteamento.rota} 
          aoExportar={roteamento.lidarComExportacao} exportandoRota={roteamento.exportandoRota} 
          aoSalvar={roteamento.lidarComSalvamento} salvandoRota={roteamento.salvandoRota} 
          aoFinalizarArrasto={roteamento.lidarComFimArrasto} 
        />
      </div>
    </div>
  );
}