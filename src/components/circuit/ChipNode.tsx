import React from 'react';
import {
  CHIP_HEADER_HEIGHT,
  COMPONENT_REGISTRY,
  getChipHeight,
  getMemoryAddrLabel,
  getMemoryDataLabel,
  getPinLocalPosition,
  isGateType,
  isMemoryType,
  isPowerSymbolType,
  PIN_ROW_HEIGHT,
} from '@/engine/chips/registry';
import { pinKey } from '@/engine/simulator';
import type { LogicLevel, PinDefinition, PlacedComponent, SignalKind } from '@/types/circuit';

export const SIGNAL_COLORS_LIGHT: Record<SignalKind, string> = {
  address: '#0284c7',
  data: '#059669',
  control: '#d97706',
  chipSelect: '#7c3aed',
  power: '#e11d48',
  logic: '#2563eb',
};

export const SIGNAL_COLORS_DARK: Record<SignalKind, string> = {
  address: '#38bdf8',
  data: '#34d399',
  control: '#fbbf24',
  chipSelect: '#a78bfa',
  power: '#fb7185',
  logic: '#60a5fa',
};

export function getSignalColor(kind: SignalKind, dark: boolean, pinId?: string): string {
  if (pinId === 'GND') return dark ? '#a1a1aa' : '#52525b';
  return (dark ? SIGNAL_COLORS_DARK : SIGNAL_COLORS_LIGHT)[kind] ?? (dark ? '#a1a1aa' : '#52525b');
}

interface ChipNodeProps {
  component: PlacedComponent;
  dark: boolean;
  selected: boolean;
  connectingFrom: {
    componentId: string;
    pinId: string;
    direction: 'input' | 'output';
    isBus?: boolean;
  } | null;
  pinValues: Map<string, LogicLevel>;
  showLiveLevels: boolean;
  onStartDrag: (e: React.PointerEvent, componentId: string) => void;
  onSelect: (componentId: string) => void;
  onDelete: (componentId: string) => void;
  onPinClick: (e: React.MouseEvent, componentId: string, pin: PinDefinition) => void;
  onPinHover: (info: { compLabel: string; pin: PinDefinition; level?: LogicLevel } | null) => void;
}

function getLevelStyle(
  level: LogicLevel,
  dark: boolean,
  activeLow?: boolean
): { bg: string; text: string; border: string; label: string } {
  if (level === 0) {
    if (activeLow) {
      return dark
        ? { bg: '#14532d', text: '#86efac', border: '#166534', label: '0' }
        : { bg: '#dcfce7', text: '#15803d', border: '#bbf7d0', label: '0' };
    }
    return dark
      ? { bg: '#27272a', text: '#a1a1aa', border: '#3f3f46', label: '0' }
      : { bg: '#f4f4f5', text: '#52525b', border: '#e4e4e7', label: '0' };
  }
  if (level === 1) {
    if (activeLow) {
      return dark
        ? { bg: '#27272a', text: '#71717a', border: '#3f3f46', label: '1' }
        : { bg: '#f4f4f5', text: '#71717a', border: '#e4e4e7', label: '1' };
    }
    return dark
      ? { bg: '#1e3a5f', text: '#93c5fd', border: '#2563eb', label: '1' }
      : { bg: '#dbeafe', text: '#1d4ed8', border: '#bfdbfe', label: '1' };
  }
  if (level === 'X') {
    return dark
      ? { bg: '#450a0a', text: '#fca5a5', border: '#991b1b', label: 'X' }
      : { bg: '#fee2e2', text: '#b91c1c', border: '#fecaca', label: 'X' };
  }
  return dark
    ? { bg: '#27272a', text: '#71717a', border: '#3f3f46', label: 'Z' }
    : { bg: '#f4f4f5', text: '#a1a1aa', border: '#e4e4e7', label: 'Z' };
}

export const ChipNode: React.FC<ChipNodeProps> = ({
  component,
  dark,
  selected,
  connectingFrom,
  pinValues,
  showLiveLevels,
  onStartDrag,
  onSelect,
  onDelete,
  onPinClick,
  onPinHover,
}) => {
  const def = COMPONENT_REGISTRY[component.type];

  const isTargetCompatible = (pin: PinDefinition): boolean => {
    if (!connectingFrom) return false;
    if (connectingFrom.componentId === component.id && connectingFrom.pinId === pin.id) {
      return false;
    }
    if (Boolean(connectingFrom.isBus) !== Boolean(pin.isBus)) return false;
    return connectingFrom.direction !== pin.direction;
  };

  // =========================================================================
  // 1. AUTHENTIC DIGITAL ELECTRONICS POWER SYMBOLS (VCC T-Bar & GND 3-Bar)
  // =========================================================================
  if (isPowerSymbolType(component.type)) {
    const isVcc = component.type === 'POWER_VCC';
    const pin = def.pins[0];
    const local = getPinLocalPosition(def, pin.id)!;
    const isSource =
      connectingFrom?.componentId === component.id && connectingFrom?.pinId === pin.id;
    const stroke = selected
      ? '#10b981'
      : isVcc
        ? dark
          ? '#fb7185'
          : '#e11d48'
        : dark
          ? '#d4d4d8'
          : '#3f3f46';

    return (
      <g
        transform={`translate(${component.x}, ${component.y})`}
        onClick={(e) => {
          e.stopPropagation();
          onSelect(component.id);
        }}
      >
        {/* Subtle delete button */}
        {!component.locked && (
          <g
            className="cursor-pointer opacity-50 hover:opacity-100"
            transform={`translate(${def.width - 12}, -2)`}
            onClick={(e) => {
              e.stopPropagation();
              onDelete(component.id);
            }}
          >
            <circle
              cx={5}
              cy={5}
              r={7}
              fill={dark ? '#27272a' : '#ffffff'}
              stroke={dark ? '#3f3f46' : '#e4e4e7'}
            />
            <text
              x={5}
              y={8.5}
              textAnchor="middle"
              fill={dark ? '#fca5a5' : '#e11d48'}
              fontSize={11}
              fontWeight={700}
              className="select-none"
            >
              ×
            </text>
          </g>
        )}

        {/* Draggable symbol body */}
        <g
          className="cursor-grab active:cursor-grabbing"
          onPointerDown={(e) => onStartDrag(e, component.id)}
        >
          {/* Invisible comfortable drag hit area */}
          <rect x={8} y={4} width={def.width - 16} height={56} rx={8} fill="transparent" />

          {isVcc ? (
            <>
              {/* Standard VCC T-bar + "+5V" label */}
              <text
                x={def.width / 2}
                y={13}
                textAnchor="middle"
                fill={stroke}
                fontSize={11}
                fontFamily="JetBrains Mono, monospace"
                fontWeight={700}
                className="select-none pointer-events-none"
              >
                VCC (1)
              </text>
              <line
                x1={16}
                y1={22}
                x2={def.width - 16}
                y2={22}
                stroke={stroke}
                strokeWidth={2.8}
                strokeLinecap="round"
              />
              <line
                x1={def.width / 2}
                y1={22}
                x2={def.width / 2}
                y2={56}
                stroke={stroke}
                strokeWidth={2.2}
                strokeLinecap="round"
              />
            </>
          ) : (
            <>
              {/* Standard 3-bar Earth / Ground symbol */}
              <line
                x1={def.width / 2}
                y1={8}
                x2={def.width / 2}
                y2={30}
                stroke={stroke}
                strokeWidth={2.2}
                strokeLinecap="round"
              />
              <line
                x1={15}
                y1={30}
                x2={def.width - 15}
                y2={30}
                stroke={stroke}
                strokeWidth={2.5}
                strokeLinecap="round"
              />
              <line
                x1={21}
                y1={37}
                x2={def.width - 21}
                y2={37}
                stroke={stroke}
                strokeWidth={2.2}
                strokeLinecap="round"
              />
              <line
                x1={27}
                y1={44}
                x2={def.width - 27}
                y2={44}
                stroke={stroke}
                strokeWidth={2}
                strokeLinecap="round"
              />
              <text
                x={def.width / 2}
                y={58}
                textAnchor="middle"
                fill={dark ? '#a1a1aa' : '#52525b'}
                fontSize={10}
                fontFamily="JetBrains Mono, monospace"
                fontWeight={600}
                className="select-none pointer-events-none"
              >
                GND (0)
              </text>
            </>
          )}
        </g>

        {/* Connection Terminal Socket */}
        <g
          className="cursor-pointer"
          onClick={(e) => {
            e.stopPropagation();
            onPinClick(e, component.id, pin);
          }}
          onMouseEnter={() =>
            onPinHover({ compLabel: component.label, pin, level: isVcc ? 1 : 0 })
          }
          onMouseLeave={() => onPinHover(null)}
        >
          <circle cx={local.x} cy={local.y} r={14} fill="transparent" />
          <circle
            cx={local.x}
            cy={local.y}
            r={isSource ? 6 : 4.8}
            fill={isSource ? '#10b981' : dark ? '#18181b' : '#ffffff'}
            stroke={isSource ? '#10b981' : stroke}
            strokeWidth={2.2}
          />
        </g>
      </g>
    );
  }

  // =========================================================================
  // 2. AUTHENTIC ANSI / IEEE LOGIC GATE SHAPES (AND, OR, NOT, NAND, NOR)
  // =========================================================================
  if (isGateType(component.type)) {
    const strokeColor = selected
      ? '#10b981'
      : dark
        ? '#e4e4e7'
        : '#18181b';
    const fillColor = dark ? '#1c1c20' : '#ffffff';
    const isNot = component.type === 'GATE_NOT';
    const isOrLike = component.type === 'GATE_OR' || component.type === 'GATE_NOR';
    const hasOutputBubble =
      component.type === 'GATE_NAND' ||
      component.type === 'GATE_NOR' ||
      component.type === 'GATE_NOT';

    const outLevel = pinValues.get(pinKey(component.id, 'OUT'));
    const outStyle =
      showLiveLevels && outLevel !== undefined
        ? getLevelStyle(outLevel, dark, hasOutputBubble)
        : null;

    const renderGatePinSocket = (pin: PinDefinition) => {
      const local = getPinLocalPosition(def, pin.id);
      if (!local) return null;
      const isSource =
        connectingFrom?.componentId === component.id && connectingFrom?.pinId === pin.id;
      const compatible = isTargetCompatible(pin);
      const level = pinValues.get(pinKey(component.id, pin.id));
      const pinColor = getSignalColor(pin.kind, dark, pin.id);

      return (
        <g
          key={pin.id}
          className="cursor-pointer"
          onClick={(e) => {
            e.stopPropagation();
            onPinClick(e, component.id, pin);
          }}
          onMouseEnter={() => onPinHover({ compLabel: component.label, pin, level })}
          onMouseLeave={() => onPinHover(null)}
        >
          <circle cx={local.x} cy={local.y} r={13} fill="transparent" />
          {compatible && (
            <circle
              cx={local.x}
              cy={local.y}
              r={9}
              fill="#10b981"
              fillOpacity={0.22}
              stroke="#10b981"
              strokeWidth={1.2}
            />
          )}
          <circle
            cx={local.x}
            cy={local.y}
            r={isSource ? 6 : 4.8}
            fill={isSource ? '#10b981' : dark ? '#18181b' : '#ffffff'}
            stroke={isSource ? '#10b981' : pinColor}
            strokeWidth={2.2}
          />
        </g>
      );
    };

    return (
      <g
        transform={`translate(${component.x}, ${component.y})`}
        onClick={(e) => {
          e.stopPropagation();
          onSelect(component.id);
        }}
      >
        <text
          x={def.width / 2}
          y={2}
          textAnchor="middle"
          fill={dark ? '#a1a1aa' : '#71717a'}
          fontSize={10}
          fontFamily="JetBrains Mono, monospace"
          fontWeight={600}
          className="select-none pointer-events-none"
        >
          {component.label}
        </text>

        {!component.locked && (
          <g
            className="cursor-pointer opacity-55 hover:opacity-100"
            transform={`translate(${def.width - 14}, -6)`}
            onClick={(e) => {
              e.stopPropagation();
              onDelete(component.id);
            }}
          >
            <circle
              cx={6}
              cy={6}
              r={7}
              fill={dark ? '#27272a' : '#ffffff'}
              stroke={dark ? '#3f3f46' : '#e4e4e7'}
              strokeWidth={1.2}
            />
            <text
              x={6}
              y={9.5}
              textAnchor="middle"
              fill={dark ? '#fca5a5' : '#e11d48'}
              fontSize={11}
              fontWeight={700}
              className="select-none"
            >
              ×
            </text>
          </g>
        )}

        <g
          className="cursor-grab active:cursor-grabbing"
          onPointerDown={(e) => onStartDrag(e, component.id)}
        >
          {isNot ? (
            <>
              <line x1={0} y1={32} x2={22} y2={32} stroke={strokeColor} strokeWidth={2.2} />
              <line x1={85} y1={32} x2={def.width} y2={32} stroke={strokeColor} strokeWidth={2.2} />
            </>
          ) : (
            <>
              <line x1={0} y1={24} x2={isOrLike ? 26 : 20} y2={24} stroke={strokeColor} strokeWidth={2.2} />
              <line x1={0} y1={48} x2={isOrLike ? 26 : 20} y2={48} stroke={strokeColor} strokeWidth={2.2} />
              <line
                x1={hasOutputBubble ? (isOrLike ? 94 : 90) : isOrLike ? 84 : 80}
                y1={36}
                x2={def.width}
                y2={36}
                stroke={strokeColor}
                strokeWidth={2.2}
              />
            </>
          )}

          {component.type === 'GATE_AND' && (
            <path
              d="M 20 12 L 56 12 A 24 24 0 0 1 56 60 L 20 60 Z"
              fill={fillColor}
              stroke={strokeColor}
              strokeWidth={selected ? 2.5 : 2.1}
              strokeLinejoin="round"
            />
          )}

          {component.type === 'GATE_NAND' && (
            <>
              <path
                d="M 20 12 L 56 12 A 24 24 0 0 1 56 60 L 20 60 Z"
                fill={fillColor}
                stroke={strokeColor}
                strokeWidth={selected ? 2.5 : 2.1}
                strokeLinejoin="round"
              />
              <circle cx={85} cy={36} r={5} fill={fillColor} stroke={strokeColor} strokeWidth={2.1} />
            </>
          )}

          {component.type === 'GATE_OR' && (
            <path
              d="M 18 12 Q 34 36 18 60 L 42 60 Q 68 60 84 36 Q 68 12 42 12 Z"
              fill={fillColor}
              stroke={strokeColor}
              strokeWidth={selected ? 2.5 : 2.1}
              strokeLinejoin="round"
            />
          )}

          {component.type === 'GATE_NOR' && (
            <>
              <path
                d="M 18 12 Q 34 36 18 60 L 42 60 Q 68 60 84 36 Q 68 12 42 12 Z"
                fill={fillColor}
                stroke={strokeColor}
                strokeWidth={selected ? 2.5 : 2.1}
                strokeLinejoin="round"
              />
              <circle cx={89} cy={36} r={5} fill={fillColor} stroke={strokeColor} strokeWidth={2.1} />
            </>
          )}

          {component.type === 'GATE_NOT' && (
            <>
              <path
                d="M 22 10 L 74 32 L 22 54 Z"
                fill={fillColor}
                stroke={strokeColor}
                strokeWidth={selected ? 2.5 : 2.1}
                strokeLinejoin="round"
              />
              <circle cx={79.5} cy={32} r={5.5} fill={fillColor} stroke={strokeColor} strokeWidth={2.1} />
            </>
          )}

          <text
            x={isNot ? 42 : isOrLike ? 49 : 48}
            y={isNot ? 35.5 : 39.5}
            textAnchor="middle"
            fill={dark ? '#d4d4d8' : '#3f3f46'}
            fontSize={10}
            fontFamily="JetBrains Mono, monospace"
            fontWeight={700}
            className="select-none pointer-events-none"
          >
            {def.shortName}
          </text>

          {outStyle && (
            <g className="pointer-events-none">
              <rect
                x={def.width - 20}
                y={isNot ? 42 : 46}
                width={17}
                height={15}
                rx={4}
                fill={outStyle.bg}
                stroke={outStyle.border}
                strokeWidth={1}
              />
              <text
                x={def.width - 11.5}
                y={isNot ? 52.5 : 56.5}
                textAnchor="middle"
                fill={outStyle.text}
                fontSize={9.5}
                fontFamily="JetBrains Mono, monospace"
                fontWeight={700}
              >
                {outStyle.label}
              </text>
            </g>
          )}
        </g>

        {def.pins.map((pin) => renderGatePinSocket(pin))}
      </g>
    );
  }

  // =========================================================================
  // 3. STANDARD IC / CPU / MEMORY CARDS (NEUTRAL DARK OR CRISP LIGHT)
  // =========================================================================
  const height = getChipHeight(def);
  const accentColor =
    def.category === 'cpu'
      ? dark
        ? '#38bdf8'
        : '#0284c7'
      : def.category === 'decoder'
        ? dark
          ? '#a78bfa'
          : '#7c3aed'
        : def.category === 'memory'
          ? dark
            ? '#34d399'
            : '#059669'
          : dark
            ? '#fb7185'
            : '#e11d48';

  const cardBg = dark ? '#1c1c20' : '#ffffff';
  const headerBg = dark ? '#242429' : '#f8fafc';
  const cardBorder = selected ? '#10b981' : dark ? '#3f3f46' : '#d4d4d8';
  const titleColor = dark ? '#f4f4f5' : '#18181b';
  const pinLabelColor = dark ? '#d4d4d8' : '#27272a';

  const leftPins = def.pins.filter((p) => p.side === 'left');
  const rightPins = def.pins.filter((p) => p.side === 'right');

  const renderPin = (pin: PinDefinition, idx: number, side: 'left' | 'right') => {
    const cy = CHIP_HEADER_HEIGHT + idx * PIN_ROW_HEIGHT + PIN_ROW_HEIGHT / 2;
    const cx = side === 'left' ? 0 : def.width;
    const isSource =
      connectingFrom?.componentId === component.id && connectingFrom?.pinId === pin.id;
    const compatible = isTargetCompatible(pin);
    const level = pin.isBus ? undefined : pinValues.get(pinKey(component.id, pin.id));
    const pinColor = getSignalColor(pin.kind, dark, pin.id);

    const levelStyle =
      showLiveLevels && !pin.isBus && level !== undefined
        ? getLevelStyle(level, dark, pin.activeLow)
        : null;

    const bubbleX = side === 'left' ? 8.5 : def.width - 8.5;
    const labelX =
      side === 'left'
        ? pin.activeLow
          ? 18
          : 12
        : def.width - (pin.activeLow ? 18 : 12);

    const hasLeft = leftPins.length > 0;
    const hasRight = rightPins.length > 0;
    const badgeX =
      side === 'left'
        ? hasRight
          ? def.width / 2 - 20
          : def.width - 28
        : hasLeft
          ? def.width / 2 + 4
          : 12;

    return (
      <g
        key={pin.id}
        className="cursor-pointer group"
        onClick={(e) => {
          e.stopPropagation();
          onPinClick(e, component.id, pin);
        }}
        onMouseEnter={() => onPinHover({ compLabel: component.label, pin, level })}
        onMouseLeave={() => onPinHover(null)}
      >
        <circle cx={cx} cy={cy} r={12} fill="transparent" />

        {compatible && (
          <circle
            cx={cx}
            cy={cy}
            r={9}
            fill="#10b981"
            fillOpacity={0.22}
            stroke="#10b981"
            strokeWidth={1.2}
          />
        )}

        <line
          x1={side === 'left' ? -7 : def.width}
          y1={cy}
          x2={side === 'left' ? 0 : def.width + 7}
          y2={cy}
          stroke={isSource ? '#10b981' : pinColor}
          strokeWidth={pin.isBus ? 3.8 : 2.3}
          strokeLinecap="round"
        />

        <circle
          cx={cx}
          cy={cy}
          r={isSource ? 6 : 4.5}
          fill={isSource ? '#10b981' : dark ? '#18181b' : '#ffffff'}
          stroke={isSource ? '#10b981' : pinColor}
          strokeWidth={2}
        />

        {pin.activeLow && (
          <circle
            cx={bubbleX}
            cy={cy}
            r={3.5}
            fill={cardBg}
            stroke={pinColor}
            strokeWidth={1.7}
          />
        )}

        <text
          x={labelX}
          y={cy + 3.5}
          textAnchor={side === 'left' ? 'start' : 'end'}
          fill={pinLabelColor}
          fontSize={11}
          fontFamily="JetBrains Mono, monospace"
          fontWeight={500}
          className="select-none pointer-events-none"
        >
          {isMemoryType(component.type) && pin.id === 'ADDR'
            ? getMemoryAddrLabel(component.props?.sizeKB)
            : isMemoryType(component.type) && pin.id === 'DATA'
              ? getMemoryDataLabel(component.props?.dataSlice, component.props?.dataWidth)
              : pin.label}
        </text>

        {levelStyle && (
          <g className="pointer-events-none">
            <rect
              x={badgeX}
              y={cy - 7.5}
              width={17}
              height={15}
              rx={4}
              fill={levelStyle.bg}
              stroke={levelStyle.border}
              strokeWidth={0.8}
            />
            <text
              x={badgeX + 8.5}
              y={cy + 3.5}
              textAnchor="middle"
              fill={levelStyle.text}
              fontSize={9.5}
              fontFamily="JetBrains Mono, monospace"
              fontWeight={700}
            >
              {levelStyle.label}
            </text>
          </g>
        )}
      </g>
    );
  };

  return (
    <g
      transform={`translate(${component.x}, ${component.y})`}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(component.id);
      }}
    >
      <rect
        x={0}
        y={0}
        width={def.width}
        height={height}
        rx={10}
        fill={cardBg}
        stroke={cardBorder}
        strokeWidth={selected ? 2.1 : 1.3}
      />

      <g
        className="cursor-grab active:cursor-grabbing"
        onPointerDown={(e) => onStartDrag(e, component.id)}
      >
        <path
          d={`M 0 10 Q 0 0 10 0 L ${def.width - 10} 0 Q ${def.width} 0 ${def.width} 10 L ${def.width} ${CHIP_HEADER_HEIGHT} L 0 ${CHIP_HEADER_HEIGHT} Z`}
          fill={headerBg}
        />
        {/* Subtle top category accent line */}
        <path
          d={`M 10 0.75 L ${def.width - 10} 0.75`}
          stroke={accentColor}
          strokeWidth={2.5}
          strokeLinecap="round"
        />
        <line
          x1={0}
          y1={CHIP_HEADER_HEIGHT}
          x2={def.width}
          y2={CHIP_HEADER_HEIGHT}
          stroke={dark ? '#2e2e34' : '#e4e4e7'}
          strokeWidth={1}
        />

        <text
          x={11}
          y={19}
          fill={titleColor}
          fontSize={11.5}
          fontFamily="Inter, sans-serif"
          fontWeight={700}
          className="select-none pointer-events-none"
        >
          {component.label}
        </text>

        <text
          x={11}
          y={32}
          fill={accentColor}
          fontSize={9.5}
          fontFamily="JetBrains Mono, monospace"
          fontWeight={600}
          className="select-none pointer-events-none"
        >
          {component.props?.sizeKB
            ? `${def.shortName} · ${component.props.sizeKB} kB × ${component.props.dataWidth ?? 8}b`
            : def.shortName}
        </text>
      </g>

      {!component.locked && (
        <g
          className="cursor-pointer opacity-55 hover:opacity-100"
          transform={`translate(${def.width - 20}, 10)`}
          onClick={(e) => {
            e.stopPropagation();
            onDelete(component.id);
          }}
        >
          <rect
            x={-1}
            y={-1}
            width={16}
            height={16}
            rx={5}
            fill={dark ? '#27272a' : '#ffffff'}
            stroke={dark ? '#3f3f46' : '#e4e4e7'}
          />
          <text
            x={7}
            y={10.5}
            textAnchor="middle"
            fill={dark ? '#fca5a5' : '#e11d48'}
            fontSize={12}
            fontWeight={700}
            className="select-none"
          >
            ×
          </text>
        </g>
      )}

      {leftPins.map((pin, idx) => renderPin(pin, idx, 'left'))}
      {rightPins.map((pin, idx) => renderPin(pin, idx, 'right'))}
    </g>
  );
};
