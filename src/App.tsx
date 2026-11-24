import { useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  ChevronDown,
  ClipboardCheck,
  Cpu,
  GraduationCap,
  Layers,
  Map as MapIcon,
  Moon,
  MoreHorizontal,
  Play,
  RotateCcw,
  ShieldAlert,
  Sparkles,
  Sun,
  X,
} from 'lucide-react';
import { CircuitCanvas } from '@/components/circuit/CircuitCanvas';
import { LevelMapModal } from '@/components/layout/LevelMapModal';
import { MemoryMapPanel } from '@/components/memory-map/MemoryMapPanel';
import { ComponentPalette } from '@/components/palette/ComponentPalette';
import { DiagnosticsPanel } from '@/components/panels/DiagnosticsPanel';
import { StatementBanner } from '@/components/panels/StatementBanner';
import { loadAllSublevels, loadManifest } from '@/data/levelLoader';
import { COMPONENT_REGISTRY } from '@/engine/chips/registry';
import {
  validateSublevel,
  type PlayerTableRow,
  type ValidationResult,
} from '@/engine/levelValidator';
import { analyzeMemoryMap } from '@/engine/memoryMapAnalyzer';
import {
  buildInitialSublevelState,
  buildReferenceWires,
  loadSavedState,
  saveSublevelState,
  type SavedSublevelState,
} from '@/store/useGameStore';
import type { PinRef, PlacedComponent } from '@/types/circuit';
import type { PaletteEntry } from '@/types/level';

type RightTab = 'memoryMap' | 'diagnostics';
type ThemeMode = 'dark' | 'light';

const THEME_STORAGE_KEY = 'arquigame_theme_v1';

export function App() {
  const manifest = useMemo(() => loadManifest(), []);
  const sublevels = useMemo(() => loadAllSublevels(), []);

  // Default to clean neutral dark mode, persisted in localStorage
  const [theme, setTheme] = useState<ThemeMode>(() => {
    try {
      const saved = localStorage.getItem(THEME_STORAGE_KEY);
      return saved === 'light' ? 'light' : 'dark';
    } catch {
      return 'dark';
    }
  });
  const dark = theme === 'dark';

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // ignore
    }
  }, [dark, theme]);

  // Collapsible left sidebar (starts hidden for a calm, canvas-first studio layout)
  const [sidebarPinned, setSidebarPinned] = useState(false);
  const [sidebarHovered, setSidebarHovered] = useState(false);

  const [currentSublevelId, setCurrentSublevelId] = useState<string>(
    sublevels[0]?.id ?? '1-1'
  );
  const sublevel = useMemo(
    () => sublevels.find((s) => s.id === currentSublevelId) ?? sublevels[0],
    [sublevels, currentSublevelId]
  );

  const [state, setState] = useState<SavedSublevelState>(() => {
    const saved = loadSavedState(sublevel.id, sublevel.assistMode);
    return saved ?? buildInitialSublevelState(sublevel, sublevel.assistMode);
  });

  const [rightTab, setRightTab] = useState<RightTab>('memoryMap');
  const [rightDrawerOpen, setRightDrawerOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [levelMapOpen, setLevelMapOpen] = useState(false);

  useEffect(() => {
    saveSublevelState(sublevel.id, state.mode, state);
  }, [sublevel.id, state]);

  const liveAnalysis = useMemo(
    () => analyzeMemoryMap(state.components, state.wires, sublevel.circuit.cpuProfile),
    [state.components, state.wires, sublevel.circuit.cpuProfile]
  );

  const isExamMode = state.mode === 'exam';

  const handleSwitchMode = (nextMode: 'guided' | 'exam') => {
    if (nextMode === state.mode) return;
    const saved = loadSavedState(sublevel.id, nextMode);
    setState(saved ?? buildInitialSublevelState(sublevel, nextMode));
    setValidation(null);
    setMenuOpen(false);
  };

  const handleReset = () => {
    setState(buildInitialSublevelState(sublevel, state.mode));
    setValidation(null);
  };

  const handleAddComponent = (entry: PaletteEntry) => {
    const def = COMPONENT_REGISTRY[entry.type];
    const existingGates = state.components.filter(
      (c) => COMPONENT_REGISTRY[c.type].category === 'gate'
    ).length;
    const prefix =
      def.category === 'gate'
        ? `G${existingGates + 1}`
        : `U${state.components.length}`;

    const candidateSlots = [
      { x: 290, y: 50 },
      { x: 520, y: 50 },
      { x: 520, y: 230 },
      { x: 300, y: 340 },
      { x: 450, y: 150 },
      { x: 450, y: 310 },
      { x: 640, y: 50 },
      { x: 640, y: 240 },
    ];
    const freeSlot =
      candidateSlots.find(
        (slot) =>
          !state.components.some(
            (c) => Math.abs(c.x - slot.x) < 60 && Math.abs(c.y - slot.y) < 60
          )
      ) ?? {
        x: 270 + ((state.components.length * 40) % 320),
        y: 60 + ((state.components.length * 50) % 280),
      };

    const label =
      entry.type === 'POWER_VCC'
        ? '+5V'
        : entry.type === 'POWER_GND'
          ? 'GND'
          : def.category === 'power'
            ? 'VCC / GND'
            : def.category === 'gate'
              ? prefix
              : `${prefix}: ${def.shortName}${entry.props?.sizeKB ? ` ${entry.props.sizeKB} kB` : ''}`;

    const newComp: PlacedComponent = {
      id: `${entry.type.toLowerCase()}-${Date.now().toString(36)}`,
      type: entry.type,
      label,
      x: freeSlot.x,
      y: freeSlot.y,
      locked: false,
      props: entry.props
        ? { ...entry.props }
        : def.defaultProps
          ? { ...def.defaultProps }
          : undefined,
    };

    setState((prev) => ({
      ...prev,
      components: [...prev.components, newComp],
    }));
    setValidation(null);
  };

  const handleMoveComponent = (id: string, x: number, y: number) => {
    setState((prev) => ({
      ...prev,
      components: prev.components.map((c) => (c.id === id ? { ...c, x, y } : c)),
    }));
  };

  const handleDeleteComponent = (id: string) => {
    setState((prev) => ({
      ...prev,
      components: prev.components.filter((c) => c.id !== id || c.locked),
      wires: prev.wires.filter(
        (w) => w.from.componentId !== id && w.to.componentId !== id
      ),
    }));
    setValidation(null);
  };

  const handleAddWire = (from: PinRef, to: PinRef) => {
    setState((prev) => {
      const exists = prev.wires.some(
        (w) =>
          (w.from.componentId === from.componentId &&
            w.from.pinId === from.pinId &&
            w.to.componentId === to.componentId &&
            w.to.pinId === to.pinId) ||
          (w.from.componentId === to.componentId &&
            w.from.pinId === to.pinId &&
            w.to.componentId === from.componentId &&
            w.to.pinId === from.pinId)
      );
      if (exists) return prev;

      return {
        ...prev,
        wires: [
          ...prev.wires,
          {
            id: `w-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
            from,
            to,
            locked: false,
          },
        ],
      };
    });
    setValidation(null);
  };

  const handleDeleteWire = (wireId: string) => {
    setState((prev) => ({
      ...prev,
      wires: prev.wires.filter((w) => w.id !== wireId || w.locked),
    }));
    setValidation(null);
  };

  const handleUpdateTableRow = (regionId: string, patch: Partial<PlayerTableRow>) => {
    setState((prev) => ({
      ...prev,
      tableRows: prev.tableRows.map((r) =>
        r.regionId === regionId ? { ...r, ...patch } : r
      ),
    }));
  };

  const handleAddTableRow = () => {
    setState((prev) => ({
      ...prev,
      tableRows: [
        ...prev.tableRows,
        {
          regionId: `exam-row-${Date.now().toString(36)}`,
          chipType: 'MEM_SRAM',
          isMirror: false,
          startHex: '',
          endHex: '',
          access: 'RW',
        },
      ],
    }));
  };

  const handleRemoveTableRow = (regionId: string) => {
    setState((prev) => ({
      ...prev,
      tableRows: prev.tableRows.filter((r) => r.regionId !== regionId),
    }));
  };

  const handleVerify = () => {
    const res = validateSublevel(
      sublevel,
      state.components,
      state.wires,
      state.tableRows,
      state.mode
    );
    setValidation(res);
    setRightTab('diagnostics');
    setRightDrawerOpen(true);

    if (res.passed && !state.completed) {
      setState((prev) => ({ ...prev, completed: true }));
    }
  };

  const handleLoadReferenceSolution = () => {
    if (isExamMode) return;
    const base = buildInitialSublevelState(sublevel, 'guided');
    const refWires = buildReferenceWires(sublevel);
    const filledTable: PlayerTableRow[] = sublevel.memoryMapTask.expectedRegions.map(
      (reg) => ({
        regionId: reg.id,
        startHex: `${reg.startHex.slice(2)}h`,
        endHex: `${reg.endHex.slice(2)}h`,
        access: reg.access,
      })
    );
    setState({
      ...base,
      wires: refWires,
      tableRows: filledTable,
    });
    setValidation(null);
  };

  const completedIds = useMemo(() => {
    const set = new Set<string>();
    if (state.completed) set.add(sublevel.id);
    return set;
  }, [state.completed, sublevel.id]);

  return (
    <div
      className="h-screen w-screen flex flex-col bg-zinc-50 dark:bg-[#121214] text-zinc-900 dark:text-zinc-100 overflow-hidden"
      onClick={() => {
        if (menuOpen) setMenuOpen(false);
      }}
    >
      {/* Clean Decluttered Header Bar */}
      <header className="h-13 shrink-0 flex items-center justify-between px-4 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 gap-3 relative z-30">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex items-center gap-2 shrink-0">
            <div className="w-7 h-7 rounded-lg bg-zinc-900 dark:bg-zinc-100 flex items-center justify-center">
              <Cpu className="w-4 h-4 text-white dark:text-zinc-900" />
            </div>
            <span className="font-bold text-sm tracking-tight text-zinc-900 dark:text-zinc-100 hidden sm:inline">
              ArquiGame
            </span>
          </div>

          <div className="h-4 w-px bg-zinc-200 dark:bg-zinc-800 hidden sm:block" />

          <button
            type="button"
            onClick={() => setLevelMapOpen(true)}
            className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-zinc-100 hover:bg-zinc-200/80 dark:bg-zinc-800/80 dark:hover:bg-zinc-800 border border-zinc-200/80 dark:border-zinc-700/70 transition min-w-0"
          >
            <MapIcon className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400 shrink-0" />
            <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-100 truncate">
              {sublevel.title}
            </span>
            {state.completed && (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
            )}
            <ChevronDown className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
          </button>
        </div>

        {/* Calm Right Controls */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Guided vs Exam Mode Switcher */}
          <div
            className="flex items-center rounded-lg bg-zinc-100 dark:bg-zinc-950 p-0.5 border border-zinc-200/80 dark:border-zinc-800 text-xs"
            title="Alterna entre modo guiado y modo examen sin ayudas"
          >
            <button
              type="button"
              onClick={() => handleSwitchMode('guided')}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md font-medium transition ${
                !isExamMode
                  ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-2xs'
                  : 'text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200'
              }`}
            >
              <GraduationCap className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Guiado</span>
            </button>
            <button
              type="button"
              onClick={() => handleSwitchMode('exam')}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md font-medium transition ${
                isExamMode
                  ? 'bg-white dark:bg-zinc-800 text-rose-700 dark:text-rose-400 shadow-2xs'
                  : 'text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200'
              }`}
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Examen</span>
            </button>
          </div>

          {/* Icon-only Theme Toggle */}
          <button
            type="button"
            onClick={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
            className="p-1.5 rounded-lg bg-white hover:bg-zinc-100 dark:bg-zinc-800/80 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700 transition"
            title={dark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
          >
            {dark ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-zinc-600" />
            )}
          </button>

          {/* Compact Options Menu (Reiniciar, Cargar solución) */}
          <div className="relative">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setMenuOpen((o) => !o);
              }}
              className="p-1.5 rounded-lg bg-white hover:bg-zinc-100 dark:bg-zinc-800/80 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700 transition"
              title="Más opciones"
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>

            {menuOpen && (
              <div
                className="absolute right-0 mt-1.5 w-48 py-1 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 shadow-xl z-50 text-xs"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  onClick={() => {
                    handleReset();
                    setMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-left text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-zinc-500" />
                  <span>Reiniciar placa</span>
                </button>

                {!isExamMode && (
                  <button
                    type="button"
                    onClick={() => {
                      handleLoadReferenceSolution();
                      setMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-left text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    <span>Cargar solución</span>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Toggle Mapa Hex / Resultado Drawer */}
          <button
            type="button"
            onClick={() => setRightDrawerOpen((o) => !o)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition ${
              rightDrawerOpen
                ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 border-transparent'
                : 'bg-white hover:bg-zinc-100 dark:bg-zinc-800/80 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-200 border-zinc-200 dark:border-zinc-700'
            }`}
            title="Abrir o cerrar la tabla de Mapa de Memoria y Resultados"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Mapa Hex</span>
            {validation && (
              <span
                className={`w-2 h-2 rounded-full ${
                  validation.passed ? 'bg-emerald-500' : 'bg-rose-500'
                }`}
              />
            )}
          </button>

          <button
            type="button"
            onClick={handleVerify}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-xs transition"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Comprobar</span>
          </button>
        </div>
      </header>

      {/* Top Compact Statement Strip */}
      <StatementBanner
        key={sublevel.id}
        sublevel={sublevel}
        isExamMode={isExamMode}
        dark={dark}
      />

      {/* Full-Canvas Workspace with Collapsible Left Palette & Slide-Over Right Drawer */}
      <main className="flex-1 flex min-h-0 overflow-hidden relative">
        {/* Left: Hidden by default, hover-to-open Component Palette */}
        <ComponentPalette
          entries={sublevel.circuit.palette}
          isExamMode={isExamMode}
          pinned={sidebarPinned}
          hovered={sidebarHovered}
          onSetPinned={setSidebarPinned}
          onSetHovered={setSidebarHovered}
          onAddComponent={handleAddComponent}
        />

        {/* Center: Protagonist Schematic SVG Canvas */}
        <CircuitCanvas
          cpuProfile={sublevel.circuit.cpuProfile}
          dark={dark}
          components={state.components}
          wires={state.wires}
          showLiveProbe={!isExamMode}
          onMoveComponent={handleMoveComponent}
          onDeleteComponent={handleDeleteComponent}
          onAddWire={handleAddWire}
          onDeleteWire={handleDeleteWire}
        />

        {/* Right: Slide-Over Drawer (Mapa Hex + Resultado), closed at start */}
        <aside
          className={`absolute top-0 bottom-0 right-0 z-30 w-[370px] max-w-[92vw] flex flex-col bg-white dark:bg-zinc-900 border-l border-zinc-200 dark:border-zinc-800 shadow-2xl transition-transform duration-200 ease-out ${
            rightDrawerOpen ? 'translate-x-0' : 'translate-x-full pointer-events-none'
          }`}
        >
          <div className="flex items-center border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-950/50 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setRightTab('memoryMap')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-3 border-b-2 transition ${
                rightTab === 'memoryMap'
                  ? 'border-zinc-900 dark:border-zinc-100 text-zinc-900 dark:text-zinc-100 bg-white dark:bg-zinc-900'
                  : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Mapa Hex</span>
            </button>

            <button
              type="button"
              onClick={() => setRightTab('diagnostics')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-3 border-b-2 transition ${
                rightTab === 'diagnostics'
                  ? 'border-zinc-900 dark:border-zinc-100 text-zinc-900 dark:text-zinc-100 bg-white dark:bg-zinc-900'
                  : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200'
              }`}
            >
              <ClipboardCheck className="w-3.5 h-3.5" />
              <span>Resultado</span>
              {validation && (
                <span
                  className={`w-2 h-2 rounded-full ${
                    validation.passed ? 'bg-emerald-500' : 'bg-rose-500'
                  }`}
                />
              )}
            </button>

            <button
              type="button"
              onClick={() => setRightDrawerOpen(false)}
              className="px-3 py-3 text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-100 transition"
              title="Cerrar panel"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {rightTab === 'memoryMap' && (
              <MemoryMapPanel
                sublevel={sublevel}
                analysis={liveAnalysis}
                tableRows={state.tableRows}
                validation={validation}
                isExamMode={isExamMode}
                onUpdateRow={handleUpdateTableRow}
                onAddRow={handleAddTableRow}
                onRemoveRow={handleRemoveTableRow}
              />
            )}

            {rightTab === 'diagnostics' && (
              <DiagnosticsPanel validation={validation} />
            )}
          </div>
        </aside>
      </main>

      <LevelMapModal
        open={levelMapOpen}
        manifest={manifest}
        sublevels={sublevels}
        currentSublevelId={sublevel.id}
        completedIds={completedIds}
        onSelectSublevel={(id) => {
          setCurrentSublevelId(id);
          const next = sublevels.find((s) => s.id === id);
          if (next) {
            setState(
              loadSavedState(next.id, next.assistMode) ??
                buildInitialSublevelState(next, next.assistMode)
            );
            setValidation(null);
            setRightDrawerOpen(false);
          }
        }}
        onClose={() => setLevelMapOpen(false)}
      />
    </div>
  );
}

export default App;
