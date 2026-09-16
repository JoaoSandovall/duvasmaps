import { useState } from 'react';
import { toast } from 'sonner';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8020';

export function useLeads(token) {
  const [arquivo, setArquivo] = useState(null);
  const [dados, setDados] = useState({ validos: [], pendentes: [] });
  
  const [carregandoUpload, setCarregandoUpload] = useState(false);
  const [carregandoBusca, setCarregandoBusca] = useState(false);

  const [nichoBusca, setNichoBusca] = useState('');
  const [localidadeBusca, setLocalidadeBusca] = useState('');
  const [maxResultados, setMaxResultados] = useState(20);

  const [filtroNotaMin, setFiltroNotaMin] = useState('');
  const [filtroAvaliacoesMin, setFiltroAvaliacoesMin] = useState('');
  const [filtroSite, setFiltroSite] = useState('todos');
  const [idsDesmarcados, setIdsDesmarcados] = useState([]);

  const custoPorPagina = 0.032;
  const paginasEstimadas = Math.ceil(maxResultados / 20);
  const custoTotalEstimado = (paginasEstimadas * custoPorPagina).toFixed(3);

  const cabecalhosAutenticacao = { 'Authorization': `Bearer ${token}` };

  const lidarComMudancaArquivo = (e) => setArquivo(e.target.files[0]);

  const lidarComUpload = async (onSuccess) => {
    if (!arquivo) return toast.error("Selecione um arquivo primeiro.");
    
    setCarregandoUpload(true);
    const toastId = toast.loading("Processando planilha de leads...");
    
    const formData = new FormData();
    formData.append('file', arquivo);

    try {
      const resposta = await fetch(`${API_URL}/api/upload-leads`, {
        method: 'POST', headers: cabecalhosAutenticacao, body: formData,
      });
      const resultado = await resposta.json();
      if (resposta.ok) {
        setDados(resultado.data);
        setIdsDesmarcados([]); 
        toast.success(`Upload concluído: ${resultado.leads_validos} leads extraídos com sucesso.`, { id: toastId });
        if (onSuccess) onSuccess();
      } else {
        toast.error(resultado.detail || "Erro ao processar arquivo.", { id: toastId });
      }
    } catch (erro) {
      toast.error("Falha de comunicação com o servidor.", { id: toastId });
    } finally {
      setCarregandoUpload(false);
    }
  };

  // 1. CHAMA O TOAST DE CONFIRMAÇÃO INTERATIVO (Substitui o window.confirm)
  const lidarComBusca = (onSuccess) => {
    if (!nichoBusca || !localidadeBusca) {
      return toast.warning("Parâmetros ausentes", { description: "Preencha o segmento e a região para prospectar." });
    }
    
    toast('Autorização de Faturamento', {
      description: `Esta operação fará requisições pagas ao Google (Aprox. $${custoTotalEstimado} USD).`,
      action: {
        label: 'Autorizar Processamento',
        onClick: () => executarBuscaConfirmada(onSuccess), // 2. SÓ RODA SE CLICAR AQUI
      },
      cancel: {
        label: 'Cancelar',
      },
      duration: 10000,
    });
  };

  // 3. EXECUTA A BUSCA REAL APÓS O CLIQUE NO TOAST
  const executarBuscaConfirmada = async (onSuccess) => {
    setCarregandoBusca(true);
    const toastId = toast.loading(`Mapeando ${nichoBusca} na região de ${localidadeBusca}...`);

    try {
      const resposta = await fetch(`${API_URL}/api/search-places`, {
        method: 'POST', 
        headers: { ...cabecalhosAutenticacao, 'Content-Type': 'application/json' },
        body: JSON.stringify({ nicho: nichoBusca, localidade: localidadeBusca, max_resultados: maxResultados })
      });
      const resultado = await resposta.json();
      if (resposta.ok) {
        setDados(resultado.data);
        setIdsDesmarcados([]); 
        toast.success(`Varredura concluída. ${resultado.data.validos.length} estabelecimentos encontrados.`, { id: toastId });
        if (onSuccess) onSuccess();
      } else {
        toast.error(resultado.detail || 'Falha ao executar varredura geográfica.', { id: toastId });
      }
    } catch (erro) {
      toast.error("Erro interno ao contatar provedor de dados.", { id: toastId });
    } finally {
      setCarregandoBusca(false);
    }
  };

  const alternarSelecao = (id) => {
    setIdsDesmarcados(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const alternarTodos = (ids, selecionar) => {
    if (selecionar) setIdsDesmarcados(prev => prev.filter(id => !ids.includes(id)));
    else setIdsDesmarcados(prev => [...new Set([...prev, ...ids])]);
  };

  const leadsFiltrados = dados.validos.filter(lead => {
    const nota = parseFloat(lead.dados_brutos?.rating || lead.dados_brutos?.nota || 0);
    const avaliacoes = parseInt(lead.dados_brutos?.total_avaliacoes || lead.dados_brutos?.avaliacoes || 0);
    const siteStr = lead.dados_brutos?.site || lead.dados_brutos?.website || '';
    const temSiteUrl = siteStr && siteStr.trim().length > 0;

    if (filtroNotaMin && nota < parseFloat(filtroNotaMin)) return false;
    if (filtroAvaliacoesMin && avaliacoes < parseInt(filtroAvaliacoesMin)) return false;
    if (filtroSite === 'sim' && !temSiteUrl) return false;
    if (filtroSite === 'nao' && temSiteUrl) return false;
    return true;
  });

  const leadsComCoordenadas = leadsFiltrados.filter(lead => 
    lead.localizacao.tipo === 'coordenadas' && !idsDesmarcados.includes(lead.id)
  );

  return {
    dados, 
    arquivo, lidarComMudancaArquivo, lidarComUpload, carregandoUpload,
    nichoBusca, setNichoBusca, localidadeBusca, setLocalidadeBusca, maxResultados, setMaxResultados,
    custoTotalEstimado, lidarComBusca, carregandoBusca,
    filtroNotaMin, setFiltroNotaMin, filtroAvaliacoesMin, setFiltroAvaliacoesMin, filtroSite, setFiltroSite,
    idsDesmarcados, alternarSelecao, alternarTodos, leadsFiltrados, leadsComCoordenadas
  };
}