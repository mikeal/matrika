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
    // const decoded = decode(block.bytes, block.cid)
    // console.log(decoded)
  })

  describe('writer', () => {
    let w
    before(async () => {
      w = await writer(block.cid)
    })
    it('base', async () => {
      assert(w.put)
      assert(w.close)
      assert(w.stream)
    })
    it('put', async () => {
      const r = await w.put(block)
    //   console.log(r)
    })
    it('close', async () => {
      const cl = await w.close()
    //   console.log(cl)
    })
    it('stream', async () => {
    //   console.log(w.stream)
    })
  })

  it('mkGetBlock', () => {
    // TODO make a car file fixture
  })
})
