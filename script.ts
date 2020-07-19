import * as Glyphs from './glyphs'
import { Point, Glyph } from './glyphs'
import SightCanvas from './sightCanvas'

async function main() {
  const canvas = document.getElementById('canvas') as HTMLCanvasElement
  const glyphs = await Glyphs.fetchGlyphs('butts')

  const sightCanvas = new SightCanvas(glyphs, canvas)
  sightCanvas.drawLoop()
}

main()
