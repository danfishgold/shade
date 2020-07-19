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
  ): { x0: number; y0: number; scale: number } {
    const boundingBox = Glyphs.boundingBox(glyphs)
    const yScale = this.canvas.height / boundingBox.height
    const xScale = this.canvas.width / boundingBox.width
    const scale = 0.5 * Math.min(xScale, yScale)
    const x0 =
      this.canvas.width / 2 - scale * (boundingBox.width / 2 + boundingBox.x0)
    const y0 =
      this.canvas.height / 2 - scale * (boundingBox.height / 2 + boundingBox.y0)

    return { x0, y0, scale }
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

  private initializeSight(glyphs: Glyph[]): WasmSight {
    const { x0, y0, scale } = this.glyphMetrics(glyphs)
    const glyphSegments = this.glyphPathDs
      .flatMap(Glyphs.splitPathDIntoDisjointParts)
      .map(Glyphs.svgPathFromD)
      .map((path) => Glyphs.svgPathToPoints(path, 2))
      .map((path: Point[]): Point[] => {
        return path.map(
          ({ x, y }: Point): Point => {
            return {
              x: (x0 + x * scale) / this.dpr,
              y: (y0 + y * scale) / this.dpr,
            }
          }
        )
      })
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
    this.glyphPathDs = glyphs.map(Glyphs.glyphToPathD)
    this.sight = this.initializeSight(glyphs)
    this.mouse = { x: canvas.width / 2, y: canvas.height / 2 }
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

    // // Draw glyphs
    // this.glyphPoints.forEach((glyph, idx) => {
    //   ctx.fillStyle = idx == 1 ? '#000' : '#ddd'
    //   ctx.beginPath()
    //   ctx.moveTo(glyph[0].x, glyph[0].y)
    //   for (const { x, y } of glyph.slice(1)) {
    //     ctx.lineTo(x, y)
    //   }
    //   ctx.fill()
    // })

    // Sight Polygons
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

    // Draw red dots
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
