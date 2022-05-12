import { AbstractLevelDOWN } from 'abstract-leveldown'
import util from 'util'

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

// MatrikaLevelDOWN.prototype._serializeKey = function (key) {
//   // As an example, prefix all input keys with an exclamation mark.
//   // Below methods will receive serialized keys in their arguments.
//   return '!' + key
// }

MatrikaLevelDOWN.prototype._put = function (key, value, options, callback) {
  // we need to update the _store with the new CID after each operation
  this._store[key] = value
  this._nextTick(callback)
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
