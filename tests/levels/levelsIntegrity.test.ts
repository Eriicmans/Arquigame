import { describe, expect, it } from 'vitest';
import { loadAllSublevels, loadManifest } from '@/data/levelLoader';
import { validateSublevel, type PlayerTableRow } from '@/engine/levelValidator';
import { validatePuzzleTasks } from '@/engine/puzzleValidator';
import { buildReferenceWires } from '@/store/useGameStore';

describe('Integridad de /niveles (Esquemas Zod + Simulación de Solución de Referencia)', () => {
  it('el manifest.json es válido y lista los 5 niveles disponibles', () => {
    const manifest = loadManifest();
    expect(manifest.levels).toHaveLength(5);
    for (const lvl of manifest.levels) {
      expect(lvl.status).toBe('available');
      expect(lvl.sublevelIds.length).toBeGreaterThanOrEqual(3);
    }
  });

  it('todos los subniveles (1.1 a 5.3) cargan sin error y su solución de referencia pasa al 100 %', () => {
    const sublevels = loadAllSublevels();
    expect(sublevels.length).toBe(16);

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
        const regValues: Record<string, number[]> = {};
        if (sub.registerTask) {
          for (const reg of sub.registerTask.registers) {
            const arr = new Array(8).fill(0);
            for (const b of reg.bits) {
              arr[b.bit] = b.expected ?? b.initial ?? 0;
            }
            regValues[reg.id] = arr;
          }
        }
        const qAnswers: Record<string, number> = {};
        if (sub.registerTask) {
          for (const q of sub.registerTask.questions) {
            qAnswers[q.id] = q.correctIndex;
          }
        }
        const flowOrder = sub.flowchartTask?.expectedOrder ?? [];
        const pRes = validatePuzzleTasks(
          sub.registerTask,
          sub.flowchartTask,
          regValues,
          qAnswers,
          flowOrder
        );
        expect(pRes.passed, `Subnivel ${sub.id} falló validación de puzzle`).toBe(true);
      }
    }
  });
});
