import { serialize, decorate } from './sugar.js'
import { CID } from 'multiformats'
import { encode } from './ipld.js'
import { create as createMap, load } from 'prolly-trees/map'
import { deepStrictEqual as same } from 'assert'
import { treeopts, bf } from './util.js'

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

const transform = async function * ({ kv, changes, getBlock, targetSize }) {
  const chunker = bf(targetSize)
  const { get, put } = storage(getBlock)
  const list = changes
  // TODO: force ordering by key in changes
  let root
  let iter
  if (!kv) {
    kv = null
    iter = createMap({ get, list, chunker, ...treeopts })
  } else { 
    const head = await get(kv)
    root = await load({ cid: head.value.map, get, chunker, ...treeopts })
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
  
  const head = await encode({
    _type: 'matrika:kv:v1',
    prev: kv,
    map: await root.address,
    changes: changesBlock.cid,
    targetSize
  })
  put(head)
  yield head
}

const mapLoader = async ({ kv, getBlock }) => {
  const block = await getBlock(kv)
  if (!block.value.map) throw new Error('Not a kv ' + kv)
  return load({ cid: block.value.map, get: getBlock, chunker: bf(block.value.targetSize), ...treeopts })
}

const DEFAULT_TARGET_SIZE = 3 // TODO: don't ship with this default

const trycid = string => {
  try {
    return CID.from(string)
  } catch (e) {
    return null
  }
}

const create = async function * (map, targetSize = DEFAULT_TARGET_SIZE) {
  if (targetSize < 2) {
    throw new RangeError("targetSize must be greater than 1")
  }
  const changes = []
  for (const [key, value] of Object.entries(map)) {
    let cid = trycid(value)
    if (!cid) {
      const blocks = await serialize(value)
      cid = blocks[blocks.length -1].cid
      yield * blocks
    }
    changes.push({ key, value: cid })
  }
  yield * transform({ changes, targetSize })
}

const prepareChanges = async changes => {
  let blocks = []
  for (const c of changes) {
    let { key, value, del } = c
    if (!CID.asCID(value)) {
      blocks = [ ...blocks, ...await serialize(value) ]
      c.value = blocks[blocks.length -1].cid
    }
  }
  return blocks
}

const update = async function * ({ kv, prev, getBlock, changes, ...options }) {
  const head = await getBlock(kv)
  const { targetSize } = head.value
  const chunker = bf(targetSize)
  const node = await load({ cid: head.value.map, get: getBlock, chunker, ...treeopts })
  if (prev) {
    // TODO: find changes delta and throw on conflicts
    throw new Error('not implemented')
  }

  const blocks = await prepareChanges(changes)
  yield * blocks

  const result = await node.bulk(changes)

  const { fromEntries, values } = Object

  const blocks = values(fromEntries(result.blocks.map(b => [ b.cid.toString(), b ])))
  yield * blocks

  const changesBlock = await encode(changes)
  yield changesBlock
  
  const newHead = await encode({
    _type: 'matrika:kv:v1',
    prev: kv,
    map: await result.root.address,
    changes: changesBlock.cid,
    targetSize
  })
  yield newHead
}

const ls = async ({ kv, getBlock, start, end, includeValues }) => {
  const node = await mapLoader({ kv, getBlock })
  let cids, result
  if (start) {
    const r = await node.getRangeEntries(start, end) 
    cids = r.cids._cids
    result = r.result
  } else {
    const r = await node.getAllEntries() 
    cids = r.cids._cids
    result = r.result
  }
  cids.add(node.block.cid.toString())
  cids.add(kv.toString())
  if (!includeValues) {
    result = result.map(r => ({ key: r.key, value: decorate(getBlock, r.value) }))
  } else {
    result = await Promise.all(result.map(async r => {
      const block = await getBlock(r.value)
      cids.add(block.cid.toString())
      return { key: r.key, value: decorate(getBlock, block.value, block) }
    }))
  }
  return { cids, result }
}

const has = async opts => {

}

const get = async ({ key, kv, getBlock }) => {
  const node = await mapLoader({ kv, getBlock })
  const { result } = await node.get(key)
  return decorate(getBlock, result)
}
const set = async function * ({ key, value, kv, getBlock, prev }) {
  const changes = [ { key, value } ]
  yield * update({ changes, kv, getBlock, prev })
}

class KVUpdate {
  constructor (kv) {
    this.kv = kv
    this.blocks = {}
    this.getBlock = cid => this._getBlock(cid)
    this.getBlock._blocksref = this.blocks
  }
  async _getBlock (cid) {
    if (this.blocks[cid.toString()]) return this.blocks[cid.toString()]
    return this.kv.getBlock(cid)
  }
  put (block) {
    this.last = block
    this.blocks[blocks.cid.toString()] = block
  }
  kv () {
    return new KV(this.last.cid, this.getBlock)
  }
}

class KV {
  constructor (cid, getBlock) {
    this.cid = cid
    this.getBlock = getBlock
    this.loaded = this.load()
  }
  static async create ({ map, getBlock, targetSize }) {
    const update = new KVUpdate({ getBlock })
    for await (const block of create(map, targetSize)) {
      update.put(block)
    }
    return update.kv()
  }
  async load () {
    const head = await getBlock(kv)
    const { targetSize } = head.value
    const chunker = bf(targetSize)
    const node = await load({ cid: head.value.map, get: getBlock, chunker, ...treeopts })
    this.head = head
    this.node = node
    return true
  }
  async get (key, value=true) {
    await this.load()
    const { result } = await this.node.get(key)
    if (value) {
      const block = await this.getBlock(result)
      return decorate(this.getBlock, block.value, block)
    }
    return result
  }
  async bulk (changes) {
    await this.load()
    const update = new KVUpdate(this)
    await blocks = await prepareChanges(changes)
    blocks.forEach(b => update.put(b))

    const result = await node.bulk(changes)
    rseult.blocks.forEach(b => update.put(b))

    const changesBlock = await encode(changes)
    update.put(changesBlock)
    
    const newHead = await encode({
      _type: 'matrika:kv:v1',
      prev: kv,
      map: await result.root.address,
      changes: changesBlock.cid,
      targetSize
    })
    update.put(newHead)
    return update
  }
  async set (key, value) {
    const changes = [ { key, value } ]
    return this.bulk(changes)
  }
  async del (key) {
    const changes = [ { key, del: true } ]
    return this.bulk(changes)
  }
}


export { create, update, ls, get, set }
