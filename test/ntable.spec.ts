import { createAgent } from 'notionapi-agent'
import { getOnePageAsTree } from 'nast-util-from-notionapi'
import { getPageIDFromCollectionPageURL } from '../src/utils/notion'
import { Table } from '../src/table'
import { NTable } from '../src/ntable'

async function main() {
  try {
    const pageId = getPageIDFromCollectionPageURL(
      'https://www.notion.so/595365eeed0845fb9f4d641b7b845726?v=a1cb648704784afea1d5cdfb8ac2e9f0'
    )
    const collectionPage = (await getOnePageAsTree(
      pageId,
      createAgent()
    )) as NAST.CollectionPage
    const table = new Table(collectionPage)
    const table2 = new NTable(collectionPage)
    table.records.forEach(record => {
      console.log(record.title)
      console.log(record.getPropertyValuesByName('Tag'))
      console.dir(record.getPropertyValuesByName('tags'), { depth: 100 })
    })
    console.dir(table.recordsGroupByProperty('Tag'), { depth: 2 })
    console.dir(table.recordsGroupByProperty('tags', 2), { depth: 2 })
    console.dir(table.recordsGroupByProperty('tags'), { depth: 2 })
    console.dir(table.recordsGroupByProperty('title'), { depth: 2 })
    console.dir(table.recordsGroupByProperty('publish'), { depth: 2 })
    console.dir(table.recordsGroupByProperty('template'), { depth: 2 })
    console.dir(table2.properties, { depth: 2 })
    table2.records.forEach(record => {
      console.dir(
        (record.propertyCellMap.get(table2.properties[8]) || {}).value
      )
    })
    table2.peek()
  } catch (error) {
    console.error(error)
  }
}

main()
