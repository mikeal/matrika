/* globals describe, it, before */
import assert from 'assert'
import fs from 'fs'
import { PassThrough } from 'stream'
import tempfile from 'tempfile'
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
    const decoded = await decode(block.bytes, block.cid)
    assert.equal(decoded.cid.toString(), 'bafyreif6wvo5txz35pv5vnungtazalvmmdhes3hopaqopjb63gvwwovlwy')
    assert.equal(decoded.value.anything, 'goes')
    assert.equal(decoded.bytes.length, 15)
  })

  describe('writer', () => {
    let w, mockedStream, tempfileName
    const chunks = []
    before(async () => {
      tempfileName = tempfile()
      mockedStream = fs.createWriteStream(tempfileName)
      //   mockedStream = new PassThrough()
      mockedStream.on('data', (chunk) => { chunks.push(chunk) })
      w = await writer(block.cid)
      w.stream.pipe(mockedStream)
      await w.put(block)
      await w.close()
    })
    it('worked', async () => {
      const data = fs.readFileSync(tempfileName)
      assert.match(data.toString(), /anything/)
    })
    describe('mkGetBlock', () => {
      let rdr
      before(async () => {
        rdr = await mkGetBlock(tempfileName)
      })
      it('returns reader', () => {
        assert(rdr.reader)
        assert(rdr.root)
        assert(rdr.getBlock)
        assert.equal(rdr.root.toString(), 'bafyreif6wvo5txz35pv5vnungtazalvmmdhes3hopaqopjb63gvwwovlwy')
      })
      it('can get blocks', async () => {
        const block = await rdr.getBlock(rdr.root)
        assert.equal(block.cid.toString(), 'bafyreif6wvo5txz35pv5vnungtazalvmmdhes3hopaqopjb63gvwwovlwy')
        assert.equal(block.value.anything, 'goes')
        assert.equal(block.bytes.length, 15)
      })
    })
  })
})
