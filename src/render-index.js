const fs = require('fs')
const path = require('path')
const Sqrl = require('squirrelly')

const { log } = require('./utils')

module.exports = {
  renderIndex
}

function renderIndex(task) {
  const siteMeta = task.siteMeta
  const templateProvider = task.templateProvider
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
            siteMeta
          },
          options: plugin.options
        })
      else
        log(`Plugin ${plugin.name} is in wrong format, skipped.`)
    })
  }

  const workDir = process.cwd()
  const outDir = path.join(workDir, 'public')
  const indexPath = path.join(outDir, 'index.html')
  
  Sqrl.autoEscaping(false)
  const html = Sqrl.Render(templateProvider.get('index'), {
    siteMeta
  })
  fs.writeFileSync(indexPath, html, { encoding: 'utf-8' })
}