import { PrismaClient } from '@prisma/client'
const p = new PrismaClient()

async function fixConstraints() {
    console.log('Fixing DB constraints (using ALTER TABLE DROP CONSTRAINT)...')

    // 1. Drop old Semester_Code_key as CONSTRAINT
    try {
        await p.$executeRawUnsafe(`
      ALTER TABLE [dbo].[Semester] DROP CONSTRAINT IF EXISTS [Semester_Code_key]
    `)
        console.log('[1/2] Semester_Code_key: dropped OK')
    } catch (e) {
        console.error('[1/2] Semester_Code_key ERROR:', e.message)
    }

    // 2. Drop old Class_ClassCode_key as CONSTRAINT  
    try {
        await p.$executeRawUnsafe(`
      ALTER TABLE [dbo].[Class] DROP CONSTRAINT IF EXISTS [Class_ClassCode_key]
    `)
        console.log('[2/2] Class_ClassCode_key: dropped OK')
    } catch (e) {
        console.error('[2/2] Class_ClassCode_key ERROR:', e.message)
    }

    // 3. Verify final state
    const semIndexes = await p.$queryRawUnsafe("SELECT name, is_unique FROM sys.indexes WHERE object_id = OBJECT_ID('[dbo].[Semester]') ORDER BY name")
    console.log('\n=== Semester indexes after fix ===')
    semIndexes.forEach(x => console.log(' -', x.name, '(unique:', x.is_unique + ')'))

    const clsIndexes = await p.$queryRawUnsafe("SELECT name, is_unique FROM sys.indexes WHERE object_id = OBJECT_ID('[dbo].[Class]') ORDER BY name")
    console.log('\n=== Class indexes after fix ===')
    clsIndexes.forEach(x => console.log(' -', x.name, '(unique:', x.is_unique + ')'))

    await p.$disconnect()
    console.log('\nDone!')
}

fixConstraints().catch(e => { console.error('FATAL:', e); process.exit(1) })
