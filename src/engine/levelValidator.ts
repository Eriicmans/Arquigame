import {
  analyzeMemoryMap,
  formatHex16,
  formatHex16Short,
  parseHexAddress,
  type MemoryMapAnalysis,
} from '@/engine/memoryMapAnalyzer';
import type { DiagnosticItem } from '@/engine/simulator';
import type { PlacedComponent, Wire } from '@/types/circuit';
import type { ExpectedMemoryRegion, SublevelDefinition } from '@/types/level';

export interface PlayerTableRow {
  regionId: string;
  chipType?: 'MEM_UVPROM' | 'MEM_SRAM' | 'MEM_FLASH' | 'EMPTY';
  isMirror?: boolean;
  startHex: string;
  endHex: string;
  access: 'R' | 'RW' | 'NONE';
}

export interface RegionCheckResult {
  region: ExpectedMemoryRegion;
  circuitPassed: boolean;
  circuitReason: string;
  tablePassed: boolean;
  tableReason: string;
}

export interface ValidationResult {
  passed: boolean;
  circuitPassed: boolean;
  tablePassed: boolean;
  analysis: MemoryMapAnalysis;
  regionResults: RegionCheckResult[];
  diagnostics: DiagnosticItem[];
}

export function validateSublevel(
  sublevel: SublevelDefinition,
  components: PlacedComponent[],
  wires: Wire[],
  playerTable: PlayerTableRow[],
  mode: 'guided' | 'exam' = sublevel.assistMode
): ValidationResult {
  if (!sublevel.circuit || !sublevel.memoryMapTask) {
    throw new Error(`El subnivel ${sublevel.id} no utiliza circuito ni mapa de memoria.`);
  }
  const analysis = analyzeMemoryMap(components, wires, sublevel.circuit.cpuProfile);
  const diagnostics: DiagnosticItem[] = [...analysis.diagnostics];
  const regionResults: RegionCheckResult[] = [];

  let allRegionsCircuitOk = true;
  let allRegionsTableOk = true;
  const matchedExamRowIndices = new Set<number>();

  for (const expected of sublevel.memoryMapTask.expectedRegions) {
    const expStart = parseHexAddress(expected.startHex)!;
    const expEnd = parseHexAddress(expected.endHex)!;

    // Check circuit coverage across all 1 KB blocks in [expStart, expEnd]
    const overlapping = analysis.segments.filter(
      (s) =>
        s.space === expected.space &&
        s.endAddr >= expStart &&
        s.startAddr <= expEnd
    );

    let circuitPassed = false;
    let circuitReason = '';

    if (expected.chipType === 'EMPTY') {
      const hasAnyChip = overlapping.some((s) => s.chips.length > 0);
      if (!hasAnyChip && overlapping.length > 0) {
        circuitPassed = true;
        circuitReason = `Zona ${formatHex16Short(expStart)}–${formatHex16Short(expEnd)} libre (VACÍO) correctamente.`;
      } else {
        circuitPassed = false;
        circuitReason = `El rango ${formatHex16Short(expStart)}–${formatHex16Short(expEnd)} debería quedar VACÍO, pero tiene chips activos.`;
      }
    } else {
      // Exact segment match: supports single full-width chip OR paired low+high slice chips of same type
      const exactMatch = overlapping.find((s) => {
        if (
          s.startAddr !== expStart ||
          s.endAddr !== expEnd ||
          s.isCollision ||
          s.chips.length === 0 ||
          s.access !== expected.access ||
          Boolean(s.isMirror) !== Boolean(expected.isMirror)
        ) {
          return false;
        }
        const allSameType = s.chips.every((c) => c.chipType === expected.chipType);
        if (!allSameType) return false;
        if (expected.chipId && !s.chips.some((c) => c.chipId === expected.chipId)) {
          return false;
        }
        // If multiple chips are active without collision, verify they form a complete low+high pair
        if (s.chips.length > 1) {
          const hasLow = s.chips.some((c) => c.dataSlice === 'low');
          const hasHigh = s.chips.some((c) => c.dataSlice === 'high');
          return s.chips.length === 2 && hasLow && hasHigh;
        }
        return true;
      });

      if (exactMatch) {
        circuitPassed = true;
        circuitReason = `${expected.label} activo correctamente en ${formatHex16Short(expStart)}–${formatHex16Short(expEnd)} (${expected.access}).`;
      } else {
        circuitPassed = false;
        // Build helpful reason
        const matchedChipSegs = analysis.segments.filter(
          (s) =>
            s.space === expected.space &&
            s.chips.some(
              (c) =>
                c.chipType === expected.chipType &&
                (!expected.chipId || c.chipId === expected.chipId)
            )
        );
        if (matchedChipSegs.length === 0) {
          circuitReason = `${expected.label} no se activa en ningún rango de ${expected.space}. Revisa /CS, /OE${expected.access === 'RW' ? ', /WE' : ''} y los habilitadores del decodificador.`;
        } else {
          const first = matchedChipSegs[0];
          if (first.startAddr === expStart && first.endAddr === expEnd && first.access !== expected.access) {
            circuitReason = `${expected.label} está en el rango correcto (${formatHex16Short(expStart)}–${formatHex16Short(expEnd)}), pero su modo de acceso actual es "${first.access}" y debe ser "${expected.access}" (revisa /OE y /WE).`;
          } else {
            const actualRanges = matchedChipSegs
              .map((s) => `${formatHex16Short(s.startAddr)}–${formatHex16Short(s.endAddr)}`)
              .join(', ');
            circuitReason = `${expected.label} responde en ${actualRanges}, pero el enunciado exige ${formatHex16Short(expStart)}–${formatHex16Short(expEnd)}.`;
          }
        }
      }
    }

    if (!circuitPassed) {
      allRegionsCircuitOk = false;
      diagnostics.push({
        id: `req-circuit-${expected.id}`,
        severity: 'error',
        category: 'memoryMap',
        title: `Requisito pendiente: ${expected.label}`,
        detail: circuitReason,
      });
    }

    // Check player table entry
    let tablePassed = true;
    let tableReason = 'No requerida';

    if (sublevel.memoryMapTask.requireTableCompletion) {
      if (mode === 'exam') {
        // Free-form table matching in Exam mode (order-independent, matched by range + type + access + mirror)
        const matchIdx = playerTable.findIndex((row, idx) => {
          if (matchedExamRowIndices.has(idx)) return false;
          const pStart = parseHexAddress(row.startHex);
          const pEnd = parseHexAddress(row.endHex);
          const startOk = pStart !== null && formatHex16(pStart) === formatHex16(expStart);
          const endOk = pEnd !== null && formatHex16(pEnd) === formatHex16(expEnd);
          const accessOk = row.access === expected.access;
          const typeOk = !row.chipType || row.chipType === expected.chipType;
          const mirrorOk = Boolean(row.isMirror) === Boolean(expected.isMirror);
          return startOk && endOk && accessOk && typeOk && mirrorOk;
        });

        if (matchIdx !== -1) {
          matchedExamRowIndices.add(matchIdx);
          tablePassed = true;
          tableReason = 'Fila correcta en tu tabla.';
        } else {
          tablePassed = false;
          tableReason = `Falta o tiene algún error la fila correspondiente a ${formatHex16Short(expStart)}–${formatHex16Short(expEnd)} (${expected.chipType === 'EMPTY' ? 'Vacío' : expected.chipType.replace('MEM_', '')}${expected.isMirror ? ' Imagen' : ''}, ${expected.access}).`;
        }
      } else {
        const row = playerTable.find((r) => r.regionId === expected.id);
        if (!row) {
          tablePassed = false;
          tableReason = 'Fila sin completar.';
        } else {
          const pStart = parseHexAddress(row.startHex);
          const pEnd = parseHexAddress(row.endHex);
          const startOk = pStart !== null && formatHex16(pStart) === formatHex16(expStart);
          const endOk = pEnd !== null && formatHex16(pEnd) === formatHex16(expEnd);
          const accessOk = row.access === expected.access;

          if (startOk && endOk && accessOk) {
            tablePassed = true;
            tableReason = 'Rango y acceso correctos en la tabla.';
          } else {
            tablePassed = false;
            const issues: string[] = [];
            if (!startOk) issues.push('dirección inicial');
            if (!endOk) issues.push('dirección final');
            if (!accessOk) issues.push('tipo de acceso');
            tableReason = `Revisa en la tabla del mapa de memoria: ${issues.join(', ')} para ${expected.label}.`;
          }
        }
      }

      if (!tablePassed) {
        allRegionsTableOk = false;
        diagnostics.push({
          id: `req-table-${expected.id}`,
          severity: 'warning',
          category: 'table',
          title:
            mode === 'exam'
              ? `Tabla incompleta o errónea (${formatHex16Short(expStart)}–${formatHex16Short(expEnd)})`
              : `Tabla incompleta: ${expected.label}`,
          detail: tableReason,
        });
      }
    }

    regionResults.push({
      region: expected,
      circuitPassed,
      circuitReason,
      tablePassed,
      tableReason,
    });
  }

  if (
    sublevel.memoryMapTask.requireTableCompletion &&
    mode === 'exam' &&
    playerTable.length > sublevel.memoryMapTask.expectedRegions.length
  ) {
    allRegionsTableOk = false;
    diagnostics.push({
      id: 'exam-extra-rows',
      severity: 'warning',
      category: 'table',
      title: 'Filas sobrantes en la tabla',
      detail: `Has añadido ${playerTable.length} filas, pero el mapa de memoria de este ejercicio tiene exactamente ${sublevel.memoryMapTask.expectedRegions.length} regiones.`,
    });
  }

  const circuitPassed = !analysis.hasErrors && allRegionsCircuitOk;
  const tablePassed = allRegionsTableOk;
  const passed = circuitPassed && tablePassed;

  if (passed) {
    diagnostics.unshift({
      id: 'level-passed',
      severity: 'success',
      category: 'memoryMap',
      title: '¡Subnivel verificado al 100 %!',
      detail:
        'El circuito decodifica correctamente todas las memorias sin solapamientos ni fugas de E/S, y tu tabla hexadecimal coincide exactamente con el mapa real.',
    });
  }

  return {
    passed,
    circuitPassed,
    tablePassed,
    analysis,
    regionResults,
    diagnostics,
  };
}
