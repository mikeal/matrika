#!/bin/env node
import { readFileSync } from 'fs'
import { create, update, ls } from './index.js'
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'
import { CarReader, CarWriter } from '@ipld/car'
import { Readable } from 'stream'
import { CID } from 'multiformats'

import * as codec from '@ipld/dag-cbor'
import { sha256 as hasher } from 'multiformats/hashes/sha2'
import * as Block from 'multiformats/block'

const getBlockGateway = () => { throw new Error('Not Implemented') }

const output = async (argv, blocks) => {
  const root = blocks[blocks.length -1]
  const { writer, out } = await CarWriter.create([root.cid])
  Readable.from(out).pipe(process.stdout)
  for (const block of blocks) {
    writer.put(block)
  }
  writer.close()
}

const createCommand = async argv => {
  const map = JSON.parse(argv.json)
  const blocks = []
  for await (const block of create(map)) {
    blocks.push(block)
  }
  await output(argv, blocks)
}

const mkGetBlock = (reader) => async cid => {
  if (await reader.has(cid)) {
    const { bytes } = await reader.get(cid)
    if (cid.code === 113) {
      return Block.create({ bytes, codec, cid, hasher })
    } else {
      return { bytes, cid }
    }
  }
  return getBlockGateway(cid)
}

const lsCommand = async argv => {
  let getBlock 
  if (argv.root) argv.root = CID.from(argv.root)
  if (argv.input) {
    const reader = await CarReader.fromBytes(readFileSync(argv.input))
    getBlock = mkGetBlock(reader)
    if (!argv.root) argv.root = (await reader.getRoots())[0]
  } else {
    getBlock = getBlockGateway
  }
  const { result, cids } = await ls({ getBlock, db: argv.root })
  console.log(result.join('\n'))
}

const defaults = yargs => {
  yargs.option('input', {
    describe: 'CAR file input',
    alias: 'i'
  })
  yargs.option('root', {
    describe: 'Root CID to use in the given command',
    alias: 'r'
  })
}

const createOpts = yargs => {
  // TODO: implement targetSize
}

yargs(hideBin(process.argv))
  .command('create <json>', 'Create new database from JSON string map', createOpts, createCommand)
  .command('ls [start] [end]', 'List the keys in a database', defaults, lsCommand) 
  .demandCommand(1)
  .parse()
