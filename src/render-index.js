const fs = require('fs')
const path = require('path')
const Sqrl = require('squirrelly')

const { log } = require('./utils')

module.exports = {
  renderIndex
}

function renderIndex(task) {
  const siteMetadata = task.siteMetadata
  const index = task.index
  const operations = task.operations
  const plugins = task.plugins

  /** Run `beforeRender` plugins. */
  log('Run beforeRender plugins on index.')
  if (operations.enablePlugin) {
    plugins.forEach(plugin => {
      if (typeof plugin.func === 'function')
        plugin.func.call({
          pageType: 'index',
          context: {
            siteMetadata, index
          },
          options: plugin.options
        })
      else
        log(`Plugin ${plugin.name} is not a function, skipped.`)
    })
  }

  const workDir = process.cwd()
  const outDir = path.join(workDir, 'public')
  const indexPath = path.join(outDir, 'index.html')

  Sqrl.autoEscaping(false)
  const html = Sqrl.Render(index.template, {
    siteMetadata,
    index
  })
  fs.writeFileSync(indexPath, html, { encoding: 'utf-8' })
}