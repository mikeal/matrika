import * as codec from '@ipld/dag-cbor'
import { sha256 as hasher } from 'multiformats/hashes/sha2'
import { bf, simpleCompare as compare } from 'chunky-trees/utils'
import { nocache } from 'chunky-trees/cache'

const cache = nocache

const treeopts = { cache, codec, hasher, compare }

export { treeopts, bf }
