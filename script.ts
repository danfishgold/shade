import * as Glyphs from './glyphs'
import { Point, Glyph } from './glyphs'
import SightCanvas from './sightCanvas'

async function main() {
  const canvas = document.getElementById('canvas') as HTMLCanvasElement
  const params = new URLSearchParams(window.location.search)
  const phrase = params.get('phrase')
  const isometric = params.has('isometric')
  const glyphs = await Glyphs.fetchGlyphs(phrase)

  const sightCanvas = new SightCanvas(glyphs, canvas, isometric)
  sightCanvas.drawLoop()
}

main()
