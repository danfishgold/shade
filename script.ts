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

  const canvas = document.getElementById('canvas') as HTMLCanvasElement

  // https://www.html5rocks.com/en/tutorials/canvas/hidpi/
  const dpr = window.devicePixelRatio || 1
  const rect = canvas.getBoundingClientRect()
  canvas.width = rect.width * dpr
  canvas.height = rect.height * dpr
  const ctx = canvas.getContext('2d')
  ctx.scale(dpr, dpr)

  const sight = new Sight(glyphs, canvas)
  sight.drawLoop()
}

main()
