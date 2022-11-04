import { hideBin } from 'yargs/helpers'
import { mkGetBlock, getBlockGateway , writer } from '../src/ipld.js'
import { CID } from 'multiformats'
import { createWriteStream } from 'fs'
import bent from 'bent'

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
      argv = [argv.slice(0, 2).join('-'), ...argv.slice(2)]
    }
  }
  return argv
}

const reader = async (input, root) => {
  if (typeof root === 'string') {
    root = CID.parse(root)
  }
  let getBlock
  if (input) {
    const r = await mkGetBlock(input)
    getBlock = r.getBlock
    if (!root) root = r.root
  } else {
    if (!root) throw new Error('Must pass a root if not providing a CAR file')
    getBlock = getBlockGateway
  }
  return { root, getBlock }
}

const post = bent('POST', 'json')
const w3s = 'https://api.web3.storage/car'

const output = async (argv, blocks) => {
  const root = blocks[blocks.length - 1]
  const { put, close, stream } = await writer(root.cid)
  let response
  if (argv.outfile) {
    stream.pipe(createWriteStream(argv.outfile))
  } else if (argv.publish) {
    const token = process.env.W3S_API_TOKEN
    if (!token) throw new Error('Must set W3S_API_TOKEN env variable to publish to web3.storage')
    const headers = { Authorization: `Bearer ${token}` }
    response = post(w3s, stream, headers)
  } else {
    stream.pipe(process.stdout)
  }
  for (const block of blocks) {
    put(block)
  }
  close()
  if (response) {
    const res = await response
    console.log(res)
  }
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
  ;[...cids].forEach(cid => promises.push(getBlock(cid).then(put)))

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
  yargs.option('publish', {
    describe: 'Write CAR file to web3.storage. Must set W3S_API_TOKEN env variable.',
    type: 'boolean',
    default: false,
    alias: 'p'
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
