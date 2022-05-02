import { transform, mapLoader } from './core.js'
import { prepare } from './sugar.js'

const prepareMap = o => Object.keys(o).map(k => ({ key: k, value: prepare(o[k]) }))

const targetSize = 3 // TODO: don't ship with this default

const create = map => transform({ changes: prepareMap(map), targetSize })

const update = async function * ({db, changes, ...options}) {
  changes = Object.keys(o).map(k => ({ key: k, value: prepare(o[k]) }))
  yield * transform({ db, changes, ...options })
}

const ls = async ({ db, getBlock }) => {
  const node = await mapLoader({ db, getBlock })
  let { cids, result } = await node.getAllEntries() 
  cids = cids._cids
  result = result.map(r => r.key)
  return { cids, result }
}

export { create, update, ls }
