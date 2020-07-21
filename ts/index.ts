import * as Glyphs from './glyphs'
import SightCanvas from './sightCanvas'

async function main() {
  const canvas = document.getElementById('canvas') as HTMLCanvasElement
  const params = new URLSearchParams(window.location.search)
  if (!params.has('phrase')) {
    params.set('phrase', 'BEES')
    if (!params.has('isometric')) {
      params.set('isometric', 'nope')
    }
    window.location.search = params.toString()
  }
  const phrase = params.get('phrase')
  const isometric =
    params.has('isometric') &&
    !['no', 'false', 'nah', 'nope', 'ne'].includes(params.get('isometric'))
  const glyphs = await Glyphs.fetchGlyphs(phrase)

  const sightCanvas = new SightCanvas(glyphs, canvas, isometric)
  sightCanvas.drawLoop()
}

main()
