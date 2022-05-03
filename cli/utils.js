import { hideBin } from 'yargs/helpers'
import { mkGetBlock } from '../src/ipld.js'
import { CID } from 'multiformats'

const mayberun = (process, meta, fn) => {
  const f = process.argv[1]
  const u = meta.url.slice('file://'.length)
  if (f === u) fn()
}

const fixargv = () => {
  let argv = hideBin(process.argv)
  if (argv.length === 1) argv = []
  if (argv.length >= 2) {
    if (!argv[0].includes('-')) {
      argv = [ argv.slice(0,2).join('-'), ...argv.slice(2) ]
    }
  }
  return argv
}

const reader = async (input, root) => {
  if (root) root = CID.parse(root)
  const { getBlock, root: carRoot } = await mkGetBlock(input)
  if (!root) root = carRoot
  return { root, getBlock }
}

export { mayberun, fixargv, reader }
