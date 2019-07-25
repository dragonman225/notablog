module.exports = { log }

/**
 * Wrapper of console.log().
 */
function log() {
  let args = Array.from(arguments)
  args.unshift('(notablog)')
  console.log.apply(null, args)
}