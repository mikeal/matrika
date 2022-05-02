import { transform, mapLoader } from './core.js'
import { prepare } from './sugar.js'

const prepareMap = o => Object.keys(o).map(k => ({ key: k, value: prepare(o[k]) }))

const targetSize = 3 // TODO: don't ship with this default

const create = map => transform({ changes: prepareMap(map), targetSize })

const update = async function * ({db, changes, ...options}) {
  changes = Object.keys(o).map(k => ({ key: k, value: prepare(o[k]) }))
  yield * transform({ db, changes, ...options })
}

const query = async function * ({ db, start, end, getBlock }) {
  const node = await mapLoader({ db, getBlock })
  let iter = await node.getRangeEntries(start, end) 
  console.log(iter)
  return
  for await (const node of iter) {
    console.log(node)
  }
}

export { create, update, query }
