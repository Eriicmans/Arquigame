import { describe, expect, it } from 'vitest';
import { analyzeMemoryMap } from '@/engine/memoryMapAnalyzer';
import { parsePinKey, simulateCircuitState } from '@/engine/simulator';
import type { PlacedComponent, Wire } from '@/types/circuit';

function w(id: string, from: string, to: string): Wire {
  return { id, from: parsePinKey(from), to: parsePinKey(to) };
}

describe('Simulador lógico y analizador de mapas de memoria', () => {
  it('decodifica correctamente 8085 + 74138 y detecta fugas de IO/M', () => {
    const components: PlacedComponent[] = [
      { id: 'cpu', type: 'CPU_8085', label: '8085', x: 0, y: 0 },
      { id: 'dec', type: 'IC_74138', label: '74138', x: 200, y: 0 },
      { id: 'pwr', type: 'POWER_RAILS', label: 'PWR', x: 200, y: 200 },
      { id: 'rom', type: 'MEM_UVPROM', label: 'UVPROM 8kB', x: 400, y: 0, props: { sizeKB: 8 } },
    ];

    // Intentional bug: /E1 tied to GND instead of IO/M -> memory leaks into I/O space
    const leakyWires: Wire[] = [
      w('1', 'cpu.A13', 'dec.A0'),
      w('2', 'cpu.A14', 'dec.A1'),
      w('3', 'cpu.A15', 'dec.A2'),
      w('4', 'pwr.GND', 'dec./E1'),
      w('5', 'pwr.GND', 'dec./E2'),
      w('6', 'pwr.VCC', 'dec.E3'),
      w('7', 'dec./Y0', 'rom./CS'),
      w('8', 'cpu./RD', 'rom./OE'),
      w('9', 'cpu.A0..A12', 'rom.ADDR'),
      w('10', 'cpu.D0..D7', 'rom.DATA'),
    ];

    const leaky = analyzeMemoryMap(components, leakyWires, '8085');
    expect(leaky.ioLeaks).toHaveLength(1);
    expect(leaky.hasErrors).toBe(true);

    // Fix: connect IO/M to /E2 (interchangeable with /E1)
    const fixedWires = leakyWires.map((wire) =>
      wire.id === '5' ? w('5', 'cpu.IO/M', 'dec./E2') : wire
    );
    const clean = analyzeMemoryMap(components, fixedWires, '8085');
    expect(clean.ioLeaks).toHaveLength(0);
    expect(clean.hasErrors).toBe(false);
    expect(clean.segments[0].startHex).toBe('0x0000');
    expect(clean.segments[0].endHex).toBe('0x1FFF');
    expect(clean.segments[0].access).toBe('R');
  });

  it('detecta zonas imagen (espejo) usando puerta AND en lógica negativa (estilo Examen 2025-01-07)', () => {
    const components: PlacedComponent[] = [
      { id: 'cpu', type: 'CPU_8085', label: '8085', x: 0, y: 0 },
      { id: 'dec', type: 'IC_74138', label: '74138', x: 200, y: 0 },
      { id: 'and1', type: 'GATE_AND', label: 'AND', x: 350, y: 0 },
      { id: 'pwr', type: 'POWER_RAILS', label: 'PWR', x: 200, y: 200 },
      { id: 'ram2', type: 'MEM_SRAM', label: 'SRAM 2', x: 500, y: 0, props: { sizeKB: 8 } },
    ];

    const wires: Wire[] = [
      w('1', 'cpu.A13', 'dec.A0'),
      w('2', 'cpu.A14', 'dec.A1'),
      w('3', 'cpu.A15', 'dec.A2'),
      w('4', 'cpu.IO/M', 'dec./E1'),
      w('5', 'pwr.GND', 'dec./E2'),
      w('6', 'pwr.VCC', 'dec.E3'),
      // Combine /Y4 (8000h-9FFFh) AND /Y5 (A000h-BFFFh) -> active low mirror
      w('7', 'dec./Y4', 'and1.IN1'),
      w('8', 'dec./Y5', 'and1.IN2'),
      w('9', 'and1.OUT', 'ram2./CS'),
      w('10', 'cpu./RD', 'ram2./OE'),
      w('11', 'cpu./WR', 'ram2./WE'),
      w('12', 'cpu.A0..A12', 'ram2.ADDR'),
      w('13', 'cpu.D0..D7', 'ram2.DATA'),
    ];

    const analysis = analyzeMemoryMap(components, wires, '8085');
    expect(analysis.hasErrors).toBe(false);

    const primary = analysis.segments.find(
      (s) => s.startHex === '0x8000' && s.endHex === '0x9FFF'
    );
    const mirror = analysis.segments.find(
      (s) => s.startHex === '0xA000' && s.endHex === '0xBFFF'
    );
    expect(primary).toBeDefined();
    expect(primary?.isMirror).toBe(false);
    expect(mirror).toBeDefined();
    expect(mirror?.isMirror).toBe(true);
  });

  it('detecta solapamiento (colisión de bus) y cortocircuito entre salidas', () => {
    const components: PlacedComponent[] = [
      { id: 'cpu', type: 'CPU_8085', label: '8085', x: 0, y: 0 },
      { id: 'dec', type: 'IC_74138', label: '74138', x: 200, y: 0 },
      { id: 'pwr', type: 'POWER_RAILS', label: 'PWR', x: 200, y: 200 },
      { id: 'rom', type: 'MEM_UVPROM', label: 'ROM', x: 400, y: 0, props: { sizeKB: 8 } },
      { id: 'ram', type: 'MEM_SRAM', label: 'RAM', x: 400, y: 150, props: { sizeKB: 8 } },
    ];

    const collisionWires: Wire[] = [
      w('1', 'cpu.A13', 'dec.A0'),
      w('2', 'cpu.A14', 'dec.A1'),
      w('3', 'cpu.A15', 'dec.A2'),
      w('4', 'cpu.IO/M', 'dec./E1'),
      w('5', 'pwr.GND', 'dec./E2'),
      w('6', 'pwr.VCC', 'dec.E3'),
      // Both chips wired to /Y0!
      w('7', 'dec./Y0', 'rom./CS'),
      w('8', 'dec./Y0', 'ram./CS'),
      w('9', 'cpu./RD', 'rom./OE'),
      w('10', 'cpu./RD', 'ram./OE'),
      w('11', 'cpu./WR', 'ram./WE'),
      w('12', 'cpu.A0..A12', 'rom.ADDR'),
      w('13', 'cpu.D0..D7', 'rom.DATA'),
      w('14', 'cpu.A0..A12', 'ram.ADDR'),
      w('15', 'cpu.D0..D7', 'ram.DATA'),
    ];

    const res = analyzeMemoryMap(components, collisionWires, '8085');
    expect(res.hasErrors).toBe(true);
    expect(res.segments.some((s) => s.isCollision)).toBe(true);

    // Direct output-to-output short (/Y0 tied to /Y1)
    const shortSnap = simulateCircuitState(
      components,
      [...collisionWires, w('16', 'dec./Y0', 'dec./Y1')],
      { address: 0, ioM: 0, psen: 1, rd: 0, wr: 1 }
    );
    expect(shortSnap.shortCircuits.length).toBeGreaterThan(0);
  });

  it('soporta arquitectura Harvard del 80C552 (/PSEN programa vs /RD y /WR datos)', () => {
    const components: PlacedComponent[] = [
      { id: 'cpu', type: 'CPU_80C552', label: '80C552', x: 0, y: 0 },
      { id: 'dec', type: 'IC_74139', label: '74139', x: 200, y: 0 },
      { id: 'pwr', type: 'POWER_RAILS', label: 'PWR', x: 200, y: 200 },
      { id: 'rom', type: 'MEM_UVPROM', label: 'EPROM 16kB', x: 400, y: 0, props: { sizeKB: 16 } },
      { id: 'ram', type: 'MEM_SRAM', label: 'XRAM 16kB', x: 400, y: 150, props: { sizeKB: 16 } },
    ];

    const wires: Wire[] = [
      w('1', 'cpu.A14', 'dec.A0'),
      w('2', 'cpu.A15', 'dec.A1'),
      w('3', 'pwr.GND', 'dec./E'),
      // Same logical address 0000h-3FFFh, separated by /PSEN vs /RD+/WR!
      w('4', 'dec./Y0', 'rom./CS'),
      w('5', 'cpu./PSEN', 'rom./OE'),
      w('6', 'dec./Y0', 'ram./CS'),
      w('7', 'cpu./RD', 'ram./OE'),
      w('8', 'cpu./WR', 'ram./WE'),
      w('9', 'cpu.A0..A12', 'rom.ADDR'),
      w('10', 'cpu.D0..D7', 'rom.DATA'),
      w('11', 'cpu.A0..A12', 'ram.ADDR'),
      w('12', 'cpu.D0..D7', 'ram.DATA'),
    ];

    const res = analyzeMemoryMap(components, wires, '80C552');
    expect(res.hasErrors).toBe(false);

    const progSeg = res.segments.find(
      (s) => s.space === 'program' && s.startHex === '0x0000' && s.endHex === '0x3FFF'
    );
    const dataSeg = res.segments.find(
      (s) => s.space === 'data' && s.startHex === '0x0000' && s.endHex === '0x3FFF'
    );

    expect(progSeg?.chips[0]?.chipType).toBe('MEM_UVPROM');
    expect(progSeg?.access).toBe('R');
    expect(dataSeg?.chips[0]?.chipType).toBe('MEM_SRAM');
    expect(dataSeg?.access).toBe('RW');
  });

  it('permite pares de memoria en paralelo (D0..D3 + D4..D7) sin colisión y detecta colisión si comparten carril', () => {
    const components: PlacedComponent[] = [
      { id: 'cpu', type: 'CPU_8085', label: '8085', x: 0, y: 0 },
      { id: 'dec', type: 'IC_74138', label: '74138', x: 200, y: 0 },
      { id: 'pwr', type: 'POWER_RAILS', label: 'PWR', x: 200, y: 200 },
      {
        id: 'rom_lo',
        type: 'MEM_UVPROM',
        label: 'UVPROM Low',
        x: 400,
        y: 0,
        props: { sizeKB: 8, dataWidth: 4, dataSlice: 'low' },
      },
      {
        id: 'rom_hi',
        type: 'MEM_UVPROM',
        label: 'UVPROM High',
        x: 400,
        y: 160,
        props: { sizeKB: 8, dataWidth: 4, dataSlice: 'high' },
      },
    ];

    const wires: Wire[] = [
      w('1', 'cpu.A13', 'dec.A0'),
      w('2', 'cpu.A14', 'dec.A1'),
      w('3', 'cpu.A15', 'dec.A2'),
      w('4', 'cpu.IO/M', 'dec./E1'),
      w('5', 'pwr.GND', 'dec./E2'),
      w('6', 'pwr.VCC', 'dec.E3'),
      w('7', 'dec./Y0', 'rom_lo./CS'),
      w('8', 'cpu./RD', 'rom_lo./OE'),
      w('9', 'cpu.A0..A12', 'rom_lo.ADDR'),
      w('10', 'cpu.D0..D7', 'rom_lo.DATA'),
      w('11', 'dec./Y0', 'rom_hi./CS'),
      w('12', 'cpu./RD', 'rom_hi./OE'),
      w('13', 'cpu.A0..A12', 'rom_hi.ADDR'),
      w('14', 'cpu.D0..D7', 'rom_hi.DATA'),
    ];

    const validPair = analyzeMemoryMap(components, wires, '8085');
    expect(validPair.hasErrors).toBe(false);
    expect(validPair.segments[0].isCollision).toBe(false);
    expect(validPair.segments[0].chips).toHaveLength(2);

    // If both are 'low', they collide on D0..D3
    const badComponents = components.map((c) =>
      c.id === 'rom_hi' ? { ...c, props: { sizeKB: 8, dataWidth: 4, dataSlice: 'low' as const } } : c
    );
    const badPair = analyzeMemoryMap(badComponents, wires, '8085');
    expect(badPair.hasErrors).toBe(true);
    expect(badPair.segments[0].isCollision).toBe(true);
  });
});
