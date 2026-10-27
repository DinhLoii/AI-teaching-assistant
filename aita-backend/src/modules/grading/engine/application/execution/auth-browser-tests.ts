import { randomUUID } from 'node:crypto'
import type { Page } from 'playwright'
import type { BrowserTestDefinition, BrowserAction } from '../../core/domain/tests/BrowserTestDefinition.js'

const fold = (value: string) => value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd')

/** This template is selected by the teacher's requirements, never by submitted instructions. */
export async function prepareAuthBrowserTests(page: Page, assignment: any): Promise<Array<BrowserTestDefinition & { ruleIds: string[] }>> {
  const rules = assignment.rubric?.rules || []
  const requirement = fold(JSON.stringify({ metadata: assignment.metadata, rules }))
  if (!/dang ky|register|registration/.test(requirement) || !/dang nhap|login|sign.in/.test(requirement)) return []
  const base = new URL(page.url())
  const localPath = () => new URL(page.url()).pathname + new URL(page.url()).search + new URL(page.url()).hash
  const inspect = async () => page.evaluate(() => {
    const forms = Array.from(document.querySelectorAll('form'))
    return forms.map((form, index) => {
      const formSelector = `form >> nth=${index}`
      const inputs = Array.from(form.querySelectorAll<HTMLInputElement>('input')).filter(input => input.type !== 'hidden' && !!input.getClientRects().length)
      return { form: formSelector, inputs: inputs.map(input => ({ type: input.type, name: [input.name, input.id, input.placeholder, ...Array.from(input.labels || []).map(label => label.textContent)].join(' '), selector: input.id && document.querySelectorAll(`[id=${JSON.stringify(input.id)}]`).length === 1 ? `[id=${JSON.stringify(input.id)}]` : `${formSelector} >> input >> nth=${Array.from(form.querySelectorAll('input')).indexOf(input)}` })), submit: `${formSelector} >> button:not([type=button]):not([type=reset]), input[type=submit] >> nth=0` }
    })
  })
  const formOf = async (kind: 'login' | 'register') => (await inspect()).find(form => form.inputs.filter(input => input.type === 'password').length === (kind === 'register' ? 2 : 1))
  const navigateTo = async (kind: 'login' | 'register') => {
    const pattern = kind === 'register' ? /dang ky|register|sign.up/ : /dang nhap|login|sign.in/
    if (await formOf(kind)) return true
    const links = await page.locator('a[href]').evaluateAll(links => links.map(link => ({ text: link.textContent || '', href: (link as HTMLAnchorElement).href })))
    const target = links.find(link => pattern.test(fold(link.text + ' ' + link.href)) && new URL(link.href).origin === base.origin)
    if (!target) return false
    await page.goto(target.href, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(150)
    return !!await formOf(kind)
  }
  if (!await navigateTo('login')) return []
  const login = (await formOf('login'))!, loginPath = localPath()
  if (!await navigateTo('register')) return []
  const register = (await formOf('register'))!, registerPath = localPath()
  const emailOf = (form: typeof login) => form.inputs.find(input => input.type === 'email' || /email/.test(fold(input.name)))
  const le = emailOf(login), re = emailOf(register)
  const lp = login.inputs.find(input => input.type === 'password')!
  const rp = register.inputs.filter(input => input.type === 'password')
  if (!le || !re || !await page.locator(register.submit).count()) return []
  const email = `ui-${randomUUID().slice(0, 8)}@example.test`, password = 'UiTest!2026abc'
  const fill = (target: string, value: string): BrowserAction => ({ action: 'fill', target, value })
  const registerFields = register.inputs.filter(input => !['password', 'submit', 'checkbox', 'radio'].includes(input.type) && input !== re).map(input => fill(input.selector, 'UI Test'))
  const registration = (address = email, confirm = password) => [...registerFields, fill(re.selector, address), fill(rp[0].selector, password), fill(rp[1].selector, confirm)]
  const validation = (value: string): BrowserAction => ({ action: 'assertValidation', target: register.form, value })
  const tests: Array<BrowserTestDefinition & { ruleIds: string[] }> = []
  const add = (id: string, name: string, startUrl: string, steps: BrowserAction[], matches: RegExp) => tests.push({ id: `auto-auth-${id}`, name, startUrl, steps, ruleIds: rules.filter((rule: any) => matches.test(fold(rule.title + ' ' + rule.description))).map((rule: any) => rule.id) })
  add('invalid-email', 'Đăng ký: từ chối email sai định dạng', registerPath, [...registration('invalid-email'), { action: 'click', target: register.submit }, validation('email|định dạng|format')], /valid|kiem tra|rang buoc|dinh dang/)
  add('mismatch', 'Đăng ký: từ chối mật khẩu xác nhận không khớp', registerPath, [...registration(email, 'Different!2026'), { action: 'click', target: register.submit }, validation('khớp|xác nhận|match|confirm')], /valid|kiem tra|rang buoc|xac nhan|mat khau/)
  add('register', 'Đăng ký tài khoản mới và chuyển sang đăng nhập', registerPath, [...registration(), { action: 'click', target: register.submit }, { action: 'assertVisible', target: lp.selector }], /dang ky|register|tao tai khoan/)
  add('duplicate', 'Đăng ký: chặn email đã tồn tại', registerPath, [...registration(), { action: 'click', target: register.submit }, validation('tồn tại|trùng|đã.*đăng ký|exists|already|registered')], /trung|ton tai|duplicate/)
  add('wrong-login', 'Đăng nhập: từ chối mật khẩu sai', loginPath, [fill(le.selector, email), fill(lp.selector, 'Wrong!2026'), { action: 'click', target: login.submit }, { action: 'assertValidation', target: login.form, value: 'không đúng|sai|invalid|incorrect|not found|credentials' }], /dang nhap|login|valid|kiem tra/)
  add('login', 'Đăng nhập đúng và kiểm tra hồ sơ tài khoản', loginPath, [fill(le.selector, email), fill(lp.selector, password), { action: 'click', target: login.submit }, { action: 'assertText', target: 'body', value: email }, { action: 'screenshot', screenshotName: 'auto-auth-profile' }], /dang nhap|login|ho so|trang ca nhan|session|phien/)
  add('logout', 'Bấm đăng xuất và quay lại đăng nhập', localPath(), [{ action: 'click', target: 'text=/^(Đăng xuất|Log\\s*out|Logout|Sign\\s*out)$/i' }, { action: 'assertVisible', target: lp.selector }], /dang xuat|logout/)
  // The final workflow must preserve the authenticated state from the previous one.
  tests.at(-1)!.startUrl = ''
  await page.goto(new URL(loginPath, base.origin).href, { waitUntil: 'domcontentloaded' })
  return tests
}
