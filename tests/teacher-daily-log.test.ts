import { readFileSync } from 'node:fs'
import ts from 'typescript'
import { describe, expect, it } from 'vitest'

type MockElement = { value: string; textContent: string; innerHTML: string }
type MockDocument = { getElementById: (id: string) => MockElement | null }
type MockResponse = { ok: boolean; json: () => Promise<unknown> }
type MockRequestInit = { headers?: Record<string, string> }
type MockFetch = (url: string, init?: MockRequestInit) => Promise<MockResponse>
type DailyLogLoader = () => Promise<void>

const html = readFileSync(new URL('../frontend/index.html', import.meta.url), 'utf8')
const applicationScript = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)]
  .map((match) => match[1] ?? '')
  .find((script) => script.includes('async function loadTeacherDailyLogs'))

if (!applicationScript) throw new Error('Skrip Daily Log tidak ditemui dalam frontend/index.html')

const sourceFile = ts.createSourceFile('frontend/index.js', applicationScript, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS)

function getFunctionSource(name: string) {
  let declaration: ts.FunctionDeclaration | undefined

  const visit = (node: ts.Node) => {
    if (ts.isFunctionDeclaration(node) && node.name?.text === name) declaration = node
    ts.forEachChild(node, visit)
  }

  visit(sourceFile)
  if (!declaration) throw new Error(`Fungsi ${name} tidak ditemui dalam skrip Daily Log`)
  return declaration.getText(sourceFile)
}

const createDailyLogLoader = new Function(
  'document',
  'fetch',
  'currentToken',
  `const escapeHtml = ${getFunctionSource('escapeHtml')};
   const formatDate = ${getFunctionSource('formatDate')};
   let dailyLogRequest = 0;
   return ${getFunctionSource('loadTeacherDailyLogs')};`,
) as (document: MockDocument, fetcher: MockFetch, token: string) => DailyLogLoader

function createDocument(classId: string, date: string) {
  const createElement = (value = ''): MockElement => {
    let textContent = ''
    return {
      value,
      get textContent() {
        return textContent
      },
      set textContent(nextValue: string) {
        textContent = String(nextValue)
      },
      innerHTML: '',
    }
  }
  const elements = new Map<string, MockElement>([
    ['dailyLogClassSelect', createElement(classId)],
    ['dailyLogDate', createElement(date)],
    ['dailyLogStudentList', createElement()],
    ['dailyLogClassName', createElement()],
    ['dailyLogSelectedDate', createElement()],
    ['dailyLogTotal', createElement()],
    ['dailyLogCompleted', createElement()],
    ['dailyLogNotCompleted', createElement()],
  ])

  return {
    elements,
    getElementById(id: string) {
      return elements.get(id) ?? null
    },
  }
}

describe('teacher daily-log frontend', () => {
  it('uses one shared class/date filter and renders a table card for each student', async () => {
    const sectionStart = html.indexOf('<div id="tabTeacherDailyLogs"')
    const sectionEnd = html.indexOf('<!-- TAB 3:', sectionStart)
    const dailyLogMarkup = html.slice(sectionStart, sectionEnd)
    expect([...dailyLogMarkup.matchAll(/id="dailyLogDate"/g)]).toHaveLength(1)
    expect([...dailyLogMarkup.matchAll(/id="dailyLogClassSelect"/g)]).toHaveLength(1)
    expect(dailyLogMarkup).toContain('<select id="dailyLogClassSelect" onchange="loadTeacherDailyLogs()"')
    expect(dailyLogMarkup).toContain('<input id="dailyLogDate" type="date" onchange="loadTeacherDailyLogs()"')

    const document = createDocument('12', '2026-11-05')
    const requests: Array<{ url: string; init?: MockRequestInit }> = []
    const responseData = {
      success: true,
      data: {
        class: { id: 12, name: 'Kelas Amanah' },
        date: '2026-11-05',
        summary: { total: 2, completed: 1, notCompleted: 1 },
        students: [
          {
            studentUserId: 41,
            studentIdNum: 'M-041',
            fullName: 'Aina <script>alert(1)</script>',
            gender: 'P',
            status: 'completed',
            log: {
              id: 1,
              logDate: '2026-11-05',
              warmupCompleted: true,
              curlUpReps: 12,
              cardioDurationMinutes: 8,
              cardioPulseOrReps: 74,
              pushUpReps: 9,
              sitReachCm: 18,
              notes: 'Catatan <b>bagus</b>',
              createdAt: '2026-11-05T09:00:00.000Z',
            },
          },
          {
            studentUserId: 42,
            studentIdNum: 'M-042',
            fullName: 'Badrul',
            gender: 'L',
            status: 'not_completed',
            log: null,
          },
        ],
      },
    }
    const fetcher: MockFetch = async (url, init) => {
      requests.push({ url, init })
      return { ok: true, json: async () => responseData }
    }

    await createDailyLogLoader(document, fetcher, 'teacher-test-token')()

    expect(requests).toHaveLength(1)
    expect(requests[0]?.url).toBe('/api/teacher/classes/12/daily-logs?date=2026-11-05')
    expect(requests[0]?.init?.headers?.Authorization).toBe('Bearer teacher-test-token')
    expect(document.getElementById('dailyLogClassName')?.textContent).toBe('Kelas Amanah')
    expect(document.getElementById('dailyLogTotal')?.textContent).toBe('2')
    expect(document.getElementById('dailyLogCompleted')?.textContent).toBe('1')
    expect(document.getElementById('dailyLogNotCompleted')?.textContent).toBe('1')

    const rendered = document.getElementById('dailyLogStudentList')?.innerHTML ?? ''
    expect([...rendered.matchAll(/<article class="daily-log-card">/g)]).toHaveLength(2)
    expect([...rendered.matchAll(/<table class="daily-log-table">/g)]).toHaveLength(2)
    expect(rendered).toContain('Aina &lt;script&gt;alert(1)&lt;/script&gt;')
    expect(rendered).toContain('12 ulangan')
    expect(rendered).toContain('74')
    expect(rendered).toContain('Sudah kemas kini')
    expect(rendered).toContain('Belum kemas kini')
    expect(rendered).toContain('Belum ada progress direkodkan pada tarikh ini.')
    expect(rendered).toContain('Catatan &lt;b&gt;bagus&lt;/b&gt;')
  })

  it('asks for a class before requesting data and applies the selected date to all students', async () => {
    const document = createDocument('', '2026-11-05')
    const requests: string[] = []
    const fetcher: MockFetch = async (url) => {
      requests.push(url)
      return { ok: true, json: async () => ({}) }
    }

    await createDailyLogLoader(document, fetcher, 'teacher-test-token')()

    expect(requests).toHaveLength(0)
    expect(document.getElementById('dailyLogStudentList')?.innerHTML).toContain('Pilih kelas untuk mula.')
    expect(document.getElementById('dailyLogSelectedDate')?.textContent).not.toBe('—')
  })
})
