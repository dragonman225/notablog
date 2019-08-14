const { getOnePageAsTree } = require('../../notajs/packages/nast-util-from-notionapi')
const { toHTMLInternal } = require('nast-util-to-html')

const { getPageIDFromNotionDatabaseURL } = require('./notion-utils')
const { log } = require('./utils')

const COLUMN_NAMES = {
  tags: 'tags',
  publish: 'publish',
  inMenu: 'inMenu',
  inList: 'inList',
  url: 'url',
  description: 'description',
  date: 'date'
}

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

  /** Get custom url pages */
  let pagesWithCustomUrl = pagesValidAndPublished
    .filter(page => {
      /** "url" property must exist with length > 0 */
      let urlProp = page.properties[schemaMap['url']]
      if (urlProp != null) return urlProp[0][0].length > 0
      else return false
    })

  /** Create map for pageId -> url */
  let idUrlMap = {}
  pagesWithCustomUrl.forEach(page => {
    /** Remove "/" and "\" since they can't be in filename */
    idUrlMap[page.id] =
      page.properties[schemaMap['url']][0][0].replace(/\/|\\/g, '')
  })

  /**
   * Convert page structure
   */
  /**
   * @typedef {Object} Page
   * @property {string} id
   * @property {string} title
   * @property {Tag[]} tags
   * @property {string} icon
   * @property {string} cover
   * @property {StyledString[]} description
   * @property {number} createdTime
   * @property {number} lastEditedTime
   * @property {string} url
   * @property {boolean} inList
   * @property {boolean} inMenu
   * @property {boolean} publish
   */
  /**
   * @type {Page[]}
   */
  let pagesConverted = pagesValidAndPublished
    .map(row => {
      return {
        id: row.id,
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
        icon: row.icon,
        cover: row.cover,
        description: getTextRaw(row, schemaMap['description']),
        descriptionPlain: getTextPlain(row, schemaMap['description']),
        descriptionHTML: getTextHTML(row, schemaMap['description']),
        createdTime: row.createdTime,
        lastEditedTime: row.lastEditedTime,
        url: idUrlMap[row.id] ? `${idUrlMap[row.id]}.html` : `${row.id}.html`,
        inList: getCheckbox(row, schemaMap['inList']),
        inMenu: getCheckbox(row, schemaMap['inMenu']),
        publish: getCheckbox(row, schemaMap['publish'])
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
    pages: pagesConverted.sort((post1, post2) => {
      if (post1.createdTime > post2.createdTime) return -1
      else if (post1.createdTime < post2.createdTime) return 1
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