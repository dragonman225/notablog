import fs from 'fs'
import fsPromises = fs.promises
import path from 'path'
import { getOnePageAsTree } from 'nast-util-from-notionapi'
import { renderToHTML } from 'nast-util-to-react'
// eslint-disable-next-line @typescript-eslint/no-var-requires
const Sqrl = require('squirrelly')

import { log } from './utils'
import { toDashID } from './notion-utils'
import { RenderPostTask } from './types'

/**
 * Render a post.
 * @param task
 */
export async function renderPost(task: RenderPostTask) {

  const siteContext = task.data.siteContext
  const templateProvider = task.tools.templateProvider
  const notionAgent = task.tools.notionAgent
  const cache = task.tools.cache
  const pageMetadata = task.data.pageMetadata
  const config = task.config

  const pageID = toDashID(pageMetadata.id)

  let nast: NAST.Block

  /** Fetch page. */
  if (config.doFetchPage) {
    log.info(`Fetch data of page "${pageID}"`)
    nast = await getOnePageAsTree(pageID, notionAgent)
    cache.set('notion', pageID, nast)
    log.info(`Cache of "${pageID}" is saved`)
  } else {
    log.info(`Read cache of page "${pageID}"`)
    const _nast = cache.get('notion', pageID)
    if (_nast != null) nast = _nast as NAST.Block
    else throw new Error(`\
Cache of page "${pageID}" is corrupted, delete cache/ to rebuild`)
  }

  /** Render with template. */
  if (pageMetadata.publish) {
    log.info(`Render page "${pageID}"`)
    const contentHTML = renderToHTML(nast)
    const outDir = config.outDir
    const postPath = path.join(outDir, pageMetadata.url)

    Sqrl.autoEscaping(false)
    const html = Sqrl.Render(
      templateProvider.get(pageMetadata.template).content, 
      {
        siteMeta: siteContext,
        post: {
          ...pageMetadata,
          contentHTML
        }
      }
    )
    await fsPromises.writeFile(postPath, html, { encoding: 'utf-8' })
    return 0
  } else {
    log.info(`Skip rendering of unpublished page "${pageID}"`)
    return 1
  }

}