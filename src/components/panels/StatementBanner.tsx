import React, { useState } from 'react';
import {
  BookOpen,
  ChevronDown,
  ChevronUp,
  FileText,
  GitFork,
  Lightbulb,
  ShieldAlert,
} from 'lucide-react';
import type { SublevelDefinition } from '@/types/level';
import { MermaidDiagram } from './MermaidDiagram';

interface StatementBannerProps {
  sublevel: SublevelDefinition;
  isExamMode: boolean;
  dark: boolean;
}

/** Highlights hex ranges, active-low signals, and chip names for fast scanning */
function formatTechnicalText(text: string): React.ReactNode[] {
  const tokenRegex =
    /(\b(?:0x)?[0-9A-Fa-f]{4}h(?:–(?:0x)?[0-9A-Fa-f]{4}h)?\b|\/(?:RD|WR|PSEN|CS|OE|WE|E1|E2|E|Y[0-7]|OUT)\b|\b(?:IO\/M|74AHCT138|74138|74139|80C552|80C51|8085|UVPROM|SRAM|Flash|XRAM|AND|OR|NOT|VCC|GND)\b)/g;

  const parts = text.split(tokenRegex);
  return parts.map((part, idx) => {
    if (!part) return null;
    if (tokenRegex.test(part)) {
      tokenRegex.lastIndex = 0;
      return (
        <code
          key={idx}
          className="px-1.5 py-0.5 mx-0.5 rounded bg-zinc-200/75 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-mono text-[11.5px] font-semibold"
        >
          {part}
        </code>
      );
    }
    tokenRegex.lastIndex = 0;
    return <React.Fragment key={idx}>{part}</React.Fragment>;
  });
}

export const StatementBanner: React.FC<StatementBannerProps> = ({
  sublevel,
  isExamMode,
  dark,
}) => {
  // Starts compact; expands as an overlay so the schematic canvas never gets squeezed
  const [expanded, setExpanded] = useState(false);
  const [showMermaid, setShowMermaid] = useState(false);
  const [revealedHints, setRevealedHints] = useState(0);

  return (
    <section className="relative z-20 shrink-0 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
      {/* Compact Statement Strip */}
      <div className="px-5 py-2.5 flex items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3 min-w-0">
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 text-[11px] font-semibold shrink-0 mt-0.5 sm:mt-0">
            <BookOpen className="w-3 h-3 text-emerald-500" />
            Enunciado
          </span>

          <p className="text-[13px] text-zinc-700 dark:text-zinc-200 leading-snug line-clamp-2">
            {formatTechnicalText(sublevel.briefing.statement)}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {sublevel.sourceRef && (
            <span
              className="hidden xl:inline-flex items-center gap-1.5 max-w-[280px] px-2.5 py-1 rounded-lg bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200/80 dark:border-zinc-700/80 text-zinc-600 dark:text-zinc-300 text-[11px] font-medium"
              title={`Archivo oficial de referencia: ${sublevel.sourceRef}`}
            >
              <FileText className="w-3 h-3 text-sky-500 shrink-0" />
              <span className="truncate">{sublevel.sourceRef}</span>
            </span>
          )}

          {isExamMode && (
            <span className="hidden sm:inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-[11px] font-semibold">
              <ShieldAlert className="w-3 h-3" />
              Sin ayudas
            </span>
          )}

          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition ${
              expanded
                ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 border-transparent'
                : 'bg-zinc-50 hover:bg-zinc-100 dark:bg-zinc-800/80 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-200 border-zinc-200 dark:border-zinc-700'
            }`}
          >
            <span>{isExamMode ? 'Requisitos' : 'Pasos y pistas'}</span>
            {expanded ? (
              <ChevronUp className="w-3.5 h-3.5" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      </div>

      {/* Overlay Dropdown Details */}
      {expanded && (
        <div className="absolute left-0 right-0 top-full z-40 px-5 py-4 bg-white/98 dark:bg-zinc-900/98 backdrop-blur-md border-b border-zinc-200 dark:border-zinc-800 shadow-2xl">
          <div className="max-w-6xl mx-auto space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-xs text-zinc-700 dark:text-zinc-200 font-medium">
                <FileText className="w-3.5 h-3.5 text-sky-500 shrink-0" />
                <span>Fuente oficial: {sublevel.sourceRef ?? sublevel.subtitle}</span>
              </div>

              {!isExamMode && (
                <div className="flex items-center gap-2">
                  {sublevel.briefing.mermaid && (
                    <button
                      type="button"
                      onClick={() => setShowMermaid((v) => !v)}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-medium transition ${
                        showMermaid
                          ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 border-transparent'
                          : 'bg-zinc-50 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-700'
                      }`}
                    >
                      <GitFork className="w-3.5 h-3.5" />
                      <span>Esquema guía</span>
                    </button>
                  )}

                  {sublevel.briefing.hints.length > 0 && (
                    <button
                      type="button"
                      onClick={() =>
                        setRevealedHints((n) =>
                          n < sublevel.briefing.hints.length ? n + 1 : 0
                        )
                      }
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-medium transition ${
                        revealedHints > 0
                          ? 'bg-amber-50 dark:bg-amber-950/50 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300'
                          : 'bg-zinc-50 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-700'
                      }`}
                    >
                      <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
                      <span>
                        {revealedHints === 0
                          ? `Ver pista (0/${sublevel.briefing.hints.length})`
                          : revealedHints < sublevel.briefing.hints.length
                            ? `Siguiente pista (${revealedHints}/${sublevel.briefing.hints.length})`
                            : 'Ocultar pistas'}
                      </span>
                    </button>
                  )}
                </div>
              )}
            </div>

            <p className="text-[13.5px] leading-relaxed text-zinc-700 dark:text-zinc-200">
              {formatTechnicalText(sublevel.briefing.statement)}
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {sublevel.briefing.objectives.map((obj, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-2.5 px-3 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200/80 dark:border-zinc-800 text-xs text-zinc-700 dark:text-zinc-300 leading-snug"
                >
                  <span className="shrink-0 w-5 h-5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 font-mono text-[10px] font-bold flex items-center justify-center">
                    {idx + 1}
                  </span>
                  <span>{formatTechnicalText(obj)}</span>
                </div>
              ))}
            </div>

            {!isExamMode && (showMermaid || revealedHints > 0) && (
              <div className="pt-3 border-t border-zinc-200 dark:border-zinc-800 grid grid-cols-1 lg:grid-cols-2 gap-3">
                {showMermaid && sublevel.briefing.mermaid && (
                  <div>
                    <div className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 mb-1.5">
                      Esquema orientativo
                    </div>
                    <MermaidDiagram chart={sublevel.briefing.mermaid} dark={dark} />
                  </div>
                )}

                {revealedHints > 0 && (
                  <div className="space-y-1.5">
                    {sublevel.briefing.hints.slice(0, revealedHints).map((hint, idx) => (
                      <div
                        key={idx}
                        className="px-3 py-2 rounded-lg bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 text-xs text-zinc-800 dark:text-zinc-200"
                      >
                        <span className="font-mono font-bold text-amber-700 dark:text-amber-400 mr-1.5">
                          Pista {idx + 1}:
                        </span>
                        {formatTechnicalText(hint)}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
};
