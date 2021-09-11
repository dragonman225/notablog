import fs from 'fs'
import path from 'path'

import { log } from './utils/misc'
import { RenderIndexTask } from './types'

export function renderIndex(task: RenderIndexTask): void {
  const siteMeta = task.data.siteContext
  const { renderer } = task.tools
  const config = task.config

  const outDir = config.outDir
  const indexPath = path.join(outDir, 'index.html')

  log.info('Render home page')
  const html = renderer.render('index', { siteMeta })
  fs.writeFileSync(indexPath, html, { encoding: 'utf-8' })

  siteMeta.tagMap.forEach((pageMetas, tagVal) => {
    log.info(`Render tag "${tagVal}"`)
    const html = renderer.render('tag', {
      siteMeta,
      tagName: tagVal,
      pages: pageMetas,
    })
    fs.writeFileSync(`${config.tagDir}/${tagVal}.html`, html, {
      encoding: 'utf-8',
    })
  })
}
