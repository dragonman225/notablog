const fs = require('fs')
const path = require('path')
const NotionAgent = require('notionapi-agent')
const TaskManager = require('@dnpr/task-manager')
const { copyDirSync } = require('@dnpr/fsutil')

const { parseTable } = require('./src/parse-table')
const { renderIndex } = require('./src/render-index')
const { renderPost } = require('./src/render-post')
const { log } = require('./src/utils')

/** Internal Plugins */
const transformDate = require('./src/plugins/timestamp-to-date')
const renderDescription = require('./src/plugins/render-description')
const renderIcon = require('./src/plugins/render-icon')

const workDir = process.cwd()
const configPath = path.join(workDir, 'config.json')
const config = JSON.parse(fs.readFileSync(configPath, { encoding: 'utf-8' }))
const url = config.url
const theme = config.theme
const apiAgent = new NotionAgent({ suppressWarning: true })

const taskManagerOpts = {
  delay: 0,
  delayJitterMax: 0,
  parallelNum: 3,
  debug: false
}

const plugins = [
  transformDate,
  renderDescription,
  renderIcon
]

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
      throw new Error(`No theme "${theme}" in themes/ folder.`)
    }

    const outDir = path.join(workDir, 'public')
    if (!fs.existsSync(outDir)) {
      fs.mkdirSync(outDir, { recursive: true })
    }

    /** Copy assets. */
    log('Copy assets.')
    let assetDir = path.join(themeDir, 'source')
    copyDirSync(assetDir, outDir)

    /** Fetch Site Metadata. */
    log('Fetch Site Metadata.')
    let siteMeta = await parseTable(url, apiAgent)

    /** Generate index-rendering task. */
    let indexTemplatePath = path.join(themeDir, 'layout/index.html')
    let indexTemplate = fs.readFileSync(indexTemplatePath, { encoding: 'utf-8' })

    let renderIndexTask = {
      siteMeta,
      index: {
        /** Only published pages should appear in index */
        posts: siteMeta.pages.filter(page => {
          return page.publish
        }),
        template: indexTemplate,
        output: 'index.html'
      },
      operations: {
        enablePlugin: true
      },
      plugins
    }

    /** Render index. */
    log('Render index.')
    renderIndex(renderIndexTask)

    /** Generate blogpost-rendering tasks. */
    let postTemplatePath = path.join(themeDir, 'layout/post.html')
    let postTemplate = fs.readFileSync(postTemplatePath, { encoding: 'utf-8' })

    let postTotalCount = siteMeta.pages.length
    let postUpdatedCount = postTotalCount
    let renderPostTasks = siteMeta.pages.map(post => {
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
        post: {
          ...post,
          cachePath: cacheFilePath,
          template: postTemplate
        },
        operations: {
          doFetchPage: postUpdated,
          enablePlugin: true
        },
        plugins
      }
    })
    log(`${postUpdatedCount} of ${postTotalCount} posts have been updated.`)

    /** Fetch & render posts. */
    log('Fetch and render posts.')
    const tm = new TaskManager(renderPostTasks, renderPost, taskManagerOpts)
    tm.start()
    await tm.finish()

    let endTime = Date.now()
    let timeElapsed = (endTime - startTime) / 1000
    log(`Build complete in ${timeElapsed}s`)

  } catch (error) {
    console.error(error)
  }
}