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

  const glyphSegments = glyphs
    .flatMap(Glyphs.glyphToSVGPaths)
    .map((path) => Glyphs.svgPathToPoints(path, 2))
    .map((path: Point[]): Point[] => {
      return path.map(
        ({ x, y }: Point): Point => {
          return { x: 100 + x * 1.5, y: 200 + y * 2 }
        }
      )
    })
    .flatMap(Glyphs.pathSegments)

  const canvas = document.getElementById('canvas') as HTMLCanvasElement

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
