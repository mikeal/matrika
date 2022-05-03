#!/bin/env node
import { readFileSync } from 'fs'
import { create, update, ls, get, set } from '../src/kv.js'
import yargs from 'yargs'
import { CID } from 'multiformats'
import { prepare } from '../src/sugar.js'
import { mayberun, fixargv, reader } from './utils.js'
import { encode, decode, writer } from '../src/ipld.js'

const output = async (argv, blocks) => {
  const root = blocks[blocks.length -1]
  const { put, close, stream } = await writer(root.cid)
  stream.pipe(process.stdout)
  for (const block of blocks) {
    put(block)
  }
  close()
}

const createCommand = async argv => {
  const map = JSON.parse(argv.json)
  const blocks = []
  for await (const block of create(map)) {
    blocks.push(block)
  }
  await output(argv, blocks)
}

const lsCommand = async argv => {
  const { getBlock, root } = await reader(argv.input, argv.root)
  const { start, end } = argv
  const { result, cids } = await ls({ getBlock, kv: root, start, end })
  for (const r of result) {
    if (argv.renderValues) {
      r.value = prepare(await r.value())
    } else {
      r.value = r.value.cid
    }
    console.log(r)
  }
}

const getCommand = async argv => {
  const { getBlock, root } = reader(argv.root, argv.input)
  const value = await get({ getBlock, kv: root })
}
const setCommand = async argv => {}

const defaults = yargs => {
  yargs.option('input', {
    describe: 'CAR file input',
    alias: 'i'
  })
  yargs.option('root', {
    describe: 'Root CID to use in the given command',
    alias: 'c'
  })
  yargs.option('renderValues', {
    describe: 'Rather than printing CIDs, retrieve the block values and render them',
    type: 'boolean',
    default: false
  })
}

const createOpts = yargs => {
  // TODO: implement targetSize
}

const commands = () => {
  const argv = fixargv()
  yargs(argv)
    .command('kv-create <json>', 'Create new database from JSON string map', createOpts, createCommand)
    .command('kv-ls [start] [end]', 'List the keys in a database', defaults, lsCommand) 
    .command('kv-get <key>', 'Read single key', defaults, getCommand)
    .command('kv-set <key> <value-json>', 'Write single key', defaults, setCommand)
    .demandCommand(1)
    .parse()
}

export default commands

mayberun(process, import.meta, commands)
