import { describe, expect, it } from 'vitest';
import { loadAllSublevels, loadManifest } from '@/data/levelLoader';
import { validateSublevel, type PlayerTableRow } from '@/engine/levelValidator';
import { buildReferenceWires } from '@/store/useGameStore';

describe('Integridad de /niveles (Esquemas Zod + Simulación de Solución de Referencia)', () => {
  it('el manifest.json es válido y lista los 5 niveles', () => {
    const manifest = loadManifest();
    expect(manifest.levels).toHaveLength(5);
    expect(manifest.levels[0].status).toBe('available');
  });

  it('todos los subniveles cargan sin error y su referenceNetlist pasa al 100 %', () => {
    const sublevels = loadAllSublevels();
    expect(sublevels.length).toBeGreaterThanOrEqual(1);

    for (const sub of sublevels) {
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

      // Verify exam-mode free-form table validation (order-independent)
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
    }
  });
});
