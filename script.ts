import * as Glyphs from './glyphs'
import Sight from './sight'
import { Point } from './sight'
import { Glyph } from './glyphs'
import boop from './crate/Cargo.toml'

const ugh = new boop.Ugh()

let mem = new Float64Array(boop.rust_memory().buffer, ugh.pointer())
console.log(mem)

// JS array and rust object refer to the same place in memory
console.log(ugh.get(0), mem[0])
console.log(ugh.get(1), mem[1])

// mutating in rust is reflected in JS
ugh.set(2, 0.3)
console.log(mem[2])

// and vice versa
mem[3] = 0.4
console.log(ugh.get(3))

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
