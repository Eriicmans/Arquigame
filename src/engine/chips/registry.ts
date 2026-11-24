import type { ComponentDefinition, ComponentType, PinDefinition } from '@/types/circuit';

export const PIN_ROW_HEIGHT = 26;
export const CHIP_HEADER_HEIGHT = 40;
export const CHIP_PADDING_BOTTOM = 14;

export function getMemoryAddrLabel(sizeKB?: number): string {
  if (!sizeKB || sizeKB <= 0) return 'A0..An';
  const bits = Math.round(Math.log2(sizeKB * 1024));
  return `A0..A${Math.max(0, bits - 1)}`;
}

export function getMemoryDataLabel(dataSlice?: 'full' | 'low' | 'high', dataWidth?: number): string {
  if (dataSlice === 'low') return dataWidth === 8 ? 'D0..D7' : 'D0..D3';
  if (dataSlice === 'high') return dataWidth === 8 ? 'D8..D15' : 'D4..D7';
  return dataWidth === 16 ? 'D0..D15' : 'D0..D7';
}

export function isGateType(type: ComponentType): boolean {
  return (
    type === 'GATE_AND' ||
    type === 'GATE_OR' ||
    type === 'GATE_NOT' ||
    type === 'GATE_NAND' ||
    type === 'GATE_NOR'
  );
}

export function isPowerSymbolType(type: ComponentType): boolean {
  return type === 'POWER_VCC' || type === 'POWER_GND';
}

export function getChipHeight(def: ComponentDefinition): number {
  if (def.type === 'GATE_NOT') return 64;
  if (isGateType(def.type)) return 72;
  if (isPowerSymbolType(def.type)) return 64;
  const leftCount = def.pins.filter((p) => p.side === 'left').length;
  const rightCount = def.pins.filter((p) => p.side === 'right').length;
  const rows = Math.max(leftCount, rightCount, 2);
  return CHIP_HEADER_HEIGHT + rows * PIN_ROW_HEIGHT + CHIP_PADDING_BOTTOM;
}

export function getPinLocalPosition(
  def: ComponentDefinition,
  pinId: string
): { x: number; y: number; pin: PinDefinition } | null {
  const pin = def.pins.find((p) => p.id === pinId);
  if (!pin) return null;

  // Authentic digital electronics power symbols
  if (def.type === 'POWER_VCC' && pinId === 'VCC') {
    return { x: def.width / 2, y: 56, pin };
  }
  if (def.type === 'POWER_GND' && pinId === 'GND') {
    return { x: def.width / 2, y: 8, pin };
  }

  // Authentic ANSI logic gate pin geometry
  if (def.type === 'GATE_NOT') {
    if (pinId === 'IN') return { x: 0, y: 32, pin };
    if (pinId === 'OUT') return { x: def.width, y: 32, pin };
  } else if (isGateType(def.type)) {
    if (pinId === 'IN1') return { x: 0, y: 24, pin };
    if (pinId === 'IN2') return { x: 0, y: 48, pin };
    if (pinId === 'OUT') return { x: def.width, y: 36, pin };
  }

  const sidePinsLeft = def.pins.filter((p) => p.side === 'left');
  const sidePinsRight = def.pins.filter((p) => p.side === 'right');

  const leftIdx = sidePinsLeft.findIndex((p) => p.id === pinId);
  if (leftIdx !== -1) {
    return {
      x: 0,
      y: CHIP_HEADER_HEIGHT + leftIdx * PIN_ROW_HEIGHT + PIN_ROW_HEIGHT / 2,
      pin: sidePinsLeft[leftIdx],
    };
  }

  const rightIdx = sidePinsRight.findIndex((p) => p.id === pinId);
  if (rightIdx !== -1) {
    return {
      x: def.width,
      y: CHIP_HEADER_HEIGHT + rightIdx * PIN_ROW_HEIGHT + PIN_ROW_HEIGHT / 2,
      pin: sidePinsRight[rightIdx],
    };
  }

  return null;
}

export const COMPONENT_REGISTRY: Record<ComponentType, ComponentDefinition> = {
  CPU_8085: {
    type: 'CPU_8085',
    category: 'cpu',
    displayName: 'Microprocesador Intel 8085',
    shortName: 'CPU 8085',
    description:
      'Bus de direcciones 16 bits (64 kB: 0000h–FFFFh), bus de datos 8 bits, separación IO/M (0 = Memoria, 1 = E/S), /RD y /WR activos en bajo.',
    width: 176,
    pins: [
      { id: 'A15', label: 'A15', side: 'right', direction: 'output', kind: 'address', tooltip: 'Bit 15 del bus de direcciones (MSB)' },
      { id: 'A14', label: 'A14', side: 'right', direction: 'output', kind: 'address', tooltip: 'Bit 14 del bus de direcciones' },
      { id: 'A13', label: 'A13', side: 'right', direction: 'output', kind: 'address', tooltip: 'Bit 13 del bus de direcciones (bloque 8 kB)' },
      { id: 'A12', label: 'A12', side: 'right', direction: 'output', kind: 'address', tooltip: 'Bit 12 del bus de direcciones (bloque 4 kB)' },
      { id: 'A11', label: 'A11', side: 'right', direction: 'output', kind: 'address', tooltip: 'Bit 11 del bus de direcciones (bloque 2 kB)' },
      { id: 'A10', label: 'A10', side: 'right', direction: 'output', kind: 'address', tooltip: 'Bit 10 del bus de direcciones (bloque 1 kB)' },
      { id: 'IO/M', label: 'IO/M', side: 'right', direction: 'output', kind: 'control', tooltip: '0 = Ciclo de Memoria, 1 = Ciclo de Puertos E/S' },
      { id: '/RD', label: '/RD', side: 'right', direction: 'output', activeLow: true, kind: 'control', tooltip: 'Lectura (Read), activa a nivel bajo (0)' },
      { id: '/WR', label: '/WR', side: 'right', direction: 'output', activeLow: true, kind: 'control', tooltip: 'Escritura (Write), activa a nivel bajo (0)' },
      { id: 'A0..A12', label: 'A0..An (Bus)', side: 'right', direction: 'output', kind: 'address', isBus: true, tooltip: 'Bus bajo de direcciones internas hacia las memorias' },
      { id: 'D0..D7', label: 'D0..D7', side: 'right', direction: 'output', kind: 'data', isBus: true, tooltip: 'Bus bidireccional de datos de 8 bits' },
    ],
  },

  CPU_80C552: {
    type: 'CPU_80C552',
    category: 'cpu',
    displayName: 'Microcontrolador 80C552 / 80C51',
    shortName: 'MCU 80C552',
    description:
      'Arquitectura Harvard: /PSEN lee memoria de programa externa (EPROM), /RD y /WR acceden a memoria de datos externa (XRAM).',
    width: 176,
    pins: [
      { id: 'A15', label: 'A15', side: 'right', direction: 'output', kind: 'address', tooltip: 'Bit 15 del bus de direcciones (P2.7)' },
      { id: 'A14', label: 'A14', side: 'right', direction: 'output', kind: 'address', tooltip: 'Bit 14 del bus de direcciones (P2.6)' },
      { id: 'A13', label: 'A13', side: 'right', direction: 'output', kind: 'address', tooltip: 'Bit 13 del bus de direcciones (P2.5)' },
      { id: 'A12', label: 'A12', side: 'right', direction: 'output', kind: 'address', tooltip: 'Bit 12 del bus de direcciones (P2.4)' },
      { id: 'A11', label: 'A11', side: 'right', direction: 'output', kind: 'address', tooltip: 'Bit 11 del bus de direcciones (P2.3)' },
      { id: 'A10', label: 'A10', side: 'right', direction: 'output', kind: 'address', tooltip: 'Bit 10 del bus de direcciones (P2.2)' },
      { id: '/PSEN', label: '/PSEN', side: 'right', direction: 'output', activeLow: true, kind: 'control', tooltip: 'Program Store Enable — lectura de memoria de programa (activo bajo)' },
      { id: '/RD', label: '/RD', side: 'right', direction: 'output', activeLow: true, kind: 'control', tooltip: 'Lectura de memoria de datos externa XRAM (activo bajo)' },
      { id: '/WR', label: '/WR', side: 'right', direction: 'output', activeLow: true, kind: 'control', tooltip: 'Escritura de memoria de datos externa XRAM (activo bajo)' },
      { id: 'A0..A12', label: 'A0..An (Bus)', side: 'right', direction: 'output', kind: 'address', isBus: true, tooltip: 'Bus bajo de direcciones demultiplexado (con latch ALE)' },
      { id: 'D0..D7', label: 'D0..D7', side: 'right', direction: 'output', kind: 'data', isBus: true, tooltip: 'Bus de datos de 8 bits (Puerto P0)' },
    ],
  },

  IC_74138: {
    type: 'IC_74138',
    category: 'decoder',
    displayName: 'Decodificador 74AHCT138 (3→8)',
    shortName: '74138',
    description:
      'Decodificador 3 a 8 líneas con salidas activas a nivel bajo (/Y0–/Y7). Se habilita solo cuando /E1=0, /E2=0 y E3=1.',
    width: 176,
    pins: [
      { id: 'A0', label: 'A0 (A)', side: 'left', direction: 'input', kind: 'address', tooltip: 'Entrada de selección bit 0 (peso 1, pin 1)' },
      { id: 'A1', label: 'A1 (B)', side: 'left', direction: 'input', kind: 'address', tooltip: 'Entrada de selección bit 1 (peso 2, pin 2)' },
      { id: 'A2', label: 'A2 (C)', side: 'left', direction: 'input', kind: 'address', tooltip: 'Entrada de selección bit 2 (peso 4, pin 3)' },
      { id: '/E1', label: '/E1', side: 'left', direction: 'input', activeLow: true, kind: 'control', tooltip: 'Habilitador /E1 (/G2A, pin 4) — activo a nivel BAJO (0)' },
      { id: '/E2', label: '/E2', side: 'left', direction: 'input', activeLow: true, kind: 'control', tooltip: 'Habilitador /E2 (/G2B, pin 5) — activo a nivel BAJO (0)' },
      { id: 'E3', label: 'E3', side: 'left', direction: 'input', kind: 'control', tooltip: 'Habilitador E3 (G1, pin 6) — activo a nivel ALTO (1)' },
      { id: '/Y0', label: '/Y0', side: 'right', direction: 'output', activeLow: true, kind: 'chipSelect', tooltip: 'Salida 0 (A2 A1 A0 = 000), activa en BAJO' },
      { id: '/Y1', label: '/Y1', side: 'right', direction: 'output', activeLow: true, kind: 'chipSelect', tooltip: 'Salida 1 (A2 A1 A0 = 001), activa en BAJO' },
      { id: '/Y2', label: '/Y2', side: 'right', direction: 'output', activeLow: true, kind: 'chipSelect', tooltip: 'Salida 2 (A2 A1 A0 = 010), activa en BAJO' },
      { id: '/Y3', label: '/Y3', side: 'right', direction: 'output', activeLow: true, kind: 'chipSelect', tooltip: 'Salida 3 (A2 A1 A0 = 011), activa en BAJO' },
      { id: '/Y4', label: '/Y4', side: 'right', direction: 'output', activeLow: true, kind: 'chipSelect', tooltip: 'Salida 4 (A2 A1 A0 = 100), activa en BAJO' },
      { id: '/Y5', label: '/Y5', side: 'right', direction: 'output', activeLow: true, kind: 'chipSelect', tooltip: 'Salida 5 (A2 A1 A0 = 101), activa en BAJO' },
      { id: '/Y6', label: '/Y6', side: 'right', direction: 'output', activeLow: true, kind: 'chipSelect', tooltip: 'Salida 6 (A2 A1 A0 = 110), activa en BAJO' },
      { id: '/Y7', label: '/Y7', side: 'right', direction: 'output', activeLow: true, kind: 'chipSelect', tooltip: 'Salida 7 (A2 A1 A0 = 111), activa en BAJO' },
    ],
  },

  IC_74139: {
    type: 'IC_74139',
    category: 'decoder',
    displayName: 'Decodificador 74139 (2→4)',
    shortName: '74139',
    description:
      'Decodificador 2 a 4 líneas con salidas activas a nivel bajo (/Y0–/Y3) y habilitador /E activo a nivel bajo.',
    width: 164,
    pins: [
      { id: 'A0', label: 'A0', side: 'left', direction: 'input', kind: 'address', tooltip: 'Selección bit 0 (peso 1)' },
      { id: 'A1', label: 'A1', side: 'left', direction: 'input', kind: 'address', tooltip: 'Selección bit 1 (peso 2)' },
      { id: '/E', label: '/E', side: 'left', direction: 'input', activeLow: true, kind: 'control', tooltip: 'Habilitador /E (/G) — activo a nivel BAJO (0)' },
      { id: '/Y0', label: '/Y0', side: 'right', direction: 'output', activeLow: true, kind: 'chipSelect', tooltip: 'Salida 0 (A1 A0 = 00), activa en BAJO' },
      { id: '/Y1', label: '/Y1', side: 'right', direction: 'output', activeLow: true, kind: 'chipSelect', tooltip: 'Salida 1 (A1 A0 = 01), activa en BAJO' },
      { id: '/Y2', label: '/Y2', side: 'right', direction: 'output', activeLow: true, kind: 'chipSelect', tooltip: 'Salida 2 (A1 A0 = 10), activa en BAJO' },
      { id: '/Y3', label: '/Y3', side: 'right', direction: 'output', activeLow: true, kind: 'chipSelect', tooltip: 'Salida 3 (A1 A0 = 11), activa en BAJO' },
    ],
  },

  GATE_AND: {
    type: 'GATE_AND',
    category: 'gate',
    displayName: 'Puerta AND (2 entradas)',
    shortName: 'AND',
    description:
      'En lógica negativa (/Y0, /Y1 activos en 0), una puerta AND actúa como unión OR: su salida baja a 0 si cualquiera de sus entradas vale 0.',
    width: 116,
    pins: [
      { id: 'IN1', label: 'A', side: 'left', direction: 'input', kind: 'logic', tooltip: 'Entrada A de la puerta AND' },
      { id: 'IN2', label: 'B', side: 'left', direction: 'input', kind: 'logic', tooltip: 'Entrada B de la puerta AND' },
      { id: 'OUT', label: 'Y', side: 'right', direction: 'output', kind: 'chipSelect', tooltip: 'Salida: A · B (0 si A=0 o B=0)' },
    ],
  },

  GATE_OR: {
    type: 'GATE_OR',
    category: 'gate',
    displayName: 'Puerta OR (2 entradas)',
    shortName: 'OR',
    description:
      'En lógica negativa, una puerta OR exige condiciones concurrentes: su salida solo baja a 0 cuando AMBAS entradas valen 0.',
    width: 116,
    pins: [
      { id: 'IN1', label: 'A', side: 'left', direction: 'input', kind: 'logic', tooltip: 'Entrada A de la puerta OR' },
      { id: 'IN2', label: 'B', side: 'left', direction: 'input', kind: 'logic', tooltip: 'Entrada B de la puerta OR' },
      { id: 'OUT', label: 'Y', side: 'right', direction: 'output', kind: 'chipSelect', tooltip: 'Salida: A + B (0 solo si A=0 y B=0)' },
    ],
  },

  GATE_NOT: {
    type: 'GATE_NOT',
    category: 'gate',
    displayName: 'Inversor NOT (7404)',
    shortName: 'NOT',
    description: 'Invierte el nivel lógico de la entrada (0 → 1, 1 → 0).',
    width: 108,
    pins: [
      { id: 'IN', label: 'A', side: 'left', direction: 'input', kind: 'logic', tooltip: 'Entrada a invertir' },
      { id: 'OUT', label: '/Y', side: 'right', direction: 'output', activeLow: true, kind: 'logic', tooltip: 'Salida invertida' },
    ],
  },

  GATE_NAND: {
    type: 'GATE_NAND',
    category: 'gate',
    displayName: 'Puerta NAND (2 entradas)',
    shortName: 'NAND',
    description: 'Salida a nivel bajo (0) únicamente cuando ambas entradas valen 1.',
    width: 116,
    pins: [
      { id: 'IN1', label: 'A', side: 'left', direction: 'input', kind: 'logic', tooltip: 'Entrada A de la puerta NAND' },
      { id: 'IN2', label: 'B', side: 'left', direction: 'input', kind: 'logic', tooltip: 'Entrada B de la puerta NAND' },
      { id: 'OUT', label: '/Y', side: 'right', direction: 'output', activeLow: true, kind: 'chipSelect', tooltip: 'Salida invertida: NOT(A · B)' },
    ],
  },

  GATE_NOR: {
    type: 'GATE_NOR',
    category: 'gate',
    displayName: 'Puerta NOR (2 entradas)',
    shortName: 'NOR',
    description: 'Salida a nivel alto (1) únicamente cuando ambas entradas valen 0.',
    width: 116,
    pins: [
      { id: 'IN1', label: 'A', side: 'left', direction: 'input', kind: 'logic', tooltip: 'Entrada A de la puerta NOR' },
      { id: 'IN2', label: 'B', side: 'left', direction: 'input', kind: 'logic', tooltip: 'Entrada B de la puerta NOR' },
      { id: 'OUT', label: '/Y', side: 'right', direction: 'output', activeLow: true, kind: 'chipSelect', tooltip: 'Salida invertida: NOT(A + B)' },
    ],
  },

  MEM_UVPROM: {
    type: 'MEM_UVPROM',
    category: 'memory',
    displayName: 'Memoria UVPROM (Solo Lectura)',
    shortName: 'UVPROM',
    description:
      'Memoria no volátil de solo lectura (programa/reset). Activa sus salidas cuando /CS=0 y /OE=0.',
    width: 176,
    defaultProps: { sizeKB: 8, dataWidth: 8 },
    pins: [
      { id: '/CS', label: '/CS', side: 'left', direction: 'input', activeLow: true, kind: 'chipSelect', tooltip: 'Chip Select — selección del integrado (activo en BAJO)' },
      { id: '/OE', label: '/OE (/RD)', side: 'left', direction: 'input', activeLow: true, kind: 'control', tooltip: 'Output Enable — habilitación de lectura (conectar a /RD o /PSEN)' },
      { id: 'ADDR', label: 'A0..An', side: 'left', direction: 'input', kind: 'address', isBus: true, tooltip: 'Bus de direcciones internas de la memoria' },
      { id: 'DATA', label: 'D0..D7', side: 'left', direction: 'input', kind: 'data', isBus: true, tooltip: 'Bus de datos de la memoria' },
    ],
  },

  MEM_SRAM: {
    type: 'MEM_SRAM',
    category: 'memory',
    displayName: 'Memoria SRAM (Lectura/Escritura)',
    shortName: 'SRAM',
    description:
      'Memoria volátil de lectura y escritura. Requiere /CS=0 y /OE=0 para leer, o /CS=0 y /WE=0 para escribir.',
    width: 176,
    defaultProps: { sizeKB: 8, dataWidth: 8 },
    pins: [
      { id: '/CS', label: '/CS', side: 'left', direction: 'input', activeLow: true, kind: 'chipSelect', tooltip: 'Chip Select — selección del integrado (activo en BAJO)' },
      { id: '/OE', label: '/OE (/RD)', side: 'left', direction: 'input', activeLow: true, kind: 'control', tooltip: 'Output Enable — lectura (conectar a /RD)' },
      { id: '/WE', label: '/WE (/WR)', side: 'left', direction: 'input', activeLow: true, kind: 'control', tooltip: 'Write Enable — escritura (conectar a /WR)' },
      { id: 'ADDR', label: 'A0..An', side: 'left', direction: 'input', kind: 'address', isBus: true, tooltip: 'Bus de direcciones internas de la memoria' },
      { id: 'DATA', label: 'D0..D7', side: 'left', direction: 'input', kind: 'data', isBus: true, tooltip: 'Bus de datos de la memoria' },
    ],
  },

  MEM_FLASH: {
    type: 'MEM_FLASH',
    category: 'memory',
    displayName: 'Memoria Flash (No Volátil R/W)',
    shortName: 'FLASH',
    description:
      'Memoria no volátil reprogramable con señales /CS, /OE y /WE activas a nivel bajo.',
    width: 176,
    defaultProps: { sizeKB: 16, dataWidth: 8 },
    pins: [
      { id: '/CS', label: '/CS', side: 'left', direction: 'input', activeLow: true, kind: 'chipSelect', tooltip: 'Chip Select (activo en BAJO)' },
      { id: '/OE', label: '/OE (/RD)', side: 'left', direction: 'input', activeLow: true, kind: 'control', tooltip: 'Output Enable — lectura (activo en BAJO)' },
      { id: '/WE', label: '/WE (/WR)', side: 'left', direction: 'input', activeLow: true, kind: 'control', tooltip: 'Write Enable — programación/escritura (activo en BAJO)' },
      { id: 'ADDR', label: 'A0..An', side: 'left', direction: 'input', kind: 'address', isBus: true, tooltip: 'Bus de direcciones internas' },
      { id: 'DATA', label: 'D0..D7', side: 'left', direction: 'input', kind: 'data', isBus: true, tooltip: 'Bus de datos' },
    ],
  },

  POWER_VCC: {
    type: 'POWER_VCC',
    category: 'power',
    displayName: 'Alimentación VCC (+5V / 1 lógico)',
    shortName: 'VCC',
    description: 'Símbolo estándar de alimentación positiva (+5V, nivel lógico ALTO constante = 1).',
    width: 82,
    pins: [
      { id: 'VCC', label: 'VCC', side: 'bottom', direction: 'output', kind: 'power', tooltip: 'Alimentación +5V (nivel lógico 1 constante)' },
    ],
  },

  POWER_GND: {
    type: 'POWER_GND',
    category: 'power',
    displayName: 'Masa GND (0V / 0 lógico)',
    shortName: 'GND',
    description: 'Símbolo estándar de masa/tierra (0V, nivel lógico BAJO constante = 0).',
    width: 82,
    pins: [
      { id: 'GND', label: 'GND', side: 'top', direction: 'output', kind: 'power', tooltip: 'Masa 0V (nivel lógico 0 constante)' },
    ],
  },

  POWER_RAILS: {
    type: 'POWER_RAILS',
    category: 'power',
    displayName: 'Alimentación VCC / GND',
    shortName: 'VCC / GND',
    description: 'Niveles lógicos fijos: VCC = 1 lógico (+5V), GND = 0 lógico (0V).',
    width: 136,
    pins: [
      { id: 'VCC', label: 'VCC (1)', side: 'right', direction: 'output', kind: 'power', tooltip: 'Nivel lógico ALTO constante (1)' },
      { id: 'GND', label: 'GND (0)', side: 'right', direction: 'output', kind: 'power', tooltip: 'Nivel lógico BAJO constante (0)' },
    ],
  },
};

export function isMemoryType(type: ComponentType): boolean {
  return type === 'MEM_UVPROM' || type === 'MEM_SRAM' || type === 'MEM_FLASH';
}

export function isCpuType(type: ComponentType): boolean {
  return type === 'CPU_8085' || type === 'CPU_80C552';
}
