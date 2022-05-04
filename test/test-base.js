/* globals describe, it */
import { create } from '../src/kv.js'

describe('base', () => {
  const fixtureMap = { a: 10, b: 20 }

  it('base create', async () => {
    const blocks = []
    for await (const block of create(fixtureMap)) {
      blocks.push(block)
    }
    // console.log(blocks.map((x) => x))
  })

//   it('base list all', async () => {
    
    
//   })
})
