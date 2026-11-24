export type LogicLevel = 0 | 1 | 'Z' | 'X'; // 0 = Low, 1 = High, Z = Floating, X = Contention/Conflict

export type SignalKind =
  | 'address'
  | 'data'
  | 'control'
  | 'power'
  | 'chipSelect'
  | 'logic';

export type PinDirection = 'input' | 'output';

export interface PinDefinition {
  id: string;
  label: string;
  side: 'left' | 'right' | 'top' | 'bottom';
  direction: PinDirection;
  activeLow?: boolean;
  kind: SignalKind;
  tooltip: string;
  /** Optional bus pin (visual grouping like A0..A12 or D0..D7) */
  isBus?: boolean;
}

export type ComponentType =
  | 'CPU_8085'
  | 'CPU_80C552'
  | 'IC_74138'
  | 'IC_74139'
  | 'GATE_AND'
  | 'GATE_OR'
  | 'GATE_NOT'
  | 'GATE_NAND'
  | 'GATE_NOR'
  | 'MEM_UVPROM'
  | 'MEM_SRAM'
  | 'MEM_FLASH'
  | 'POWER_VCC'
  | 'POWER_GND'
  | 'POWER_RAILS';

export type DataSlice = 'full' | 'low' | 'high';

export interface ComponentDefinition {
  type: ComponentType;
  category: 'cpu' | 'decoder' | 'gate' | 'memory' | 'power';
  displayName: string;
  shortName: string;
  description: string;
  width: number;
  defaultProps?: {
    sizeKB?: number;
    dataWidth?: number;
    dataSlice?: DataSlice;
  };
  pins: PinDefinition[];
}

export interface PlacedComponent {
  id: string;
  type: ComponentType;
  label: string;
  x: number;
  y: number;
  locked?: boolean;
  props?: {
    sizeKB?: number;
    dataWidth?: number;
    dataSlice?: DataSlice;
  };
}

export interface PinRef {
  componentId: string;
  pinId: string;
}

export interface Wire {
  id: string;
  from: PinRef;
  to: PinRef;
  locked?: boolean;
}

export type CpuProfile = '8085' | '80C552';
