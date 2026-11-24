import React from 'react';
import { AlertCircle, AlertTriangle, CheckCircle2, ClipboardCheck, Info } from 'lucide-react';
import type { DiagnosticItem } from '@/engine/simulator';
import type { ValidationResult } from '@/engine/levelValidator';

interface DiagnosticsPanelProps {
  validation: ValidationResult | null;
}

export const DiagnosticsPanel: React.FC<DiagnosticsPanelProps> = ({ validation }) => {
  if (!validation) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-12 px-5 text-zinc-500 dark:text-zinc-400">
        <div className="w-12 h-12 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mb-3">
          <ClipboardCheck className="w-6 h-6 text-zinc-400 dark:text-zinc-500" />
        </div>
        <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">
          Listo para comprobar
        </p>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1.5 leading-relaxed">
          Cuando termines el cableado y la tabla del mapa de memoria, pulsa{' '}
          <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
            Comprobar
          </span>{' '}
          arriba a la derecha para analizar todo el espacio de direcciones (0000h–FFFFh).
        </p>
      </div>
    );
  }

  const iconFor = (sev: DiagnosticItem['severity']) => {
    switch (sev) {
      case 'success':
        return <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />;
      default:
        return <Info className="w-4 h-4 text-zinc-600 dark:text-zinc-400 shrink-0 mt-0.5" />;
    }
  };

  const styleFor = (sev: DiagnosticItem['severity']) => {
    switch (sev) {
      case 'success':
        return 'bg-emerald-50 dark:bg-emerald-950/35 border-emerald-200 dark:border-emerald-800 text-emerald-950 dark:text-emerald-100';
      case 'error':
        return 'bg-rose-50 dark:bg-rose-950/35 border-rose-200 dark:border-rose-800 text-rose-950 dark:text-rose-100';
      case 'warning':
        return 'bg-amber-50 dark:bg-amber-950/35 border-amber-200 dark:border-amber-800 text-amber-950 dark:text-amber-100';
      default:
        return 'bg-zinc-50 dark:bg-zinc-800/60 border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100';
    }
  };

  return (
    <div className="space-y-4 text-xs">
      <div className="grid grid-cols-2 gap-2.5">
        <div
          className={`p-3 rounded-xl border ${
            validation.circuitPassed
              ? 'bg-emerald-50 dark:bg-emerald-950/35 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
              : 'bg-rose-50 dark:bg-rose-950/35 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300'
          }`}
        >
          <div className="text-[11px] font-medium opacity-80">Circuito</div>
          <div className="font-bold text-sm mt-0.5">
            {validation.circuitPassed ? 'Aprobado' : 'Con errores'}
          </div>
        </div>

        <div
          className={`p-3 rounded-xl border ${
            validation.tablePassed
              ? 'bg-emerald-50 dark:bg-emerald-950/35 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
              : 'bg-amber-50 dark:bg-amber-950/35 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300'
          }`}
        >
          <div className="text-[11px] font-medium opacity-80">Tabla Mapa Hex</div>
          <div className="font-bold text-sm mt-0.5">
            {validation.tablePassed ? 'Correcta' : 'Pendiente'}
          </div>
        </div>
      </div>

      <div className="space-y-2">
        {validation.diagnostics.map((item) => (
          <div
            key={item.id}
            className={`flex items-start gap-2.5 p-3 rounded-xl border ${styleFor(item.severity)}`}
          >
            {iconFor(item.severity)}
            <div className="min-w-0">
              <div className="font-semibold leading-snug">{item.title}</div>
              <p className="text-[11px] opacity-85 mt-1 leading-relaxed">
                {item.detail}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
