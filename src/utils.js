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

module.exports = { log, parseJSON }