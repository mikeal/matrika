import { create, load } from 'chunky-trees/map'
import { deepStrictEqual as same } from 'assert'
import * as codec from '@ipld/dag-cbor'
import { sha256 as hasher } from 'multiformats/hashes/sha2'
import { nocache } from 'chunky-trees/cache'
import { bf, simpleCompare as compare } from 'chunky-trees/utils'
import * as Block from 'multiformats/block'

const cache = nocache

const storage = (getBlock) => {
    const blocks = {}
    const put = block => {
      blocks[block.cid.toString()] = block
    }
    const get = async cid => {
      const block = blocks[cid.toString()]
      if (getBlock) return getBlock(cid)
      if (!block) throw new Error('Not found')
      return block
    }
    return { get, put, blocks }
}

const opts = { cache, codec, hasher, compare }

const encode = value => Block.encode({ codec, hasher, value })

const transform = async function * ({ db, changes, getBlock, targetSize }) {
  const chunker = bf(targetSize)
  const { get, put } = storage(getBlock)
  const list = changes
  // TODO: force ordering by key in changes
  let root
  let iter
  if (!db) {
    db = null
    iter = create({ get, list, chunker, ...opts })
  } else { 
    const head = await get(db)
    root = await load({ cid: head.value.map, get, chunker, ...opts })
    console.log(root)
    throw new Error('no implemented')
  }
  for await (const node of iter) {
    const address = await node.address
    put(await node.block)
    yield node.block
    root = node
  }
  const changesBlock = await encode(list)
  put(changesBlock)
  yield changesBlock
  
  const head = await encode({ prev: db, map: await root.address, changes: changesBlock.cid, targetSize })
  put(head)
  yield head
}

const mapLoader = async ({ db, getBlock }) => {
  const block = await getBlock(db)
  return load({ cid: block.value.map, get: getBlock, chunker: bf(block.value.targetSize), ...opts })
}

export { transform, mapLoader }


