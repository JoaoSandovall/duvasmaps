import React from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

const leadPinHtml = `
  <div class="relative flex items-center justify-center w-8 h-8 drop-shadow-md">
    <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="#0f172a" stroke="#ffffff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"></path>
      <circle cx="12" cy="10" r="3" fill="#ffffff"></circle>
    </svg>
  </div>
`;

const leadIcon = new L.divIcon({
  className: 'bg-transparent border-0',
  html: leadPinHtml,
  iconSize: [28, 28],
  iconAnchor: [14, 28],
  popupAnchor: [0, -28]
});

const gpsPulsanteHtml = `
  <div class="relative flex h-5 w-5 items-center justify-center">
    <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-slate-400 opacity-75"></span>
    <span class="relative inline-flex rounded-full h-3.5 w-3.5 bg-slate-900 border-2 border-white shadow-sm"></span>
  </div>
`;

const userIcon = new L.divIcon({
  className: 'bg-transparent border-0',
  html: gpsPulsanteHtml,
  iconSize: [20, 20],
  iconAnchor: [10, 10],
});

export default function InteractiveMap({ 
  leadsComCoordenadas, rotaOrdenada, aoOtimizar, carregandoRota,
  statusMensagem,
  perfilRota, aoMudarPerfil, geometriaRota,
  localizacaoAtual, aoBuscarLocalizacao, buscandoLocalizacao
}) {
  const caminhoMapa = geometriaRota && geometriaRota.length > 0 
    ? geometriaRota 
    : rotaOrdenada.map(ponto => [ponto.lat, ponto.lng]);

  return (
    <div className="flex-1 relative z-0 bg-slate-200">
      
      {leadsComCoordenadas.length > 0 && (
        <div className="absolute top-6 left-1/2 -translate-x-1/2 z-[1000] flex flex-col items-center gap-2">
          
          <div className="flex bg-white rounded-md shadow-sm p-1 border border-slate-300">
            <button 
              onClick={() => aoMudarPerfil('driving')} 
              className={`px-6 py-1.5 text-[11px] font-bold uppercase tracking-wider rounded-sm transition-colors flex items-center gap-2 ${perfilRota === 'driving' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-100'}`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg>
              Veículo
            </button>
            <button 
              onClick={() => aoMudarPerfil('foot')} 
              className={`px-6 py-1.5 text-[11px] font-bold uppercase tracking-wider rounded-sm transition-colors flex items-center gap-2 ${perfilRota === 'foot' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-100'}`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
              Pedestre
            </button>
          </div>

          <button 
            onClick={aoOtimizar} disabled={carregandoRota} 
            className="bg-slate-900 text-white px-8 py-3 rounded-md shadow-lg font-bold text-xs uppercase tracking-widest hover:bg-slate-800 transition-all flex items-center justify-center gap-2 disabled:opacity-70 min-w-[300px]"
          >
            {carregandoRota ? (
              <>
                <svg className="animate-spin h-4 w-4 text-white shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                {statusMensagem || 'Processando Roteirização...'}
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"></path></svg>
                Processar Roteirização (TSP)
              </>
            )}
          </button>
        </div>
      )}

      <div className="absolute bottom-6 right-6 z-[1000]">
        <button
          onClick={aoBuscarLocalizacao} disabled={buscandoLocalizacao} title="Sincronizar Coordenadas Atuais"
          className="bg-white text-slate-800 p-3 rounded-md shadow-md border border-slate-300 hover:bg-slate-100 transition-colors flex items-center justify-center"
        >
          {buscandoLocalizacao ? (
            <svg className="animate-spin h-5 w-5 text-slate-800" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 2a10 10 0 00-7.07 17.07L12 22l7.07-2.93A10 10 0 0012 2z"></path></svg>
          )}
        </button>
      </div>
      
      <MapContainer center={[-15.7942, -47.8821]} zoom={11} className="w-full h-full" zoomControl={false}>
        {/* Mapa técnico em tons de cinza claro */}
        <TileLayer url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" />
        
        {leadsComCoordenadas.map((lead, idx) => (
          <Marker key={idx} position={[lead.localizacao.lat, lead.localizacao.lng]} icon={leadIcon}>
            <Popup><span className="font-mono text-xs font-bold text-slate-900">{lead.nome}</span></Popup>
          </Marker>
        ))}

        {localizacaoAtual && (
          <Marker position={[localizacaoAtual.lat, localizacaoAtual.lng]} icon={userIcon}>
            <Popup><span className="font-bold text-slate-900 uppercase text-[10px] tracking-widest">Origem Operacional</span></Popup>
          </Marker>
        )}

        {rotaOrdenada.length > 0 && (
          <Polyline 
            key={`linha-${perfilRota}-${caminhoMapa.length}`}
            positions={caminhoMapa} 
            color={perfilRota === 'foot' ? "#475569" : "#0f172a"} 
            weight={4} 
            opacity={0.8} 
            dashArray={perfilRota === 'foot' ? "8, 8" : null}
          />
        )}
      </MapContainer>
    </div>
  );
}