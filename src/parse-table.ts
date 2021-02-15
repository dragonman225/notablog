import { createAgent } from 'notionapi-agent'
import { getOnePageAsTree } from 'nast-util-from-notionapi'
import { renderToHTML } from 'nast-util-to-react'
import { SemanticString } from 'nast-types'
import { getPageIDFromCollectionPageURL } from './notion-utils'
import { log, objAccess } from './utils'
import { SiteContext, PageMetadata } from './types'

/**
 * Extract interested data for blog generation from a Notion table.
 */
export async function parseTable(
  collectionPageURL: string, 
  notionAgent: ReturnType<typeof createAgent>
): Promise<SiteContext> {
  const pageID = getPageIDFromCollectionPageURL(collectionPageURL)
  const pageCollection = (await getOnePageAsTree(pageID, notionAgent)) as NAST.CollectionPage

  /**
   * Create map for property_name (column name) -> property_id (column id).
   * Notion uses random strings to identify columns because it allows users 
   * to create multiple columns that have the same name.
   */
  const mapColNameToId = {}
  for (const [key, value] of Object.entries(pageCollection.schema)) {
    const colId = key
    const colName = value.name
    if (mapColNameToId[colName]) {
      log.warn(`Duplicate column name "${colName}", \
column with id "${colId}" is used`)
    } else {
      mapColNameToId[colName] = key
    }
  }

  /** 
   * Check if table has all required columns.
   * 
   * - `title` is required by Notion.
   */
  const requiredCols =
    ['tags', 'publish', 'inMenu', 'inList', 'template', 'url', 'description', 'date']
  for (const colName of requiredCols) {
    if (typeof pageCollection.schema[mapColNameToId[colName]] === 'undefined') {
      throw new Error(`Required column "${colName}" is missing in table.`)
    }
  }

  /**
   * Create map for tag -> color
   */
  const mapTagToColor = {}
  const classPrefix = '';
  (pageCollection.schema[mapColNameToId['tags']].options || []).forEach(tag => {
    mapTagToColor[tag.value] = `${classPrefix}${tag.color}`
  })

  /** Remove empty rows */
  const validPages = pageCollection.children
    .filter(page => !!page.properties)

  const pageMetadatas: PageMetadata[] = validPages
    .map(row => {
      return {
        id: (row.uri.split('/').pop() || '').split('?')[0],
        icon: row.icon,
        iconHTML: renderIconToHTML(row.icon),
        cover: row.cover,
        title: row.title,
        tags: getMultiSelect(row, mapColNameToId['tags']).map(tag => {
          return {
            value: tag,
            color: mapTagToColor[tag]
          }
        }),
        publish: getCheckbox(row, mapColNameToId['publish']),
        inMenu: getCheckbox(row, mapColNameToId['inMenu']),
        inList: getCheckbox(row, mapColNameToId['inList']),
        template: getSingleSelect(row, mapColNameToId['template']),
        url: getRealUrl(row, mapColNameToId['url']),
        description: getTextRaw(row, mapColNameToId['description']),
        descriptionPlain: getTextPlain(row, mapColNameToId['description']),
        descriptionHTML: getTextHTML(row, mapColNameToId['description']),
        date: getDateRaw(row, mapColNameToId['date']),
        dateString: getDateString(row, mapColNameToId['date']),
        createdTime: row.createdTime,
        lastEditedTime: row.lastEditedTime
      }
    })

  const siteContext = {
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
    pages: pageMetadatas.sort((later, former) => {
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
  siteContext.pages.forEach(page => {
    page.tags.forEach(tag => {
      if (!siteContext.tagMap.has(tag.value)) {
        siteContext.tagMap.set(tag.value, [page])
      } else {
        siteContext.tagMap.get(tag.value).push(page)
      }
    })
  })

  return siteContext
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
function getCheckbox(page: NAST.Page, propId: string) {
  const prop = objAccess(page)('properties')(propId)()
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
  const prop = page.properties[propId]
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
  const prop = page.properties[propId]
  if (prop) return renderStyledStringToTXT(prop)
  else return ''
}

function renderStyledStringToTXT(styledStringArr: SemanticString[] | undefined): string {
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
  const prop = page.properties[propId]
  if (prop) return renderStyledStringToHTML(prop)
  else return ''
}

function renderStyledStringToHTML(styledStringArr: SemanticString[] | undefined): string {
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
  const prop = page.properties[propId]
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
  const options = getMultiSelect(page, propId)
  if (options.length > 0) return options[0]
  else return ''
}

/**
 * Get raw string of a date-typed property
 * @param {Nast.Page} page
 * @param {string} propId
 * @returns {string | undefined} YYYY-MM-DD
 */
function getDateRaw(page: NAST.Page, propId: string): string | undefined {
  return objAccess(page)('properties')(propId)(0)(1)(0)(1)('start_date')()
}

/**
 * Get formatted string from a date-typed property
 * @param {Nast.Page} page
 * @param {string} propId
 * @returns {string | undefined} WWW, MMM DD, YYY
 */
function getDateString(page, propId) {
  const dateRaw = getDateRaw(page, propId)
  if (dateRaw) {
    const options = { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' }
    const dateString = (new Date(dateRaw)).toLocaleDateString('en-US', options)
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
  const wantUrl = getTextPlain(page, propId)
  const safeUrl = getSafeUrl(wantUrl)
  const realUrl = (safeUrl.length > 0) ?
    `${safeUrl}.html` : `${page.uri.split('/').pop().split('?')[0]}.html`
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