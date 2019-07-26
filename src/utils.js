module.exports = { log, parseJSON }

/**
 * Wrapper of console.log().
 */
function log() {
  let args = Array.from(arguments)
  args.unshift('(notablog)')
  console.log.apply(null, args)
}

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