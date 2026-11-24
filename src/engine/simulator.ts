import { COMPONENT_REGISTRY } from '@/engine/chips/registry';
import type { LogicLevel, PlacedComponent, Wire } from '@/types/circuit';

export interface CpuBusState {
  address: number; // 16-bit address (0x0000 - 0xFFFF)
  ioM: 0 | 1; // 8085: 0 = Memory, 1 = I/O
  psen: 0 | 1; // 80C552: 0 = Program Read active
  rd: 0 | 1; // 0 = Read active
  wr: 0 | 1; // 0 = Write active
}

export interface DiagnosticItem {
  id: string;
  severity: 'error' | 'warning' | 'info' | 'success';
  category: 'wiring' | 'bus' | 'memoryMap' | 'table';
  title: string;
  detail: string;
  componentId?: string;
}

export interface CircuitSnapshot {
  pinValues: Map<string, LogicLevel>;
  shortCircuits: Array<{ pins: string[]; message: string }>;
  floatingInputs: Array<{ componentId: string; pinId: string; label: string }>;
  busConnections: {
    memoryAddrConnected: Map<string, boolean>;
    memoryDataConnected: Map<string, boolean>;
  };
}

export function pinKey(componentId: string, pinId: string): string {
  return `${componentId}.${pinId}`;
}

export function parsePinKey(key: string): { componentId: string; pinId: string } {
  const dot = key.indexOf('.');
  return {
    componentId: key.slice(0, dot),
    pinId: key.slice(dot + 1),
  };
}

function getCpuPinLevel(pinId: string, bus: CpuBusState): LogicLevel {
  if (pinId.startsWith('A') && /^A\d+$/.test(pinId)) {
    const bit = Number(pinId.slice(1));
    return ((bus.address >> bit) & 1) as 0 | 1;
  }
  switch (pinId) {
    case 'IO/M':
      return bus.ioM;
    case '/PSEN':
      return bus.psen;
    case '/RD':
      return bus.rd;
    case '/WR':
      return bus.wr;
    default:
      return 'Z';
  }
}

function evalCombinationalOutputs(
  comp: PlacedComponent,
  readPin: (pinId: string) => LogicLevel,
  bus: CpuBusState
): Record<string, LogicLevel> {
  switch (comp.type) {
    case 'POWER_VCC':
      return { VCC: 1 };

    case 'POWER_GND':
      return { GND: 0 };

    case 'POWER_RAILS':
      return { VCC: 1, GND: 0 };

    case 'CPU_8085':
      return {
        A15: getCpuPinLevel('A15', bus),
        A14: getCpuPinLevel('A14', bus),
        A13: getCpuPinLevel('A13', bus),
        A12: getCpuPinLevel('A12', bus),
        A11: getCpuPinLevel('A11', bus),
        A10: getCpuPinLevel('A10', bus),
        'IO/M': bus.ioM,
        '/RD': bus.rd,
        '/WR': bus.wr,
      };

    case 'CPU_80C552':
      return {
        A15: getCpuPinLevel('A15', bus),
        A14: getCpuPinLevel('A14', bus),
        A13: getCpuPinLevel('A13', bus),
        A12: getCpuPinLevel('A12', bus),
        A11: getCpuPinLevel('A11', bus),
        A10: getCpuPinLevel('A10', bus),
        '/PSEN': bus.psen,
        '/RD': bus.rd,
        '/WR': bus.wr,
      };

    case 'IC_74138': {
      const a0 = readPin('A0');
      const a1 = readPin('A1');
      const a2 = readPin('A2');
      const e1 = readPin('/E1');
      const e2 = readPin('/E2');
      const e3 = readPin('E3');

      const out: Record<string, LogicLevel> = {};
      // If any enable is missing/floating or conflict, decoder cannot validly assert outputs
      if (e1 === 'Z' || e2 === 'Z' || e3 === 'Z' || e1 === 'X' || e2 === 'X' || e3 === 'X') {
        for (let i = 0; i < 8; i++) out[`/Y${i}`] = 'X';
        return out;
      }

      // Disabled when /E1=1 OR /E2=1 OR E3=0 -> all outputs inactive HIGH (1)
      if (e1 === 1 || e2 === 1 || e3 === 0) {
        for (let i = 0; i < 8; i++) out[`/Y${i}`] = 1;
        return out;
      }

      // Enabled, now need valid A0, A1, A2
      if (
        a0 === 'Z' || a1 === 'Z' || a2 === 'Z' ||
        a0 === 'X' || a1 === 'X' || a2 === 'X'
      ) {
        for (let i = 0; i < 8; i++) out[`/Y${i}`] = 'X';
        return out;
      }

      const sel = (a2 << 2) | (a1 << 1) | a0;
      for (let i = 0; i < 8; i++) {
        out[`/Y${i}`] = i === sel ? 0 : 1;
      }
      return out;
    }

    case 'IC_74139': {
      const a0 = readPin('A0');
      const a1 = readPin('A1');
      const e = readPin('/E');

      const out: Record<string, LogicLevel> = {};
      if (e === 'Z' || e === 'X') {
        for (let i = 0; i < 4; i++) out[`/Y${i}`] = 'X';
        return out;
      }
      if (e === 1) {
        for (let i = 0; i < 4; i++) out[`/Y${i}`] = 1;
        return out;
      }
      if (a0 === 'Z' || a1 === 'Z' || a0 === 'X' || a1 === 'X') {
        for (let i = 0; i < 4; i++) out[`/Y${i}`] = 'X';
        return out;
      }
      const sel = (a1 << 1) | a0;
      for (let i = 0; i < 4; i++) {
        out[`/Y${i}`] = i === sel ? 0 : 1;
      }
      return out;
    }

    case 'GATE_NOT': {
      const v = readPin('IN');
      if (v === 0) return { OUT: 1 };
      if (v === 1) return { OUT: 0 };
      return { OUT: 'X' };
    }

    case 'GATE_AND': {
      const a = readPin('IN1');
      const b = readPin('IN2');
      if (a === 'Z' || b === 'Z' || a === 'X' || b === 'X') return { OUT: 'X' };
      return { OUT: a === 1 && b === 1 ? 1 : 0 };
    }

    case 'GATE_OR': {
      const a = readPin('IN1');
      const b = readPin('IN2');
      if (a === 'Z' || b === 'Z' || a === 'X' || b === 'X') return { OUT: 'X' };
      return { OUT: a === 1 || b === 1 ? 1 : 0 };
    }

    case 'GATE_NAND': {
      const a = readPin('IN1');
      const b = readPin('IN2');
      if (a === 'Z' || b === 'Z' || a === 'X' || b === 'X') return { OUT: 'X' };
      return { OUT: a === 1 && b === 1 ? 0 : 1 };
    }

    case 'GATE_NOR': {
      const a = readPin('IN1');
      const b = readPin('IN2');
      if (a === 'Z' || b === 'Z' || a === 'X' || b === 'X') return { OUT: 'X' };
      return { OUT: a === 1 || b === 1 ? 0 : 1 };
    }

    default:
      return {};
  }
}

interface NetGraph {
  nets: string[][];
  pinToNet: Map<string, number>;
  busAdjacency: Map<string, Set<string>>;
}

export function buildNetGraph(components: PlacedComponent[], wires: Wire[]): NetGraph {
  const compMap = new Map(components.map((c) => [c.id, c]));
  const adj = new Map<string, Set<string>>();
  const busAdjacency = new Map<string, Set<string>>();

  const addEdge = (map: Map<string, Set<string>>, a: string, b: string) => {
    if (!map.has(a)) map.set(a, new Set());
    if (!map.has(b)) map.set(b, new Set());
    map.get(a)!.add(b);
    map.get(b)!.add(a);
  };

  for (const w of wires) {
    const cFrom = compMap.get(w.from.componentId);
    const cTo = compMap.get(w.to.componentId);
    if (!cFrom || !cTo) continue;

    const pFrom = COMPONENT_REGISTRY[cFrom.type].pins.find((p) => p.id === w.from.pinId);
    const pTo = COMPONENT_REGISTRY[cTo.type].pins.find((p) => p.id === w.to.pinId);
    if (!pFrom || !pTo) continue;

    const kA = pinKey(w.from.componentId, w.from.pinId);
    const kB = pinKey(w.to.componentId, w.to.pinId);

    if (pFrom.isBus || pTo.isBus) {
      addEdge(busAdjacency, kA, kB);
    } else {
      addEdge(adj, kA, kB);
    }
  }

  const visited = new Set<string>();
  const nets: string[][] = [];
  const pinToNet = new Map<string, number>();

  for (const node of adj.keys()) {
    if (visited.has(node)) continue;
    const netIdx = nets.length;
    const group: string[] = [];
    const queue = [node];
    visited.add(node);

    while (queue.length > 0) {
      const cur = queue.shift()!;
      group.push(cur);
      pinToNet.set(cur, netIdx);
      for (const next of adj.get(cur) ?? []) {
        if (!visited.has(next)) {
          visited.add(next);
          queue.push(next);
        }
      }
    }
    nets.push(group);
  }

  return { nets, pinToNet, busAdjacency };
}

export function simulateCircuitState(
  components: PlacedComponent[],
  wires: Wire[],
  bus: CpuBusState,
  precomputedGraph?: NetGraph
): CircuitSnapshot {
  const graph = precomputedGraph ?? buildNetGraph(components, wires);
  const compMap = new Map(components.map((c) => [c.id, c]));

  // Track output drivers per pinKey
  const outputValues = new Map<string, LogicLevel>();
  const pinValues = new Map<string, LogicLevel>();

  // Initialize all non-bus pins to Z
  for (const c of components) {
    for (const p of COMPONENT_REGISTRY[c.type].pins) {
      if (!p.isBus) {
        pinValues.set(pinKey(c.id, p.id), 'Z');
      }
    }
  }

  const shortCircuits: Array<{ pins: string[]; message: string }> = [];
  let recordedShorts = false;

  // Iterative fixed-point propagation (handles multi-stage combinational circuits)
  for (let pass = 0; pass < 16; pass++) {
    let changed = false;

    for (const c of components) {
      const readPin = (pinId: string): LogicLevel => pinValues.get(pinKey(c.id, pinId)) ?? 'Z';
      const outputs = evalCombinationalOutputs(c, readPin, bus);
      for (const [pId, val] of Object.entries(outputs)) {
        const k = pinKey(c.id, pId);
        if (outputValues.get(k) !== val) {
          outputValues.set(k, val);
          changed = true;
        }
        if (!graph.pinToNet.has(k) && pinValues.get(k) !== val) {
          pinValues.set(k, val);
        }
      }
    }

    // Resolve each connected net
    for (const net of graph.nets) {
      const drivers: Array<{ key: string; val: LogicLevel }> = [];
      for (const k of net) {
        const { componentId, pinId } = parsePinKey(k);
        const comp = compMap.get(componentId);
        if (!comp) continue;
        const pDef = COMPONENT_REGISTRY[comp.type].pins.find((p) => p.id === pinId);
        if (pDef?.direction === 'output') {
          drivers.push({ key: k, val: outputValues.get(k) ?? 'Z' });
        }
      }

      let resolved: LogicLevel = 'Z';
      if (drivers.length === 1) {
        resolved = drivers[0].val;
      } else if (drivers.length > 1) {
        // Two outputs tied directly together is always an electrical short circuit in CMOS/TTL
        resolved = 'X';
        if (!recordedShorts) {
          shortCircuits.push({
            pins: drivers.map((d) => d.key),
            message: `Cortocircuito entre salidas (${drivers.map((d) => d.key).join(' y ')}). No conectes dos salidas directamente; usa una puerta lógica (ej. AND para unir /Y0 y /Y1).`,
          });
        }
      }

      for (const k of net) {
        if (pinValues.get(k) !== resolved) {
          pinValues.set(k, resolved);
          changed = true;
        }
      }
    }

    recordedShorts = true;
    if (!changed) break;
  }

  // Detect floating inputs on components that have at least one connection or are memory/decoders
  const floatingInputs: Array<{ componentId: string; pinId: string; label: string }> = [];
  for (const c of components) {
    const def = COMPONENT_REGISTRY[c.type];
    if (def.category === 'cpu' || def.category === 'power') continue;

    for (const p of def.pins) {
      if (p.direction !== 'input' || p.isBus) continue;
      const val = pinValues.get(pinKey(c.id, p.id)) ?? 'Z';
      if (val === 'Z') {
        floatingInputs.push({ componentId: c.id, pinId: p.id, label: p.label });
      }
    }
  }

  // Check bus connections for memory chips (ADDR & DATA connected to CPU bus)
  const memoryAddrConnected = new Map<string, boolean>();
  const memoryDataConnected = new Map<string, boolean>();
  const cpuComp = components.find((c) => c.type === 'CPU_8085' || c.type === 'CPU_80C552');

  for (const c of components) {
    if (COMPONENT_REGISTRY[c.type].category !== 'memory') continue;
    const addrNeighbors = graph.busAdjacency.get(pinKey(c.id, 'ADDR'));
    const dataNeighbors = graph.busAdjacency.get(pinKey(c.id, 'DATA'));
    const hasAddr = Boolean(
      cpuComp && addrNeighbors && addrNeighbors.has(pinKey(cpuComp.id, 'A0..A12'))
    );
    const hasData = Boolean(
      cpuComp && dataNeighbors && dataNeighbors.has(pinKey(cpuComp.id, 'D0..D7'))
    );
    memoryAddrConnected.set(c.id, hasAddr);
    memoryDataConnected.set(c.id, hasData);
  }

  return {
    pinValues,
    shortCircuits,
    floatingInputs,
    busConnections: {
      memoryAddrConnected,
      memoryDataConnected,
    },
  };
}
