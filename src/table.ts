import { numToOrder } from './utils/misc'

interface PropertyValue {
  type: Notion.Collection.ColumnPropertyType
  value: any
  groupKeys?: string[]
}

function parsePropertyValue(
  column: Notion.Collection.ColumnProperty,
  columnId: Notion.Collection.ColumnID,
  row: NAST.Page
): PropertyValue {
  /**
   * A common place to get the column value.
   * However, some types of column values are at other places.
   */
  const data = (row.properties || {})[columnId]
  switch (column.type) {
    case 'title':
      return {
        type: column.type,
        value: row.title,
      }
    case 'checkbox':
      return {
        type: column.type,
        value: data ? data[0][0] === 'Yes' : false,
        groupKeys: [data ? (data[0][0] === 'Yes').toString() : 'false'],
      }
    case 'select':
    case 'multi_select': {
      const optionNames = data ? data[0][0].split(',') : []
      const optionVals = optionNames.map(optionName => {
        const option = (column.options || []).find(o => o.value === optionName)
        if (!option) {
          console.log(`Select option "${optionName}" is \
not found on property "${columnId}:${column.name}".`)
          return {
            color: 'default',
            value: optionName,
          }
        } else {
          return {
            color: option.color,
            value: option.value,
          }
        }
      })
      return {
        type: column.type,
        value: optionVals,
        groupKeys: optionVals.map(o => o.value),
      }
    }
    // TODO: NAST currently do not have the following 2 information.
    case 'created_by':
    case 'last_edited_by':
      return {
        type: column.type,
        value: 'Someone',
      }
    case 'created_time':
      return {
        type: column.type,
        value: row.createdTime,
      }
    case 'last_edited_time':
      return {
        type: column.type,
        value: row.lastEditedTime,
      }
    default:
      return {
        type: column.type,
        value: (row.properties || {})[columnId],
      }
  }
}

export interface ISchema {
  idPropertyMap: {
    [key in Notion.Collection.ColumnID]: Notion.Collection.ColumnProperty
  }
  nameIdsMap: {
    [key in Notion.Collection.ColumnProperty['name']]: Notion.Collection.ColumnID[]
  }
  lookupIdsByName: (name: string) => Notion.Collection.ColumnID[]
}

export interface IRecord {
  uri: NAST.URI
  title: NAST.SemanticString[]
  icon?: NAST.Emoji | NAST.PublicUrl
  cover?: NAST.PublicUrl
  coverPosition: number
  fullWidth: boolean
  schema: Schema
  getPropertyValueById: (
    id: Notion.Collection.ColumnID
  ) => PropertyValue | undefined
  getPropertyValuesByName: (
    name: Notion.Collection.ColumnProperty['name']
  ) => PropertyValue[]
}

export interface ITable {
  uri: NAST.URI
  name: NAST.SemanticString[]
  description?: NAST.SemanticString[]
  icon?: NAST.Emoji | NAST.PublicUrl
  cover?: NAST.PublicUrl
  coverPosition: number
  schema: Schema
  records: Record[]
}

export class Schema implements ISchema {
  idPropertyMap: {
    [key in Notion.Collection.ColumnID]: Notion.Collection.ColumnProperty
  }
  nameIdsMap: {
    [key in Notion.Collection.ColumnProperty['name']]: Notion.Collection.ColumnID[]
  }

  constructor(rawSchema: NAST.Collection['schema']) {
    this.idPropertyMap = rawSchema
    this.nameIdsMap = Object.entries(rawSchema).reduce((map, pair) => {
      const propertyId = pair[0]
      const propertyName = pair[1].name
      if (map[propertyName] && Array.isArray(map[propertyName])) {
        map[propertyName].push(propertyId)
      } else {
        map[propertyName] = [propertyId]
      }
      return map
    }, {} as { [key: string]: string[] })
  }

  lookupIdsByName(name: string) {
    const ids = this.nameIdsMap[name]
    if (ids) return ids
    else return []
  }
}

export class Record implements IRecord {
  uri: NAST.URI
  title: NAST.SemanticString[]
  icon?: NAST.Emoji | NAST.PublicUrl
  cover?: NAST.PublicUrl
  coverPosition: number
  fullWidth: boolean
  schema: Schema
  private _rawRecord: NAST.Page

  constructor(rawRecord: NAST.Page, schema: Schema) {
    this.uri = rawRecord.uri
    this.title = rawRecord.title
    this.icon = rawRecord.icon
    this.cover = rawRecord.cover
    this.coverPosition = rawRecord.coverPosition
    this.fullWidth = rawRecord.fullWidth
    this.schema = schema
    this._rawRecord = rawRecord
  }

  /** A property has an unique id. */
  getPropertyValueById(id: Notion.Collection.ColumnID) {
    const property = this.schema.idPropertyMap[id]
    if (property) return parsePropertyValue(property, id, this._rawRecord)
    else return undefined
  }

  /** Properties may have the same name. */
  getPropertyValuesByName(name: Notion.Collection.ColumnProperty['name']) {
    const propertyIds = this.schema.lookupIdsByName(name)
    const propertyValues = propertyIds.reduce((pvs, id) => {
      const pv = this.getPropertyValueById(id)
      if (pv) pvs.push(pv)
      return pvs
    }, [] as PropertyValue[])
    return propertyValues
  }
}

export class Table implements ITable {
  uri: NAST.URI
  name: NAST.SemanticString[]
  description?: NAST.SemanticString[]
  icon?: NAST.Emoji | NAST.PublicUrl
  cover?: NAST.PublicUrl
  coverPosition: number
  schema: Schema
  records: Record[]

  constructor(rawTable: NAST.CollectionPage) {
    this.uri = rawTable.uri
    this.name = rawTable.name
    this.description = rawTable.description
    this.icon = rawTable.icon
    this.cover = rawTable.cover
    this.coverPosition = rawTable.coverPosition
    this.schema = new Schema(rawTable.schema)
    this.records = rawTable.children.map(
      record => new Record(record, this.schema)
    )
  }

  recordsGroupByProperty(propertyName: string, which = 1) {
    const groups: { [key: string]: Record[] } = {}
    const ungrouped: Record[] = []
    const propertyIds = this.schema.lookupIdsByName(propertyName)
    const selectedPropertyId = propertyIds[which - 1]
    if (!selectedPropertyId) {
      console.log(`\
Cannot find property of name "${propertyName}" that is the \
${numToOrder(which)} of properties having the name in schema.
Return all records as ungrouped.`)
      return { groups, ungrouped: this.records }
    }

    for (let i = 0; i < this.records.length; i++) {
      const record = this.records[i]
      const propertyValue = record.getPropertyValueById(selectedPropertyId)
      if (!propertyValue) {
        console.log(`\
Cannot get property value on record \
"${record.title.reduce((str, ss) => (str += ss[0]), '')}", \
but the requested property exists in schema.
Is the table broken?`)
        ungrouped.push(record)
        continue
      }

      const groupKeys = propertyValue.groupKeys
      if (!groupKeys) {
        console.log(`\
Cannot group records by property name "${propertyName}" of type \
"${propertyValue.type}".`)
        ungrouped.push(record)
        continue
      }

      groupKeys.forEach(key => {
        if (groups[key]) {
          groups[key].push(record)
        } else {
          groups[key] = [record]
        }
      })
    }

    return {
      groups,
      ungrouped,
    }
  }
}
