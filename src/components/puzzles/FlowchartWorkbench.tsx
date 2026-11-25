import React from 'react';
import { ArrowDown, ArrowUp, Plus, Trash2, Workflow } from 'lucide-react';
import type { FlowchartBlock, FlowchartTask } from '@/types/level';

interface FlowchartWorkbenchProps {
  task: FlowchartTask;
  order: string[];
  isExamMode: boolean;
  onAddBlock: (blockId: string) => void;
  onRemoveAt: (idx: number) => void;
  onMove: (idx: number, dir: -1 | 1) => void;
}

const KIND_STYLE: Record<FlowchartBlock['kind'], string> = {
  start: 'border-sky-300 dark:border-sky-800 bg-sky-50/70 dark:bg-sky-950/30',
  action: 'border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900',
  decision: 'border-amber-300 dark:border-amber-800 bg-amber-50/70 dark:bg-amber-950/30',
  stack: 'border-violet-300 dark:border-violet-800 bg-violet-50/70 dark:bg-violet-950/30',
  return: 'border-emerald-300 dark:border-emerald-800 bg-emerald-50/70 dark:bg-emerald-950/30',
  bug: 'border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900',
};

export const FlowchartWorkbench: React.FC<FlowchartWorkbenchProps> = ({
  task,
  order,
  isExamMode,
  onAddBlock,
  onRemoveAt,
  onMove,
}) => {
  const availableBlocks = task.blocks.filter((b) => !order.includes(b.id));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
      {/* Left: Available Blocks Pool */}
      <div className="lg:col-span-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-bold text-zinc-800 dark:text-zinc-100">
            Bloques disponibles ({availableBlocks.length})
          </h3>
          <span className="text-[11px] text-zinc-400">Pulsa para añadir</span>
        </div>

        {availableBlocks.length === 0 ? (
          <div className="py-8 text-center text-xs text-zinc-400">
            Todos los bloques están colocados en el diagrama.
          </div>
        ) : (
          <div className="space-y-2">
            {availableBlocks.map((blk) => (
              <button
                key={blk.id}
                type="button"
                onClick={() => onAddBlock(blk.id)}
                className="w-full text-left flex items-center justify-between gap-2.5 px-3 py-2.5 rounded-xl bg-zinc-50 hover:bg-zinc-100 dark:bg-zinc-950/60 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 transition"
              >
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-zinc-800 dark:text-zinc-100">
                    {blk.label}
                  </div>
                  {blk.code && (
                    <code className="block mt-0.5 font-mono text-[11px] text-emerald-600 dark:text-emerald-400 truncate">
                      {blk.code}
                    </code>
                  )}
                  {!isExamMode && blk.detail && (
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                      {blk.detail}
                    </p>
                  )}
                </div>
                <Plus className="w-4 h-4 text-zinc-400 shrink-0" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Right: Ordered Flowchart Sequence */}
      <div className="lg:col-span-7 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Workflow className="w-4 h-4 text-emerald-500" />
            <h3 className="text-xs font-bold text-zinc-800 dark:text-zinc-100">
              {task.title}
            </h3>
          </div>
          <span className="text-[11px] font-mono text-zinc-500">
            {order.length} pasos
          </span>
        </div>

        {order.length === 0 ? (
          <div className="py-12 text-center border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl text-xs text-zinc-400">
            Selecciona los bloques de la izquierda en el orden exacto de ejecución.
            <br />
            ¡Cuidado! Puede haber bloques trampa con bugs típicos de examen.
          </div>
        ) : (
          <div className="space-y-1.5">
            {order.map((blockId, idx) => {
              const blk = task.blocks.find((b) => b.id === blockId);
              if (!blk) return null;

              return (
                <React.Fragment key={`${blockId}-${idx}`}>
                  <div
                    className={`flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl border ${KIND_STYLE[blk.kind]}`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="shrink-0 w-6 h-6 rounded-full bg-zinc-900/10 dark:bg-white/10 font-mono text-[11px] font-bold flex items-center justify-center text-zinc-800 dark:text-zinc-100">
                        {idx + 1}
                      </span>
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                          {blk.label}
                        </div>
                        {blk.code && (
                          <code className="block font-mono text-[11px] text-emerald-700 dark:text-emerald-400">
                            {blk.code}
                          </code>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        disabled={idx === 0}
                        onClick={() => onMove(idx, -1)}
                        className="p-1 rounded hover:bg-black/5 dark:hover:bg-white/10 disabled:opacity-25 text-zinc-600 dark:text-zinc-300"
                        title="Subir paso"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        disabled={idx === order.length - 1}
                        onClick={() => onMove(idx, 1)}
                        className="p-1 rounded hover:bg-black/5 dark:hover:bg-white/10 disabled:opacity-25 text-zinc-600 dark:text-zinc-300"
                        title="Bajar paso"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onRemoveAt(idx)}
                        className="p-1 rounded hover:bg-rose-500/10 text-zinc-400 hover:text-rose-500"
                        title="Quitar bloque"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {idx < order.length - 1 && (
                    <div className="flex justify-center">
                      <div className="w-0.5 h-3 bg-zinc-300 dark:bg-zinc-700" />
                    </div>
                  )}
                </React.Fragment>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
