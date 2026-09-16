import { useState } from 'react';
import { arrayMove } from '@dnd-kit/sortable';
import { toast } from 'sonner';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8020';

export function useRouting(token, leadsComCoordenadas, localizacaoAtual) {
  const [rota, setRota] = useState({ ordenada: [], distancia: 0 });
  const [perfilRota, setPerfilRota] = useState('driving');
  const [geometriaRota, setGeometriaRota] = useState([]);
  
  const [carregandoRota, setCarregandoRota] = useState(false);
  const [statusMensagem, setStatusMensagem] = useState(''); // NOVO ESTADO: Transparência de Processamento
  const [salvandoRota, setSalvandoRota] = useState(false);
  const [exportandoRota, setExportandoRota] = useState(false);

  const cabecalhosAutenticacao = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };

  const limparRota = () => {
    setRota({ ordenada: [], distancia: 0 });
    setGeometriaRota([]);
  };

  const lidarComOtimizacao = async (perfilDesejado = perfilRota) => {
    const perfilFinal = typeof perfilDesejado === 'string' ? perfilDesejado : perfilRota;
    
    if (leadsComCoordenadas.length < 1) return toast.warning("Selecione pelo menos um cliente na tabela.");
    if (!localizacaoAtual && leadsComCoordenadas.length < 2) return toast.warning("Mínimo de 2 pontos necessários para gerar rota.");
    
    setCarregandoRota(true);
    setGeometriaRota([]); 
    
    const toastId = toast.loading("Iniciando motor de roteirização...");

    setStatusMensagem("Geocodificando endereços...");
    const etapasTecnicas = [
      "Resolvendo matriz de distâncias...",
      "Processando nós da rede...",
      "Otimizando trajeto via TSP...",
      "Renderizando malha viária..."
    ];
    let step = 0;
    const intervaloStatus = setInterval(() => {
      if (step < etapasTecnicas.length) {
        setStatusMensagem(etapasTecnicas[step]);
        step++;
      }
    }, 800);

    const carga = {
      leads: leadsComCoordenadas.map(lead => ({
        id: lead.id, nome: lead.nome, lat: lead.localizacao.lat, lng: lead.localizacao.lng
      })),
      perfil: perfilFinal,
      origem_lat: localizacaoAtual ? localizacaoAtual.lat : null,
      origem_lng: localizacaoAtual ? localizacaoAtual.lng : null
    };

    try {
      const resposta = await fetch(`${API_URL}/api/optimize-route`, {
        method: 'POST', headers: cabecalhosAutenticacao, body: JSON.stringify(carga)
      });
      const resultado = await resposta.json();
      if (resposta.ok) {
        setRota({ ordenada: resultado.rota_ordenada, distancia: resultado.distancia_total_km });
        setGeometriaRota(resultado.geometria);
        toast.success(`Rota otimizada com sucesso. Distância total: ${resultado.distancia_total_km} km`, { id: toastId });
      } else {
        toast.error("Falha ao processar rota matemática.", { id: toastId });
      }
    } catch (erro) {
      toast.error("Erro ao contatar o servidor de roteirização.", { id: toastId });
    } finally {
      clearInterval(intervaloStatus);
      setCarregandoRota(false);
      setStatusMensagem('');
    }
  };

  const lidarComMudancaPerfil = (novoPerfil) => {
    setPerfilRota(novoPerfil);
    if (rota.ordenada.length > 0) lidarComOtimizacao(novoPerfil);
  };

  const lidarComSalvamento = async () => {
    if (rota.ordenada.length === 0) return;
    setSalvandoRota(true);
    const toastId = toast.loading("Registrando rota no banco de dados...");
    
    const carga = { distancia: rota.distancia, rota: rota.ordenada.map(p => ({ id: p.id, nome: p.nome, lat: p.lat, lng: p.lng })) };
    try {
      const resposta = await fetch(`${API_URL}/api/save-route`, {
        method: 'POST', headers: cabecalhosAutenticacao, body: JSON.stringify(carga)
      });
      if (resposta.ok) {
        toast.success("Registro operacional salvo com sucesso.", { id: toastId });
      } else {
        toast.error("Falha ao salvar o registro da rota.", { id: toastId });
      }
    } catch (erro) { 
      toast.error("Erro de conexão ao salvar rota.", { id: toastId });
    } finally { 
      setSalvandoRota(false); 
    }
  };

  const lidarComExportacao = async () => {
    if (rota.ordenada.length === 0) return;
    setExportandoRota(true);
    const toastId = toast.loading("Gerando arquivo XLSX...");

    const carga = { leads: rota.ordenada.map(p => ({ id: p.id, nome: p.nome, lat: p.lat, lng: p.lng })) };
    try {
      const resposta = await fetch(`${API_URL}/api/export-route`, {
        method: 'POST', headers: cabecalhosAutenticacao, body: JSON.stringify(carga)
      });
      if (resposta.ok) {
        const blob = await resposta.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = 'rota_otimizada.xlsx';
        document.body.appendChild(a); a.click(); a.remove();
        window.URL.revokeObjectURL(url);
        toast.success("Arquivo exportado e baixado.", { id: toastId });
      } else { 
        toast.error("O servidor não conseguiu compilar a planilha.", { id: toastId }); 
      }
    } catch (erro) { 
      toast.error("Erro durante o download do arquivo.", { id: toastId }); 
    } finally { 
      setExportandoRota(false); 
    }
  };

  const lidarComFimArrasto = (evento) => {
    const { active, over } = evento;
    if (active && over && active.id !== over.id) {
      setRota((estadoAnterior) => {
        const indiceAntigo = estadoAnterior.ordenada.findIndex((item) => item.id === active.id);
        const indiceNovo = estadoAnterior.ordenada.findIndex((item) => item.id === over.id);
        return { ...estadoAnterior, ordenada: arrayMove(estadoAnterior.ordenada, indiceAntigo, indiceNovo) };
      });
      setGeometriaRota([]);
      toast.info("Sequência alterada manualmente.", { description: "As linhas no mapa foram ocultadas para evitar dados divergentes." });
    }
  };

  return {
    rota, perfilRota, geometriaRota, limparRota,
    carregandoRota, salvandoRota, exportandoRota, statusMensagem,
    lidarComOtimizacao, lidarComMudancaPerfil, lidarComSalvamento, lidarComExportacao, lidarComFimArrasto
  };
}