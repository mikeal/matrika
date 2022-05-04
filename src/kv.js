import { prepare, decorate } from './sugar.js'
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
  return load({ cid: block.value.map, get: getBlock, chunker: bf(block.value.targetSize), ...treeopts })
}

const prepareMap = o => Object.keys(o).map(k => ({ key: k, value: prepare(o[k]) }))

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
      const block = await encode(value)
      yield block
      cid = block.cid
    }
    changes.push({ key, value: cid })
  }
  yield * transform({ changes, targetSize })
}

const update = async function * ({kv, prev, changes, ...options}) {
  if (prev) {
    // TODO: find changes delta and throw on conflicts
  }
  for (const { value, key, del } of changes) {
    if (await has({ key, kv, getBlock })) {

    }

    const value = prepare(change.value)
    if (!cid) {
      const block = await encode(value)
      yield block
      cid = block.cid
    }
    change.value = cid
  }
  yield * transform({ kv, changes, ...options })
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
      return { key: r.key, value: decorate(getBlock, block.value) }
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
const set = async ({ key, value, kv, getBlock }) => {
}

export { create, update, ls, get, set }
