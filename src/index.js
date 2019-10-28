const fs = require('fs')
const path = require('path')
const { NotionAgent } = require('notionapi-agent')
const TaskManager = require('@dnpr/task-manager')
const { copyDirSync } = require('@dnpr/fsutil')

const TemplateProvider = require('./template-provider')
const { parseTable } = require('./parse-table')
const { renderIndex } = require('./render-index')
const { renderPost } = require('./render-post')
const { log } = require('./utils')

const workDir = process.cwd()
const configPath = path.join(workDir, 'config.json')
const config = JSON.parse(fs.readFileSync(configPath, { encoding: 'utf-8' }))
const url = config.url
const theme = config.theme
const apiAgent = new NotionAgent({ suppressWarning: true, verbose: false })

const taskManagerOpts = {
  delay: 0,
  delayJitterMax: 0,
  parallelNum: 3,
  debug: false
}

/**
 * Originally for internal use. Planned to deprecate.
 */
const plugins = []

main()

async function main() {
  try {

    let startTime = Date.now()

    /** Init dir paths. */
    const cacheDir = path.join(workDir, 'source/notion_cache')
    if (!fs.existsSync(cacheDir)) {
      fs.mkdirSync(cacheDir, { recursive: true })
    }

    const themeDir = path.join(workDir, `themes/${theme}`)
    if (!fs.existsSync(themeDir)) {
      throw new Error(`Cannot find "${theme}" in themes/ folder`)
    }

    const outDir = path.join(workDir, 'public')
    if (!fs.existsSync(outDir)) {
      fs.mkdirSync(outDir, { recursive: true })
    }

    const tagDir = path.join(workDir, 'public/tag')
    if (!fs.existsSync(tagDir)) {
      fs.mkdirSync(tagDir, { recursive: true })
    }

    /** Copy theme assets. */
    log.info('Copy theme assets')
    let assetDir = path.join(themeDir, 'assets')
    copyDirSync(assetDir, outDir)

    /** Fetch Site Metadata. */
    log.info('Fetch Site Metadata')
    let siteMeta = await parseTable(url, apiAgent)

    /** Create TemplateProvider instance */
    let templateProvider = new TemplateProvider(themeDir)

    let renderIndexTask = {
      siteMeta,
      templateProvider,
      operations: {
        enablePlugin: true
      },
      plugins
    }

    /** Render index. */
    log.info('Render index')
    renderIndex(renderIndexTask)

    /** Generate blogpost-rendering tasks. */
    let postTotalCount = siteMeta.pages.length
    let postUpdatedCount = postTotalCount
    let postPublishedCount = siteMeta.pages.filter(page => page.publish).length
    let renderPostTasks = siteMeta.pages
      .map(post => {
        let cacheFileName = post.id.replace(/\/|\\/g, '') + '.json'
        let cacheFilePath = path.join(cacheDir, cacheFileName)

        let postUpdated
        if (fs.existsSync(cacheFilePath)) {
          let lastCacheTime = fs.statSync(cacheFilePath).mtimeMs
          postUpdated = post.lastEditedTime > lastCacheTime
          if (!postUpdated) postUpdatedCount -= 1
        } else {
          postUpdated = true
        }

        return {
          siteMeta,
          templateProvider,
          post: {
            ...post,
            cachePath: cacheFilePath
          },
          operations: {
            doFetchPage: postUpdated,
            enablePlugin: true
          },
          plugins
        }
      })
    log.info(`${postUpdatedCount} of ${postTotalCount} posts have been updated`)
    log.info(`${postPublishedCount} of ${postTotalCount} posts are published`)

    /** Fetch & render posts. */
    log.info('Fetch and render published posts')
    const tm = new TaskManager(renderPostTasks, renderPost, taskManagerOpts)
    tm.start()
    await tm.finish()

    let endTime = Date.now()
    let timeElapsed = (endTime - startTime) / 1000
    log.info(`Build complete in ${timeElapsed}s. Open public/index.html to preview`)

  } catch (error) {
    console.error(error)
  }
}