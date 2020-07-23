const fetch = require('node-fetch')
const opentype = require('opentype.js')

const fontUrl = `${process.env['URL']}/fonts/Montserrat-ExtraBold.otf`

exports.handler = async function (event) {
  try {
    const fontResponse = await fetch(fontUrl)
    const fontBuffer = await fontResponse.arrayBuffer()
    const font = await opentype.parse(fontBuffer)
    const paths = font.getPaths(event.body || 'BEES').map((path) => {
      return { commands: path.commands, boundingBox: path.getBoundingBox() }
    })
    return {
      statusCode: 200,
      body: JSON.stringify(paths),
    }
  } catch (err) {
    console.log(err)
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    }
  }
}
