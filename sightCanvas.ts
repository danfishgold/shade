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
      { a: { x: 0, y: 0 }, b: { x: this.canvas.width, y: 0 } },
      {
        a: { x: this.canvas.width, y: 0 },
        b: { x: this.canvas.width, y: this.canvas.height },
      },
      {
        a: { x: this.canvas.width, y: this.canvas.height },
        b: { x: 0, y: this.canvas.height },
      },
      { a: { x: 0, y: this.canvas.height }, b: { x: 0, y: 0 } },
    ]
  }

  private initializeSight(): WasmSight {
    const glyphSegments = this.glyphPathDs
      .flatMap(Glyphs.splitPathDIntoDisjointParts)
      .map(Glyphs.svgPathFromD)
      .map((path) => Glyphs.svgPathToPoints(path, 3))
      .flatMap(Glyphs.pathSegments)

    const segments = glyphSegments.concat(this.borderSegments())

    const sight = WasmSight.new()
    const segmentComponents = new Float64Array(
      rust_memory().buffer,
      sight.segment_components(),
      segments.length * 4
    )
    segments.forEach((segment, index) => {
      segmentComponents[index * 4 + 0] = segment.a.x
      segmentComponents[index * 4 + 1] = segment.a.y
      segmentComponents[index * 4 + 2] = segment.b.x
      segmentComponents[index * 4 + 3] = segment.b.y
    })
    sight.initialize_sight(segments.length)

    return sight
  }

  constructor(glyphs: Glyph[], canvas: HTMLCanvasElement) {
    this.canvas = canvas
    this.dpr = window.devicePixelRatio || 1
    setCanvasDPR(this.canvas, this.dpr)
    const { dx, dy, scale } = this.glyphMetrics(glyphs)
    console.log(dx, dy)
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
    const ringCount = 3
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

    const colors = ['magenta', 'cyan', 'yellow', 'white']
    // const colors = ['red', 'cyan', 'red', 'cyan', 'red', 'cyan', 'white']
    sources.forEach((source, idx) => {
      this.sight.generate_polygon(source.x, source.y)
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
