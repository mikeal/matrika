/* globals describe, it, before */
import assert from 'assert'

import { create, ls, get, set } from '../src/kv.js'

const fixtureMap = { a: 10, b: 20, d: 40, e: 50 }

describe('errors', () => {
  it('must have targetSize > 1', async () => {
    await assert.rejects(
      async () => {
        for await (const block of create(fixtureMap, 1)) {
          console.log(block.cid)
        }
      }
      , 'RangeError')
  })
})

describe('base', () => {
  const blocks = []
  const blockMap = {}
  const getBlock = async (cid) => blockMap[cid.toString()]
  let rootCID

  before('create blocks', async () => {
    for await (const block of create(fixtureMap, 3)) {
      blocks.push(block)
      blockMap[block.cid.toString()] = block
    //   console.log(block.cid)
    }
    rootCID = blocks[blocks.length - 1].cid
  })

  it('create values', () => {
    assert.equal(blocks.length, 7)
    assert.equal(blocks[0].value, fixtureMap.a)
    assert.equal(blocks[1].value, fixtureMap.b)
    assert.equal(blocks[2].value, fixtureMap.d)
    assert.equal(blocks[3].value, fixtureMap.e)
  })

  it('create inner', () => {
    const inner = blocks[4].value
    const leaf = inner.leaf
    assert.equal(inner.closed, true)
    assert.equal(leaf.length, 4)
    assert.equal(leaf[0][0], 'a')
    assert.equal(leaf[1][0], 'b')
    assert.equal(leaf[2][0], 'd')
    assert.equal(leaf[3][0], 'e')
  })

  it('create changes', () => {
    const changes = blocks[5].value
    assert.equal(changes[0].key, 'a')
    assert.equal(changes[1].key, 'b')
    assert.equal(changes[2].key, 'd')
    assert.equal(changes[3].key, 'e')
  })

  it('create root', () => {
    const root = blocks[6].value
    assert.equal(root.targetSize, 3)
    assert.equal(root._type, 'matrika:kv:v1')
  })

  describe('list all', () => {
    let list
    before('make list', async () => {
      list = await ls({ getBlock, kv: rootCID })
    })
    it('result keys', () => {
      assert.equal(list.result.length, 4)
      assert.equal(list.result[0].key, 'a')
      assert.equal(list.result[1].key, 'b')
      assert.equal(list.result[2].key, 'd')
      assert.equal(list.result[3].key, 'e')
    })
    it('result value functions', async () => {
      assert.equal(await list.result[0].value(), 10)
      assert.equal(await list.result[1].value(), 20)
      assert.equal(await list.result[2].value(), 40)
      assert.equal(await list.result[3].value(), 50)
    })
    it('result cid set', () => {
      assert.equal(list.cids.size, 2)
      assert(list.cids.has(blocks[4].cid.toString()))
      assert(list.cids.has(blocks[6].cid.toString()))
    })
  })

  describe('list all start/end', () => {
    let list
    before('make list', async () => {
      list = await ls({ getBlock, kv: rootCID, start: 'd', end: 'f' })
    })
    it('result keys', () => {
      assert.equal(list.result.length, 2)
      assert.equal(list.result[0].key, 'd')
      assert.equal(list.result[1].key, 'e')
    })
    it('result value functions', async () => {
      assert.equal(await list.result[0].value(), 40)
      assert.equal(await list.result[1].value(), 50)
    })
    it('result cid set', () => {
      assert.equal(list.cids.size, 2)
      assert(list.cids.has(blocks[4].cid.toString()))
      assert(list.cids.has(blocks[6].cid.toString()))
    })
  })

  describe('list all includeValues', () => {
    let list
    before('make list', async () => {
      list = await ls({ getBlock, kv: rootCID, includeValues: true })
    })
    it('result keys', () => {
      assert.equal(list.result.length, 4)
      assert.equal(list.result[0].key, 'a')
      assert.equal(list.result[1].key, 'b')
      assert.equal(list.result[2].key, 'd')
      assert.equal(list.result[3].key, 'e')
    })
    it('result values', async () => {
      assert.equal(await list.result[0].value, 10)
      assert.equal(await list.result[1].value, 20)
      assert.equal(await list.result[2].value, 40)
      assert.equal(await list.result[3].value, 50)
    })
    it('result cid set', () => {
      assert.equal(list.cids.size, 6)
      assert(list.cids.has(blocks[0].cid.toString()))
      assert(list.cids.has(blocks[1].cid.toString()))
      assert(list.cids.has(blocks[2].cid.toString()))
      assert(list.cids.has(blocks[3].cid.toString()))
      assert(list.cids.has(blocks[4].cid.toString()))
      assert(list.cids.has(blocks[6].cid.toString()))
    })
  })

  describe('get key', () => {
    it('returns the value getter', async () => {
      const result = await get({ getBlock, kv: rootCID, key: 'a' })
      const ogBlock = blockMap[result.cid.toString()]
      const value = await result()
      assert.equal(ogBlock.value, value)
    })
  })

  describe('set key', () => {
    const setBlocks = []
    let rootBlock
    before('do the set', async () => {
      for await (const block of set({ getBlock, kv: rootCID, key: 'c', value: '30' })) {
        setBlocks.push(block)
      }
      rootBlock = setBlocks[setBlocks.length - 1].value
    })
    it('yields new blocks', () => {
      assert.equal(setBlocks.length, 4)
      assert.equal(setBlocks[0].value, 30)
    })

    it('yields new inner', () => {
      const inner = setBlocks[1].value
      assert.equal(inner.leaf.length, 5)
      assert.equal(inner.leaf[2][0], 'c')
      assert.equal(inner.closed, true)
    })

    it('yields changes', () => {
      const changes = setBlocks[setBlocks.length - 2].value
      assert.equal(changes.length, 1)
      assert.equal(changes[0].key, 'c')
    })

    it('yields new root', () => {
      assert.equal(rootBlock.targetSize, 3)
      assert.equal(rootBlock._type, 'matrika:kv:v1')
    })
  })
})
