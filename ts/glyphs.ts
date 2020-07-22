import { pathDataToPolys } from 'svg-path-to-polygons'

export interface Point {
  x: number
  y: number
}

export interface Segment {
  a: Point
  b: Point
}

export interface Glyph {
  commands: Array<Command>
  boundingBox: {
    x1: number
    y1: number
    x2: number
    y2: number
  }
}

interface CommandC {
  type: 'C'
  x1: number
  y1: number
  x2: number
  y2: number
  x: number
  y: number
}

interface CommandM {
  type: 'M'
  x: number
  y: number
}

interface CommandL {
  type: 'L'
  x: number
  y: number
}

interface CommandZ {
  type: 'Z'
}

type Command = CommandC | CommandM | CommandL | CommandZ

export async function fetchGlyphs(text: string): Promise<Glyph[]> {
  const glyphResponse = await fetch(`.netlify/functions/letter-glyphs`, {
    method: 'POST',
    body: text,
  })
  return await glyphResponse.json()
}

export function transformGlyph(
  glyph: Glyph,
  dx: number,
  dy: number,
  scale: number
): Glyph {
  return {
    boundingBox: {
      x1: dx + scale * glyph.boundingBox.x1,
      y1: dy + scale * glyph.boundingBox.y1,
      x2: dx + scale * glyph.boundingBox.x2,
      y2: dy + scale * glyph.boundingBox.y2,
    },
    commands: glyph.commands.map((cmd) => transformCommand(cmd, dx, dy, scale)),
  }
}

function transformCommand(
  cmd: Command,
  dx: number,
  dy: number,
  scale: number
): Command {
  switch (cmd.type) {
    case 'Z': {
      return cmd
    }
    case 'M': {
      return {
        type: 'M',
        x: dx + scale * cmd.x,
        y: dy + scale * cmd.y,
      }
    }
    case 'L': {
      return {
        type: 'L',
        x: dx + scale * cmd.x,
        y: dy + scale * cmd.y,
      }
    }
    case 'C': {
      return {
        type: 'C',
        x1: dx + scale * cmd.x1,
        y1: dy + scale * cmd.y1,
        x2: dx + scale * cmd.x2,
        y2: dy + scale * cmd.y2,
        x: dx + scale * cmd.x,
        y: dy + scale * cmd.y,
      }
    }
  }
}

function commandToString(command: Command): string {
  switch (command.type) {
    case 'Z':
      return 'Z'
    case 'M':
      return `M${command.x} ${command.y}`
    case 'L':
      return `L${command.x} ${command.y}`
    case 'C':
      return `C ${command.x1} ${command.y1}, ${command.x2} ${command.y2}, ${command.x} ${command.y}`
  }
}

export function glyphToPathD(glyph: Glyph): string {
  return glyph.commands.map(commandToString).join(' ')
}

export function polygonsFromPathD(d: string): Point[][] {
  const polygonPointPairs: [number, number][][] = pathDataToPolys(d, {
    tolerance: 0.5,
    decimals: 1,
  })
  return polygonPointPairs.map((polygon) => {
    return polygon.map(([x, y]) => {
      return { x, y }
    })
  })
}

export function polygonSegments(polygon: Point[]): Segment[] {
  return polygon.map((_, index: number) => {
    return {
      a: polygon[index],
      b: polygon[(index + 1) % polygon.length],
    }
  })
}

export function boundingBox(
  glyphs: Glyph[]
): { x0: number; y0: number; width: number; height: number } {
  const x1 = Math.min(...glyphs.map((g) => g.boundingBox.x1))
  const y1 = Math.min(...glyphs.map((g) => g.boundingBox.y1))
  const x2 = Math.max(...glyphs.map((g) => g.boundingBox.x2))
  const y2 = Math.max(...glyphs.map((g) => g.boundingBox.y2))

  return {
    x0: x1,
    y0: y1,
    width: x2 - x1,
    height: y2 - y1,
  }
}
