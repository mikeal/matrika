import { AbstractLevelDOWN } from 'abstract-leveldown'
import util from 'util'
import 'dotenv/config'
import { create, update, ls, get, set } from './kv.js'
import { addAbortSignal } from 'stream'
import bent from 'bent'
import { writer, getBlockGateway } from './ipld.js'

// Constructor
function MatrikaLevelDOWN () {
  AbstractLevelDOWN.call(this)
}

// Our new prototype inherits from AbstractLevelDOWN
util.inherits(MatrikaLevelDOWN, AbstractLevelDOWN)

MatrikaLevelDOWN.prototype._open = function (options, callback) {
  // Initialize a memory storage object
  this._store = {}

  // Use nextTick to be a nice async citizen
  this._nextTick(callback)
}

const post = bent('POST', 'json')
const w3s = 'https://api.web3.storage/car'

const cloudPutBlocks = async (blocks) => {
  console.log('cloudPutBlocks', blocks.length)
  const root = blocks[blocks.length - 1]
  const { put, close, stream } = await writer(root.cid)
  const token = process.env.W3S_API_TOKEN
  if (!token) throw new Error('Must set W3S_API_TOKEN env variable to publish to web3.storage')
  const headers = { Authorization: `Bearer ${token}` }
  const response = post(w3s, stream, headers)
  for (const block of blocks) {
    put(block)
  }
  close()
  console.log(await response)
}

const addTo = async (cid, key, value) => {
  console.log('addTo', cid)

  const blocks = []
  for await (const block of set({ getBlock: getBlockGateway, kv: cid, key, value })) {
    blocks.push(block)
  }
  await cloudPutBlocks(blocks)
  return blocks[blocks.length - 1].cid
}

const makeFresh = async (key, value) => {
  const blocks = []
  for await (const block of create({ [key]: value })) {
    blocks.push(block)
  }
  await cloudPutBlocks(blocks)
  return blocks[blocks.length - 1].cid
}

const doPut = async (cid, key, value) => {
  if (cid) {
    return await addTo(cid, key, value)
  } else {
    // we need to update the _store with the new CID after each operation
    return await makeFresh(key, value)
  }
}

MatrikaLevelDOWN.prototype._put = function (key, value, options, callback) {
  // we need to update the _store with the new CID after each operation
  doPut(this._store.cid, key, value).then((cid) => {
    this._store.cid = cid
    this._nextTick(callback)
  })
}

MatrikaLevelDOWN.prototype._get = function (key, options, callback) {
  const value = this._store[key]

  if (value === undefined) {
    // 'NotFound' error, consistent with LevelDOWN API
    return this._nextTick(callback, new Error('NotFound'))
  }

  this._nextTick(callback, null, value)
}

MatrikaLevelDOWN.prototype._del = function (key, options, callback) {
  delete this._store[key]
  this._nextTick(callback)
}

export default MatrikaLevelDOWN
