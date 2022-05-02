import { transform, mapLoader } from './core.js'
import { prepare, decorate } from './sugar.js'
import { CID } from 'multiformats'

import * as codec from '@ipld/dag-cbor'
import { sha256 as hasher } from 'multiformats/hashes/sha2'
import * as Block from 'multiformats/block'

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
      const block = await Block.encode({ value, hasher, codec })
      yield block
      cid = block.cid
    }
    changes.push({ key, value: cid })
  }
  yield * transform({ changes, targetSize })
}

const update = async function * ({db, changes, ...options}) {
  changes = Object.keys(o).map(k => ({ key: k, value: prepare(o[k]) }))
  for (const change of changes) {
    const value = change.value
    let cid
    if (typeof value == 'string') {
      cid = trycid(value)
    }
    if (!cid) {
      const block = await Block.encode({ value, hasher, codec })
      yield block
      cid = block.cid
    }
    change.value = cid
  }
  yield * transform({ db, changes, ...options })
}

const ls = async ({ db, getBlock }) => {
  const node = await mapLoader({ db, getBlock })
  let { cids, result } = await node.getAllEntries() 
  cids = cids._cids
  result = result.map(r => ({ key: r.key, value: decorate(getBlock, r.value) }))
  return { cids, result }
}

export { create, update, ls }
