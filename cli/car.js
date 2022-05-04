import { CarReader } from '@ipld/car'
import { readFileSync } from 'fs'
import { decode } from '../src/ipld.js'
import { fixargv, readDefaults, mayberun } from './utils.js'
import yargs from 'yargs'

const infoCommand = async argv => {
  const reader = await CarReader.fromBytes(readFileSync(argv.inputfile))
  const [ cid ] = await reader.getRoots()
  const { bytes } = await reader.get(cid)
  const head = await decode(bytes, cid)
  console.log({ root: cid, head: head.value })
}

const commands = () => {
  const argv = fixargv()
  yargs(argv)
    .command('car-info <inputfile>', 'Read a CAR file and print basic info', readDefaults, infoCommand)
    .demandCommand(1)
    .parse()
}

export default commands

mayberun(process, import.meta, commands)
