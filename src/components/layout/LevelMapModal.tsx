import React from 'react';
import { CheckCircle2, FileText, Lock, Map, X } from 'lucide-react';
import type { LevelManifest, SublevelDefinition } from '@/types/level';

interface LevelMapModalProps {
  open: boolean;
  manifest: LevelManifest;
  sublevels: SublevelDefinition[];
  currentSublevelId: string;
  completedIds: Set<string>;
  onSelectSublevel: (id: string) => void;
  onClose: () => void;
}

export const LevelMapModal: React.FC<LevelMapModalProps> = ({
  open,
  manifest,
  sublevels,
  currentSublevelId,
  completedIds,
  onSelectSublevel,
  onClose,
}) => {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 backdrop-blur-xs p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 flex items-center justify-center">
              <Map className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                Temario y Niveles · {manifest.course}
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Organizado según los 5 bloques de tu cuaderno de la asignatura
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-3 max-h-[70vh] overflow-y-auto bg-zinc-50/70 dark:bg-[#121214]">
          {manifest.levels.map((lvl) => {
            const lvlSublevels = sublevels.filter((s) => s.levelId === lvl.id);
            const isAvailable = lvl.status === 'available';

            return (
              <div
                key={lvl.id}
                className={`p-4 rounded-xl border ${
                  isAvailable
                    ? 'bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-700'
                    : 'bg-zinc-50 dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-800 opacity-65'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                        {lvl.title}
                      </span>
                      {!isAvailable && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-zinc-200/80 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 text-[10px] font-semibold">
                          <Lock className="w-2.5 h-2.5" /> Próximamente
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                      {lvl.description}
                    </p>
                  </div>
                </div>

                {lvlSublevels.length > 0 && (
                  <div className="mt-3 space-y-1.5">
                    {lvlSublevels.map((sub) => {
                      const active = sub.id === currentSublevelId;
                      const done = completedIds.has(sub.id);
                      return (
                        <button
                          key={sub.id}
                          type="button"
                          onClick={() => {
                            onSelectSublevel(sub.id);
                            onClose();
                          }}
                          className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl border text-left transition ${
                            active
                              ? 'bg-zinc-100 dark:bg-zinc-800 border-emerald-500/60 text-zinc-900 dark:text-zinc-100'
                              : 'bg-zinc-50 dark:bg-zinc-950/60 border-zinc-200 dark:border-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-600 text-zinc-700 dark:text-zinc-300'
                          }`}
                        >
                          <div>
                            <div className="text-xs font-semibold">{sub.title}</div>
                            <div className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                              {sub.subtitle}
                            </div>
                            {sub.sourceRef && (
                              <div className="inline-flex items-center gap-1 text-[10px] text-sky-600 dark:text-sky-400 mt-1 font-medium">
                                <FileText className="w-3 h-3 shrink-0" />
                                <span>{sub.sourceRef}</span>
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="px-2 py-0.5 rounded-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-[10px] font-semibold capitalize text-zinc-600 dark:text-zinc-300">
                              {sub.difficulty}
                            </span>
                            {done && (
                              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
