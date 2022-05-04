/* globals describe, it, before */
import assert from 'assert'

import { create, ls, get, set } from '../src/kv.js'

const fixtureMap = { a: 10, b: 20 }

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
    }
    rootCID = blocks[4].cid
  })

  it('create values', () => {
    assert.equal(blocks.length, 5)
    assert.equal(blocks[0].value, fixtureMap.a)
    assert.equal(blocks[1].value, fixtureMap.b)
  })

  it('create inner', () => {
    const inner = blocks[2].value
    const leaf = inner.leaf
    assert.equal(inner.closed, false)
    assert.equal(leaf.length, 2)
    assert.equal(leaf[0][0], 'a')
    assert.equal(leaf[1][0], 'b')
  })

  it('create changes', () => {
    const changes = blocks[3].value
    assert.equal(changes[0].key, 'a')
    assert.equal(changes[1].key, 'b')
  })

  it('create root', () => {
    const root = blocks[4].value
    assert.equal(root.targetSize, 3)
    assert.equal(root._type, 'matrika:kv:v1')
  })

  describe('list all', () => {
    let list
    before('make list', async () => {
      list = await ls({ getBlock, kv: rootCID })
    })
    it('result keys', () => {
      assert.equal(list.result.length, 2)
      assert.equal(list.result[0].key, 'a')
      assert.equal(list.result[1].key, 'b')
    })
    it('result value functions', async () => {
      assert.equal(await list.result[0].value(), 10)
      assert.equal(await list.result[1].value(), 20)
    })
    it('result cid set', () => {
      assert.equal(list.cids.size, 2)
      assert(list.cids.has(blocks[2].cid.toString()))
      assert(list.cids.has(blocks[4].cid.toString()))
    })
  })

  describe('list all includeValues', () => {
    let list
    before('make list', async () => {
      list = await ls({ getBlock, kv: rootCID, includeValues: true })
    })
    it('result keys', () => {
      assert.equal(list.result.length, 2)
      assert.equal(list.result[0].key, 'a')
      assert.equal(list.result[1].key, 'b')
    })
    it('result values', async () => {
      assert.equal(await list.result[0].value, 10)
      assert.equal(await list.result[1].value, 20)
    })
    it('result cid set', () => {
      assert.equal(list.cids.size, 4)
      assert(list.cids.has(blocks[0].cid.toString()))
      assert(list.cids.has(blocks[1].cid.toString()))
      assert(list.cids.has(blocks[2].cid.toString()))
      assert(list.cids.has(blocks[4].cid.toString()))
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
    before('do the set', async () => {
      for await (const block of set({ getBlock, kv: rootCID, key: 'c', value: '30' })) {
        setBlocks.push(block)
      }
    })
    it('yields new blocks', () => {
      assert.equal(setBlocks.length, 4)
      assert.equal(setBlocks[0].value, 30)
    })

    it('yields new inner', () => {
      const inner = setBlocks[1].value
      assert.equal(inner.leaf.length, 3)
      assert.equal(inner.leaf[2][0], 'c')
      assert.equal(inner.closed, false)
    })

    it('yields changes', () => {
      const changes = setBlocks[setBlocks.length - 2].value
      assert.equal(changes.length, 1)
      assert.equal(changes[0].key, 'c')
    })

    it('yields new root', () => {
      const rootBlock = setBlocks[setBlocks.length - 1].value
      assert.equal(rootBlock.targetSize, 3)
      assert.equal(rootBlock._type, 'matrika:kv:v1')
    })
  })
})
