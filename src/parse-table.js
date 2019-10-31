const { getOnePageAsTree } = require('nast-util-from-notionapi')
const { renderToHTML } = require('nast-util-to-html')

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
      log.warn(`Duplicate column name "${propertyString}", column with id "${propertyId}" is used`)
    } else {
      schemaMap[propertyString] = key
    }
  }

  /** 
   * Check if table has all required columns.
   * 
   * - `title` is required by Notion.
   */
  let requiredProps =
    ['tags', 'publish', 'inMenu', 'inList', 'template', 'url', 'description', 'date']
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
  let pagesValid = pageCollection.blocks
    .filter(page => {
      return page.properties != null
    })

  /**
   * Select Option
   * @typedef {Object} SelectOption
   * @property {string} value 
   * @property {string} color
   */
  /**
   * Metadata of a page
   * @typedef {Object} PageMetadata
   * @property {string} id
   * @property {string} icon
   * @property {string} iconHTML
   * @property {string} cover
   * @property {string} title
   * @property {SelectOption[]} tags
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
   * @type {PageMetadata[]}
   */
  let pagesConverted = pagesValid
    .map(row => {
      return {
        id: row.id,
        icon: row.icon,
        iconHTML: renderIconToHTML(row.icon),
        cover: row.cover,
        title: row.title,
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
   * @typedef {Object} SiteMetadata
   * @property {string} icon
   * @property {string} iconHTML
   * @property {string} cover
   * @property {string} title
   * @property {Notion.StyledString[]} description
   * @property {string} descriptionPlain
   * @property {string} descriptionHTML
   * @property {PageMetadata[]} pages
   * @property {Map<string, PageMetadata[]>} tagMap
   */
  /**
   * @type {SiteMetadata}
   */
  let siteMeta = {
    icon: pageCollection.icon,
    iconHTML: renderIconToHTML(pageCollection.icon),
    cover: pageCollection.cover,
    title: pageCollection.name,
    description: pageCollection.description,
    descriptionPlain: renderStyledStringToTXT(pageCollection.description),
    descriptionHTML: renderStyledStringToHTML(pageCollection.description),
    /**
     * Sort the pages so that the most recent post is at the top.
     */
    pages: pagesConverted.sort((later, former) => {
      const laterTimestamp = later.date
        ? (new Date(later.date)).getTime() : 0
      const formerTimestamp = former.date
        ? (new Date(former.date)).getTime() : 0
      if (laterTimestamp > formerTimestamp) return -1
      else if (laterTimestamp < formerTimestamp) return 1
      else return 0
    }),
    tagMap: new Map()
  }

  /**
   * Create tagMap
   */
  siteMeta.pages.forEach(page => {
    page.tags.forEach(tag => {
      if (!siteMeta.tagMap.has(tag.value)) {
        siteMeta.tagMap.set(tag.value, [page])
      } else {
        siteMeta.tagMap.get(tag.value).push(page)
      }
    })
  })

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
  if (prop) return renderStyledStringToTXT(prop)
  else return ''
}

function renderStyledStringToTXT(styledStringArr) {
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
  if (prop) return renderStyledStringToHTML(prop)
  else return ''
}

function renderStyledStringToHTML(styledStringArr) {
  if (styledStringArr) return renderToHTML(styledStringArr)
  else return ''
}

/**
 * Get option array of a multi-select-typed property
 * 
 * Raw options look like this:
 * { '<propId>': [ [ 'css,web' ] ] }
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
 * TODO: Use encodeURLComponent to completely eliminate XSS.
 * 
 * Determine the string that will be used as the filename of the generated 
 * HTML and as the URL to link in other pages.
 * 
 * First, `/` and `\` are removed since they can't exist in file path.
 * Second, if the escaped url is a empty string or user doesn't specify an
 * url, use page id as the url.
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

/**
 * If the icon is an url, wrap it with `<img>`.
 * @param {string} icon 
 */
function renderIconToHTML(icon) {
  const re = /^http/
  if (re.test(icon)) {
    return `<span><img class="inline-img-icon" src="${icon}"></span>`
  } else {
    return icon ? `<span>${icon}</span>` : ''
  }
}