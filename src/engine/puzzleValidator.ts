import type { DiagnosticItem } from '@/engine/simulator';
import type { FlowchartTask, RegisterTask } from '@/types/level';

export interface PuzzleValidationResult {
  passed: boolean;
  registersPassed: boolean;
  flowchartPassed: boolean;
  diagnostics: DiagnosticItem[];
}

export function validatePuzzleTasks(
  registerTask: RegisterTask | undefined,
  flowchartTask: FlowchartTask | undefined,
  registerValues: Record<string, number[]>,
  questionAnswers: Record<string, number>,
  flowchartOrder: string[]
): PuzzleValidationResult {
  const diagnostics: DiagnosticItem[] = [];
  let registersPassed = true;
  let flowchartPassed = true;

  if (registerTask) {
    for (const reg of registerTask.registers) {
      const bits = registerValues[reg.id] ?? reg.bits.map((b) => b.initial);
      const wrongBits: string[] = [];

      for (const spec of reg.bits) {
        if (spec.expected === null) continue;
        // bits array is indexed 0..7 matching bit 0..7
        const actual = bits[spec.bit];
        if (actual !== spec.expected) {
          wrongBits.push(`b${spec.bit} (${spec.name})`);
        }
      }

      if (wrongBits.length > 0) {
        registersPassed = false;
        diagnostics.push({
          id: `reg-${reg.id}`,
          severity: 'error',
          category: 'wiring',
          title: `Registro ${reg.name} incorrecto`,
          detail: `Revisa los bits: ${wrongBits.join(', ')}.`,
        });
      }
    }

    for (const q of registerTask.questions) {
      const ans = questionAnswers[q.id];
      if (ans !== q.correctIndex) {
        registersPassed = false;
        diagnostics.push({
          id: `q-${q.id}`,
          severity: 'warning',
          category: 'table',
          title: 'Pregunta técnica pendiente o incorrecta',
          detail: `"${q.prompt}" — Revisa el cálculo o la tabla de la hoja de características.`,
        });
      }
    }
  }

  if (flowchartTask) {
    const distractorsUsed = flowchartOrder.filter((id) =>
      flowchartTask.distractorIds.includes(id)
    );
    if (distractorsUsed.length > 0) {
      flowchartPassed = false;
      const names = distractorsUsed
        .map((id) => flowchartTask.blocks.find((b) => b.id === id)?.label ?? id)
        .join(', ');
      diagnostics.push({
        id: 'flow-distractor',
        severity: 'error',
        category: 'wiring',
        title: 'Bloques erróneos o con bugs en el flujo',
        detail: `Has incluido bloques inválidos para este flujo: ${names}. Retíralos de la secuencia.`,
      });
    }

    const expected = flowchartTask.expectedOrder;
    const exactOrder =
      flowchartOrder.length === expected.length &&
      expected.every((id, idx) => flowchartOrder[idx] === id);

    if (!exactOrder && distractorsUsed.length === 0) {
      flowchartPassed = false;
      if (flowchartOrder.length !== expected.length) {
        diagnostics.push({
          id: 'flow-len',
          severity: 'error',
          category: 'wiring',
          title: 'Secuencia incompleta o con bloques extra',
          detail: `El flujo correcto requiere exactamente ${expected.length} bloques (tienes ${flowchartOrder.length}).`,
        });
      } else {
        const firstDiff = expected.findIndex((id, idx) => flowchartOrder[idx] !== id);
        diagnostics.push({
          id: 'flow-order',
          severity: 'error',
          category: 'wiring',
          title: `Orden incorrecto a partir del paso #${firstDiff + 1}`,
          detail: `Revisa el orden lógico (p. ej. salvado/restauración LIFO de la pila, limpieza de flags o evaluación de eventos).`,
        });
      }
    }
  }

  const passed = registersPassed && flowchartPassed;
  if (passed) {
    diagnostics.unshift({
      id: 'puzzle-passed',
      severity: 'success',
      category: 'memoryMap',
      title: '¡Subnivel verificado al 100 %!',
      detail: 'Configuración de registros y flujo de ejecución validados correctamente.',
    });
  }

  return {
    passed,
    registersPassed,
    flowchartPassed,
    diagnostics,
  };
}
