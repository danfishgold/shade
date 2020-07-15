import butts from './butts.json'
import { glyphToSVGPath, SVGPathToPoints } from './glyphs'

async function main() {
  // const text = 'butts'
  // const glyphResponse = await await fetch(
  //   `https://svg-font-stuff.glitch.me/glyphs/${text}`
  // )
  // const glyphs: Array<Glyph> = await glyphResponse.json()

  const [b, u, t1, t2, s] = butts
    .map(glyphToSVGPath)
    .map((path) => SVGPathToPoints(path, 100))

  const canvas: HTMLCanvasElement = document.getElementById('canvas')
  const ctx = canvas.getContext('2d')

  const drawLetter = (letter) => {
    ctx.fillStyle = 'green'
    for (const pt of letter) {
      ctx.beginPath()
      ctx.arc(pt.x * 4, pt.y * 4 + 300, 2, 0, Math.PI * 2)
      ctx.fill()
    }
  }
  drawLetter(b)
  drawLetter(u)
  drawLetter(t1)
  drawLetter(t2)
  drawLetter(s)

  canvas.addEventListener('mousemove', (e) => {
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    const [x, y] = [e.clientX, e.clientY]
    // console.log(x, y)
    drawLetter(b)
    drawLetter(u)
    drawLetter(t1)
    drawLetter(t2)
    drawLetter(s)
    ctx.beginPath()
    ctx.arc(x, y, 10, 0, Math.PI * 2)
    ctx.fill()
  })
}

main()
