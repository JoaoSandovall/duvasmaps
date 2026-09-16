import { useState, useEffect } from 'react';

export function useGPS(token) {
  const [localizacaoAtual, setLocalizacaoAtual] = useState(null);
  const [buscandoLocalizacao, setBuscandoLocalizacao] = useState(false);

  const obterLocalizacaoAtual = () => {
    setBuscandoLocalizacao(true);
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (posicao) => {
          setLocalizacaoAtual({ lat: posicao.coords.latitude, lng: posicao.coords.longitude });
          setBuscandoLocalizacao(false);
        },
        (erro) => {
          console.error("Erro ao obter GPS:", erro);
          setBuscandoLocalizacao(false);
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    } else {
      setBuscandoLocalizacao(false);
    }
  };

  useEffect(() => {
    if (token) {
      obterLocalizacaoAtual();
    }
  }, [token]);

  return {
    localizacaoAtual,
    buscandoLocalizacao,
    obterLocalizacaoAtual
  };
}