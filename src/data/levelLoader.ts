import manifestJson from '@niveles/manifest.json';
import {
  ManifestSchema,
  SublevelSchema,
  type LevelManifest,
  type SublevelDefinition,
} from '@/types/level';

const rawSublevels = import.meta.glob('../../niveles/nivel-*/*.json', {
  eager: true,
  import: 'default',
});

export function loadManifest(): LevelManifest {
  return ManifestSchema.parse(manifestJson);
}

export function loadAllSublevels(): SublevelDefinition[] {
  const list: SublevelDefinition[] = [];
  for (const [filePath, data] of Object.entries(rawSublevels)) {
    const parsed = SublevelSchema.safeParse(data);
    if (!parsed.success) {
      throw new Error(
        `Error validando el nivel JSON ${filePath}: ${parsed.error.message}`
      );
    }
    list.push(parsed.data);
  }
  return list.sort((a, b) => a.levelId - b.levelId || a.order - b.order);
}

export function getSublevelById(id: string): SublevelDefinition | undefined {
  return loadAllSublevels().find((s) => s.id === id);
}
