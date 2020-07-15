import { Point, Segment } from './sight'

export interface Glyph {
  commands: Array<Command>
  boundingBox: {
    x1: number
    y1: number
    x2: number
    y2: number
  }
}

type Command = CommandC | CommandM | CommandL | CommandZ

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

function glyphToPathD(glyph: Glyph): string {
  return glyph.commands.map(commandToString).join(' ')
}

export function glyphToSVGPaths(glyph: Glyph): SVGPathElement[] {
  const pathD = glyphToPathD(glyph)
  const pathDs = pathD
    .split(' Z')
    .slice(0, -1)
    .map((segment) => segment + 'Z')

  return pathDs.map((d) => {
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
    path.setAttribute('d', d)
    return path
  })
}

export function svgPathToPoints(
  path: SVGPathElement,
  pointDistance: number
): Point[] {
  const length = path.getTotalLength()
  const pointCount = Math.ceil(length / pointDistance)
  return Array(pointCount)
    .fill(null)
    .map((_, pointIndex) =>
      path.getPointAtLength((pointIndex / pointCount) * length)
    )
}

export function pathSegments(pathPoints: Point[]): Segment[] {
  return pathPoints.map((_, index: number) => {
    return {
      a: pathPoints[index],
      b: pathPoints[(index + 1) % pathPoints.length],
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
