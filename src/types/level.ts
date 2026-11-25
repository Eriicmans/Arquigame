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

export const RegisterBitSchema = z.object({
  bit: z.number().int().min(0).max(7),
  name: z.string().min(1),
  description: z.string().min(1),
  /** Expected value: 0, 1, or null if don't-care / reserved */
  expected: z.union([z.literal(0), z.literal(1), z.null()]),
  initial: z.union([z.literal(0), z.literal(1)]).default(0),
});

export const RegisterSpecSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  addressHex: z.string().optional(),
  purpose: z.string().min(1),
  bits: z.array(RegisterBitSchema).length(8),
});

export const RegisterQuestionSchema = z.object({
  id: z.string().min(1),
  prompt: z.string().min(1),
  options: z.array(z.string().min(1)).min(2),
  correctIndex: z.number().int().min(0),
  explanation: z.string().min(1),
});

export const RegisterTaskSchema = z.object({
  registers: z.array(RegisterSpecSchema).min(1),
  questions: z.array(RegisterQuestionSchema).default([]),
});

export const FlowchartBlockSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  code: z.string().optional(),
  kind: z.enum(['start', 'action', 'decision', 'stack', 'return', 'bug']),
  detail: z.string().optional(),
});

export const FlowchartTaskSchema = z.object({
  title: z.string().min(1),
  blocks: z.array(FlowchartBlockSchema).min(2),
  /** Ordered list of block IDs that form the valid solution */
  expectedOrder: z.array(z.string().min(1)).min(2),
  /** Distractor / buggy block IDs that must NOT be in the final flow */
  distractorIds: z.array(z.string().min(1)).default([]),
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
  circuit: z
    .object({
      cpuProfile: z.enum(['8085', '80C552']),
      components: z.array(PlacedComponentSchema),
      palette: z.array(PaletteEntrySchema).default([]),
      fixedWires: z.array(NetlistWireSchema).default([]),
      referenceNetlist: z.array(NetlistWireSchema).default([]),
    })
    .optional(),
  memoryMapTask: z
    .object({
      addressWidth: z.number().int().default(16),
      requireTableCompletion: z.boolean().default(true),
      expectedRegions: z.array(ExpectedMemoryRegionSchema).min(1),
    })
    .optional(),
  registerTask: RegisterTaskSchema.optional(),
  flowchartTask: FlowchartTaskSchema.optional(),
});

export type SublevelDefinition = z.infer<typeof SublevelSchema>;
export type ExpectedMemoryRegion = z.infer<typeof ExpectedMemoryRegionSchema>;
export type PaletteEntry = z.infer<typeof PaletteEntrySchema>;
export type RegisterSpec = z.infer<typeof RegisterSpecSchema>;
export type RegisterTask = z.infer<typeof RegisterTaskSchema>;
export type FlowchartBlock = z.infer<typeof FlowchartBlockSchema>;
export type FlowchartTask = z.infer<typeof FlowchartTaskSchema>;

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
