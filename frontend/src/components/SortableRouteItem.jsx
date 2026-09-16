import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

export default function SortableRouteItem({ id, index, nome }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });

  const estiloTransformacao = { 
    transform: CSS.Transform.toString(transform), 
    transition 
  };

  return (
    <div 
      ref={setNodeRef} style={estiloTransformacao} {...attributes} {...listeners}
      className="group p-3 bg-white border border-slate-200 rounded-sm shadow-sm flex gap-3 items-center cursor-grab active:cursor-grabbing hover:border-slate-400 transition-colors"
    >
      <div className="flex flex-col gap-[3px] text-slate-300 group-hover:text-slate-500 px-1">
        <div className="w-1 h-1 bg-current rounded-none"></div>
        <div className="w-1 h-1 bg-current rounded-none"></div>
        <div className="w-1 h-1 bg-current rounded-none"></div>
      </div>
      
      <div className="bg-slate-100 text-slate-500 w-6 h-6 flex items-center justify-center rounded-sm font-mono font-bold text-[10px] shrink-0 border border-slate-200">
        {index + 1}
      </div>
      
      <strong className="text-slate-700 text-xs truncate uppercase tracking-wider">{nome}</strong>
    </div>
  );
}