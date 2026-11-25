import { parsePinKey } from '@/engine/simulator';
import type { PlayerTableRow } from '@/engine/levelValidator';
import type { PlacedComponent, Wire } from '@/types/circuit';
import type { SublevelDefinition } from '@/types/level';

export interface SavedSublevelState {
  mode: 'guided' | 'exam';
  components: PlacedComponent[];
  wires: Wire[];
  tableRows: PlayerTableRow[];
  registerValues: Record<string, number[]>;
  questionAnswers: Record<string, number>;
  flowchartOrder: string[];
  completed: boolean;
}

const STORAGE_KEY = 'arquigame_progress_v4';

export function buildInitialSublevelState(
  sublevel: SublevelDefinition,
  mode: 'guided' | 'exam' = sublevel.assistMode
): SavedSublevelState {
  const components: PlacedComponent[] = sublevel.circuit
    ? mode === 'exam'
      ? sublevel.circuit.components
          .filter((c) => c.type === 'CPU_8085' || c.type === 'CPU_80C552')
          .map((c) => ({ ...c, locked: true }))
      : sublevel.circuit.components.map((c) => ({
          ...c,
          props: c.props ? { ...c.props } : undefined,
        }))
    : [];

  const wires: Wire[] = sublevel.circuit
    ? mode === 'exam'
      ? []
      : sublevel.circuit.fixedWires.map((fw, idx) => ({
          id: `fixed-${idx}`,
          from: parsePinKey(fw.from),
          to: parsePinKey(fw.to),
          locked: fw.locked ?? true,
        }))
    : [];

  const tableRows: PlayerTableRow[] = sublevel.memoryMapTask
    ? mode === 'exam'
      ? [
          {
            regionId: 'exam-row-1',
            chipType: 'MEM_UVPROM',
            isMirror: false,
            startHex: '',
            endHex: '',
            access: 'R',
          },
        ]
      : sublevel.memoryMapTask.expectedRegions.map((reg) => ({
          regionId: reg.id,
          chipType: reg.chipType,
          isMirror: Boolean(reg.isMirror),
          startHex: '',
          endHex: '',
          access: reg.chipType === 'EMPTY' ? 'NONE' : 'R',
        }))
    : [];

  const registerValues: Record<string, number[]> = {};
  if (sublevel.registerTask) {
    for (const reg of sublevel.registerTask.registers) {
      const arr = new Array(8).fill(0);
      for (const b of reg.bits) {
        arr[b.bit] = b.initial ?? 0;
      }
      registerValues[reg.id] = arr;
    }
  }

  return {
    mode,
    components,
    wires,
    tableRows,
    registerValues,
    questionAnswers: {},
    flowchartOrder: [],
    completed: false,
  };
}

export function buildReferenceWires(sublevel: SublevelDefinition): Wire[] {
  if (!sublevel.circuit) return [];
  return sublevel.circuit.referenceNetlist.map((rw, idx) => ({
    id: `ref-${idx}`,
    from: parsePinKey(rw.from),
    to: parsePinKey(rw.to),
    locked: false,
  }));
}

function stateKey(sublevelId: string, mode: 'guided' | 'exam'): string {
  return `${sublevelId}:${mode}`;
}

export function loadSavedState(
  sublevelId: string,
  mode: 'guided' | 'exam'
): SavedSublevelState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const all = JSON.parse(raw) as Record<string, SavedSublevelState>;
    return all[stateKey(sublevelId, mode)] ?? null;
  } catch {
    return null;
  }
}

export function saveSublevelState(
  sublevelId: string,
  mode: 'guided' | 'exam',
  state: SavedSublevelState
): void {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const all = raw ? (JSON.parse(raw) as Record<string, SavedSublevelState>) : {};
    all[stateKey(sublevelId, mode)] = state;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  } catch {
    // Ignore storage quota errors
  }
}
