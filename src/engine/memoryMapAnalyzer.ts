import { COMPONENT_REGISTRY, isMemoryType } from '@/engine/chips/registry';
import {
  buildNetGraph,
  pinKey,
  simulateCircuitState,
  type CpuBusState,
  type DiagnosticItem,
} from '@/engine/simulator';
import type { CpuProfile, DataSlice, PlacedComponent, Wire } from '@/types/circuit';

export interface ActiveChipEntry {
  chipId: string;
  chipLabel: string;
  chipType: 'MEM_UVPROM' | 'MEM_SRAM' | 'MEM_FLASH';
  physicalSizeKB: number;
  dataSlice: DataSlice;
  canRead: boolean;
  canWrite: boolean;
}

export function slicesOverlap(a: DataSlice, b: DataSlice): boolean {
  return a === 'full' || b === 'full' || a === b;
}

export function hasSliceCollision(chips: ActiveChipEntry[]): boolean {
  for (let i = 0; i < chips.length; i++) {
    for (let j = i + 1; j < chips.length; j++) {
      if (slicesOverlap(chips[i].dataSlice, chips[j].dataSlice)) {
        return true;
      }
    }
  }
  return false;
}

export interface MemoryMapSegment {
  id: string;
  startAddr: number;
  endAddr: number;
  startHex: string;
  endHex: string;
  sizeKB: number;
  space: 'memory' | 'program' | 'data';
  chips: ActiveChipEntry[];
  access: 'R' | 'RW' | 'W' | 'NONE';
  isCollision: boolean;
  isMirror: boolean;
}

export interface MemoryMapAnalysis {
  cpuProfile: CpuProfile;
  segments: MemoryMapSegment[];
  ioLeaks: Array<{ chipId: string; chipLabel: string }>;
  uvpromWriteErrors: Array<{ chipId: string; chipLabel: string }>;
  diagnostics: DiagnosticItem[];
  hasErrors: boolean;
  chipMappedKB: Map<string, number>;
}

export function formatHex16(addr: number): string {
  return `0x${addr.toString(16).toUpperCase().padStart(4, '0')}`;
}

export function formatHex16Short(addr: number): string {
  return `${addr.toString(16).toUpperCase().padStart(4, '0')}h`;
}

export function parseHexAddress(input: string): number | null {
  const cleaned = input.trim().toUpperCase();
  if (!cleaned) return null;
  let hex = cleaned;
  if (hex.startsWith('0X')) hex = hex.slice(2);
  if (hex.endsWith('H')) hex = hex.slice(0, -1);
  if (!/^[0-9A-F]{1,4}$/.test(hex)) return null;
  return parseInt(hex, 16);
}

interface BlockResult {
  blockIndex: number; // 0..63 (each block = 1 KB = 0x0400)
  activeChips: ActiveChipEntry[];
}

function evaluateSpaceBlocks(
  components: PlacedComponent[],
  wires: Wire[],
  graph: ReturnType<typeof buildNetGraph>,
  cpuProfile: CpuProfile,
  space: 'memory' | 'program' | 'data'
): {
  blocks: BlockResult[];
  uvpromWriteErrors: Map<string, string>;
} {
  const memories = components.filter((c) => isMemoryType(c.type));
  const blocks: BlockResult[] = [];
  const uvpromWriteErrors = new Map<string, string>();

  for (let b = 0; b < 64; b++) {
    const addr = b * 1024; // 1 KB steps: 0x0000, 0x0400, ... 0xFC00

    const readBus: CpuBusState =
      cpuProfile === '8085'
        ? { address: addr, ioM: 0, psen: 1, rd: 0, wr: 1 }
        : space === 'program'
          ? { address: addr, ioM: 0, psen: 0, rd: 1, wr: 1 }
          : { address: addr, ioM: 0, psen: 1, rd: 0, wr: 1 };

    const writeBus: CpuBusState =
      cpuProfile === '8085'
        ? { address: addr, ioM: 0, psen: 1, rd: 1, wr: 0 }
        : { address: addr, ioM: 0, psen: 1, rd: 1, wr: 0 };

    const readSnap = simulateCircuitState(components, wires, readBus, graph);
    const writeSnap =
      space === 'program' ? null : simulateCircuitState(components, wires, writeBus, graph);

    const activeChips: ActiveChipEntry[] = [];

    for (const mem of memories) {
      const csRead = readSnap.pinValues.get(pinKey(mem.id, '/CS'));
      const oeRead = readSnap.pinValues.get(pinKey(mem.id, '/OE'));
      const canRead = csRead === 0 && oeRead === 0;

      let canWrite = false;
      if (writeSnap) {
        const csWrite = writeSnap.pinValues.get(pinKey(mem.id, '/CS'));
        const oeWrite = writeSnap.pinValues.get(pinKey(mem.id, '/OE'));

        if (mem.type === 'MEM_UVPROM') {
          if (csWrite === 0 && oeWrite === 0) {
            uvpromWriteErrors.set(mem.id, mem.label);
          }
        } else {
          const weWrite = writeSnap.pinValues.get(pinKey(mem.id, '/WE'));
          canWrite = csWrite === 0 && weWrite === 0;
        }
      }

      if (canRead || canWrite) {
        activeChips.push({
          chipId: mem.id,
          chipLabel: mem.label,
          chipType: mem.type as 'MEM_UVPROM' | 'MEM_SRAM' | 'MEM_FLASH',
          physicalSizeKB:
            mem.props?.sizeKB ?? COMPONENT_REGISTRY[mem.type].defaultProps?.sizeKB ?? 8,
          dataSlice: mem.props?.dataSlice ?? 'full',
          canRead,
          canWrite,
        });
      }
    }

    blocks.push({ blockIndex: b, activeChips });
  }

  return { blocks, uvpromWriteErrors };
}

function signatureOf(chips: ActiveChipEntry[]): string {
  if (chips.length === 0) return 'EMPTY';
  return chips
    .map((c) => `${c.chipId}:${c.canRead ? 'R' : ''}${c.canWrite ? 'W' : ''}`)
    .sort()
    .join('|');
}

export function analyzeMemoryMap(
  components: PlacedComponent[],
  wires: Wire[],
  cpuProfile: CpuProfile
): MemoryMapAnalysis {
  const graph = buildNetGraph(components, wires);
  const diagnostics: DiagnosticItem[] = [];

  // 1. Structural check on a baseline cycle
  const baseBus: CpuBusState =
    cpuProfile === '8085'
      ? { address: 0, ioM: 0, psen: 1, rd: 0, wr: 1 }
      : { address: 0, ioM: 0, psen: 0, rd: 1, wr: 1 };
  const baseSnap = simulateCircuitState(components, wires, baseBus, graph);

  for (const sc of baseSnap.shortCircuits) {
    diagnostics.push({
      id: `short-${sc.pins.join('-')}`,
      severity: 'error',
      category: 'wiring',
      title: 'Cortocircuito de salidas',
      detail: sc.message,
    });
  }

  // Group floating inputs by component
  const floatingByComp = new Map<string, string[]>();
  for (const f of baseSnap.floatingInputs) {
    if (!floatingByComp.has(f.componentId)) floatingByComp.set(f.componentId, []);
    floatingByComp.get(f.componentId)!.push(f.label);
  }
  for (const [compId, pins] of floatingByComp.entries()) {
    const comp = components.find((c) => c.id === compId);
    if (!comp) continue;
    const isMem = isMemoryType(comp.type);
    const isDecoder = comp.type === 'IC_74138' || comp.type === 'IC_74139';
    diagnostics.push({
      id: `float-${compId}`,
      severity: isMem || isDecoder ? 'error' : 'warning',
      category: 'wiring',
      title: `Pines sin conectar en ${comp.label}`,
      detail: `Entradas flotantes: ${pins.join(', ')}. En circuitos digitales TTL/CMOS no deben quedar entradas de habilitación o selección al aire.`,
      componentId: compId,
    });
  }

  // Check memory bus wiring (ADDR & DATA)
  for (const comp of components) {
    if (!isMemoryType(comp.type)) continue;
    if (!baseSnap.busConnections.memoryAddrConnected.get(comp.id)) {
      diagnostics.push({
        id: `bus-addr-${comp.id}`,
        severity: 'error',
        category: 'bus',
        title: `Bus de direcciones desconectado en ${comp.label}`,
        detail: `Conecta el bus A0..A12 de la CPU al pin A0..An de ${comp.label}.`,
        componentId: comp.id,
      });
    }
    if (!baseSnap.busConnections.memoryDataConnected.get(comp.id)) {
      diagnostics.push({
        id: `bus-data-${comp.id}`,
        severity: 'error',
        category: 'bus',
        title: `Bus de datos desconectado en ${comp.label}`,
        detail: `Conecta el bus D0..D7 de la CPU al pin D0..D7 de ${comp.label}.`,
        componentId: comp.id,
      });
    }
  }

  // 2. Sweep memory space(s)
  const spacesToSweep: Array<'memory' | 'program' | 'data'> =
    cpuProfile === '8085' ? ['memory'] : ['program', 'data'];

  const allSegments: MemoryMapSegment[] = [];
  const chipMappedKB = new Map<string, number>();
  const allUvpromWriteErrors = new Map<string, string>();

  for (const space of spacesToSweep) {
    const { blocks, uvpromWriteErrors } = evaluateSpaceBlocks(
      components,
      wires,
      graph,
      cpuProfile,
      space
    );
    for (const [k, v] of uvpromWriteErrors.entries()) allUvpromWriteErrors.set(k, v);

    // Track cumulative KB seen per chip so we can mark mirror regions accurately
    const seenKBPerChip = new Map<string, number>();
    // First compute total KB per chip in this space
    const totalKBInSpace = new Map<string, number>();
    for (const blk of blocks) {
      for (const ch of blk.activeChips) {
        totalKBInSpace.set(ch.chipId, (totalKBInSpace.get(ch.chipId) ?? 0) + 1);
      }
    }
    for (const [chipId, kb] of totalKBInSpace.entries()) {
      chipMappedKB.set(chipId, (chipMappedKB.get(chipId) ?? 0) + kb);
    }

    // Merge adjacent blocks with same signature and same mirror state
    let curStart = 0;
    let curChips = blocks[0].activeChips;
    let curSig = signatureOf(curChips);
    let curMirror = false;

    const getBlockMirrorState = (chips: ActiveChipEntry[]): boolean => {
      if (chips.length === 0 || hasSliceCollision(chips)) return false;
      return chips.some((ch) => (seenKBPerChip.get(ch.chipId) ?? 0) >= ch.physicalSizeKB);
    };

    curMirror = getBlockMirrorState(curChips);
    for (const ch of curChips) {
      seenKBPerChip.set(ch.chipId, (seenKBPerChip.get(ch.chipId) ?? 0) + 1);
    }

    const pushSegment = (
      startBlk: number,
      endBlk: number,
      chips: ActiveChipEntry[],
      isMirror: boolean
    ) => {
      const startAddr = startBlk * 1024;
      const endAddr = (endBlk + 1) * 1024 - 1;
      const sizeKB = endBlk - startBlk + 1;
      const isCollision = hasSliceCollision(chips);
      let access: 'R' | 'RW' | 'W' | 'NONE' = 'NONE';
      if (chips.length >= 1) {
        const anyR = chips.some((c) => c.canRead);
        const anyW = chips.some((c) => c.canWrite);
        access = anyR && anyW ? 'RW' : anyR ? 'R' : anyW ? 'W' : 'NONE';
      }

      allSegments.push({
        id: `${space}-${startAddr}-${endAddr}`,
        startAddr,
        endAddr,
        startHex: formatHex16(startAddr),
        endHex: formatHex16(endAddr),
        sizeKB,
        space,
        chips,
        access,
        isCollision,
        isMirror,
      });
    };

    for (let b = 1; b < blocks.length; b++) {
      const blkChips = blocks[b].activeChips;
      const blkSig = signatureOf(blkChips);
      const blkMirror = getBlockMirrorState(blkChips);

      for (const ch of blkChips) {
        seenKBPerChip.set(ch.chipId, (seenKBPerChip.get(ch.chipId) ?? 0) + 1);
      }

      if (blkSig !== curSig || blkMirror !== curMirror) {
        pushSegment(curStart, b - 1, curChips, curMirror);
        curStart = b;
        curChips = blkChips;
        curSig = blkSig;
        curMirror = blkMirror;
      }
    }
    pushSegment(curStart, blocks.length - 1, curChips, curMirror);
  }

  // Emit collision diagnostics
  for (const seg of allSegments) {
    if (seg.isCollision) {
      const names = seg.chips.map((c) => c.chipLabel).join(' y ');
      diagnostics.push({
        id: `collision-${seg.id}`,
        severity: 'error',
        category: 'memoryMap',
        title: `Solapamiento de bus en ${formatHex16Short(seg.startAddr)}–${formatHex16Short(seg.endAddr)}`,
        detail: `Colisión eléctrica: ${names} tienen /CS=0 simultáneamente en este rango de direcciones.`,
      });
    }
    if (seg.isMirror && seg.chips.length === 1) {
      diagnostics.push({
        id: `mirror-${seg.id}`,
        severity: 'info',
        category: 'memoryMap',
        title: `Zona imagen (espejo) en ${formatHex16Short(seg.startAddr)}–${formatHex16Short(seg.endAddr)}`,
        detail: `${seg.chips[0].chipLabel} (${seg.chips[0].physicalSizeKB} kB físicos) se repite en este bloque por decodificación parcial o combinación de salidas.`,
      });
    }
  }

  // UVPROM activated on write errors
  const uvpromWriteErrors: Array<{ chipId: string; chipLabel: string }> = [];
  for (const [chipId, chipLabel] of allUvpromWriteErrors.entries()) {
    uvpromWriteErrors.push({ chipId, chipLabel });
    diagnostics.push({
      id: `uvprom-wr-${chipId}`,
      severity: 'error',
      category: 'bus',
      title: `Lectura/Escritura incorrecta en ${chipLabel}`,
      detail: `${chipLabel} es de solo lectura pero su /OE se activa en ciclos /WR. Conecta /OE a /RD${cpuProfile === '80C552' ? ' o /PSEN' : ''}.`,
      componentId: chipId,
    });
  }

  // 3. Check 8085 I/O isolation (IO/M = 1 must NOT activate memory chips)
  const ioLeaks: Array<{ chipId: string; chipLabel: string }> = [];
  if (cpuProfile === '8085') {
    const memories = components.filter((c) => isMemoryType(c.type));
    const leaked = new Map<string, string>();
    // Sample every 4 KB (16 points covers A15..A12)
    for (let b = 0; b < 64; b += 2) {
      const ioSnap = simulateCircuitState(
        components,
        wires,
        { address: b * 1024, ioM: 1, psen: 1, rd: 0, wr: 1 },
        graph
      );
      for (const mem of memories) {
        const cs = ioSnap.pinValues.get(pinKey(mem.id, '/CS'));
        const oe = ioSnap.pinValues.get(pinKey(mem.id, '/OE'));
        if (cs === 0 && oe === 0) {
          leaked.set(mem.id, mem.label);
        }
      }
    }
    for (const [chipId, chipLabel] of leaked.entries()) {
      ioLeaks.push({ chipId, chipLabel });
      diagnostics.push({
        id: `io-leak-${chipId}`,
        severity: 'error',
        category: 'bus',
        title: `Fuga al espacio de E/S en ${chipLabel}`,
        detail: `${chipLabel} se activa también cuando IO/M = 1 (puertos E/S). Conecta IO/M a un habilitador activo en bajo (/E1 o /E2) del decodificador.`,
        componentId: chipId,
      });
    }
  }

  const hasErrors = diagnostics.some((d) => d.severity === 'error');

  return {
    cpuProfile,
    segments: allSegments,
    ioLeaks,
    uvpromWriteErrors,
    diagnostics,
    hasErrors,
    chipMappedKB,
  };
}
