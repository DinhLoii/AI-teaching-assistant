import { Prisma } from '@prisma/client'
import { prisma } from './prisma.js'

type Model = {
  name: string
  dbName?: string | null
  fields: readonly { name: string; dbName?: string | null; kind: string; type: string; isList: boolean; isRequired: boolean }[]
}
type Column = { table_name: string; column_name: string; udt_name: string; is_nullable: string }

const compatibleTypes: Record<string, readonly string[]> = {
  String: ['text', 'varchar', 'bpchar', 'citext', 'uuid'],
  Int: ['int2', 'int4'], BigInt: ['int8'], Boolean: ['bool'],
  Decimal: ['numeric'], Float: ['float4', 'float8'],
  DateTime: ['timestamp', 'timestamptz', 'date', 'time', 'timetz'],
  Json: ['json', 'jsonb'], Bytes: ['bytea'],
}

/** Read-only compatibility check for a demo using a database created outside Migrate.
 * Does not certify migration history, constraints, indexes or historical data changes.
 */
export async function assertRuntimeSchema(db: any = prisma, models: readonly Model[] = Prisma.dmmf.datamodel.models) {
  const columns = await db.$queryRaw`
    SELECT table_name, column_name, udt_name, is_nullable
    FROM information_schema.columns
    WHERE table_schema = current_schema()
  ` as Column[]
  const existing = new Map(columns.map(c => [JSON.stringify([c.table_name, c.column_name]), c]))
  const errors: string[] = []
  let checked = 0
  for (const model of models) {
    for (const field of model.fields) {
      if (field.kind === 'object') continue
      const table = model.dbName || model.name, name = field.dbName || field.name
      const column = existing.get(JSON.stringify([table, name]))
      checked++
      if (!column) { errors.push(`${table}.${name}: missing`); continue }
      const allowed = compatibleTypes[field.type]
      if (!allowed) { errors.push(`${table}.${name}: unsupported type ${field.type}`); continue }
      const types = field.isList ? allowed.map(t => `_${t}`) : allowed
      if (!types.includes(column.udt_name)) errors.push(`${table}.${name}: incompatible type ${column.udt_name}`)
      if (field.isRequired && column.is_nullable !== 'NO') errors.push(`${table}.${name}: must be NOT NULL`)
    }
  }
  if (errors.length) throw new Error(`Database schema is incompatible (${errors.length} issues): ${errors.slice(0, 8).join('; ')}`)
  return { models: models.length, columns: checked }
}
