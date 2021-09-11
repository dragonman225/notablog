import { FormattingMentionDate } from 'nast-types'

import { getPageIDFromPageURL } from './utils/notion'

interface Property {
  id: string
  type: string
  records: Map<Record, Cell>
}

interface Record {
  id: string
  propertyCellMap: Map<Property, Cell>
}

interface Cell {
  property: Property
  record: Record
}

interface Table {
  id: string
  properties: Property[]
  records: Record[]
}

export enum NPropertyType {
  Text = 'text',
  Checkbox = 'checkbox',
  Select = 'select',
  MultiSelect = 'multi_select',
  Date = 'date',
}

export type NSelectOption = {
  id: string
  color: Notion.Collection.ColumnPropertyOptionColor
  value: string
}

export class NProperty implements Property {
  id: string
  type: string
  records: Map<NRecord, NCell>

  name: string

  constructor(id: string, rawProperty: Notion.Collection.ColumnProperty) {
    this.id = id
    this.name = rawProperty.name
    this.type = ''
    this.records = new Map()
  }
}

export class NTextProperty extends NProperty {
  type: NPropertyType.Text

  constructor(id: string, rawProperty: Notion.Collection.ColumnProperty) {
    super(id, rawProperty)
    this.type = NPropertyType.Text
  }
}

export class NCheckboxProperty extends NProperty {
  type: NPropertyType.Checkbox

  constructor(id: string, rawProperty: Notion.Collection.ColumnProperty) {
    super(id, rawProperty)
    this.type = NPropertyType.Checkbox
  }
}

export class NSelectProperty extends NProperty {
  type: NPropertyType.Select
  options: NSelectOption[]

  constructor(id: string, rawProperty: Notion.Collection.ColumnProperty) {
    super(id, rawProperty)
    this.type = NPropertyType.Select
    this.options = rawProperty.options || []
  }
}

export class NMultiSelectProperty extends NProperty {
  type: NPropertyType.MultiSelect
  options: NSelectOption[]

  constructor(id: string, rawProperty: Notion.Collection.ColumnProperty) {
    super(id, rawProperty)
    this.type = NPropertyType.MultiSelect
    this.options = rawProperty.options || []
  }
}

export class NDateTimeProperty extends NProperty {
  type: NPropertyType.Date

  constructor(id: string, rawProperty: Notion.Collection.ColumnProperty) {
    super(id, rawProperty)
    this.type = NPropertyType.Date
  }
}

type NPropertyUnion =
  | NTextProperty
  | NCheckboxProperty
  | NSelectProperty
  | NMultiSelectProperty
  | NDateTimeProperty

type NCellOf<T extends NProperty> = T extends NTextProperty
  ? NTextCell
  : T extends NCheckboxProperty
  ? NCheckboxCell
  : T extends NSelectProperty
  ? NSelectCell
  : T extends NMultiSelectProperty
  ? NMultiSelectCell
  : T extends NDateTimeProperty
  ? NDateTimeCell
  : NCell

interface NPropertyCellMap extends Map<NProperty, NCell> {
  /** Call `get` with X type of `NProperty` returns X type of `NCell`. */
  get: <T extends NProperty>(property: T) => NCellOf<T> | undefined
}

interface NRecord extends Record {
  id: string
  propertyCellMap: NPropertyCellMap
  uri: NAST.URI
  title: NAST.SemanticString[]
  icon?: NAST.Emoji | NAST.PublicUrl
  cover?: NAST.PublicUrl
  coverPosition: number
  fullWidth: boolean
  createdTime: NAST.TimestampNumber
  lastEditedTime: NAST.TimestampNumber
}

class NRecord implements NRecord {
  constructor(rawPage: NAST.Page) {
    this.id = getPageIDFromPageURL(rawPage.uri)
    this.propertyCellMap = new Map()

    this.uri = rawPage.uri
    this.title = rawPage.title
    this.icon = rawPage.icon
    this.cover = rawPage.cover
    this.coverPosition = rawPage.coverPosition
    this.fullWidth = rawPage.fullWidth
    this.createdTime = rawPage.createdTime
    this.lastEditedTime = rawPage.lastEditedTime
  }
}

class NCell implements Cell {
  property: NProperty
  record: NRecord

  constructor(property: NProperty, record: NRecord) {
    this.property = property
    this.record = record
  }
}

export class NTextCell extends NCell {
  value: NAST.SemanticString[]

  constructor(
    property: NTextProperty,
    record: NRecord,
    rawValue: NAST.SemanticString[]
  ) {
    super(property, record)
    this.value = rawValue
  }
}

export class NCheckboxCell extends NCell {
  value: boolean

  constructor(
    property: NCheckboxProperty,
    record: NRecord,
    rawValue: NAST.SemanticString[]
  ) {
    super(property, record)
    this.value = rawValue ? rawValue[0][0] === 'Yes' : false
  }
}

export class NSelectCell extends NCell {
  value: NSelectOption | undefined

  constructor(
    property: NSelectProperty,
    record: NRecord,
    rawValue: NAST.SemanticString[]
  ) {
    super(property, record)
    const optionNames = rawValue ? rawValue[0][0].split(',') : []
    this.value = property.options.find(o => o.value === optionNames[0])
  }
}

export class NMultiSelectCell extends NCell {
  value: NSelectOption[]

  constructor(
    property: NMultiSelectProperty,
    record: NRecord,
    rawValue: NAST.SemanticString[]
  ) {
    super(property, record)
    const optionNames = rawValue ? rawValue[0][0].split(',') : []
    this.value = optionNames.reduce((result, optionName) => {
      const option = property.options.find(o => o.value === optionName)
      if (option) result.push(option)
      return result
    }, [] as NSelectOption[])
  }
}

export class NDateTimeCell extends NCell {
  value: NAST.DateTime | undefined

  constructor(
    property: NDateTimeProperty,
    record: NRecord,
    rawValue: NAST.SemanticString[]
  ) {
    super(property, record)
    /**
     * rawValue
     * [0]: SemanticString
     * [0][1]: FormattingAll[]
     * [0][1][0]: FormattingMentionDate
     * [0][1][0][1]: DateTime
     */
    const node = rawValue && rawValue[0]
    const attrs = node && node[1]
    const formattingDate = attrs && (attrs[0] as FormattingMentionDate)
    const dataTime = formattingDate && formattingDate[1]
    this.value = dataTime
  }
}

type NCellUnion =
  | NTextCell
  | NCheckboxCell
  | NSelectCell
  | NMultiSelectCell
  | NDateTimeCell

export class NTable implements Table {
  id: string
  properties: NPropertyUnion[]
  records: NRecord[]

  constructor(rawTable: NAST.Collection) {
    this.id = getPageIDFromPageURL(rawTable.uri)

    const rawTableColumnProps = rawTable.views[0].format.table_properties
    /**
     * Using rawTableColumnProps to initialize schema make the order of
     * properties match the order of columns in the UI.
     */
    if (rawTableColumnProps) {
      this.properties = rawTableColumnProps
        /** Filter out properties that do not exist in schema. */
        .filter(tableProperty => rawTable.schema[tableProperty.property])
        .map(tableProperty => {
          const propertyId = tableProperty.property
          const rawProperty = rawTable.schema[propertyId]
          return createNProperty(propertyId, rawProperty)
        })
    } else {
      this.properties = Object.entries(rawTable.schema).map(tuple => {
        const [propertyId, rawProperty] = tuple
        return createNProperty(propertyId, rawProperty)
      })
    }

    this.records = []
    rawTable.children.forEach(rawPage => {
      const record = new NRecord(rawPage)
      this.records.push(record)
      this.properties.forEach(property => {
        const rawPropertyValue = (rawPage.properties || {})[property.id]
        const cell = createNCell(property, record, rawPropertyValue)
        property.records.set(record, cell)
        record.propertyCellMap.set(property, cell)
      })
    })
  }

  /** Print the table structure so you can see what it looks like. */
  peek(): void {
    let head = ''
    for (let i = 0; i < this.properties.length; i++) {
      head += this.properties[i].constructor.name + ' '
    }
    console.log(head)
    console.log(''.padEnd(head.length, '-'))
    for (let i = 0; i < this.records.length; i++) {
      const record = this.records[i]
      let row = ''
      record.propertyCellMap.forEach((cell, property) => {
        row +=
          cell.constructor.name.padEnd(property.constructor.name.length) + ' '
      })
      row += '-> ' + record.constructor.name
      console.log(row)
    }
  }
}

function createNProperty(
  propertyId: Notion.Collection.ColumnID,
  rawProperty: Notion.Collection.ColumnProperty
) {
  switch (rawProperty.type) {
    case 'checkbox':
      return new NCheckboxProperty(propertyId, rawProperty)
    case 'select':
      return new NSelectProperty(propertyId, rawProperty)
    case 'multi_select':
      return new NMultiSelectProperty(propertyId, rawProperty)
    case 'date':
      return new NDateTimeProperty(propertyId, rawProperty)
    default:
      return new NTextProperty(propertyId, rawProperty)
  }
}

function createNCell(
  property: NPropertyUnion,
  record: NRecord,
  rawValue: NAST.SemanticString[]
): NCellUnion {
  switch (property.type) {
    case NPropertyType.Checkbox:
      return new NCheckboxCell(property, record, rawValue)
    case NPropertyType.Select:
      return new NSelectCell(property, record, rawValue)
    case NPropertyType.MultiSelect:
      return new NMultiSelectCell(property, record, rawValue)
    case NPropertyType.Date:
      return new NDateTimeCell(property, record, rawValue)
    default:
      return new NTextCell(property, record, rawValue)
  }
}
