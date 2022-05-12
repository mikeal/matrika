import { encode } from './ipld.js'
import { sha256 as hasher } from 'multiformats/hashes/sha2'
import * as codec from '@ipld/dag-cbor'
import { CID } from 'multiformats'
import { getBlockGlobal } from './ipld.js'

const linkify = (getBlock, cid) => {
  const ret = async () => getBlock(cid).then(async (block) => {
    /* c8 ignore next */
    if (!block.value) throw new Error('Must provide decoded block from getBlock interface')
    return decorate(getBlock, block.value, block)
  })
  ret.cid = cid
  ret.toString = () => cid.toString()
  return ret
}

const link = async (obj, getBlock = getBlockGlobal) => {
  const blocks = await serialize(obj)
  const block = blocks[blocks.length -1]
  const ret = async () => decorate(getBlock, block.value)
  ret.cid = block.cid
  ret.toString = () => block.cid.toString()
  ret.block = block
  ret.blocks = blocks
  return ret
}

const decorate = (getBlock, obj, block) => {
  if (obj === null) return null
  if (typeof obj !== 'object') return obj
  if (Array.isArray(obj)) {
    return obj.map(x => decorate(getBlock, x))
  }
  if (obj.asCID === obj) {
    return linkify(getBlock, obj)
  }
  const o = Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, decorate(getBlock, v)]))
  // o._block = block
  return o
}

const serialize = async (obj, blocks=[]) => {
  /* c8 ignore next */
  if (typeof obj === 'function') {
    /* c8 ignore next */
    throw new Error('Value is already a link, cannot be serialized')
    /* c8 ignore next */
  }
  if (obj === null || typeof obj !== 'object') {
    const block = await encode(obj)
    return [...blocks, block ]
  }
  const unwrap = obj => {
    if (obj === null) return null
    if (typeof obj === 'function') {
      if (!obj.cid) throw new Error('Cannot serialize functions that are not links')
      if (obj.block) blocks.push(obj.block)
      if (obj.blocks) blocks = [ ...blocks, ...obj.blocks ]
      return obj.cid
    }
    /*
    if (obj._block) {
      blocks.push(obj._block)
      return obj._block.cid
    }
    */
    if (typeof obj !== 'object') {
      return obj
    }
    if (Array.isArray(obj)) {
      return obj.map(v => unwrap(v))
    }
    return Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, unwrap(v)]))
  }

  /*
  if (obj._block) {
    return [...blocks, obj._block ]
  }
  */

  let val
  if (Array.isArray(obj)) {
    val = obj.map(v => unwrap(v))
  } else {
    val = Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, unwrap(v)])) 
  }
  const block = await encode(val)
  blocks.push(block)
  return blocks
}

export { decorate, linkify, serialize, link }
