import { readFileSync } from 'fs'
import yargs from 'yargs'
import { CarReader, CarWriter } from '@ipld/car'
import { Readable } from 'stream'
import { CID } from 'multiformats'
import { bytes as byteslib } from 'multiformats'
import { decode as digest } from 'multiformats/hashes/digest'

import * as dagcbor from '@ipld/dag-cbor'
import * as raw from 'multiformats/codecs/raw'
import { sha256 } from 'multiformats/hashes/sha2'
import * as Block from 'multiformats/block'

const { isBinary } = byteslib

const encode = value => {
  if (isBinary(value)) {
    return Block.encode({ value, hasher: sha256, codec: raw })
  }
  return Block.encode({ value, hasher: sha256, codec: dagcbor })
}

const decode = (bytes, cid) => {
  let hasher, codec
  const { code } = cid
  const hashcode = digest(cid.multihash).code

  if (hashcode === 0x12) {
    hasher = sha256
  } else {
    throw new Error('Unsupported hash function: ' + hashcode)
  }


  if (code === 0x71) {
    codec = dagcbor
  } else if (code === 0x55) {
    codec = raw
  } else {
    throw new Error('Unsupported codec: ' + code)
  }

  return Block.decode({ bytes, cide, codec, hasher })
}

const getBlockGateway = () => { throw new Error('Not Implemented') }

const mkGetBlock = async input => {
  const reader = await CarReader.fromBytes(readFileSync(input))
  const roots = await reader.getRoots()
  const getBlock = async cid => {
    if (typeof cid === 'string') cid = CID.parse(cid)
    console.log({ cid })
    if (await reader.has(cid)) {
      const { bytes } = await reader.get(cid)
      if (cid.code === 113) {
        return Block.create({ bytes, codec: dagcbor, cid, hasher: sha256 })
      } else {
        return { bytes, cid }
      }
    }
    return getBlockGateway(cid)
  }
  return { reader, root: roots[0], getBlock }
}

const writer = async (cid, filename) => {
  const { writer, out } = await CarWriter.create([cid])
  const stream = Readable.from(out)
  const put = block => { 
    if (!CID.asCID(block.cid)) throw new Error('here ' + block.cid)
    return writer.put(block) 
  }
  const close = () => writer.close()
  return { put, close, stream }
}

export { encode, decode, mkGetBlock, writer }
