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
  
  const head = await encode({ prev: kv, map: await root.address, changes: changesBlock.cid, targetSize })
  put(head)
  yield head
}

const mapLoader = async ({ kv, getBlock }) => {
  const block = await getBlock(kv)
  return load({ cid: block.value.map, get: getBlock, chunker: bf(block.value.targetSize), ...treeopts })
}

const prepareMap = o => Object.keys(o).map(k => ({ key: k, value: prepare(o[k]) }))

const targetSize = 3 // TODO: don't ship with this default

const trycid = string => {
  try {
    return CID.from(string)
  } catch (e) {
    return null
  }
}

const create = async function * (map) {
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

const update = async function * ({kv, changes, ...options}) {
  changes = Object.keys(o).map(k => ({ key: k, value: prepare(o[k]) }))
  for (const change of changes) {
    const value = change.value
    let cid
    if (typeof value == 'string') {
      cid = trycid(value)
    }
    if (!cid) {
      const block = await encode(value)
      yield block
      cid = block.cid
    }
    change.value = cid
  }
  yield * transform({ kv, changes, ...options })
}

const ls = async ({ kv, getBlock, start, end }) => {
  const node = await mapLoader({ kv, getBlock })
  if (start) {
    let { cids, result } = await node.getRangeEntries(start, end) 
    cids = cids._cids
    result = result.map(r => ({ key: r.key, value: decorate(getBlock, r.value) }))
    return { cids, result }
  } else {
    let { cids, result } = await node.getAllEntries() 
    cids = cids._cids
    result = result.map(r => ({ key: r.key, value: decorate(getBlock, r.value) }))
    return { cids, result }
  }
}

const get = () => {}
const set = () => {}

export { create, update, ls, get, set }
