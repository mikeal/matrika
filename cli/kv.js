#!/bin/env node
import { readFileSync } from 'fs'
import { create, update, ls, get, set } from '../src/kv.js'
import yargs from 'yargs'
import { CID } from 'multiformats'
import { prepare } from '../src/sugar.js'
import { mayberun, fixargv, reader, output, readDefaults, writeDefaults, writeProof } from './utils.js'
import { encode, decode } from '../src/ipld.js'

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
  }

  if (argv.proof) {
    const resultBlock = await encode(result)
    const query = { ls: { start: !!start, end: !!end, rendered: !!argv.renderValues } }
    const head = { result: result.cid, kv: root, query, _type: 'matrika:query:ls:v1' }
    const headBlock = await encode(head)
    const blocks = [ resultBlock, headBlock ]
    await writeProof({ root: headBlock.cid, cids, getBlock, blocks })
  } else {
    for (const r of result) {
      console.log(r)
    }
 }
}

const getCommand = async argv => {
  const { getBlock, root } = reader(argv.root, argv.input)
  let value = await get({ getBlock, kv: root })
  if (argv.renderValues) {
    value = await getBlock(value) 
  }
  console.log(value)
}
const setCommand = async argv => {
  const { getBlock, root } = reader(argv.root, argv.input)
  const blocks = []
  for await (const block of set({ getBlock, kv: root, key: argv.key, value })) {
    blocks.push(block)
  }
  await output(argv, blocks)
}

const createOpts = yargs => {
  writeDefaults(yargs)
  // TODO: implement targetSize
}

const commands = () => {
  const argv = fixargv()
  yargs(argv)
    .command('kv-create <json>', 'Create new database from JSON string map', createOpts, createCommand)
    .command('kv-ls [start] [end]', 'List the keys in a database', readDefaults, lsCommand) 
    .command('kv-get <key>', 'Read single key', readDefaults, getCommand)
    .command('kv-set <key> <value-json>', 'Write single key', writeDefaults, setCommand)
    .demandCommand(1)
    .parse()
}

export default commands

mayberun(process, import.meta, commands)
