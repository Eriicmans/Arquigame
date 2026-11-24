import React, { useState } from 'react';
import { BookOpen, ChevronDown, ChevronRight, Lightbulb, ShieldAlert } from 'lucide-react';
import type { SublevelDefinition } from '@/types/level';
import { MermaidDiagram } from './MermaidDiagram';

interface BriefingPanelProps {
  sublevel: SublevelDefinition;
  isExamMode: boolean;
  dark: boolean;
}

export const BriefingPanel: React.FC<BriefingPanelProps> = ({
  sublevel,
  isExamMode,
  dark,
}) => {
  const [revealedHints, setRevealedHints] = useState(0);

  return (
    <div className="space-y-5 text-xs leading-relaxed">
      {sublevel.sourceRef && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800/70 border border-zinc-200 dark:border-zinc-700/80 text-zinc-700 dark:text-zinc-300 text-[11px] font-medium">
          <BookOpen className="w-3.5 h-3.5 shrink-0 text-zinc-500 dark:text-zinc-400" />
          <span className="truncate">{sublevel.sourceRef}</span>
        </div>
      )}

      {isExamMode && (
        <div className="flex items-start gap-2.5 px-3.5 py-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/70 text-rose-900 dark:text-rose-200">
          <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5 text-rose-600 dark:text-rose-400" />
          <div>
            <div className="font-semibold text-xs text-rose-800 dark:text-rose-300">
              Modo Examen activo (sin ayudas)
            </div>
            <p className="text-[11px] text-rose-700 dark:text-rose-200/80 mt-0.5">
              Pistas, diagrama guía, cables prefijados y simulación en vivo desactivados. Coloca los integrados desde la paleta lateral y diseña el sistema completo.
            </p>
          </div>
        </div>
      )}

      <div>
        <h3 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 mb-2">
          Enunciado
        </h3>
        <p className="text-zinc-600 dark:text-zinc-300 bg-zinc-50 dark:bg-zinc-800/40 p-3.5 rounded-xl border border-zinc-200/80 dark:border-zinc-800 leading-relaxed">
          {sublevel.briefing.statement}
        </p>
      </div>

      <div>
        <h3 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 mb-2">
          Pasos del ejercicio
        </h3>
        <ul className="space-y-2">
          {sublevel.briefing.objectives.map((obj, idx) => (
            <li
              key={idx}
              className="flex items-start gap-2.5 px-3 py-2.5 rounded-xl bg-white dark:bg-zinc-800/50 border border-zinc-200/80 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300"
            >
              <span className="shrink-0 w-5 h-5 rounded-full bg-zinc-100 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-200 font-semibold text-[11px] flex items-center justify-center mt-0.5">
                {idx + 1}
              </span>
              <span>{obj}</span>
            </li>
          ))}
        </ul>
      </div>

      {!isExamMode && sublevel.briefing.mermaid && (
        <div>
          <h3 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 mb-2">
            Esquema orientativo
          </h3>
          <MermaidDiagram chart={sublevel.briefing.mermaid} dark={dark} />
        </div>
      )}

      {!isExamMode && sublevel.briefing.hints.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-bold text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
              <Lightbulb className="w-3.5 h-3.5" />
              Pistas ({revealedHints}/{sublevel.briefing.hints.length})
            </h3>
            {revealedHints < sublevel.briefing.hints.length && (
              <button
                type="button"
                onClick={() => setRevealedHints((n) => n + 1)}
                className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 hover:underline"
              >
                Ver siguiente pista
              </button>
            )}
          </div>

          {revealedHints === 0 ? (
            <button
              type="button"
              onClick={() => setRevealedHints(1)}
              className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-amber-50/70 hover:bg-amber-50 dark:bg-amber-950/30 dark:hover:bg-amber-950/50 border border-amber-200 dark:border-amber-900/60 text-amber-900 dark:text-amber-200 font-medium transition"
            >
              <span>¿Necesitas una pista? Pulsa aquí</span>
              <ChevronRight className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            </button>
          ) : (
            <div className="space-y-2">
              {sublevel.briefing.hints.slice(0, revealedHints).map((hint, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 text-zinc-800 dark:text-zinc-200"
                >
                  <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400 mb-1">
                    <ChevronDown className="w-3 h-3" />
                    Pista {idx + 1}
                  </div>
                  <p>{hint}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
