import React, { useState } from 'react';
import { DndContext, closestCenter } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import SortableRouteItem from './SortableRouteItem';

export default function SidebarRight({
  rota, aoExportar, exportandoRota, aoSalvar, salvandoRota, aoFinalizarArrasto
}) {
  const [gavetaAberta, setGavetaAberta] = useState(true);

  return (
    <div className={`relative bg-white border-l border-slate-300 z-10 shadow-2xl flex flex-col shrink-0 transition-[width] duration-300 ease-in-out ${gavetaAberta ? 'w-[380px]' : 'w-0'}`}>
      
      <button 
        onClick={() => setGavetaAberta(!gavetaAberta)}
        title={gavetaAberta ? "Ocultar painel" : "Exibir plano de rota"}
        className="absolute top-1/2 -translate-y-1/2 -left-[30px] bg-white border border-slate-300 border-r-0 rounded-l-md p-1.5 shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.05)] text-slate-500 hover:text-slate-900 z-50 transition-colors"
      >
        <svg className={`w-4 h-4 transition-transform duration-300 ${gavetaAberta ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path></svg>
      </button>

      <div className="w-[380px] h-full flex flex-col overflow-hidden">
        <div className="p-6 border-b border-slate-200 flex flex-col gap-5 bg-slate-50 shrink-0">
          <div>
            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-widest mb-2 flex items-center gap-2">
              <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2"></path></svg>
              Plano de Roteirização
            </h2>
            {rota.distancia > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Distância Total:</span>
                <span className="text-xs font-mono font-bold text-slate-900 bg-slate-200 px-2 py-0.5 rounded-sm">{rota.distancia} km</span>
              </div>
            )}
          </div>
          
          {rota.ordenada.length > 0 && (
            <div className="flex flex-col gap-2.5">
              <button 
                onClick={aoExportar} disabled={exportandoRota}
                className="w-full bg-white text-slate-800 border border-slate-300 px-4 py-2.5 rounded-sm hover:bg-slate-100 text-xs font-bold uppercase tracking-wider transition-colors disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                {exportandoRota ? 'Processando Arquivo...' : 'Exportar Dados (XLSX)'}
              </button>
              <button 
                onClick={aoSalvar} disabled={salvandoRota}
                className="w-full bg-emerald-700 text-white px-4 py-2.5 rounded-sm hover:bg-emerald-800 text-xs font-bold uppercase tracking-wider shadow-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                {salvandoRota ? 'Registrando...' : 'Registrar Rota no Sistema'}
              </button>
            </div>
          )}
        </div>
        
        <div className="p-5 overflow-auto bg-white flex-1">
          {rota.ordenada.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center opacity-50">
              <svg className="w-10 h-10 text-slate-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"></path></svg>
              <p className="text-slate-500 text-xs font-medium max-w-[200px] uppercase tracking-wider">Aguardando geração da malha viária</p>
            </div>
          ) : (
            <DndContext collisionDetection={closestCenter} onDragEnd={aoFinalizarArrasto}>
              <SortableContext items={rota.ordenada.map(p => p.id)} strategy={verticalListSortingStrategy}>
                <div className="flex flex-col gap-2">
                  {rota.ordenada.map((ponto, idx) => (
                    <SortableRouteItem key={ponto.id} id={ponto.id} index={idx} nome={ponto.nome} />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </div>
      </div>

    </div>
  );
}