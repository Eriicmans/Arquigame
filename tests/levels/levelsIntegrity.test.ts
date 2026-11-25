import { describe, expect, it } from 'vitest';
import { loadAllSublevels, loadManifest } from '@/data/levelLoader';
import { validateSublevel, type PlayerTableRow } from '@/engine/levelValidator';
import { validatePuzzleTasks } from '@/engine/puzzleValidator';
import { buildReferenceWires } from '@/store/useGameStore';

describe('Integridad de /niveles (Esquemas Zod + Simulación de Solución de Referencia)', () => {
  it('el manifest.json es válido y lista los 5 niveles', () => {
    const manifest = loadManifest();
    expect(manifest.levels).toHaveLength(5);
    expect(manifest.levels[0].status).toBe('available');
  });

  it('todos los subniveles (Niveles 1 a 5) cargan sin error y sus soluciones de referencia pasan al 100 %', () => {
    const sublevels = loadAllSublevels();
    expect(sublevels.length).toBeGreaterThanOrEqual(16);

    for (const sub of sublevels) {
      if (sub.circuit && sub.memoryMapTask) {
        const refWires = buildReferenceWires(sub);
        const perfectTable: PlayerTableRow[] = sub.memoryMapTask.expectedRegions.map((r) => ({
          regionId: r.id,
          startHex: `${r.startHex.slice(2)}h`,
          endHex: `${r.endHex.slice(2)}h`,
          access: r.access,
        }));

        const res = validateSublevel(sub, sub.circuit.components, refWires, perfectTable, 'guided');
        expect(res.circuitPassed, `Subnivel ${sub.id} falló simulación de circuito`).toBe(true);
        expect(res.tablePassed, `Subnivel ${sub.id} falló validación de tabla`).toBe(true);
        expect(res.passed, `Subnivel ${sub.id} no pasó validación global`).toBe(true);

        const examTable: PlayerTableRow[] = [...sub.memoryMapTask.expectedRegions]
          .reverse()
          .map((r, i) => ({
            regionId: `exam-${i}`,
            chipType: r.chipType,
            isMirror: Boolean(r.isMirror),
            startHex: `${r.startHex.slice(2)}h`,
            endHex: `${r.endHex.slice(2)}h`,
            access: r.access,
          }));
        const examRes = validateSublevel(sub, sub.circuit.components, refWires, examTable, 'exam');
        expect(examRes.passed, `Subnivel ${sub.id} falló en modo examen`).toBe(true);
      } else {
        const registerValues: Record<string, number[]> = {};
        const questionAnswers: Record<string, number> = {};
        if (sub.registerTask) {
          for (const reg of sub.registerTask.registers) {
            const arr = new Array(8).fill(0);
            for (const b of reg.bits) {
              arr[b.bit] = b.expected ?? b.initial ?? 0;
            }
            registerValues[reg.id] = arr;
          }
          for (const q of sub.registerTask.questions) {
            questionAnswers[q.id] = q.correctIndex;
          }
        }
        const flowOrder = sub.flowchartTask?.expectedOrder ?? [];
        const pRes = validatePuzzleTasks(
          sub.registerTask,
          sub.flowchartTask,
          registerValues,
          questionAnswers,
          flowOrder
        );
        expect(pRes.passed, `Subnivel ${sub.id} falló validación de registros/flujo`).toBe(true);
      }
    }
  });
});
