const fs = require('fs')
const path = require('path')
const NotionAgent = require('notionapi-agent')
const downloadPageAsTree = require('notionast-util-from-notionapi')
const { toHTML } = require('notionast-util-to-html')
const Sqrl = require('squirrelly')

const { log } = require('./utils')

module.exports = {
  renderPost
}

async function renderPost(task) {
  if (task != null) {
    const pageID = task.pageID
    const title = task.title

    /** Download page. */
    log(`Fetch page ${pageID}.`)
    let nast = await downloadPageAsTree(pageID, new NotionAgent({ suppressWarning: true }))
    let html = toHTML(nast)

    /** Render with template. */
    log(`Render page ${pageID}.`)
    const workDir = process.cwd()
    const outDir = path.join(workDir, 'public')
    const postTemplatePath = path.join(workDir, 'layout/post.html')
    const postTemplate = fs.readFileSync(postTemplatePath, { encoding: 'utf-8' })
    const postPath = path.join(outDir, `${pageID}.html`)
    Sqrl.autoEscaping(false)
    const post = Sqrl.Render(postTemplate, {
      postTitle: title,
      content: html
    })
    fs.writeFileSync(postPath, post, { encoding: 'utf-8' })
  }
}