import React, { useState, useMemo } from 'react';

function urlEhSegura(url) {
  if (!url || typeof url !== 'string') return false;
  const valor = url.trim().toLowerCase();
  return valor.startsWith('http://') || valor.startsWith('https://');
}

export default function SidebarLeft({
  carregandoRota, // Prop nova para travar o painel
  nichoBusca, aoMudarNicho, localidadeBusca, aoMudarLocalidade, maxResultados, aoMudarMaxResultados,
  custoTotalEstimado, aoBuscar, carregandoBusca, aoMudarArquivo, aoEnviarUpload, carregandoUpload,
  dadosLeads, leadsFiltrados, filtroNotaMin, aoMudarFiltroNotaMin, filtroAvaliacoesMin, aoMudarFiltroAvaliacoesMin,
  filtroSite, aoMudarFiltroSite, idsDesmarcados, aoAlternarSelecao, aoAlternarTodos
}) {
  const [mostrarFiltros, setMostrarFiltros] = useState(true);
  const [ordenacoes, setOrdenacoes] = useState([]);

  const leadsOrdenados = useMemo(() => {
    let itens = [...leadsFiltrados];
    if (ordenacoes.length > 0) {
      itens.sort((a, b) => {
        for (let ordem of ordenacoes) {
          let valorA, valorB;
          if (ordem.chave === 'nome') {
            valorA = (a.nome || '').toLowerCase(); 
            valorB = (b.nome || '').toLowerCase();
          } else if (ordem.chave === 'rating') {
            valorA = parseFloat(a.dados_brutos?.rating || 0); 
            valorB = parseFloat(b.dados_brutos?.rating || 0);
          } else if (ordem.chave === 'avaliacoes') {
            valorA = parseInt(a.dados_brutos?.total_avaliacoes || 0); 
            valorB = parseInt(b.dados_brutos?.total_avaliacoes || 0);
          } else if (ordem.chave === 'site') {
            const temSiteA = (a.dados_brutos?.site && a.dados_brutos.site.trim() !== '') ? 1 : 0;
            const temSiteB = (b.dados_brutos?.site && b.dados_brutos.site.trim() !== '') ? 1 : 0;
            valorA = temSiteA; 
            valorB = temSiteB;
          }
          if (valorA < valorB) return ordem.direcao === 'asc' ? -1 : 1;
          if (valorA > valorB) return ordem.direcao === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }
    return itens;
  }, [leadsFiltrados, ordenacoes]);

  const alternarOrdenacao = (chave) => {
    setOrdenacoes(prev => {
      const index = prev.findIndex(o => o.chave === chave);
      if (index !== -1) {
        const atual = prev[index];
        let novaDirecao = atual.direcao === 'desc' ? 'asc' : null;
        if (!novaDirecao) return prev.filter(o => o.chave !== chave);
        const novoArray = [...prev];
        novoArray[index] = { ...atual, direcao: novaDirecao };
        return novoArray;
      }
      return [...prev, { chave, direcao: 'desc' }];
    });
  };

  const renderizarIconeOrdem = (chave) => {
    const index = ordenacoes.findIndex(o => o.chave === chave);
    if (index === -1) return <span className="text-slate-300 ml-1 opacity-0 group-hover:opacity-50">↕</span>;
    const ordem = ordenacoes[index];
    const icone = ordem.direcao === 'asc' ? '↑' : '↓';
    const prioridade = ordenacoes.length > 1 ? <span className="text-[9px] ml-0.5 align-top">{index + 1}</span> : null;
    return <span className="text-slate-900 font-bold ml-1">{icone}{prioridade}</span>;
  };

  const limparOrdenacoes = () => setOrdenacoes([]);
  const todosEstaoSelecionados = leadsOrdenados.length > 0 && leadsOrdenados.every(l => !idsDesmarcados.includes(l.id));
  
  const lidarComAlternarTodos = () => {
    const idsAtuais = leadsOrdenados.map(l => l.id);
    aoAlternarTodos(idsAtuais, !todosEstaoSelecionados);
  };

  return (
    // SE ESTIVER CALCULANDO ROTA, DESLIGA INTERAÇÕES (pointer-events-none) E DEIXA O PAINEL TRANSPARENTE
    <div className={`w-[600px] flex flex-col bg-white border-r border-slate-300 z-20 shadow-2xl shrink-0 transition-all duration-300 ${carregandoRota ? 'opacity-40 pointer-events-none grayscale-[30%]' : ''}`}>
      
      {/* HEADER CORPORATIVO */}
      <div className="bg-slate-900 text-white p-5 shrink-0">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <svg className="w-6 h-6 text-slate-300" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9"></path></svg>
            <h1 className="text-xl font-bold tracking-wide uppercase">Duvasmap<span className="font-light text-slate-400"> Logistics</span></h1>
          </div>
          
          <div className="flex items-center gap-2 bg-slate-800 p-1.5 rounded-md border border-slate-700">
            <input type="file" accept=".csv, .xlsx" onChange={aoMudarArquivo} className="text-[10px] text-slate-300 file:py-1 file:px-3 file:rounded file:border-0 file:text-[10px] file:font-bold file:bg-slate-700 file:text-white hover:file:bg-slate-600 cursor-pointer w-[180px]" />
            <button onClick={aoEnviarUpload} disabled={carregandoUpload} className="bg-white text-slate-900 px-3 py-1 rounded text-[10px] font-bold uppercase hover:bg-slate-200 transition-colors disabled:opacity-50">
              {carregandoUpload ? 'Lendo...' : 'Importar'}
            </button>
          </div>
        </div>

        {/* ÁREA DE BUSCA (PROSPECÇÃO) */}
        <div className="bg-slate-800 p-4 rounded-md border border-slate-700">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-xs font-bold text-slate-300 uppercase tracking-widest flex items-center gap-2">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
              Prospecção Georreferenciada
            </h2>
            <span className="text-[10px] font-mono text-slate-400">Custo Est: ${custoTotalEstimado}</span>
          </div>
          
          <div className="flex gap-2 mb-3">
            <input type="text" placeholder="Segmento (ex: Indústria)" className="bg-slate-900 border border-slate-700 text-white text-xs p-2.5 rounded-sm w-1/2 outline-none focus:border-slate-500 placeholder-slate-500" value={nichoBusca} onChange={aoMudarNicho} />
            <input type="text" placeholder="Região (ex: Zona Sul)" className="bg-slate-900 border border-slate-700 text-white text-xs p-2.5 rounded-sm w-1/2 outline-none focus:border-slate-500 placeholder-slate-500" value={localidadeBusca} onChange={aoMudarLocalidade} />
          </div>
          
          <div className="flex gap-2 items-center">
            <select className="bg-slate-900 border border-slate-700 text-white text-xs p-2.5 rounded-sm w-1/4 outline-none cursor-pointer" value={maxResultados} onChange={aoMudarMaxResultados}>
              <option value={20}>20 Leads</option>
              <option value={40}>40 Leads</option>
              <option value={60}>60 Leads</option>
            </select>
            <button onClick={aoBuscar} disabled={carregandoBusca} className="w-3/4 bg-white text-slate-900 text-xs px-4 py-2.5 rounded-sm hover:bg-slate-200 font-bold uppercase tracking-wider transition-colors flex items-center justify-center gap-2 disabled:opacity-50">
              {carregandoBusca ? 'Processando dados geográficos...' : 'Executar Varredura'}
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden bg-white flex flex-col">
        {dadosLeads.validos.length > 0 && !carregandoBusca && (
          <div className="bg-slate-50 px-5 py-3 border-b border-slate-200 shrink-0">
            <div className="flex justify-between items-center cursor-pointer select-none mb-3" onClick={() => setMostrarFiltros(!mostrarFiltros)}>
              <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"></path></svg>
                Filtros de Qualificação
              </h3>
              <span className="text-slate-600 font-mono text-[10px] bg-slate-200 px-2 py-0.5 rounded-sm">Vol: {leadsFiltrados.length}</span>
            </div>
            
            {mostrarFiltros && (
              <div className="flex gap-3">
                <div className="w-1/3">
                  <label className="text-[9px] font-bold text-slate-400 uppercase">Nota Mínima</label>
                  <input type="number" step="0.1" min="0" max="5" value={filtroNotaMin} onChange={aoMudarFiltroNotaMin} className="w-full mt-1 p-2 text-xs rounded-sm bg-white border border-slate-300 outline-none focus:border-slate-500" placeholder="Ex: 4.0" />
                </div>
                <div className="w-1/3">
                  <label className="text-[9px] font-bold text-slate-400 uppercase">Vol. Avaliações</label>
                  <input type="number" min="0" value={filtroAvaliacoesMin} onChange={aoMudarFiltroAvaliacoesMin} className="w-full mt-1 p-2 text-xs rounded-sm bg-white border border-slate-300 outline-none focus:border-slate-500" placeholder="Ex: 50" />
                </div>
                <div className="w-1/3">
                  <label className="text-[9px] font-bold text-slate-400 uppercase">Presença Digital</label>
                  <select value={filtroSite} onChange={aoMudarFiltroSite} className="w-full mt-1 p-2 text-xs rounded-sm bg-white border border-slate-300 outline-none focus:border-slate-500">
                    <option value="todos">Indiferente</option>
                    <option value="sim">Requer Website</option>
                    <option value="nao">Sem Website</option>
                  </select>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="flex-1 overflow-auto bg-white">
          {carregandoBusca || carregandoUpload ? (
            <div className="p-5 space-y-4">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="flex gap-4 animate-pulse items-center border-b border-slate-50 pb-4">
                  <div className="h-4 w-4 bg-slate-200 rounded-sm shrink-0"></div>
                  <div className="h-6 flex-1 bg-slate-200 rounded-sm"></div>
                  <div className="h-6 w-12 bg-slate-200 rounded-sm"></div>
                  <div className="h-6 w-16 bg-slate-200 rounded-sm"></div>
                </div>
              ))}
            </div>
          ) : leadsFiltrados.length === 0 && dadosLeads.validos.length > 0 ? (
            <div className="text-center p-10 text-slate-400 text-xs font-mono">
              Nenhum registro atende aos critérios atuais.
            </div>
          ) : leadsOrdenados.length > 0 ? (
            <table className="w-full text-left text-[11px] whitespace-nowrap">
              <thead className="bg-slate-100 text-slate-500 uppercase tracking-wider border-b border-slate-200 select-none sticky top-0 z-10 font-bold text-[9px]">
                <tr>
                  <th className="p-3 w-10 text-center border-r border-slate-200">
                    <input type="checkbox" checked={todosEstaoSelecionados} onChange={lidarComAlternarTodos} className="cursor-pointer w-3.5 h-3.5 accent-slate-900" title="Selecionar Todos"/>
                  </th>
                  <th className="p-3 cursor-pointer hover:bg-slate-200 transition-colors border-r border-slate-200 group" onClick={() => alternarOrdenacao('nome')}>
                    Razão Social / Nome {renderizarIconeOrdem('nome')}
                  </th>
                  <th className="p-3 cursor-pointer hover:bg-slate-200 transition-colors border-r border-slate-200 group" onClick={() => alternarOrdenacao('rating')}>
                    Nota {renderizarIconeOrdem('rating')}
                  </th>
                  <th className="p-3 cursor-pointer hover:bg-slate-200 transition-colors border-r border-slate-200 group" onClick={() => alternarOrdenacao('avaliacoes')}>
                    Avals. {renderizarIconeOrdem('avaliacoes')}
                  </th>
                  <th className="p-3 text-center border-r border-slate-200">Website</th>
                  <th className="p-3 text-center">Referência</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {leadsOrdenados.map((lead, idx) => {
                  const estaMarcado = !idsDesmarcados.includes(lead.id);
                  const linkSiteSeguro = urlEhSegura(lead.dados_brutos?.site) ? lead.dados_brutos.site : null;
                  const linkReferenciaSeguro = urlEhSegura(lead.dados_brutos?.link) ? lead.dados_brutos.link : null;
                  
                  return (
                    <tr key={idx} className={`transition-colors ${estaMarcado ? 'hover:bg-slate-50 text-slate-900' : 'bg-slate-50 text-slate-400 opacity-60'}`}>
                      <td className="p-3 text-center border-r border-slate-100">
                        <input type="checkbox" checked={estaMarcado} onChange={() => aoAlternarSelecao(lead.id)} className="cursor-pointer w-3.5 h-3.5 accent-slate-900" />
                      </td>
                      <td className="p-3 font-semibold truncate max-w-[180px] border-r border-slate-100" title={lead.nome}>{lead.nome}</td>
                      <td className="p-3 text-center border-r border-slate-100 font-mono">{lead.dados_brutos?.rating || '-'}</td>
                      <td className="p-3 text-center border-r border-slate-100 font-mono">{lead.dados_brutos?.total_avaliacoes || '-'}</td>
                      <td className="p-3 text-center border-r border-slate-100">
                        {linkSiteSeguro ? (
                          <a href={linkSiteSeguro} target="_blank" rel="noopener noreferrer" className="text-slate-600 hover:text-slate-900 hover:underline" title={linkSiteSeguro}>
                            <svg className="w-3.5 h-3.5 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"></path></svg>
                          </a>
                        ) : <span className="text-slate-300">-</span>}
                      </td>
                      <td className="p-3 text-center">
                        {linkReferenciaSeguro && (
                          <a href={linkReferenciaSeguro} target="_blank" rel="noopener noreferrer" className="text-slate-600 hover:text-slate-900">
                            <svg className="w-3.5 h-3.5 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                          </a>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : null}
        </div>
      </div>
    </div>
  );
}