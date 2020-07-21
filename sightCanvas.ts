import { Glyph, Point } from './glyphs'
import * as Glyphs from './glyphs'
import { WasmSight, rust_memory } from './crate/Cargo.toml'
// import { WasmSight, rust_memory } from './crate/pkg/shady_characters'

export default class SightCanvas {
  private glyphPathDs: string[]
  private canvas: HTMLCanvasElement
  private dpr: number
  private mouse: Point
  private updateCanvas: boolean
  private sight: WasmSight
  private isometric: boolean

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
    this.mouse = {
      x: canvas.width / 2 / this.dpr,
      y: canvas.height / 2 / this.dpr,
    }
    this.canvas.onmousemove = this.onMouseMove.bind(this)
    this.updateCanvas = true
  }

  private onMouseMove(event: MouseEvent) {
    this.mouse.x = event.clientX / this.dpr
    this.mouse.y = event.clientY / this.dpr
    this.updateCanvas = true
  }

  private draw() {
    // Clear canvas
    const ctx = this.canvas.getContext('2d')
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)

    // Draw Polygons
    const fuzzyRadius = 5
    const ringCount = this.isometric ? 0 : 3
    const sources = Array(ringCount)
      .fill(null)
      .map((_, idx) => {
        const angle = (Math.PI * 2 * idx) / ringCount
        return {
          x: this.mouse.x + Math.cos(angle) * fuzzyRadius,
          y: this.mouse.y + Math.sin(angle) * fuzzyRadius,
        }
      })
      .concat(this.mouse)

    const colors = this.isometric
      ? ['white']
      : ['magenta', 'cyan', 'yellow', 'white']
    // const colors = ['red', 'cyan', 'red', 'cyan', 'red', 'cyan', 'white']
    sources.forEach((source, idx) => {
      if (this.isometric) {
        const angle = Math.atan2(
          this.canvas.height / 2 / this.dpr - source.y,
          this.canvas.width / 2 / this.dpr - source.x
        )
        this.sight.generate_isometric_polygon(angle)
      } else {
        this.sight.generate_polygon(source.x, source.y)
      }
      const polygonSize = this.sight.polygon_size()
      const polygon = new Float64Array(
        rust_memory().buffer,
        this.sight.polygon(),
        polygonSize * 2
      )
      drawPolygon(polygon, ctx, colors[idx])
    })

    // Draw glyphs
    this.glyphPathDs.forEach((glyphD) => {
      ctx.fillStyle = '#ddd'
      const path = new Path2D(glyphD)
      ctx.fill(path)
    })

    // Draw sources
    ctx.fillStyle = '#dd3838'
    sources.map((origin) => {
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
