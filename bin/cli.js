#!/usr/bin/env node

const { parseArgs, parseFlagVal } = require('@dnpr/cli')
const { Logger } = require('@dnpr/logger')
const { generate } = require('..')

function printHelp() {
  console.log(`\
Usage: notablog <path_to_a_notablog_starter>

Options:
  -v, --verbose  Print more messages for debugging.
  -h, --help     Print this help.`)
}

async function main() {
  const { args, flags } = parseArgs(process.argv)
  const verbose = parseFlagVal(flags, '(-v|--verbose)', 'boolean', false)
  const help = parseFlagVal(flags, '(-h|--help)', 'boolean', false)
  const workDir = args[0]
  const logger = new Logger('notablog-cli', {
    logLevel: verbose ? 'debug' : 'info',
    useColor: process.env.NO_COLOR ? false : true
  })

  if (help || !workDir) {
    printHelp()
    process.exit()
  }

  try {
    const startTime = Date.now()
    await generate({
      concurrency: 3,
      verbose,
      workDir
    })
    const endTime = Date.now()
    const timeElapsed = (endTime - startTime) / 1000
    logger.info(`\
Generation complete in ${timeElapsed}s. Open public/index.html to preview`)
  } catch (error) {
    console.error(error)
  }
}

main()