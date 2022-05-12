import { KV } from './kv.js'
import { getBlockGlobal } from './ipld.js'

const kv = (cid, getBlock=getBlockGlobal) => new KV(cid, getBlock)

export { kv }
