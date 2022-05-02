import { encode, create } from 'multiformats/block'
import { sha256 as hasher } from 'multiformats/hashes/sha2'
import * as codec from '@ipld/dag-cbor'
import { CID } from 'multiformats'

const linkify = (getBlock, cid) => {
  const ret = async () => getBlock(cid).then(async (block) => {
    if (!block.value) throw new Error('Must provide decoded block from getBlock interface')
    return decorate(getBlock, block.value)
  })
  ret.cid = cid
  ret.toString = () => cid.toString()
  return ret
}

const decorate = (getBlock, obj) => {
  if (obj === null) return null
  if (typeof obj !== 'object') return obj
  if (Array.isArray(obj)) {
    return obj.map(x => decorate(getBlock, x))
  }
  if (obj.asCID === obj) {
    return linkify(getBlock, obj)
  }
  return Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, decorate(getBlock, v)]))
}

const prepare = obj => {
  if (obj === null) return null
  if (typeof obj === 'function') {
    if (!obj.cid) throw new Error('Cannot serialize functions that are not links')
    return obj.cid
  }
  if (typeof obj !== 'object') return obj
  if (Array.isArray(obj)) {
    return obj.map(x => prepare(x))
  }
  if (obj.asCID === obj) {
    return obj
  }
  return Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, prepare(v)]))
}

export { prepare, decorate, linkify }
