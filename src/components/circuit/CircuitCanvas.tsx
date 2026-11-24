import React, { useMemo, useRef, useState } from 'react';
import { Activity, Eye, EyeOff, RotateCcw, ZoomIn, ZoomOut } from 'lucide-react';
import { COMPONENT_REGISTRY, getPinLocalPosition } from '@/engine/chips/registry';
import { pinKey, simulateCircuitState, type CpuBusState } from '@/engine/simulator';
import type {
  CpuProfile,
  LogicLevel,
  PinDefinition,
  PinRef,
  PlacedComponent,
  Wire,
} from '@/types/circuit';
import { ChipNode, getSignalColor } from './ChipNode';

interface CircuitCanvasProps {
  cpuProfile: CpuProfile;
  dark: boolean;
  components: PlacedComponent[];
  wires: Wire[];
  showLiveProbe: boolean;
  onMoveComponent: (id: string, x: number, y: number) => void;
  onDeleteComponent: (id: string) => void;
  onAddWire: (from: PinRef, to: PinRef) => void;
  onDeleteWire: (wireId: string) => void;
}

function getAbsolutePinPos(
  components: PlacedComponent[],
  ref: PinRef
): { x: number; y: number; pin: PinDefinition } | null {
  const comp = components.find((c) => c.id === ref.componentId);
  if (!comp) return null;
  const def = COMPONENT_REGISTRY[comp.type];
  const local = getPinLocalPosition(def, ref.pinId);
  if (!local) return null;
  return {
    x: comp.x + local.x,
    y: comp.y + local.y,
    pin: local.pin,
  };
}

function buildManhattanPath(
  x1: number,
  y1: number,
  side1: PinDefinition['side'],
  x2: number,
  y2: number,
  side2: PinDefinition['side'],
  offsetIndex: number,
  isBus = false
): string {
  const stub = 18;
  const jitter = ((offsetIndex % 7) - 3) * 7;

  if (isBus) {
    const trunkY = 448 + (offsetIndex % 2) * 14;
    const tapX = x2 - 22 - (offsetIndex % 2) * 10;
    const startX = x1 + 22 + (offsetIndex % 2) * 10;
    return `M ${x1} ${y1} L ${startX} ${y1} L ${startX} ${trunkY} L ${tapX} ${trunkY} L ${tapX} ${y2} L ${x2} ${y2}`;
  }

  // Handle vertical pins (VCC bottom / GND top) cleanly
  if (side1 === 'top' || side1 === 'bottom') {
    const sy1 = side1 === 'bottom' ? y1 + 14 : y1 - 14;
    const sx2 = side2 === 'right' ? x2 + stub : side2 === 'left' ? x2 - stub : x2;
    return `M ${x1} ${y1} L ${x1} ${sy1} L ${sx2} ${sy1} L ${sx2} ${y2} L ${x2} ${y2}`;
  }
  if (side2 === 'top' || side2 === 'bottom') {
    const sx1 = side1 === 'right' ? x1 + stub : x1 - stub;
    const sy2 = side2 === 'bottom' ? y2 + 14 : y2 - 14;
    return `M ${x1} ${y1} L ${sx1} ${y1} L ${sx1} ${sy2} L ${x2} ${sy2} L ${x2} ${y2}`;
  }

  const sx1 = side1 === 'right' ? x1 + stub : x1 - stub;
  const sx2 = side2 === 'right' ? x2 + stub : x2 - stub;

  if (side1 === 'right' && side2 === 'left' && sx1 <= sx2) {
    const midX = (sx1 + sx2) / 2 + jitter;
    return `M ${x1} ${y1} L ${midX} ${y1} L ${midX} ${y2} L ${x2} ${y2}`;
  }
  if (side1 === 'left' && side2 === 'right' && sx2 <= sx1) {
    const midX = (sx1 + sx2) / 2 + jitter;
    return `M ${x1} ${y1} L ${midX} ${y1} L ${midX} ${y2} L ${x2} ${y2}`;
  }

  const midY = (y1 + y2) / 2 + jitter * 2;
  return `M ${x1} ${y1} L ${sx1} ${y1} L ${sx1} ${midY} L ${sx2} ${midY} L ${sx2} ${y2} L ${x2} ${y2}`;
}

export const CircuitCanvas: React.FC<CircuitCanvasProps> = ({
  cpuProfile,
  dark,
  components,
  wires,
  showLiveProbe,
  onMoveComponent,
  onDeleteComponent,
  onAddWire,
  onDeleteWire,
}) => {
  const svgRef = useRef<SVGSVGElement | null>(null);

  const [zoom, setZoom] = useState(1);
  const [selectedCompId, setSelectedCompId] = useState<string | null>(null);
  const [connectingFrom, setConnectingFrom] = useState<{
    componentId: string;
    pinId: string;
    x: number;
    y: number;
    side: PinDefinition['side'];
    direction: PinDefinition['direction'];
    isBus?: boolean;
  } | null>(null);
  const [cursorSvg, setCursorSvg] = useState<{ x: number; y: number } | null>(null);
  const [hoveredPin, setHoveredPin] = useState<{
    compLabel: string;
    pin: PinDefinition;
    level?: LogicLevel;
  } | null>(null);
  const [hoveredWire, setHoveredWire] = useState<{
    id: string;
    label: string;
    locked?: boolean;
  } | null>(null);
  const [wireWarning, setWireWarning] = useState<string | null>(null);
  const [showBusWires, setShowBusWires] = useState(true);

  const [probeAddr, setProbeAddr] = useState(0x0000);
  const [probeIoM, setProbeIoM] = useState<0 | 1>(0);
  const [probeCycle, setProbeCycle] = useState<'RD' | 'WR' | 'PSEN'>(
    cpuProfile === '80C552' ? 'PSEN' : 'RD'
  );
  const [probeOpen, setProbeOpen] = useState(false);

  const dragRef = useRef<{
    compId: string;
    offsetX: number;
    offsetY: number;
  } | null>(null);

  const probeBus: CpuBusState = useMemo(
    () => ({
      address: probeAddr,
      ioM: probeIoM,
      psen: probeCycle === 'PSEN' ? 0 : 1,
      rd: probeCycle === 'RD' ? 0 : 1,
      wr: probeCycle === 'WR' ? 0 : 1,
    }),
    [probeAddr, probeIoM, probeCycle]
  );

  const liveSnapshot = useMemo(
    () => simulateCircuitState(components, wires, probeBus),
    [components, wires, probeBus]
  );

  const showLevelsOnBoard = showLiveProbe && probeOpen;

  const clientToSvg = (clientX: number, clientY: number) => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const rect = svg.getBoundingClientRect();
    return {
      x: (clientX - rect.left) / zoom,
      y: (clientY - rect.top) / zoom,
    };
  };

  const handleStartDrag = (e: React.PointerEvent, componentId: string) => {
    e.stopPropagation();
    const comp = components.find((c) => c.id === componentId);
    if (!comp) return;
    const pt = clientToSvg(e.clientX, e.clientY);
    dragRef.current = {
      compId: componentId,
      offsetX: pt.x - comp.x,
      offsetY: pt.y - comp.y,
    };
    setSelectedCompId(componentId);
    (e.target as Element).setPointerCapture?.(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    const pt = clientToSvg(e.clientX, e.clientY);
    if (connectingFrom) {
      setCursorSvg(pt);
    }
    if (dragRef.current) {
      const snappedX = Math.max(10, Math.round((pt.x - dragRef.current.offsetX) / 10) * 10);
      const snappedY = Math.max(14, Math.round((pt.y - dragRef.current.offsetY) / 10) * 10);
      onMoveComponent(dragRef.current.compId, snappedX, snappedY);
    }
  };

  const handlePointerUp = () => {
    dragRef.current = null;
  };

  const handlePinClick = (
    _e: React.MouseEvent,
    componentId: string,
    pin: PinDefinition
  ) => {
    const abs = getAbsolutePinPos(components, { componentId, pinId: pin.id });
    if (!abs) return;

    if (!connectingFrom) {
      setConnectingFrom({
        componentId,
        pinId: pin.id,
        x: abs.x,
        y: abs.y,
        side: pin.side,
        direction: pin.direction,
        isBus: pin.isBus,
      });
      setCursorSvg({ x: abs.x, y: abs.y });
      return;
    }

    if (
      connectingFrom.componentId === componentId &&
      connectingFrom.pinId === pin.id
    ) {
      setConnectingFrom(null);
      setWireWarning(null);
      return;
    }

    // Block incompatible connections (same direction or bus-to-single-bit mismatch)
    if (Boolean(connectingFrom.isBus) !== Boolean(pin.isBus)) {
      setWireWarning('No puedes conectar un bus múltiple con una señal de 1 bit.');
      return;
    }
    if (connectingFrom.direction === pin.direction) {
      setWireWarning(
        pin.direction === 'output'
          ? 'No puedes unir dos salidas directamente; usa una puerta lógica.'
          : 'No puedes conectar dos entradas entre sí.'
      );
      return;
    }

    setWireWarning(null);
    onAddWire(
      { componentId: connectingFrom.componentId, pinId: connectingFrom.pinId },
      { componentId, pinId: pin.id }
    );
    setConnectingFrom(null);
  };

  const handleCanvasClick = () => {
    setConnectingFrom(null);
    setSelectedCompId(null);
    setWireWarning(null);
  };

  const handleCanvasContextMenu = (e: React.MouseEvent) => {
    if (connectingFrom) {
      e.preventDefault();
      setConnectingFrom(null);
      setWireWarning(null);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setConnectingFrom(null);
    } else if ((e.key === 'Delete' || e.key === 'Backspace') && selectedCompId) {
      const comp = components.find((c) => c.id === selectedCompId);
      if (comp && !comp.locked) {
        onDeleteComponent(selectedCompId);
        setSelectedCompId(null);
      }
    }
  };

  return (
    <div
      className="relative flex flex-col flex-1 h-full bg-zinc-50 dark:bg-[#121214] overflow-hidden outline-none"
      tabIndex={0}
      onKeyDown={handleKeyDown}
    >
      {/* Main Full-Bleed SVG Viewport */}
      <div className="relative flex-1 overflow-auto bg-zinc-50 dark:bg-[#121214]">
        <svg
          ref={svgRef}
          width={Math.max(1060, 1100 * zoom)}
          height={Math.max(580, 600 * zoom)}
          className="block select-none mx-auto"
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onClick={handleCanvasClick}
          onContextMenu={handleCanvasContextMenu}
        >
          <defs>
            <pattern
              id="drafting-grid"
              width={20 * zoom}
              height={20 * zoom}
              patternUnits="userSpaceOnUse"
            >
              <circle cx={1} cy={1} r={1.1} fill={dark ? '#27272a' : '#d4d4d8'} />
            </pattern>
          </defs>

          <rect width="100%" height="100%" fill="url(#drafting-grid)" />

          <g transform={`scale(${zoom})`}>
            {/* Wires Layer */}
            {wires.map((w, idx) => {
              const p1 = getAbsolutePinPos(components, w.from);
              const p2 = getAbsolutePinPos(components, w.to);
              if (!p1 || !p2) return null;

              const isBus = Boolean(p1.pin.isBus || p2.pin.isBus);
              if (isBus && !showBusWires) return null;

              const d = buildManhattanPath(
                p1.x,
                p1.y,
                p1.pin.side,
                p2.x,
                p2.y,
                p2.pin.side,
                idx,
                isBus
              );

              const baseColor = getSignalColor(
                p1.pin.kind,
                dark,
                w.from.pinId === 'GND' || w.to.pinId === 'GND' ? 'GND' : p1.pin.id
              );

              const level = isBus
                ? undefined
                : liveSnapshot.pinValues.get(pinKey(w.from.componentId, w.from.pinId));
              const isConflict = showLevelsOnBoard && level === 'X';
              const isHovered = hoveredWire?.id === w.id;
              const fromComp = components.find((c) => c.id === w.from.componentId);
              const toComp = components.find((c) => c.id === w.to.componentId);
              const wireLabel = `${fromComp?.label ?? w.from.componentId}.${p1.pin.label} → ${toComp?.label ?? w.to.componentId}.${p2.pin.label}`;

              const strokeColor =
                isHovered && !w.locked
                  ? '#ef4444'
                  : isConflict
                    ? '#ef4444'
                    : baseColor;

              return (
                <g
                  key={w.id}
                  className={w.locked ? 'cursor-default' : 'cursor-pointer'}
                  onMouseEnter={() =>
                    setHoveredWire({ id: w.id, label: wireLabel, locked: w.locked })
                  }
                  onMouseLeave={() => setHoveredWire(null)}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!w.locked) {
                      onDeleteWire(w.id);
                      setHoveredWire(null);
                    }
                  }}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (!w.locked) {
                      onDeleteWire(w.id);
                      setHoveredWire(null);
                    }
                  }}
                >
                  <path d={d} fill="none" stroke="transparent" strokeWidth={12} />
                  {showLevelsOnBoard &&
                    !isBus &&
                    ((p1.pin.activeLow && level === 0) ||
                      (!p1.pin.activeLow && level === 1 && p1.pin.kind !== 'power')) && (
                      <path
                        d={d}
                        fill="none"
                        stroke={strokeColor}
                        strokeWidth={6}
                        strokeOpacity={dark ? 0.2 : 0.16}
                        strokeLinejoin="round"
                      />
                    )}
                  <path
                    d={d}
                    fill="none"
                    stroke={strokeColor}
                    strokeWidth={isBus ? 2.4 : isHovered ? 3.2 : 2.2}
                    strokeDasharray={isBus ? '6 4' : level === 'Z' ? '3 3' : undefined}
                    strokeOpacity={isBus ? 0.45 : 0.92}
                    strokeLinejoin="round"
                    strokeLinecap="round"
                  />
                </g>
              );
            })}

            {/* Active Rubber-Band Wire */}
            {connectingFrom && cursorSvg && (
              <path
                d={buildManhattanPath(
                  connectingFrom.x,
                  connectingFrom.y,
                  connectingFrom.side,
                  cursorSvg.x,
                  cursorSvg.y,
                  cursorSvg.x >= connectingFrom.x ? 'left' : 'right',
                  0
                )}
                fill="none"
                stroke="#10b981"
                strokeWidth={2.4}
                strokeDasharray="6 4"
                strokeLinejoin="round"
                className="pointer-events-none"
              />
            )}

            {/* Chips, Gates & Power Symbols Layer */}
            {components.map((comp) => (
              <ChipNode
                key={comp.id}
                component={comp}
                dark={dark}
                selected={selectedCompId === comp.id}
                connectingFrom={
                  connectingFrom
                    ? {
                        componentId: connectingFrom.componentId,
                        pinId: connectingFrom.pinId,
                        direction: connectingFrom.direction,
                        isBus: connectingFrom.isBus,
                      }
                    : null
                }
                pinValues={liveSnapshot.pinValues}
                showLiveLevels={showLevelsOnBoard}
                onStartDrag={handleStartDrag}
                onSelect={setSelectedCompId}
                onDelete={onDeleteComponent}
                onPinClick={handlePinClick}
                onPinHover={setHoveredPin}
              />
            ))}
          </g>
        </svg>

        {/* Clean Floating Pin Tooltip */}
        {hoveredPin && (
          <div className="pointer-events-none absolute top-3 left-4 max-w-md px-3.5 py-2.5 rounded-xl bg-white/95 dark:bg-zinc-900/95 backdrop-blur border border-zinc-200 dark:border-zinc-700 shadow-lg text-xs">
            <div className="flex items-center gap-2 font-medium text-zinc-900 dark:text-zinc-100">
              <span>{hoveredPin.compLabel}</span>
              <span className="text-zinc-300 dark:text-zinc-600">·</span>
              <span className="font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                {hoveredPin.pin.label}
              </span>
              {hoveredPin.pin.activeLow && (
                <span className="px-1.5 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 text-[10px] font-semibold">
                  Activo en bajo (0)
                </span>
              )}
              {showLevelsOnBoard && hoveredPin.level !== undefined && (
                <span className="px-1.5 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-mono text-[10px] font-semibold">
                  Valor: {String(hoveredPin.level)}
                </span>
              )}
            </div>
            <p className="mt-1 text-zinc-500 dark:text-zinc-400">{hoveredPin.pin.tooltip}</p>
          </div>
        )}

        {/* Floating Wire Tooltip */}
        {!hoveredPin && hoveredWire && (
          <div className="pointer-events-none absolute top-3 left-4 px-3 py-1.5 rounded-xl bg-white/95 dark:bg-zinc-900/95 backdrop-blur border border-zinc-200 dark:border-zinc-700 shadow-lg text-xs font-mono text-zinc-800 dark:text-zinc-100">
            <span>{hoveredWire.label}</span>
            {!hoveredWire.locked && (
              <span className="ml-2 text-rose-500 font-sans text-[11px]">
                (clic para quitar)
              </span>
            )}
          </div>
        )}

        {/* Active connection / warning pill */}
        {wireWarning ? (
          <div className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 px-3.5 py-1.5 rounded-full bg-rose-600 text-white text-xs font-medium shadow-md">
            {wireWarning}
          </div>
        ) : (
          connectingFrom && (
            <div className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 px-3.5 py-1.5 rounded-full bg-emerald-600 text-white text-xs font-medium shadow-md">
              Conectando desde <span className="font-mono font-bold">{connectingFrom.pinId}</span> — haz clic en un pin resaltado en verde (Esc o clic derecho para cancelar)
            </div>
          )
        )}
        {/* Subtle Bottom-Left Floating Logic Probe Pill (hidden in Exam Mode) */}
        {showLiveProbe && (
          <div className="absolute bottom-4 left-10 z-20 flex flex-wrap items-center gap-2 p-1.5 rounded-xl bg-white/90 dark:bg-zinc-900/90 backdrop-blur border border-zinc-200 dark:border-zinc-800 shadow-lg text-xs">
            <button
              type="button"
              onClick={() => setProbeOpen((v) => !v)}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-medium transition ${
                probeOpen
                  ? 'bg-emerald-600 text-white'
                  : 'text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800'
              }`}
              title="Activar sonda para probar direcciones y ver niveles lógicos (0/1) en los pines"
            >
              <Activity className="w-3.5 h-3.5" />
              <span>Probar señales</span>
            </button>

            {probeOpen && (
              <>
                <div className="flex items-center gap-1 pl-1 border-l border-zinc-200 dark:border-zinc-700">
                  {[0x0000, 0x2000, 0x4000, 0x8000, 0xc000].map((addr) => (
                    <button
                      key={addr}
                      type="button"
                      onClick={() => setProbeAddr(addr)}
                      className={`px-2 py-1 rounded-md font-mono text-[11px] font-medium transition ${
                        probeAddr === addr
                          ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900'
                          : 'text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                      }`}
                    >
                      {addr.toString(16).toUpperCase().padStart(4, '0')}h
                    </button>
                  ))}
                </div>

                {cpuProfile === '8085' && (
                  <button
                    type="button"
                    onClick={() => setProbeIoM((v) => (v === 0 ? 1 : 0))}
                    className={`px-2 py-1 rounded-lg font-mono text-[11px] font-medium border transition ${
                      probeIoM === 0
                        ? 'bg-zinc-100 dark:bg-zinc-800 border-zinc-300 dark:border-zinc-700 text-zinc-800 dark:text-zinc-100'
                        : 'bg-amber-50 dark:bg-amber-950/50 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300'
                    }`}
                  >
                    IO/M={probeIoM}
                  </button>
                )}

                <div className="flex rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 p-0.5">
                  {cpuProfile === '80C552' && (
                    <button
                      type="button"
                      onClick={() => setProbeCycle('PSEN')}
                      className={`px-2 py-0.5 rounded-md font-mono text-[11px] font-medium ${
                        probeCycle === 'PSEN'
                          ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100'
                          : 'text-zinc-500 dark:text-zinc-400'
                      }`}
                    >
                      /PSEN
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setProbeCycle('RD')}
                    className={`px-2 py-0.5 rounded-md font-mono text-[11px] font-medium ${
                      probeCycle === 'RD'
                        ? 'bg-white dark:bg-zinc-900 text-amber-600 dark:text-amber-300'
                        : 'text-zinc-500 dark:text-zinc-400'
                    }`}
                  >
                    /RD
                  </button>
                  <button
                    type="button"
                    onClick={() => setProbeCycle('WR')}
                    className={`px-2 py-0.5 rounded-md font-mono text-[11px] font-medium ${
                      probeCycle === 'WR'
                        ? 'bg-white dark:bg-zinc-900 text-rose-600 dark:text-rose-300'
                        : 'text-zinc-500 dark:text-zinc-400'
                    }`}
                  >
                    /WR
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* Subtle Bottom-Right Floating Zoom & Bus Controls */}
        <div className="absolute bottom-4 right-4 z-20 flex items-center gap-1.5 p-1 rounded-xl bg-white/90 dark:bg-zinc-900/90 backdrop-blur border border-zinc-200 dark:border-zinc-800 shadow-lg text-xs">
          <button
            type="button"
            onClick={() => setShowBusWires((v) => !v)}
            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300 font-medium transition"
            title="Mostrar u ocultar buses A0..An y D0..D7"
          >
            {showBusWires ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            <span>Buses</span>
          </button>

          <div className="h-4 w-px bg-zinc-200 dark:bg-zinc-700" />

          <button
            type="button"
            onClick={() => setZoom((z) => Math.max(0.65, Number((z - 0.1).toFixed(2))))}
            className="p-1 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300"
            title="Alejar"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <span className="px-1 font-mono text-[11px] font-medium text-zinc-600 dark:text-zinc-300">
            {Math.round(zoom * 100)}%
          </span>
          <button
            type="button"
            onClick={() => setZoom((z) => Math.min(1.4, Number((z + 0.1).toFixed(2))))}
            className="p-1 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300"
            title="Acercar"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setZoom(1)}
            className="p-1 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 dark:text-zinc-400"
            title="Restablecer zoom"
          >
            <RotateCcw className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
};
