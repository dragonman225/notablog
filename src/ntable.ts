import { getPageIDFromPageURL } from './notion-utils'
import { objAccess } from './utils'

type SelectOption = {
  id: string
  color: Notion.Collection.ColumnPropertyOptionColor
  value: string
}

interface Property {
  id: string
  type: string
  records: Map<Record, Cell>
}

interface Record {
  id: string
  properties: Map<Property, Cell>
}

interface Cell {
  property: Property
  record: Record
}

interface Table {
  id: string
  schema: Property[]
  records: Record[]
}

class NProperty implements Property {
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

class NTextProperty extends NProperty {
  type: 'text'

  constructor(id: string, rawProperty: Notion.Collection.ColumnProperty) {
    super(id, rawProperty)
    this.type = 'text'
  }
}

class NCheckboxProperty extends NProperty {
  type: 'checkbox'

  constructor(id: string, rawProperty: Notion.Collection.ColumnProperty) {
    super(id, rawProperty)
    this.type = 'checkbox'
  }
}

class NSelectProperty extends NProperty {
  type: 'select'
  options: SelectOption[]

  constructor(id: string, rawProperty: Notion.Collection.ColumnProperty) {
    super(id, rawProperty)
    this.type = 'select'
    this.options = rawProperty.options || []
  }
}

class NMultiSelectProperty extends NProperty {
  type: 'multi_select'
  options: SelectOption[]

  constructor(id: string, rawProperty: Notion.Collection.ColumnProperty) {
    super(id, rawProperty)
    this.type = 'multi_select'
    this.options = rawProperty.options || []
  }
}

class NDateTimeProperty extends NProperty {
  type: 'date'

  constructor(id: string, rawProperty: Notion.Collection.ColumnProperty) {
    super(id, rawProperty)
    this.type = 'date'
  }
}

type NPropertyUnion =
  NTextProperty | NCheckboxProperty | NSelectProperty |
  NMultiSelectProperty | NDateTimeProperty

class NRecord implements Record {
  id: string
  properties: Map<NPropertyUnion, NCellUnion>

  uri: NAST.URI
  title: NAST.SemanticString[]
  icon?: NAST.Emoji | NAST.PublicUrl
  cover?: NAST.PublicUrl
  coverPosition: number
  fullWidth: boolean

  constructor(rawPage: NAST.Page) {
    this.id = getPageIDFromPageURL(rawPage.uri)
    this.properties = new Map()

    this.uri = rawPage.uri
    this.title = rawPage.title
    this.icon = rawPage.icon
    this.cover = rawPage.cover
    this.coverPosition = rawPage.coverPosition
    this.fullWidth = rawPage.fullWidth
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

class NTextCell extends NCell {
  value: NAST.SemanticString[]

  constructor(property: NTextProperty, record: NRecord,
    rawValue: NAST.SemanticString[]) {
    super(property, record)
    this.value = rawValue
  }
}

class NCheckboxCell extends NCell {
  value: boolean

  constructor(property: NCheckboxProperty, record: NRecord,
    rawValue: NAST.SemanticString[]) {
    super(property, record)
    this.value = rawValue ? rawValue[0][0] === 'Yes' : false
  }
}

class NSelectCell extends NCell {
  value: SelectOption | undefined

  constructor(property: NSelectProperty, record: NRecord,
    rawValue: NAST.SemanticString[]) {
    super(property, record)
    const optionNames = rawValue ? rawValue[0][0].split(',') : []
    this.value = property.options.find(o => o.value === optionNames[0])
  }
}

class NMultiSelectCell extends NCell {
  value: SelectOption[]

  constructor(property: NMultiSelectProperty, record: NRecord,
    rawValue: NAST.SemanticString[]) {
    super(property, record)
    const optionNames = rawValue ? rawValue[0][0].split(',') : []
    this.value = optionNames.reduce((result, optionName) => {
      const option = property.options.find(o => o.value === optionName)
      if (option) result.push(option)
      return result
    }, [] as SelectOption[])
  }
}

class NDateTimeCell extends NCell {
  value: NAST.DateTime | undefined

  constructor(property: NDateTimeProperty, record: NRecord,
    rawValue: NAST.SemanticString[]) {
    super(property, record)
    /**
     * rawValue
     * [0]: SemanticString
     * [0][1]: FormattingAll[]
     * [0][1][0]: FormattingMentionDate
     * [0][1][0][1]: DateTime
     */
    this.value = objAccess(rawValue)(0)(1)(0)(1)()
  }
}

type NCellUnion =
  NTextCell | NCheckboxCell | NSelectCell | NMultiSelectCell |
  NDateTimeCell

export class NTable implements Table {
  id: string
  schema: NPropertyUnion[]
  records: NRecord[]

  constructor(rawTable: NAST.Collection) {
    this.id = getPageIDFromPageURL(rawTable.uri)

    const rawTableColumnProps = rawTable.views[0].format.table_properties
    /**
     * Using rawTableColumnProps to initialize schema make the order of 
     * properties match the order of columns in the UI.
     */
    if (rawTableColumnProps) {
      this.schema = rawTableColumnProps
        /** Filter out properties that do not exist in schema. */
        .filter(tableProperty => rawTable.schema[tableProperty.property])
        .map(tableProperty => {
          const propertyId = tableProperty.property
          const rawProperty = rawTable.schema[propertyId]
          return createNProperty(propertyId, rawProperty)
        })
    } else {
      this.schema = Object.entries(rawTable.schema).map(tuple => {
        const [propertyId, rawProperty] = tuple
        return createNProperty(propertyId, rawProperty)
      })
    }

    this.records = []
    rawTable.children.forEach(rawPage => {
      const record = new NRecord(rawPage)
      this.records.push(record)
      this.schema.forEach(property => {
        const rawPropertyValue = (rawPage.properties || {})[property.id]
        const cell = createNCell(property, record, rawPropertyValue)
        property.records.set(record, cell)
        record.properties.set(property, cell)
      })
    })
  }

  /** Print the table structure so you can see what it looks like. */
  peekStructure() {
    let head = ''
    for (let i = 0; i < this.schema.length; i++) {
      head += this.schema[i].constructor.name + ' '
    }
    console.log(head)
    console.log(''.padEnd(head.length, '-'))
    for (let i = 0; i < this.records.length; i++) {
      const record = this.records[i]
      let row = ''
      record.properties.forEach((cell, property) => {
        row += cell.constructor.name
          .padEnd(property.constructor.name.length) + ' '
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
    case 'checkbox':
      return new NCheckboxCell(property, record, rawValue)
    case 'select':
      return new NSelectCell(property, record, rawValue)
    case 'multi_select':
      return new NMultiSelectCell(property, record, rawValue)
    case 'date':
      return new NDateTimeCell(property, record, rawValue)
    default:
      return new NTextCell(property, record, rawValue)
  }
}