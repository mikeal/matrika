import { hideBin } from 'yargs/helpers'
import { mkGetBlock } from '../src/ipld.js'
import { CID } from 'multiformats'
import { writer } from '../src/ipld.js'
import { createWriteStream } from 'fs'

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
  if (typeof root === 'string') {
    console.log({ root })
    root = CID.parse(root)
  }
  const { getBlock, root: carRoot } = await mkGetBlock(input)
  if (!root) root = carRoot
  return { root, getBlock }
}

const output = async (argv, blocks) => {
  const root = blocks[blocks.length -1]
  const { put, close, stream } = await writer(root.cid)
  if (!argv.outfile) {
    stream.pipe(process.stdout)
  } else {
    stream.pipe(createWriteStream(argv.outfile))
  }
  for (const block of blocks) {
    put(block)
  }
  close()
}

const writeProof = async ({ blocks, cids, getBlock, root, argv }) => {
  const { put, close, stream } = await writer(root)
  if (!argv.outfile) {
    stream.pipe(process.stdout)
  } else {
    stream.pipe(createWriteStream(argv.outfile))
  }
  const promises = []
  for (const block of blocks) {
    promises.push(put(block))
  }
  ;[ ...cids ].forEach(cid => promises.push(getBlock(cid).then(put)))

  await Promise.all(promises)

  close()
}

const defaults = yargs => {
  yargs.option('input', {
    describe: 'CAR file input',
    alias: 'i'
  })
  yargs.option('root', {
    describe: 'Root CID to use in the given command',
    alias: 'c'
  })
  yargs.option('outfile', {
    describe: 'Output CAR file to the given path. Defaults to stdout.',
    alias: 'o'
  })
}

const readDefaults = yargs => {
  defaults(yargs)
  yargs.option('renderValues', {
    describe: 'Rather than printing CIDs, retrieve the block values and render them',
    type: 'boolean',
    default: false
  })
  yargs.option('proof', {
    descibe: 'Output an IPLD proof w/ result as a CAR file',
    type: 'boolean',
    default: false
  })
}
const writeDefaults = yargs => {
  defaults(yargs)
}

export { mayberun, fixargv, reader, output, readDefaults, writeDefaults, writeProof }
