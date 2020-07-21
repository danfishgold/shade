import { Glyph, Point } from './glyphs'
import * as Glyphs from './glyphs'
import { WasmSight, rust_memory } from '../crate/Cargo.toml'

export default class SightCanvas {
  private glyphPathDs: string[]
  private canvas: HTMLCanvasElement
  private dpr: number
  private mouse: Point | null
  private updateCanvas: boolean
  private sight: WasmSight
  private isometric: boolean

  constructor(glyphs: Glyph[], canvas: HTMLCanvasElement, isometric: boolean) {
    this.canvas = canvas
    this.isometric = isometric
    this.dpr = window.devicePixelRatio || 1
    setCanvasDPR(this.canvas, this.dpr)
    const { dx, dy, scale } = this.glyphMetrics(glyphs)
    this.glyphPathDs = glyphs
      .map((glyph) => Glyphs.transformGlyph(glyph, dx, dy, scale))
      .map(Glyphs.glyphToPathD)
    this.sight = this.initializeSight()
    this.mouse = null
    this.canvas.onmousemove = this.onMouseMove.bind(this)
    this.canvas.ontouchstart = this.onTouchStart.bind(this)
    this.canvas.ontouchend = this.onTouchEnd.bind(this)
    this.canvas.ontouchcancel = this.onTouchEnd.bind(this)
    this.canvas.ontouchmove = this.onMouseMove.bind(this)

    this.updateCanvas = true
  }

  private glyphMetrics(
    glyphs: Glyph[]
  ): { dx: number; dy: number; scale: number } {
    const bb = Glyphs.boundingBox(glyphs)
    const yScale = this.canvas.height / bb.height
    const xScale = this.canvas.width / bb.width
    const scale = (0.5 / this.dpr) * Math.min(xScale, yScale)
    const dx = this.canvas.width / 2 / this.dpr - scale * (bb.width / 2 + bb.x0)
    const dy =
      this.canvas.height / 2 / this.dpr - scale * (bb.height / 2 + bb.y0)

    return { dx, dy, scale }
  }

  private borderSegments() {
    return [
      { a: { x: 0, y: 0 }, b: { x: this.canvas.width / this.dpr, y: 0 } },
      {
        a: { x: this.canvas.width / this.dpr, y: 0 },
        b: {
          x: this.canvas.width / this.dpr,
          y: this.canvas.height / this.dpr,
        },
      },
      {
        a: {
          x: this.canvas.width / this.dpr,
          y: this.canvas.height / this.dpr,
        },
        b: { x: 0, y: this.canvas.height / this.dpr },
      },
      { a: { x: 0, y: this.canvas.height / this.dpr }, b: { x: 0, y: 0 } },
    ]
  }

  private initializeSight(): WasmSight {
    const glyphSegments = this.glyphPathDs
      .flatMap(Glyphs.polygonsFromPathD)
      .flatMap(Glyphs.polygonSegments)

    const borders = this.borderSegments()
    const sight = WasmSight.new()
    const innerSegmentComponents = new Float64Array(
      rust_memory().buffer,
      sight.inner_segment_components(glyphSegments.length),
      glyphSegments.length * 4
    )
    const borderSegmentComponents = new Float64Array(
      rust_memory().buffer,
      sight.border_segment_components(borders.length),
      borders.length * 4
    )
    glyphSegments.forEach((segment, index) => {
      innerSegmentComponents[index * 4 + 0] = segment.a.x
      innerSegmentComponents[index * 4 + 1] = segment.a.y
      innerSegmentComponents[index * 4 + 2] = segment.b.x
      innerSegmentComponents[index * 4 + 3] = segment.b.y
    })
    borders.forEach((segment, index) => {
      borderSegmentComponents[index * 4 + 0] = segment.a.x
      borderSegmentComponents[index * 4 + 1] = segment.a.y
      borderSegmentComponents[index * 4 + 2] = segment.b.x
      borderSegmentComponents[index * 4 + 3] = segment.b.y
    })
    sight.initialize_sight()

    return sight
  }

  private onMouseMove(event: MouseEvent | TouchEvent) {
    event.preventDefault()
    this.mouse = this.eventPosition(event)
    this.updateCanvas = true
  }

  private onTouchStart(event: MouseEvent | TouchEvent) {
    event.preventDefault()
    this.mouse = this.eventPosition(event)
    this.updateCanvas = true
  }

  private onTouchEnd(event: MouseEvent | TouchEvent) {
    event.preventDefault()
    this.mouse = null
    this.updateCanvas = true
  }

  private eventPosition(event: MouseEvent | TouchEvent): Point {
    if (event instanceof MouseEvent) {
      return {
        x: event.clientX,
        y: event.clientY,
      }
    } else {
      return {
        x: event.touches[0].clientX,
        y: event.touches[0].clientY,
      }
    }
  }

  private draw() {
    // Reset canvas
    const ctx = this.canvas.getContext('2d')
    ctx.fillStyle = 'black'
    ctx.rect(0, 0, this.canvas.width, this.canvas.height)
    ctx.fill()

    if (this.mouse) {
      // Draw polygons
      if (this.isometric) {
        const mouseAngle = Math.atan2(
          this.canvas.height / 2 / this.dpr - this.mouse.y,
          this.canvas.width / 2 / this.dpr - this.mouse.x
        )
        const polygon = this.isometricPolygon(mouseAngle)
        drawPolygon(polygon, ctx, 'white')
      } else {
        const fuzzyRadius = 5 * this.dpr
        const colors = ['cyan', 'magenta', 'yellow']
        const sourcesAndColors: [Point, string][] = colors
          .map((color, idx): [Point, string] => {
            const angle = (Math.PI * 2 * idx) / 3
            return [
              {
                x: this.mouse.x + Math.cos(angle) * fuzzyRadius,
                y: this.mouse.y + Math.sin(angle) * fuzzyRadius,
              },
              color,
            ]
          })
          .concat([[this.mouse, 'white']])

        for (const [source, color] of sourcesAndColors) {
          const polygon = this.nonisometricPolygon(source)
          drawPolygon(polygon, ctx, color)
        }
      }
    }

    // Draw glyphs
    this.glyphPathDs.forEach((glyphD) => {
      ctx.fillStyle = '#ddd'
      const path = new Path2D(glyphD)
      ctx.fill(path)
    })
  }

  private isometricPolygon(angle: number): Float64Array {
    this.sight.generate_isometric_polygon(angle)
    const polygonSize = this.sight.polygon_size()
    return new Float64Array(
      rust_memory().buffer,
      this.sight.polygon(),
      polygonSize * 2
    )
  }

  private nonisometricPolygon(source: Point): Float64Array {
    this.sight.generate_polygon(source.x, source.y)
    const polygonSize = this.sight.polygon_size()
    return new Float64Array(
      rust_memory().buffer,
      this.sight.polygon(),
      polygonSize * 2
    )
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
  polygon: Float64Array,
  ctx: CanvasRenderingContext2D,
  fillStyle: string
) {
  ctx.fillStyle = fillStyle
  ctx.beginPath()
  ctx.moveTo(polygon[0], polygon[1])
  for (let i = 2; i < polygon.length; i += 2) {
    ctx.lineTo(polygon[i], polygon[i + 1])
  }
  ctx.fill()
}

function setCanvasDPR(canvas: HTMLCanvasElement, dpr: number) {
  // https://www.html5rocks.com/en/tutorials/canvas/hidpi/
  const rect = canvas.getBoundingClientRect()
  canvas.width = rect.width * dpr
  canvas.height = rect.height * dpr
  const ctx = canvas.getContext('2d')
  ctx.scale(dpr, dpr)
}
