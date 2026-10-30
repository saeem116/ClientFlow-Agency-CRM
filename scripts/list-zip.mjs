import { execSync } from 'child_process'

const zipPath = process.argv[2] || 'E:/Agency_CRM/clientflow/clientflow-submission.zip'
const list = execSync(`zipinfo -1 "${zipPath}"`, { encoding: 'utf8' })
const files = list.trim().split('\n').filter(Boolean)
console.log(`Total: ${files.length}`)
console.log('--- All entries ---')
files.forEach(f => console.log(f))