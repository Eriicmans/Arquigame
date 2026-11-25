import React from 'react';
import { Cpu, HelpCircle } from 'lucide-react';
import type { RegisterTask } from '@/types/level';

interface RegisterWorkbenchProps {
  task: RegisterTask;
  registerValues: Record<string, number[]>;
  questionAnswers: Record<string, number>;
  isExamMode: boolean;
  onToggleBit: (regId: string, bit: number) => void;
  onSelectAnswer: (questionId: string, optionIdx: number) => void;
}

function formatRegHex(bits: number[]): string {
  let val = 0;
  for (let b = 0; b < 8; b++) {
    if (bits[b] === 1) val |= 1 << b;
  }
  return `0x${val.toString(16).toUpperCase().padStart(2, '0')}`;
}

export const RegisterWorkbench: React.FC<RegisterWorkbenchProps> = ({
  task,
  registerValues,
  questionAnswers,
  isExamMode,
  onToggleBit,
  onSelectAnswer,
}) => {
  return (
    <div className="space-y-6">
      {/* 8-bit SFR Registers */}
      <div className="space-y-4">
        {task.registers.map((reg) => {
          const bits = registerValues[reg.id] ?? new Array(8).fill(0);
          const sortedBits = [...reg.bits].sort((a, b) => b.bit - a.bit);

          return (
            <div
              key={reg.id}
              className="rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-4 shadow-2xs"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
                    <Cpu className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-sm text-zinc-900 dark:text-zinc-100">
                        {reg.name}
                      </span>
                      {reg.addressHex && (
                        <span className="px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 font-mono text-[10px] text-zinc-500 dark:text-zinc-400">
                          SFR {reg.addressHex}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      {reg.purpose}
                    </p>
                  </div>
                </div>

                <div className="px-3 py-1 rounded-lg bg-zinc-100 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 font-mono text-sm font-bold text-emerald-600 dark:text-emerald-400">
                  {formatRegHex(bits)}
                </div>
              </div>

              {/* 8 Interactive Bit Switches (MSB b7 -> LSB b0) */}
              <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                {sortedBits.map((spec) => {
                  const val = bits[spec.bit] ?? 0;
                  const isOne = val === 1;
                  return (
                    <button
                      key={spec.bit}
                      type="button"
                      onClick={() => onToggleBit(reg.id, spec.bit)}
                      title={isExamMode ? `Bit ${spec.bit}: ${spec.name}` : spec.description}
                      className={`group flex flex-col items-center p-2 rounded-xl border transition ${
                        isOne
                          ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-400 dark:border-emerald-700'
                          : 'bg-zinc-50 dark:bg-zinc-950/60 border-zinc-200 dark:border-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-600'
                      }`}
                    >
                      <span className="text-[10px] font-mono text-zinc-400 dark:text-zinc-500">
                        b{spec.bit}
                      </span>
                      <span className="mt-0.5 font-mono text-xs font-bold text-zinc-800 dark:text-zinc-100 truncate max-w-full">
                        {spec.name}
                      </span>
                      <span
                        className={`mt-1.5 w-8 h-6 rounded-md flex items-center justify-center font-mono text-xs font-bold ${
                          isOne
                            ? 'bg-emerald-600 text-white'
                            : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300'
                        }`}
                      >
                        {val}
                      </span>
                    </button>
                  );
                })}
              </div>

              {!isExamMode && (
                <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[11px] text-zinc-500 dark:text-zinc-400">
                  {sortedBits
                    .filter((b) => b.name !== '-' && b.name !== 'RES')
                    .map((b) => (
                      <div key={b.bit} className="truncate">
                        <span className="font-mono font-semibold text-zinc-700 dark:text-zinc-300">
                          {b.name}:
                        </span>{' '}
                        {b.description}
                      </div>
                    ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Technical Questions */}
      {task.questions.length > 0 && (
        <div className="space-y-3">
          {task.questions.map((q, qIdx) => {
            const selected = questionAnswers[q.id];
            return (
              <div
                key={q.id}
                className="rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-4"
              >
                <div className="flex items-start gap-2 mb-3">
                  <HelpCircle className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <p className="text-xs font-semibold text-zinc-800 dark:text-zinc-100 leading-snug">
                    {qIdx + 1}. {q.prompt}
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {q.options.map((opt, oIdx) => {
                    const active = selected === oIdx;
                    return (
                      <button
                        key={oIdx}
                        type="button"
                        onClick={() => onSelectAnswer(q.id, oIdx)}
                        className={`px-3 py-2 rounded-xl border text-left text-xs font-medium transition ${
                          active
                            ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 border-transparent'
                            : 'bg-zinc-50 dark:bg-zinc-950/60 border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:border-zinc-400 dark:hover:border-zinc-600'
                        }`}
                      >
                        {opt}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
