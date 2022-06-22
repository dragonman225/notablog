import { createAgent } from 'notionapi-agent'
import { getOnePageAsTree } from 'nast-util-from-notionapi'
import { renderToHTML } from 'nast-util-to-react'
import { SemanticString } from 'nast-types'

import { Config } from './config'
import {
  NCheckboxProperty,
  NDateTimeProperty,
  NMultiSelectProperty,
  NProperty,
  NPropertyType,
  NSelectProperty,
  NTable,
  NTextProperty,
} from './ntable'
import { getPageIDFromCollectionPageURL } from './utils/notion'
import { SiteContext, PageMetadata } from './types'

/** Extract interested data for blog generation from a Notion table. */
export async function parseTable(
  collectionPageURL: string,
  notionAgent: ReturnType<typeof createAgent>,
  config: Config
): Promise<SiteContext> {
  const pageID = getPageIDFromCollectionPageURL(collectionPageURL)
  const pageCollection = (await getOnePageAsTree(
    pageID,
    notionAgent
  )) as NAST.CollectionPage
  const table = new NTable(pageCollection)

  const propertyAccessMap = new Map<string, NProperty>()
  table.properties.forEach(property => {
    propertyAccessMap.set(property.name, property)
  })

  /**
   * Check if the Notion table has all required properties.
   *
   * Note: Some information like `title` exists on the page itself, so we
   * don't need to check.
   */
  const requiredPropertyDescriptors = [
    ['tags', NPropertyType.MultiSelect],
    ['publish', NPropertyType.Checkbox],
    ['inMenu', NPropertyType.Checkbox],
    ['inList', NPropertyType.Checkbox],
    ['template', NPropertyType.Select],
    ['url', NPropertyType.Text],
    ['description', NPropertyType.Text],
    ['date', NPropertyType.Date],
  ]
  for (const descriptor of requiredPropertyDescriptors) {
    const property = propertyAccessMap.get(descriptor[0])
    if (!property) {
      throw new Error(
        `Required property "${descriptor[0]}" is missing in the Notion table.`
      )
    } else if (property.type !== descriptor[1]) {
      throw new Error(
        `The type of property "${descriptor[0]}" should be "${descriptor[1]}", but got "${property.type}".`
      )
    }
  }

  const pages: PageMetadata[] = table.records.map(record => {
    return {
      id: extractIdFromUri(record.uri),
      iconUrl: getIconUrl(record.icon),
      cover: record.cover,
      title: renderNodesToText(record.title),
      tags:
        record.propertyCellMap.get(
          propertyAccessMap.get('tags') as NMultiSelectProperty
        )?.value || [],
      publish:
        record.propertyCellMap.get(
          propertyAccessMap.get('publish') as NCheckboxProperty
        )?.value || false,
      inMenu:
        record.propertyCellMap.get(
          propertyAccessMap.get('inMenu') as NCheckboxProperty
        )?.value || false,
      inList:
        record.propertyCellMap.get(
          propertyAccessMap.get('inList') as NCheckboxProperty
        )?.value || false,
      template:
        record.propertyCellMap.get(
          propertyAccessMap.get('template') as NSelectProperty
        )?.value?.value || '',
      url: getPageUrl(
        record.uri,
        renderNodesToText(
          record.propertyCellMap.get(
            propertyAccessMap.get('url') as NTextProperty
          )?.value
        ),
        renderNodesToText(
          record.propertyCellMap.get(
            propertyAccessMap.get('title') as NTextProperty
          )?.value
        ),
        config
      ),
      description: record.propertyCellMap.get(
        propertyAccessMap.get('description') as NTextProperty
      )?.value,
      descriptionPlain: renderNodesToText(
        record.propertyCellMap.get(
          propertyAccessMap.get('description') as NTextProperty
        )?.value
      ),
      descriptionHTML: renderNodesToHtml(
        record.propertyCellMap.get(
          propertyAccessMap.get('description') as NTextProperty
        )?.value
      ),
      date: record.propertyCellMap.get(
        propertyAccessMap.get('date') as NDateTimeProperty
      )?.value?.start_date,
      dateString: getDateString(
        record.propertyCellMap.get(
          propertyAccessMap.get('date') as NDateTimeProperty
        )?.value?.start_date,
        config
      ),
      createdTime: record.createdTime,
      lastEditedTime: record.lastEditedTime,
    }
  })

  const siteContext: SiteContext = {
    iconUrl: getIconUrl(pageCollection.icon),
    cover: pageCollection.cover,
    title: renderNodesToText(pageCollection.name),
    description: pageCollection.description,
    descriptionPlain: renderNodesToText(pageCollection.description),
    descriptionHTML: renderNodesToHtml(pageCollection.description),
    pages: pages.sort(dateDescending),
    tagMap: new Map(),
  }

  /** Create tagMap. */
  siteContext.pages.forEach(page => {
    page.tags.forEach(tag => {
      const pagesForTag = siteContext.tagMap.get(tag.value)
      if (!pagesForTag) {
        siteContext.tagMap.set(tag.value, [page])
      } else {
        pagesForTag.push(page)
      }
    })
  })

  return siteContext
}

/**
 * Utility functions to get useful values from properties of Nast.Page
 */

function renderNodesToText(
  styledStringArr: SemanticString[] | undefined
): string {
  if (styledStringArr) return styledStringArr.map(str => str[0]).join('')
  else return ''
}

function renderNodesToHtml(
  styledStringArr: SemanticString[] | undefined
): string {
  if (styledStringArr) return renderToHTML(styledStringArr)
  else return ''
}

/**
 * Get formatted string from a date-typed property
 * @param {string | undefined} dateRaw
 * @param {Config} config
 * @returns {string | undefined} WWW, MMM DD, YYY
 */
function getDateString(
  dateRaw: string | undefined,
  config: Config
): string | undefined {
  if (dateRaw) {
    const options: Parameters<Date['toLocaleDateString']>['1'] = {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }
    const locales = config.get('locales') || 'en-US'
    const dateString = new Date(dateRaw).toLocaleDateString(locales, options)
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
 * url, generate a slug from the title (if `autoSlug` is `true` in `Config`)
 * and use it along with page id as the filename,
 * otherwise just use the page id as is.
 * @param {string} pageUri
 * @param {string} customSlug
 * @param {string} title
 * @param {Config} config
 * @returns {string}
 */
function getPageUrl(
  pageUri: string,
  customSlug: string,
  title: string,
  config: Config
): string {
  let url = getSafeUrl(customSlug)
  if (url.length === 0) {
    if (config.get('autoSlug')) {
      const partialId = extractIdFromUri(pageUri).slice(0, 6)
      url = `${getSlugFromTitle(title)}-${partialId}`
    } else {
      url = `${extractIdFromUri(pageUri)}`
    }
  }
  return `${url}.html`
}

/**
 * Returns a formatted slug from a title by stripping non-alphanumeric chars, and
 * replacing spaces with dashes.
 * @param {string} title
 * @returns {string}
 */
function getSlugFromTitle(title: string): string {
  return title
    .replaceAll(/[\s\\/]/g, '-')
    .replaceAll(/[^\w-]/g, '')
    .toLowerCase()
}

/**
 * Remove "/" and "\" since they can't be in filename
 * @param {string} url
 * @returns {string}
 */
function getSafeUrl(url: string): string {
  return url.replace(/\/|\\/g, '')
}

/**
 * @param icon May be an URL, an emoji character, or undefined.
 */
function getIconUrl(icon?: string): string | undefined {
  if (!icon) return undefined
  if (/^http/.test(icon)) {
    return icon
  } else {
    return `data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text text-anchor=%22middle%22 dominant-baseline=%22middle%22 x=%2250%22 y=%2255%22 font-size=%2280%22>${icon}</text></svg>`
  }
}

function extractIdFromUri(uri: string): string {
  return (uri.split('/').pop() || '').split('?')[0]
}

/** A comparator to sort `PageMetadata` by date descending. */
function dateDescending(later: PageMetadata, former: PageMetadata) {
  const laterTimestamp = later.date ? new Date(later.date).getTime() : 0
  const formerTimestamp = former.date ? new Date(former.date).getTime() : 0
  if (laterTimestamp > formerTimestamp) return -1
  else if (laterTimestamp < formerTimestamp) return 1
  else return 0
}
