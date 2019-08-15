const { getOnePageAsTree } = require('../../notajs/packages/nast-util-from-notionapi')
const { toHTMLInternal } = require('nast-util-to-html')

const { getPageIDFromNotionDatabaseURL } = require('./notion-utils')
const { log } = require('./utils')

// const COLUMN_NAMES = {
//   tags: 'tags',
//   publish: 'publish',
//   inMenu: 'inMenu',
//   inList: 'inList',
//   template: 'template',
//   url: 'url',
//   description: 'description',
//   date: 'date'
// }

module.exports = {
  parseTable
}

/**
 * Extract interested data for blog generation from a Notion table.
 * @param {string} notionDatabaseURL 
 * @param {NotionAgent} notionAgent 
 */
async function parseTable(notionDatabaseURL, notionAgent) {
  let pageID = getPageIDFromNotionDatabaseURL(notionDatabaseURL)
  let pageCollection = (await getOnePageAsTree(pageID, notionAgent))

  /**
   * Create map for property_name -> property_id.
   * Notion uses random strings in schema to prevent probable repeated
   * property names defined by user.
   */
  let schemaMap = {}
  for (let [key, value] of Object.entries(pageCollection.schema)) {
    let propertyId = key
    let propertyString = value.name
    if (schemaMap[propertyString]) {
      log(`Duplicate column name "${propertyString}", column with id "${propertyId}" is used`)
    } else {
      schemaMap[propertyString] = key
    }
  }

  /** 
   * Check if table has all required columns.
   * 
   * - `title` is required by Notion.
   * - `date` is get from `created_time` which every block must have.
   */
  let requiredProps =
    ['publish', 'tags', 'url', 'description', 'inMenu', 'inList']
  for (let prop of requiredProps) {
    if (typeof pageCollection.schema[schemaMap[prop]] === 'undefined') {
      throw new Error(`Required column "${prop}" is missing in table.`)
    }
  }

  /**
   * Create map for tag -> color
   */
  let tagColorMap = {}
  let classPrefix = 'tag-'
  pageCollection.schema[schemaMap['tags']].options.forEach(tag => {
    tagColorMap[tag.value] = `${classPrefix}${tag.color}`
  })

  /** Remove empty rows */
  let pagesValidAndPublished = pageCollection.blocks
    .filter(page => {
      return page.properties != null
    })

  /**
   * Convert page structure
   */
  /**
   * @typedef {Object} Page
   * @property {string} id
   * @property {string} icon
   * @property {string} cover
   * @property {string} title
   * @property {Tag[]} tags
   * @property {boolean} publish
   * @property {boolean} inMenu
   * @property {boolean} inList
   * @property {string} template
   * @property {string} url
   * @property {Notion.StyledString[]} description
   * @property {string} descriptionPlain
   * @property {string} descriptionHTML
   * @property {string} date
   * @property {string} dateString
   * @property {number} createdTime
   * @property {number} lastEditedTime
   */
  /**
   * @type {Page[]}
   */
  let pagesConverted = pagesValidAndPublished
    .map(row => {
      return {
        id: row.id,
        icon: row.icon,
        cover: row.cover,
        title: row.title,
        /**
         * Select Option
         * 
         * Raw tags looks like this:
         * { '<option_id>': [ [ 'css,web' ] ] }
         * 
         * @typedef SelectOption
         * @property {string} value 
         * @property {string} color
         */
        /**
         * @type {SelectOption}
         */
        tags: getMultiSelect(row, schemaMap['tags']).map(tag => {
          return {
            value: tag,
            color: tagColorMap[tag]
          }
        }),
        publish: getCheckbox(row, schemaMap['publish']),
        inMenu: getCheckbox(row, schemaMap['inMenu']),
        inList: getCheckbox(row, schemaMap['inList']),
        template: getSingleSelect(row, schemaMap['template']),
        url: getRealUrl(row, schemaMap['url']),
        description: getTextRaw(row, schemaMap['description']),
        descriptionPlain: getTextPlain(row, schemaMap['description']),
        descriptionHTML: getTextHTML(row, schemaMap['description']),
        date: getDateRaw(row, schemaMap['date']),
        dateString: getDateString(row, schemaMap['date']),
        createdTime: row.createdTime,
        lastEditedTime: row.lastEditedTime
      }
    })

  /**
   * The site metadata
   * @typedef {Object} NotablogMetadata
   * @property {string} icon
   * @property {string} cover
   * @property {string} title
   * @property {Notion.StyledString[]} description
   * @property {Page[]} pages
   */
  /**
   * @type {NotablogMetadata}
   */
  let siteMeta = {
    icon: pageCollection.icon,
    cover: pageCollection.cover,
    title: pageCollection.name,
    description: pageCollection.description,
    descriptionPlain: renderToPlainText(pageCollection.description),
    descriptionHTML: renderToHTML(pageCollection.description),
    /**
     * Sort the pages so that the most recent post is at the top.
     */
    pages: pagesConverted.sort((later, former) => {
      if (later.date > former.date) return -1
      else if (later.date < former.date) return 1
      else return 0
    })
  }

  return siteMeta
}

/**
 * Utility functions to get useful values from properties of Nast.Page
 */

/**
 * Get value of a checkbox-typed property
 * @param {Nast.Page} page
 * @param {string} propId
 * @returns {boolean}
 */
function getCheckbox(page, propId) {
  let prop = page.properties[propId]
  if (prop) return prop[0][0] === 'Yes'
  else return false
}

/**
 * Get raw value of a text-typed property
 * @param {Nast.Page} page
 * @param {string} propId
 * @returns {Notion.StyledString[]}
 */
function getTextRaw(page, propId) {
  let prop = page.properties[propId]
  if (prop) return prop
  else return []
}

/**
 * Get plain string from a text-typed property
 * @param {Nast.Page} page
 * @param {string} propId
 * @returns {string}
 */
function getTextPlain(page, propId) {
  let prop = page.properties[propId]
  if (prop) return renderToPlainText(prop)
  else return ''
}

function renderToPlainText(styledStringArr) {
  if (styledStringArr) return styledStringArr.map(str => str[0]).join('')
  else return ''
}

/**
 * Get HTML string from a text-typed property
 * @param {Nast.Page} page
 * @param {string} propId
 * @returns {string}
 */
function getTextHTML(page, propId) {
  let prop = page.properties[propId]
  if (prop) return renderToHTML(prop)
  else return ''
}

function renderToHTML(styledStringArr) {
  if (styledStringArr) return toHTMLInternal.renderTitle(styledStringArr)
  else return ''
}

/**
 * Get option array of a multi-select-typed property
 * @param {Nast.Page} page
 * @param {string} propId
 * @returns {string[]}
 */
function getMultiSelect(page, propId) {
  let prop = page.properties[propId]
  if (prop) return prop[0][0].split(',')
  else return []
}

/**
 * Get option of a single-select-typed property
 * @param {Nast.Page} page
 * @param {string} propId
 * @returns {string}
 */
function getSingleSelect(page, propId) {
  let options = getMultiSelect(page, propId)
  if (options.length > 0) return options[0]
  else return ''
}

/**
 * Get raw string of a date-typed property
 * @param {Nast.Page} page
 * @param {string} propId
 * @returns {string | undefined} YYYY-MM-DD
 */
function getDateRaw(page, propId) {
  let prop = page.properties[propId]
  if (prop) {
    let dateString = prop[0][1][0][1].start_date
    return dateString
  } else return undefined
}

/**
 * Get formatted string from a date-typed property
 * @param {Nast.Page} page
 * @param {string} propId
 * @returns {string | undefined} WWW, MMM DD, YYY
 */
function getDateString(page, propId) {
  let dateRaw = getDateRaw(page, propId)
  if (dateRaw) {
    let options = { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' }
    let dateString = (new Date(dateRaw)).toLocaleDateString('en-US', options)
    return dateString
  } else return undefined
}

/**
 * Infer real URL that will be used as filename.
 * @param {Nast.Page} page
 * @param {string} propId
 * @returns {string}
 */
function getRealUrl(page, propId) {
  let wantUrl = getTextPlain(page, propId)
  let safeUrl = getSafeUrl(wantUrl)
  let realUrl = (safeUrl.length > 0) ? `${safeUrl}.html` : `${page.id}.html`
  return realUrl
}

/**
 * Remove "/" and "\" since they can't be in filename
 * @param {string} url
 * @returns {string}
 */
function getSafeUrl(url) {
  return url.replace(/\/|\\/g, '')
}