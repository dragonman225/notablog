const fs = require('fs')
const path = require('path')
const Sqrl = require('squirrelly')

const { log } = require('./utils')

module.exports = {
  renderIndex
}

function renderIndex(task) {
  const siteMeta = task.data.siteMeta
  const templateProvider = task.tools.templateProvider
  const config = task.config

  const outDir = config.outDir
  const indexPath = path.join(outDir, 'index.html')

  Sqrl.autoEscaping(false)

  log.info('Render home page')
  const html = Sqrl.Render(templateProvider.get('index'), {
    siteMeta
  })
  fs.writeFileSync(indexPath, html, { encoding: 'utf-8' })

  siteMeta.tagMap.forEach((pageMetas, tagVal) => {
    log.info(`Render tag "${tagVal}"`)
    const html = Sqrl.Render(templateProvider.get('tag'), {
      siteMeta,
      tagName: tagVal,
      pages: pageMetas
    })
    fs.writeFileSync(`${config.tagDir}/${tagVal}.html`, html, { encoding: 'utf-8' })
  })
}