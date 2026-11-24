import React from 'react';
import {
  ChevronRight,
  Cpu,
  HardDrive,
  PanelLeftClose,
  Pin,
  Plus,
} from 'lucide-react';
import { COMPONENT_REGISTRY, isGateType, isPowerSymbolType } from '@/engine/chips/registry';
import type { PaletteEntry } from '@/types/level';
import { GateMiniIcon } from '@/components/circuit/GateIcons';

interface ComponentPaletteProps {
  entries: PaletteEntry[];
  isExamMode: boolean;
  pinned: boolean;
  hovered: boolean;
  onSetPinned: (pinned: boolean) => void;
  onSetHovered: (hovered: boolean) => void;
  onAddComponent: (entry: PaletteEntry) => void;
}

const GROUPS: Array<{
  category: 'decoder' | 'gate' | 'memory' | 'power';
  title: string;
  accent: string;
}> = [
  { category: 'decoder', title: 'Decodificadores', accent: 'text-violet-600 dark:text-violet-400' },
  { category: 'gate', title: 'Puertas lógicas', accent: 'text-zinc-700 dark:text-zinc-300' },
  { category: 'memory', title: 'Memorias', accent: 'text-emerald-600 dark:text-emerald-400' },
  { category: 'power', title: 'Alimentación', accent: 'text-rose-600 dark:text-rose-400' },
];

export const ComponentPalette: React.FC<ComponentPaletteProps> = ({
  entries,
  isExamMode,
  pinned,
  hovered,
  onSetPinned,
  onSetHovered,
  onAddComponent,
}) => {
  const isOpen = pinned || hovered;

  const panelContent = (
    <div className="w-64 h-full flex flex-col bg-white dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800 overflow-hidden">
      <div className="px-4 py-3 border-b border-zinc-200 dark:border-zinc-800 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">
              Componentes
            </h2>
            {isExamMode && (
              <span className="px-1.5 py-0.5 rounded-full bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-[10px] font-semibold">
                Examen
              </span>
            )}
          </div>
          <p className="mt-0.5 text-[11px] text-zinc-500 dark:text-zinc-400 leading-snug">
            {isExamMode
              ? 'Añade integrados, puertas y alimentación.'
              : 'Pulsa para añadir al esquema.'}
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            if (pinned) {
              onSetPinned(false);
              onSetHovered(false);
            } else {
              onSetPinned(true);
            }
          }}
          className="shrink-0 p-1.5 rounded-lg text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
          title={pinned ? 'Ocultar barra lateral (se abrirá al pasar el ratón)' : 'Fijar barra lateral'}
        >
          {pinned ? (
            <PanelLeftClose className="w-4 h-4" />
          ) : (
            <Pin className="w-3.5 h-3.5" />
          )}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {GROUPS.map((group) => {
          const items = entries.filter(
            (e) => COMPONENT_REGISTRY[e.type].category === group.category
          );
          if (items.length === 0) return null;

          return (
            <div key={group.category}>
              <div className="flex items-center justify-between px-1 mb-1.5">
                <span className={`text-[11px] font-semibold ${group.accent}`}>
                  {group.title}
                </span>
              </div>

              <div className="space-y-1.5">
                {items.map((entry, idx) => {
                  const def = COMPONENT_REGISTRY[entry.type];
                  const hasCustomSymbol =
                    isGateType(entry.type) || isPowerSymbolType(entry.type);

                  return (
                    <button
                      key={`${entry.type}-${idx}`}
                      type="button"
                      onClick={() => onAddComponent(entry)}
                      className="w-full text-left group flex items-center justify-between gap-2.5 px-2.5 py-2 rounded-xl bg-zinc-50 hover:bg-zinc-100 dark:bg-zinc-800/60 dark:hover:bg-zinc-800 border border-zinc-200/80 hover:border-zinc-300 dark:border-zinc-800 dark:hover:border-zinc-600 transition"
                      title={def.description}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="shrink-0 w-9 h-7 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center text-zinc-800 dark:text-zinc-200">
                          {hasCustomSymbol ? (
                            <GateMiniIcon
                              type={entry.type}
                              className={`w-7 h-5 ${
                                entry.type === 'POWER_VCC'
                                  ? 'text-rose-500 dark:text-rose-400'
                                  : ''
                              }`}
                            />
                          ) : def.category === 'decoder' ? (
                            <Cpu className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                          ) : (
                            <HardDrive className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-semibold text-zinc-800 dark:text-zinc-100 truncate">
                            {entry.label}
                          </div>
                          <div className="text-[10px] text-zinc-500 dark:text-zinc-400 truncate">
                            {entry.props?.sizeKB
                              ? `${entry.props.sizeKB} kB · bus ${entry.props.dataWidth ?? 8}b`
                              : isGateType(entry.type)
                                ? 'Símbolo estándar'
                                : isPowerSymbolType(entry.type)
                                  ? entry.type === 'POWER_VCC'
                                    ? 'Nivel alto constante'
                                    : 'Masa / nivel bajo'
                                  : `${def.pins.length} pines`}
                          </div>
                        </div>
                      </div>
                      <span className="shrink-0 p-1 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 group-hover:bg-emerald-600 group-hover:border-emerald-600 text-zinc-400 group-hover:text-white transition">
                        <Plus className="w-3.5 h-3.5" />
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Compact Color Legend */}
      <div className="px-4 py-3 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-950/40">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mb-2">
          Señales
        </div>
        <div className="grid grid-cols-2 gap-x-2 gap-y-1.5 text-[11px] text-zinc-600 dark:text-zinc-400">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-sky-500" /> Direcciones
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Control
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-violet-500" /> /CS y /Y
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Datos
          </div>
        </div>
      </div>
    </div>
  );

  // Pinned: occupies normal flow column
  if (pinned) {
    return <aside className="shrink-0 h-full z-20">{panelContent}</aside>;
  }

  // Collapsed: subtle left-edge hover trigger with clear vertical tab
  return (
    <div
      className="absolute top-0 bottom-0 left-0 z-30 flex items-center"
      onMouseEnter={() => onSetHovered(true)}
      onMouseLeave={() => onSetHovered(false)}
    >
      {/* Left edge sensor + floating tab */}
      <div
        className="w-5 h-full flex items-center cursor-pointer group"
        title="Pasa el ratón para abrir Componentes"
      >
        <div className="py-2.5 px-1 rounded-r-xl bg-white/95 dark:bg-zinc-900/95 border border-l-0 border-zinc-200 dark:border-zinc-700 shadow-md flex flex-col items-center gap-1.5 text-zinc-500 group-hover:text-zinc-900 dark:text-zinc-400 dark:group-hover:text-zinc-100 transition">
          <ChevronRight className="w-3.5 h-3.5" />
          <span
            className="text-[10px] font-semibold tracking-wide"
            style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
          >
            Componentes
          </span>
        </div>
      </div>

      {/* Floating auto-opened drawer */}
      <div
        className={`absolute top-0 left-0 h-full shadow-2xl transition-all duration-200 ease-out ${
          isOpen
            ? 'translate-x-0 opacity-100 pointer-events-auto'
            : '-translate-x-4 opacity-0 pointer-events-none'
        }`}
      >
        {panelContent}
      </div>
    </div>
  );
};
