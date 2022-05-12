/* globals describe, it, before */
import assert from 'assert'

import { dedup } from '../src/ipld.js'
import { link, linkify, serialize, decorate } from '../src/sugar.js'

const equals = assert.deepEqual

const blockmap = blocks => {
  return Object.fromEntries(blocks.map(block => [ block.cid.toString(), block ]))
}

describe('serialize', () => {

  it('basic object', async () => {
    const blocks = await serialize({ hello: 'world' })
    equals(blocks.length, 1)

    const [ { value } ] = blocks
    equals(value, { hello: 'world' })
  })

  it('basic link', async () => {
    const l = await link({ hello: 'world' })
    equals(await l(), { hello: 'world' })
    equals(l.toString(), l.cid.toString())

    const o = { test: l }
    const blocks = dedup(await serialize(o))
    equals(blocks.length, 2)
    equals(blocks[0].value, { hello: 'world' })
    equals(blocks[1].value, { test: l.cid })

    const db = blockmap(blocks)
    const getBlock = async cid => {
      if (db[cid.toString()]) return db[cid.toString()]
      throw new Error('No such block')
    }

    const obj = decorate(getBlock, blocks[1].value)
    equals(obj.test.toString(), obj.test.cid.toString())
    const sub = await obj.test()
    equals(sub, { hello: 'world' })
  })

  it('deep encode', async () => {
    const l = await link({ hello: 'world' })
    equals(await l(), { hello: 'world' })
    equals(l.toString(), l.cid.toString())
    
    const arr = [ l, l, null, true, false, 'test' ]
    const o = { arr, obj: { one: 1, two: l, three: [ l ] } }
    const blocks = dedup(await serialize(o))
    equals(blocks.length, 2)
    equals(blocks[0].value, { hello: 'world' })
    const c = l.cid
    const comparr = [ c, c, ...arr.slice(2) ]
    const comp = { arr: comparr, obj: { one: 1, two: c, three: [ c ] } }
    equals(blocks[1].value, comp)

    const db = blockmap(blocks)
    const getBlock = async cid => {
      if (db[cid.toString()]) return db[cid.toString()]
      throw new Error('No such block')
    }

    const obj = decorate(getBlock, blocks[1].value)
    let sub
    const t = () => equals(sub, { hello: 'world' })
    sub = await obj.arr[0]()
    t()
    sub = await obj.arr[1]()
    t()

    equals(obj.arr[2], null)
    equals(obj.arr[3], true)
    equals(obj.arr[4], false)
    equals(obj.arr[5], 'test')
    equals(obj.obj.one, 1)

    sub = await obj.obj.two()
    t()
    sub = await obj.obj.three[0]()
    t()
  })

  it('simple values', async () => {
    const simp = async val => {
      const blocks = await serialize(val)
      equals(blocks.length, 1)
      const [ { value } ] = blocks
      equals(val, value)
      const ret = decorate(() => {}, value)
      equals(ret, val)
      equals(ret, value)
    }
    await simp('test')
    await simp(true)
    await simp(false)
    await simp(null)
    await simp([ 1, 2, 3 ])
  })

  it('errors', async () => {
    try {
      await serialize({ test: () => {} })
    } catch (e) {
      if (e.message !== 'Cannot serialize functions that are not links') throw e
    }
  })

})
