/* globals describe, it, before */
import assert from 'assert'
import { encode, decode, mkGetBlock, writer } from '../src/ipld.js'

describe('ipld', () => {
  let block
  before(async () => {
    block = await encode({ anything: 'goes' })
  })
  it('encode', () => {
    assert.equal(block.cid.toString(), 'bafyreif6wvo5txz35pv5vnungtazalvmmdhes3hopaqopjb63gvwwovlwy')
    assert.equal(block.value.anything, 'goes')
    assert.equal(block.bytes.length, 15)
  })

  it('decode', async () => {
    // console.log(block)
    // const byteView = new DataView(block.bytes.buffer, 0)
    const decoded = decode(block.bytes, block.cid)
    // console.log(decoded)
  })

  it('writer', async () => {
    const w = await writer(block.cid)
    assert(w.put)
    assert(w.close)
    assert(w.stream)
  })

  it('mkGetBlock', () => {
    // TODO make a car file fixture
  })
})
