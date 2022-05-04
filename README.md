# matrika

A next generation decentralized database.

In `matrika`, databases and indexes are merkle graphs (DAGs) implemented on
Prolly Trees (Probablistic B-Trees) in IPLD.

Data is written to CAR files that are pushed to web3.storage and made available
in IPFS. Optionally, these CAR files could be written to other IPFS nodes and Filecoin.

# CLI

The main interface at this time is the CLI. Commands are namespaced into the following categories:

* `kv`

## Key Value Store

The key value store is an append only log of changes to a map (implemented as a prolly tree).

It is an efficient key value store that scales to an indefinite size. Concurrent changes
between different actors can be reconciled and *most* conflicts automatically resolved.

```
cli.js <command>

Commands:
  cli.js kv-create <json>           Create new database from JSON string map
  cli.js kv-ls [start] [end]        List the keys in a database
  cli.js kv-get <key>               Read single key
  cli.js kv-set <key> <value-json>  Write single key

Options:
  --help     Show help                                                 [boolean]
  --version  Show version number                                       [boolean]
```

