import { promises as fsPromises } from 'fs'
import path from 'path'
import visit from 'unist-util-visit'
import { getOnePageAsTree } from 'nast-util-from-notionapi'
import { renderToHTML } from 'nast-util-to-react'

import { toDashID } from './utils/notion'
import { log, objAccess } from './utils/misc'
import { RenderPostTask, SiteContext } from './types'

function createLinkTransformer(siteContext: SiteContext) {
  /** Get no dash page id. */
  function getPageIdFromUri(uri: string): string | undefined {
    return uri.split('/').pop()
  }

  /** Replace internal links for a node. */
  return function (node: NAST.Block, _index: number, parent: NAST.Block) {
    /** Skip root. */
    if (!parent) return

    /** Link to page. */
    if (node.type === 'page') {
      const pageId = getPageIdFromUri(node.uri)
      if (!pageId) return

      const page = siteContext.pages.find(page => page.id === pageId)
      if (!page) return

      log.debug(`Replace link: ${node.uri} -> ${page.url}`)
      node.uri = page.url

      return
    }

    /** Inline mention or link. */
    /** `node` may be any block with text, specifying text block here is 
        to eliminate type errors.  */
    const richTextStrs = (node as NAST.Text).title || []
    for (let i = 0; i < richTextStrs.length; i++) {
      const richTextStr = richTextStrs[i]

      /** Inline mention page. */
      if ('‣' === richTextStr[0] && 'p' === objAccess(richTextStr)(1)(0)(0)()) {
        const pageInline = objAccess(richTextStr)(1)(0)(1)()
        if (!pageInline) continue

        const pageId = getPageIdFromUri(pageInline.uri)
        if (!pageId) continue

        const page = siteContext.pages.find(page => page.id === pageId)
        if (page) {
          log.debug(`Replace link: ${pageInline.uri} -> ${page.url}`)
          pageInline.uri = page.url
        } else {
          const newLink = `https://www.notion.so/${pageId}`
          pageInline.uri = newLink
          log.debug(`Replace link: ${pageInline.uri} -> ${newLink}`)
        }

        continue
      }

      if (Array.isArray(richTextStr[1]))
        richTextStr[1].forEach(mark => {
          if ('a' === mark[0]) {
            /** Inline link to page or block. */
            /**
             * Link to a page:
             * '/65166b7333374374b13b040ca1599593'
             *
             * Link to a block in a page:
             * '/ec83369b2a9c438093478ddbd8da72e6#aa3f7c1be80d485499910685dee87ba9'
             *
             * Link to a page in a collection view, the page is opened in
             * preview mode (not supported):
             * '/595365eeed0845fb9f4d641b7b845726?v=a1cb648704784afea1d5cdfb8ac2e9f0&p=65166b7333374374b13b040ca1599593'
             */
            const toPath = mark[1]
            if (!toPath) return

            /** Ignore non-notion-internal links. */
            if (!toPath.startsWith('/')) return

            /** Ignore unsupported links. */
            if (toPath.includes('?')) {
              const newPath = `https://www.notion.so${toPath}`
              log.debug(`Replace link: ${toPath} -> ${newPath}`)
              mark[1] = newPath
              return
            }

            const ids = toPath.replace(/\//g, '').split('#')

            if (ids.length > 0) {
              const targetPage = ids[0]
              const targetBlock = ids[1]
              const pageInfo = siteContext.pages.find(
                page => page.id === targetPage
              )

              if (pageInfo) {
                /** The page is in the table. */
                const newLink = `${pageInfo.url}${
                  targetBlock ? '#https://www.notion.so/' + targetBlock : ''
                }`
                mark[1] = newLink
              } else {
                /** The page is not in the table. */
                const newLink = `https://www.notion.so${toPath}`
                mark[1] = newLink
              }

              log.debug(`Replace link: ${toPath} -> ${mark[1]}`)
              return
            }
          }
        })
    }

    return
  }
}

/**
 * Render a post.
 * @param task
 */
export async function renderPost(task: RenderPostTask): Promise<number> {
  const { doFetchPage, pageMetadata, siteContext } = task.data
  const { cache, notionAgent, renderer } = task.tools
  const config = task.config

  const pageID = toDashID(pageMetadata.id)
  let tree: NAST.Block

  /** Fetch page. */
  if (doFetchPage) {
    log.info(`Fetch data of page "${pageID}"`)

    tree = await getOnePageAsTree(pageID, notionAgent)
    /** Use internal links for pages in the table. */
    visit(tree, createLinkTransformer(siteContext))
    cache.set('notion', pageID, tree)

    log.info(`Cache of "${pageID}" is saved`)
  } else {
    log.info(`Read cache of page "${pageID}"`)

    const cachedTree = cache.get('notion', pageID)

    if (cachedTree != null) tree = cachedTree as NAST.Block
    else
      throw new Error(`\
Cache of page "${pageID}" is corrupted, run "notablog generate --fresh <path_to_starter>" to fix`)
  }

  /** Render with template. */
  if (pageMetadata.publish) {
    log.info(`Render published page "${pageID}"`)

    const outDir = config.outDir
    const outPath = path.join(outDir, pageMetadata.url)

    const contentHTML = renderToHTML(tree)
    const pageHTML = renderer.render(pageMetadata.template, {
      siteMeta: siteContext,
      post: {
        ...pageMetadata,
        contentHTML,
      },
    })

    await fsPromises.writeFile(outPath, pageHTML, { encoding: 'utf-8' })
    return 0
  } else {
    log.info(`Skip rendering of unpublished page "${pageID}"`)
    return 1
  }
}
