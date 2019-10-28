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
  log.info('Run beforeRender plugins on index')
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
        log.warn(`Plugin ${plugin.name} is in wrong format, skipped`)
    })
  }

  const workDir = process.cwd()
  const outDir = path.join(workDir, 'public')
  const indexPath = path.join(outDir, 'index.html')

  Sqrl.autoEscaping(false)

  log.info('Rendering home page')
  const html = Sqrl.Render(templateProvider.get('index'), {
    siteMeta
  })
  fs.writeFileSync(indexPath, html, { encoding: 'utf-8' })

  siteMeta.tagMap.forEach((pageMetas, tagVal) => {
    log.info(`Rendering tag: ${tagVal}`)
    const html = Sqrl.Render(templateProvider.get('tag'), {
      siteMeta,
      tag: {
        value: tagVal,
        pageMetas
      }
    })
    fs.writeFileSync(`${outDir}/tag/${tagVal}.html`, html, { encoding: 'utf-8' })
  })
}