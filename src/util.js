const fs = require('fs')
const path = require('path')
const { Logger } = require('@dnpr/logger')

/**
 * Wrapper of console.log().
 */
const log = new Logger('notablog', {
  logLevel: typeof process.env.DEBUG_EN !== 'undefined' ? 'debug' : 'info',
  useColor: typeof process.env.NO_COLOR !== 'undefined' ? false : true
})

/**
 * Failsafe JSON.parse() wrapper.
 * @param {*} str - Payload to parse.
 * @returns {Object} Parsed object when success, undefined when fail.
 */
function parseJSON(str) {
  try {
    return JSON.parse(str)
  } catch (error) {
    return void 0
  }
}

/**
 * @typedef {Object} NotablogConfig
 * @property {string} url - URL of a Notion table.
 * @property {string} theme - Name of a theme.
 * @property {string} browser - Path to a browser executable.
 */

/**
 * Read and parse the JSON config file.
 * @param {string} workDir - A valid Notablog starter directory.
 * @returns {NotablogConfig}
 */
function getConfig(workDir) {
  const cPath = path.join(workDir, 'config.json')
  const cFile = fs.readFileSync(cPath, { encoding: 'utf-8' })
  try {
    const config = JSON.parse(cFile)
    return config
  } catch (error) {
    console.error(error)
    throw new Error(`Fail to parse config at ${cPath}`)
  }
}

/**
 * Get the path of output dir and ensure it is available.
 * @param {string} workDir
 * @returns {string} 
 */
function outDir(workDir) {
  const outDir = path.join(workDir, 'public')
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true })
  }
  return outDir
}

module.exports = { log, parseJSON, getConfig, outDir }