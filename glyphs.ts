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

export function glyphToSVGPath(glyph: Glyph): SVGPathElement {
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
  path.setAttribute('d', glyphToPathD(glyph))
  return path
}

export function SVGPathToPoints(
  path: SVGPathElement,
  pointCount: number
): DOMPoint[] {
  const length = path.getTotalLength()
  return Array(pointCount)
    .fill(null)
    .map((_, pointIndex) =>
      path.getPointAtLength((pointIndex / pointCount) * length)
    )
}
