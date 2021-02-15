import fs from 'fs'
import fsPromises = fs.promises
import path from 'path'
import { getOnePageAsTree } from 'nast-util-from-notionapi'
import { renderToHTML } from 'nast-util-to-react'
const Sqrl = require('squirrelly')

import { log } from './util'
import { toDashID } from './notion-utils'

/**
 * Render a post.
 * @param {RenderPostTask} task
 */
export async function renderPost(task) {

  const siteMeta = task.data.siteMeta
  const templateProvider = task.tools.templateProvider
  const notion = task.tools.notion
  const cache = task.tools.cache
  const page = task.data.page
  const config = task.config

  const pageID = toDashID(page.id)

  let nast, contentHTML

  /** Fetch page. */
  if (config.doFetchPage) {
    log.info(`Fetch data of page "${pageID}"`)
    nast = await getOnePageAsTree(pageID, notion)
    cache.set('notion', pageID, nast)
    log.info(`Cache of "${pageID}" is saved`)
  } else {
    log.info(`Read cache of page "${pageID}"`)
    const _nast = cache.get('notion', pageID)
    if (_nast != null) nast = _nast
    else throw new Error(`\
Cache of page "${pageID}" is corrupted, delete source/notion_cache to rebuild`)
  }

  /** Render with template. */
  if (page.publish) {
    log.info(`Render page "${pageID}"`)
    contentHTML = renderToHTML(nast)
    const outDir = config.outDir
    const postPath = path.join(outDir, page.url)

    Sqrl.autoEscaping(false)
    const html = Sqrl.Render(templateProvider.get(page.template).content, {
      siteMeta,
      post: {
        ...page,
        contentHTML
      }
    })
    await fsPromises.writeFile(postPath, html, { encoding: 'utf-8' })
    return 0
  } else {
    log.info(`Skip rendering of unpublished page "${pageID}"`)
    return 1
  }

}