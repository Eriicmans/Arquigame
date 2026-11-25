import React from 'react';
import { AlertTriangle, CheckCircle2, EyeOff, Plus, Trash2, XCircle } from 'lucide-react';
import {
  formatHex16Short,
  type MemoryMapAnalysis,
} from '@/engine/memoryMapAnalyzer';
import type { PlayerTableRow, ValidationResult } from '@/engine/levelValidator';
import type { SublevelDefinition } from '@/types/level';

interface MemoryMapPanelProps {
  sublevel: SublevelDefinition;
  analysis: MemoryMapAnalysis;
  tableRows: PlayerTableRow[];
  validation: ValidationResult | null;
  isExamMode: boolean;
  onUpdateRow: (regionId: string, patch: Partial<PlayerTableRow>) => void;
  onAddRow: () => void;
  onRemoveRow: (regionId: string) => void;
}

export const MemoryMapPanel: React.FC<MemoryMapPanelProps> = ({
  sublevel,
  analysis,
  tableRows,
  validation,
  isExamMode,
  onUpdateRow,
  onAddRow,
  onRemoveRow,
}) => {
  const showLiveMapBar = !isExamMode || validation !== null;
  const cpuProfile = sublevel.circuit?.cpuProfile ?? '8085';
  const spaces: Array<{ key: 'memory' | 'program' | 'data'; label: string }> =
    cpuProfile === '80C552'
      ? [
          { key: 'program', label: 'Programa (/PSEN)' },
          { key: 'data', label: 'Datos XRAM (/RD, /WR)' },
        ]
      : [{ key: 'memory', label: 'Memoria (IO/M = 0)' }];

  return (
    <div className="space-y-5 text-xs">
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
            Mapa de direcciones ({cpuProfile} · 64 kB)
          </h3>
          <span className="font-mono text-[11px] text-zinc-500 dark:text-zinc-400">
            0000h – FFFFh
          </span>
        </div>

        {!showLiveMapBar ? (
          <div className="flex items-center gap-2.5 p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400">
            <EyeOff className="w-4 h-4 shrink-0 text-zinc-400" />
            <span>
              Vista previa oculta en <strong>Modo Examen</strong>. Pulsa <strong>Comprobar</strong> para ver el mapa que genera tu circuito.
            </span>
          </div>
        ) : (
          <div className="space-y-3">
            {spaces.map((sp) => {
              const spaceSegs = analysis.segments.filter((s) => s.space === sp.key);
              if (spaceSegs.length === 0) return null;
              return (
                <div key={sp.key} className="space-y-1.5">
                  {spaces.length > 1 && (
                    <div className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">
                      {sp.label}
                    </div>
                  )}
                  <div className="h-9 w-full rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-950 flex">
                    {spaceSegs.map((seg) => {
                      const widthPct = (seg.sizeKB / 64) * 100;
                      let bg = 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400';
                      let title = 'VACÍO';

                      if (seg.isCollision) {
                        bg = 'bg-rose-600 text-white';
                        title = `COLISIÓN: ${seg.chips.map((c) => c.chipLabel).join(' + ')}`;
                      } else if (seg.chips.length >= 1) {
                        const ch = seg.chips[0];
                        title = `${seg.chips.map((c) => c.chipLabel).join(' + ')}${seg.isMirror ? ' (IMAGEN)' : ''}`;
                        if (seg.isMirror) {
                          bg = 'bg-amber-500 text-zinc-950';
                        } else if (ch.chipType === 'MEM_UVPROM') {
                          bg = 'bg-sky-600 text-white';
                        } else if (ch.chipType === 'MEM_SRAM') {
                          bg = 'bg-emerald-600 text-white';
                        } else {
                          bg = 'bg-violet-600 text-white';
                        }
                      }

                      return (
                        <div
                          key={seg.id}
                          style={{ width: `${widthPct}%` }}
                          className={`${bg} border-r border-white/50 dark:border-zinc-900/80 last:border-r-0 flex flex-col items-center justify-center px-1 overflow-hidden`}
                          title={`${formatHex16Short(seg.startAddr)}–${formatHex16Short(seg.endAddr)} (${seg.sizeKB} kB): ${title}`}
                        >
                          {widthPct >= 10 && (
                            <span className="font-mono text-[10px] font-bold truncate max-w-full">
                              {seg.isCollision
                                ? 'SOLAPE'
                                : seg.chips.length >= 1
                                  ? seg.chips[0].chipType.replace('MEM_', '')
                                  : 'VACÍO'}
                            </span>
                          )}
                          {widthPct >= 12 && (
                            <span className="font-mono text-[9px] opacity-85 truncate">
                              {seg.sizeKB} kB
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            <div className="space-y-1.5">
              {analysis.segments.map((seg) => (
                <div
                  key={seg.id}
                  className={`flex items-center justify-between px-3 py-1.5 rounded-lg font-mono text-[11px] border ${
                    seg.isCollision
                      ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200'
                      : seg.isMirror
                        ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200'
                        : seg.chips.length > 0
                          ? 'bg-white dark:bg-zinc-800/60 border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-100'
                          : 'bg-zinc-50 dark:bg-zinc-900/60 border-zinc-200/70 dark:border-zinc-800 text-zinc-500 dark:text-zinc-500'
                  }`}
                >
                  <span className="font-semibold">
                    {spaces.length > 1 ? `[${seg.space === 'program' ? 'PROG' : 'DATA'}] ` : ''}
                    {formatHex16Short(seg.startAddr)} – {formatHex16Short(seg.endAddr)}
                  </span>
                  <span className="truncate mx-2 font-sans font-medium">
                    {seg.isCollision ? (
                      <span className="inline-flex items-center gap-1 text-rose-600 dark:text-rose-400">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        {seg.chips.map((c) => c.chipLabel).join(' / ')}
                      </span>
                    ) : seg.chips.length >= 1 ? (
                      `${seg.chips.map((c) => c.chipLabel).join(' + ')}${seg.isMirror ? ' (Imagen)' : ''}`
                    ) : (
                      'Zona libre'
                    )}
                  </span>
                  <span className="text-[10px] text-zinc-500 dark:text-zinc-400 shrink-0">
                    {seg.sizeKB} kB · {seg.access}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
            Rellena la tabla del mapa
          </h3>
          {isExamMode ? (
            <button
              type="button"
              onClick={onAddRow}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 text-[11px] font-semibold transition"
            >
              <Plus className="w-3 h-3" />
              <span>Añadir fila</span>
            </button>
          ) : (
            <span className="text-[11px] text-zinc-400 dark:text-zinc-500 font-mono">
              Ej: 0000h · 1FFFh
            </span>
          )}
        </div>

        {isExamMode ? (
          <div className="space-y-2.5">
            {tableRows.map((row, idx) => (
              <div
                key={row.regionId}
                className="p-3 rounded-xl border bg-white dark:bg-zinc-800/50 border-zinc-200 dark:border-zinc-800 space-y-2.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">
                    Región #{idx + 1}
                  </span>
                  <div className="flex items-center gap-2">
                    <label className="inline-flex items-center gap-1 text-[11px] text-zinc-600 dark:text-zinc-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={Boolean(row.isMirror)}
                        onChange={(e) =>
                          onUpdateRow(row.regionId, { isMirror: e.target.checked })
                        }
                        className="rounded border-zinc-300 dark:border-zinc-600"
                      />
                      <span>Imagen</span>
                    </label>
                    {tableRows.length > 1 && (
                      <button
                        type="button"
                        onClick={() => onRemoveRow(row.regionId)}
                        className="p-1 rounded hover:bg-rose-50 dark:hover:bg-rose-950/50 text-zinc-400 hover:text-rose-500 transition"
                        title="Eliminar fila"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-medium text-zinc-500 dark:text-zinc-400 mb-1">
                      Dispositivo
                    </label>
                    <select
                      value={row.chipType ?? 'MEM_UVPROM'}
                      onChange={(e) => {
                        const nextType = e.target.value as PlayerTableRow['chipType'];
                        onUpdateRow(row.regionId, {
                          chipType: nextType,
                          access: nextType === 'EMPTY' ? 'NONE' : row.access === 'NONE' ? 'R' : row.access,
                        });
                      }}
                      className="w-full px-2 py-1.5 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-xs font-medium text-zinc-800 dark:text-zinc-100"
                    >
                      <option value="MEM_UVPROM">UVPROM</option>
                      <option value="MEM_SRAM">SRAM</option>
                      <option value="MEM_FLASH">Flash</option>
                      <option value="EMPTY">Zona libre (VACÍO)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-medium text-zinc-500 dark:text-zinc-400 mb-1">
                      Acceso
                    </label>
                    <select
                      value={row.access}
                      onChange={(e) =>
                        onUpdateRow(row.regionId, {
                          access: e.target.value as 'R' | 'RW' | 'NONE',
                        })
                      }
                      className="w-full px-2 py-1.5 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-xs font-medium text-zinc-800 dark:text-zinc-100"
                    >
                      <option value="R">Solo lectura (R)</option>
                      <option value="RW">Lect./Escr. (R/W)</option>
                      <option value="NONE">Vacío</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-medium text-zinc-500 dark:text-zinc-400 mb-1">
                      Inicio (hex)
                    </label>
                    <input
                      type="text"
                      value={row.startHex}
                      onChange={(e) =>
                        onUpdateRow(row.regionId, { startHex: e.target.value })
                      }
                      placeholder="0000h"
                      className="w-full px-2.5 py-1.5 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 focus:bg-white dark:focus:bg-zinc-950 focus:border-emerald-500 focus:outline-none font-mono text-xs text-zinc-900 dark:text-zinc-100 uppercase"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-medium text-zinc-500 dark:text-zinc-400 mb-1">
                      Fin (hex)
                    </label>
                    <input
                      type="text"
                      value={row.endHex}
                      onChange={(e) =>
                        onUpdateRow(row.regionId, { endHex: e.target.value })
                      }
                      placeholder="1FFFh"
                      className="w-full px-2.5 py-1.5 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 focus:bg-white dark:focus:bg-zinc-950 focus:border-emerald-500 focus:outline-none font-mono text-xs text-zinc-900 dark:text-zinc-100 uppercase"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-2.5">
          {(sublevel.memoryMapTask?.expectedRegions ?? []).map((region) => {
            const row = tableRows.find((r) => r.regionId === region.id) ?? {
              regionId: region.id,
              startHex: '',
              endHex: '',
              access: region.chipType === 'EMPTY' ? 'NONE' : 'R',
            };

            const check = validation?.regionResults.find(
              (rr) => rr.region.id === region.id
            );

            return (
              <div
                key={region.id}
                className={`p-3 rounded-xl border transition ${
                  check
                    ? check.tablePassed && check.circuitPassed
                      ? 'bg-emerald-50/60 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800'
                      : 'bg-rose-50/50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800'
                    : 'bg-white dark:bg-zinc-800/50 border-zinc-200 dark:border-zinc-800'
                }`}
              >
                <div className="flex items-center justify-between mb-2.5">
                  <span className="font-semibold text-zinc-800 dark:text-zinc-100">
                    {region.label}
                  </span>
                  {check && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold">
                      {check.tablePassed && check.circuitPassed ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                          <span className="text-emerald-700 dark:text-emerald-300">Correcto</span>
                        </>
                      ) : (
                        <>
                          <XCircle className="w-3.5 h-3.5 text-rose-500 dark:text-rose-400" />
                          <span className="text-rose-700 dark:text-rose-300">Revisar</span>
                        </>
                      )}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[10px] font-medium text-zinc-500 dark:text-zinc-400 mb-1">
                      Inicio (hex)
                    </label>
                    <input
                      type="text"
                      value={row.startHex}
                      onChange={(e) =>
                        onUpdateRow(region.id, { startHex: e.target.value })
                      }
                      placeholder="0000h"
                      className="w-full px-2.5 py-1.5 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 focus:bg-white dark:focus:bg-zinc-950 focus:border-emerald-500 focus:outline-none font-mono text-xs text-zinc-900 dark:text-zinc-100 uppercase"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-medium text-zinc-500 dark:text-zinc-400 mb-1">
                      Fin (hex)
                    </label>
                    <input
                      type="text"
                      value={row.endHex}
                      onChange={(e) =>
                        onUpdateRow(region.id, { endHex: e.target.value })
                      }
                      placeholder="1FFFh"
                      className="w-full px-2.5 py-1.5 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 focus:bg-white dark:focus:bg-zinc-950 focus:border-emerald-500 focus:outline-none font-mono text-xs text-zinc-900 dark:text-zinc-100 uppercase"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-medium text-zinc-500 dark:text-zinc-400 mb-1">
                      Acceso
                    </label>
                    <select
                      value={row.access}
                      onChange={(e) =>
                        onUpdateRow(region.id, {
                          access: e.target.value as 'R' | 'RW' | 'NONE',
                        })
                      }
                      className="w-full px-2 py-1.5 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 focus:border-emerald-500 focus:outline-none text-xs font-medium text-zinc-800 dark:text-zinc-100"
                    >
                      <option value="R">Solo lectura (R)</option>
                      <option value="RW">Lect./Escr. (R/W)</option>
                      <option value="NONE">Vacío</option>
                    </select>
                  </div>
                </div>
              </div>
            );
          })}
          </div>
        )}
      </div>
    </div>
  );
};
