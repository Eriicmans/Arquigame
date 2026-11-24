import { z } from 'zod';

export const ComponentTypeSchema = z.enum([
  'CPU_8085',
  'CPU_80C552',
  'IC_74138',
  'IC_74139',
  'GATE_AND',
  'GATE_OR',
  'GATE_NOT',
  'GATE_NAND',
  'GATE_NOR',
  'MEM_UVPROM',
  'MEM_SRAM',
  'MEM_FLASH',
  'POWER_VCC',
  'POWER_GND',
  'POWER_RAILS',
]);

export const PlacedComponentSchema = z.object({
  id: z.string().min(1),
  type: ComponentTypeSchema,
  label: z.string().min(1),
  x: z.number(),
  y: z.number(),
  locked: z.boolean().optional(),
  props: z
    .object({
      sizeKB: z.number().positive().optional(),
      dataWidth: z.number().positive().optional(),
      dataSlice: z.enum(['full', 'low', 'high']).optional(),
    })
    .optional(),
});

export const NetlistWireSchema = z.object({
  from: z.string().regex(/^[^.]+\..+$/, 'Formato esperado: componentId.pinId'),
  to: z.string().regex(/^[^.]+\..+$/, 'Formato esperado: componentId.pinId'),
  locked: z.boolean().optional(),
});

export const ExpectedMemoryRegionSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  chipType: z.enum(['MEM_UVPROM', 'MEM_SRAM', 'MEM_FLASH', 'EMPTY']),
  /** Optional chipId when pre-placed; in exam mode matched by type + range + sizeKB */
  chipId: z.string().optional(),
  sizeKB: z.number().positive(),
  startHex: z.string().regex(/^0x[0-9A-Fa-f]{4}$/),
  endHex: z.string().regex(/^0x[0-9A-Fa-f]{4}$/),
  space: z.enum(['memory', 'program', 'data', 'io']).default('memory'),
  access: z.enum(['R', 'RW', 'NONE']),
  isMirror: z.boolean().optional(),
  requireIoIsolation: z.boolean().optional(),
});

export const PaletteEntrySchema = z.object({
  type: ComponentTypeSchema,
  label: z.string().min(1),
  props: z
    .object({
      sizeKB: z.number().positive().optional(),
      dataWidth: z.number().positive().optional(),
      dataSlice: z.enum(['full', 'low', 'high']).optional(),
    })
    .optional(),
  maxCount: z.number().int().positive().optional(),
});

export const SublevelSchema = z.object({
  id: z.string().min(1),
  levelId: z.number().int().positive(),
  order: z.number().int().positive(),
  difficulty: z.enum(['tutorial', 'medio', 'examen']),
  assistMode: z.enum(['guided', 'exam']).default('guided'),
  title: z.string().min(1),
  subtitle: z.string().min(1),
  sourceRef: z.string().optional(),
  mechanics: z.array(z.enum(['wiring', 'memoryMap', 'registers', 'flowchart'])).min(1),
  briefing: z.object({
    statement: z.string().min(1),
    objectives: z.array(z.string()).min(1),
    mermaid: z.string().optional(),
    hints: z.array(z.string()).default([]),
  }),
  circuit: z.object({
    cpuProfile: z.enum(['8085', '80C552']),
    components: z.array(PlacedComponentSchema),
    palette: z.array(PaletteEntrySchema).default([]),
    fixedWires: z.array(NetlistWireSchema).default([]),
    referenceNetlist: z.array(NetlistWireSchema).default([]),
  }),
  memoryMapTask: z.object({
    addressWidth: z.number().int().default(16),
    requireTableCompletion: z.boolean().default(true),
    expectedRegions: z.array(ExpectedMemoryRegionSchema).min(1),
  }),
});

export type SublevelDefinition = z.infer<typeof SublevelSchema>;
export type ExpectedMemoryRegion = z.infer<typeof ExpectedMemoryRegionSchema>;
export type PaletteEntry = z.infer<typeof PaletteEntrySchema>;

export const LevelManifestEntrySchema = z.object({
  id: z.number().int().positive(),
  title: z.string().min(1),
  description: z.string().min(1),
  sourceDocs: z.array(z.string()),
  status: z.enum(['available', 'coming_soon']),
  sublevelIds: z.array(z.string()),
});

export const ManifestSchema = z.object({
  version: z.string(),
  course: z.string(),
  levels: z.array(LevelManifestEntrySchema),
});

export type LevelManifest = z.infer<typeof ManifestSchema>;
export type LevelManifestEntry = z.infer<typeof LevelManifestEntrySchema>;
