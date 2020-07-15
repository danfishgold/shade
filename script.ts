import * as Glyphs from './glyphs'
import Sight from './sight'
import { Point } from './sight'
import { Glyph } from './glyphs'

async function main() {
  const text = 'butts'
  const glyphResponse = await fetch(
    `https://svg-font-stuff.glitch.me/glyphs/${text}`
  )
  const glyphs: Array<Glyph> = await glyphResponse.json()
  // const glyphs = require('./butts.json')

  const boundingBox = Glyphs.boundingBox(glyphs)

  const canvas = document.getElementById('canvas') as HTMLCanvasElement
  const yScale = canvas.height / boundingBox.height
  const xScale = canvas.width / boundingBox.width
  const scale = 0.5 * Math.min(xScale, yScale)
  const x0 = canvas.width / 2 - scale * (boundingBox.width / 2 + boundingBox.x0)
  const y0 =
    canvas.height / 2 - scale * (boundingBox.height / 2 + boundingBox.y0)

  const glyphSegments = glyphs
    .flatMap(Glyphs.glyphToSVGPaths)
    .map((path) => Glyphs.svgPathToPoints(path, 2))
    .map((path: Point[]): Point[] => {
      return path.map(
        ({ x, y }: Point): Point => {
          return {
            x: x0 + x * scale,
            y: y0 + y * scale,
          }
        }
      )
    })
    .flatMap(Glyphs.pathSegments)

  // https://www.html5rocks.com/en/tutorials/canvas/hidpi/
  const dpr = window.devicePixelRatio || 1
  const rect = canvas.getBoundingClientRect()
  canvas.width = rect.width * dpr
  canvas.height = rect.height * dpr
  const ctx = canvas.getContext('2d')
  ctx.scale(dpr, dpr)

  const sight = new Sight(glyphSegments, canvas)
  sight.drawLoop()
}

main()
