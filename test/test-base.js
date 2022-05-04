/* globals describe, it, before */
import { create, ls } from '../src/kv.js'

import assert from 'assert'

describe('base', () => {
  const fixtureMap = { a: 10, b: 20 }
  const blocks = []
  const blockMap = {}

  before('create blocks', async () => {
    for await (const block of create(fixtureMap, 3)) {
      blocks.push(block)
      blockMap[block.cid.toString()] = block
    }
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
  })

  describe('list all', () => {
    let list, rootCID
    before('make list', async () => {
      rootCID = blocks[4].cid
      const getBlock = async (cid) => blockMap[cid.toString()]
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
    let list, rootCID
    before('make list', async () => {
      rootCID = blocks[4].cid
      const getBlock = async (cid) => blockMap[cid.toString()]
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
})
