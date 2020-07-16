import { Glyph } from './glyphs'
import * as Glyphs from './glyphs'

export interface Point {
  x: number
  y: number
}

export interface Segment {
  a: Point
  b: Point
}

interface Intersection {
  x: number
  y: number
  param: number
}

export default class Sight {
  private glyphPoints: Point[][]
  private segments: Segment[]
  private uniquePoints: Point[]
  private canvas: HTMLCanvasElement
  private mouse: Point
  private updateCanvas: boolean

  constructor(glyphs: Glyph[], canvas: HTMLCanvasElement) {
    const boundingBox = Glyphs.boundingBox(glyphs)
    const yScale = canvas.height / boundingBox.height
    const xScale = canvas.width / boundingBox.width
    const scale = 0.5 * Math.min(xScale, yScale)
    const x0 =
      canvas.width / 2 - scale * (boundingBox.width / 2 + boundingBox.x0)
    const y0 =
      canvas.height / 2 - scale * (boundingBox.height / 2 + boundingBox.y0)

    this.glyphPoints = glyphs
      .flatMap(Glyphs.glyphToSVGPaths)
      .map((path) => Glyphs.svgPathToPoints(path, 2))
      .map((path: Point[]): Point[] => {
        return path.map(
          ({ x, y }: Point): Point => {
            return {
              x: (x0 + x * scale) / (window.devicePixelRatio || 1),
              y: (y0 + y * scale) / (window.devicePixelRatio || 1),
            }
          }
        )
      })
    const glyphSegments = this.glyphPoints.flatMap(Glyphs.pathSegments)
    this.segments = [
      { a: { x: 0, y: 0 }, b: { x: canvas.width, y: 0 } },
      {
        a: { x: canvas.width, y: 0 },
        b: { x: canvas.width, y: canvas.height },
      },
      {
        a: { x: canvas.width, y: canvas.height },
        b: { x: 0, y: canvas.height },
      },
      { a: { x: 0, y: canvas.height }, b: { x: 0, y: 0 } },
    ].concat(glyphSegments)
    this.uniquePoints = this.uniquePointsFromSegments(this.segments)
    this.canvas = canvas
    this.mouse = { x: canvas.width / 2, y: canvas.height / 2 }
    this.updateCanvas = true

    this.canvas.onmousemove = (event: MouseEvent) => {
      this.mouse.x = event.clientX / (window.devicePixelRatio || 1)
      this.mouse.y = event.clientY / (window.devicePixelRatio || 1)
      this.updateCanvas = true
    }
    console.log(this)
  }

  private uniquePointsFromSegments(segments: Segment[]): Point[] {
    const points = segments.flatMap((seg: Segment) => [seg.a, seg.b])
    const pointSet = new Set()
    return points.filter(function (p: Point) {
      const key = `${p.x},${p.y}`
      if (pointSet.has(key)) {
        return false
      } else {
        pointSet.add(key)
        return true
      }
    })
  }

  private getIntersection(ray: Segment, segment: Segment): Intersection | null {
    // RAY in parametric: Point + Delta*T1
    const r_px = ray.a.x
    const r_py = ray.a.y
    const r_dx = ray.b.x - ray.a.x
    const r_dy = ray.b.y - ray.a.y

    // SEGMENT in parametric: Point + Delta*T2
    const s_px = segment.a.x
    const s_py = segment.a.y
    const s_dx = segment.b.x - segment.a.x
    const s_dy = segment.b.y - segment.a.y

    // Are they parallel? If so, no intersect
    const r_mag = Math.sqrt(r_dx * r_dx + r_dy * r_dy)
    const s_mag = Math.sqrt(s_dx * s_dx + s_dy * s_dy)
    if (r_dx / r_mag == s_dx / s_mag && r_dy / r_mag == s_dy / s_mag) {
      // Unit vectors are the same.
      return null
    }

    // SOLVE FOR T1 & T2
    // r_px+r_dx*T1 = s_px+s_dx*T2 && r_py+r_dy*T1 = s_py+s_dy*T2
    // ==> T1 = (s_px+s_dx*T2-r_px)/r_dx = (s_py+s_dy*T2-r_py)/r_dy
    // ==> s_px*r_dy + s_dx*T2*r_dy - r_px*r_dy = s_py*r_dx + s_dy*T2*r_dx - r_py*r_dx
    // ==> T2 = (r_dx*(s_py-r_py) + r_dy*(r_px-s_px))/(s_dx*r_dy - s_dy*r_dx)
    const T2 =
      (r_dx * (s_py - r_py) + r_dy * (r_px - s_px)) /
      (s_dx * r_dy - s_dy * r_dx)
    const T1 = (s_px + s_dx * T2 - r_px) / r_dx

    // Must be within parametic whatevers for RAY/SEGMENT
    if (T1 < 0) return null
    if (T2 < 0 || T2 > 1) return null

    // Return the POINT OF INTERSECTION
    return {
      x: r_px + r_dx * T1,
      y: r_py + r_dy * T1,
      param: T1,
    }
  }

  private getSightPolygon(source: Point): Intersection[] {
    // Get all angles
    const uniqueAngles = this.uniquePoints.flatMap((pt) => {
      const angle = Math.atan2(pt.y - source.y, pt.x - source.x)
      return [angle - 0.00001, angle, angle + 0.00001]
    })

    // RAYS IN ALL DIRECTIONS
    let angledIntersects: [Intersection, number][] = []
    uniqueAngles.forEach((angle) => {
      // Calculate dx & dy from angle
      const dx = Math.cos(angle)
      const dy = Math.sin(angle)

      // Ray from center of screen to mouse
      const ray = {
        a: source,
        b: { x: source.x + dx, y: source.y + dy },
      }

      // Find CLOSEST intersection
      let closestIntersect = null
      this.segments.forEach((segment) => {
        const intersect = this.getIntersection(ray, segment)
        if (!intersect) {
          return
        }
        if (!closestIntersect || intersect.param < closestIntersect.param) {
          closestIntersect = intersect
        }
      })

      // Intersect angle
      if (!closestIntersect) {
        return
      }

      // Add to list of intersects
      angledIntersects.push([closestIntersect, angle])
    })

    // Sort intersects by angle
    angledIntersects = angledIntersects.sort(function (
      [_1, angle1],
      [_2, angle2]
    ) {
      return angle1 - angle2
    })

    // Polygon is intersects, in order of angle
    return angledIntersects.map(([intersect, _]) => intersect)
  }

  private draw() {
    // Clear canvas
    const ctx = this.canvas.getContext('2d')
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)

    // Draw glyphs
    this.glyphPoints.forEach((glyph, idx) => {
      ctx.fillStyle = idx == 1 ? '#000' : '#888'
      ctx.beginPath()
      ctx.moveTo(glyph[0].x, glyph[0].y)
      for (const { x, y } of glyph.slice(1)) {
        ctx.lineTo(x, y)
      }
      ctx.fill()
    })

    // Sight Polygons
    const fuzzyRadius = 5
    const ringCount = 6
    const origins = Array(ringCount)
      .fill(null)
      .map((_, idx) => {
        const angle = (Math.PI * 2 * idx) / ringCount
        return {
          x: this.mouse.x + Math.cos(angle) * fuzzyRadius,
          y: this.mouse.y + Math.sin(angle) * fuzzyRadius,
        }
      })
      .concat(this.mouse)

    const polygons = origins.map((origin) => this.getSightPolygon(origin))
    const colors = [
      'magenta',
      'cyan',
      'yellow',
      'magenta',
      'cyan',
      'yellow',
      'white',
    ]
    // const colors = ['red', 'cyan', 'red', 'cyan', 'red', 'cyan', 'white']
    polygons.forEach((polygon, idx) => {
      drawPolygon(polygon, ctx, colors[idx])
    })

    // Draw red dots
    ctx.fillStyle = '#dd3838'
    origins.map((origin) => {
      ctx.beginPath()
      ctx.arc(origin.x, origin.y, 2, 0, 2 * Math.PI, false)
      ctx.fill()
    })
  }

  drawLoop(): void {
    requestAnimationFrame(() => this.drawLoop())
    if (this.updateCanvas) {
      this.draw()
      this.updateCanvas = false
    }
  }
}

function drawPolygon(
  polygon: Intersection[],
  ctx: CanvasRenderingContext2D,
  fillStyle: string
) {
  ctx.fillStyle = fillStyle
  ctx.beginPath()
  ctx.moveTo(polygon[0].x, polygon[0].y)
  polygon.slice(1).forEach(({ x, y }) => {
    ctx.lineTo(x, y)
  })
  ctx.fill()
}

window.requestAnimationFrame =
  window.requestAnimationFrame ||
  window.webkitRequestAnimationFrame ||
  window.mozRequestAnimationFrame ||
  window.msRequestAnimationFrame
