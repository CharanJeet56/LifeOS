// LifeOS — send-report Edge Function v3 (Premium UI)
// Deploy: supabase functions deploy send-report

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import nodemailer from 'npm:nodemailer@6'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type, x-client-info, apikey',
}
const TO_EMAIL = 'charanjeeth56@gmail.com'

// ── IST Date Helpers (edge fn runs UTC, DB dates stored in IST) ──────────
function nowIST(): Date {
  // Shift UTC time by +5:30 so getUTC* methods return IST values
  return new Date(Date.now() + 5.5 * 60 * 60 * 1000)
}
function dateIST(daysBack = 0): string {
  const d = nowIST()
  d.setUTCDate(d.getUTCDate() - daysBack)
  return d.getUTCFullYear() + '-' + String(d.getUTCMonth() + 1).padStart(2, '0') + '-' + String(d.getUTCDate()).padStart(2, '0')
}
function mPfx(y: number, m: number): string {
  return y + '-' + String(m + 1).padStart(2, '0')
}
function fmt(n: number): string {
  return '₹' + Number(n || 0).toLocaleString('en-IN')
}
function pct(a: number, b: number): number {
  return b > 0 ? Math.min(100, Math.round((a / b) * 100)) : 0
}
function hm(mins: number): string {
  const h = Math.floor(mins / 60), mn = Math.round(mins % 60)
  return h + 'h' + (mn ? ' ' + mn + 'm' : '')
}

// ── Design Tokens ────────────────────────────────────────────────────────
const BG     = '#050810'
const CARD   = '#0d1117'
const CARD2  = '#111b27'
const BORDER = '#1a2535'
const AMBER  = '#f0a500'
const GREEN  = '#2ecc71'
const RED    = '#e03b3b'
const BLUE   = '#3b82f6'
const CYAN   = '#22d3ee'
const PURPLE = '#a855f7'
const T1     = '#e0eaf4'
const T2     = '#7a9ab8'
const T3     = '#3d5a73'

// ── Deno Serve ───────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  try {
    const body = await req.json() as { type?: string }
    const type = body?.type
    if (!type || !['daily', 'weekly', 'monthly', 'test'].includes(type))
      throw new Error(`Invalid type: "${type}"`)

    const gmailUser = Deno.env.get('GMAIL_USER')
    const gmailPass = Deno.env.get('GMAIL_APP_PASSWORD')
    if (!gmailUser) throw new Error('GMAIL_USER secret not set')
    if (!gmailPass) throw new Error('GMAIL_APP_PASSWORD secret not set')
    const cleanPass = gmailPass.replace(/\s/g, '')
    if (cleanPass.length !== 16) throw new Error(`App password should be 16 chars, got ${cleanPass.length}`)

    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com', port: 587, secure: false,
      auth: { user: gmailUser, pass: cleanPass },
      tls: { rejectUnauthorized: true },
    })
    await transporter.verify()

    if (type === 'test') {
      await transporter.sendMail({
        from: `LifeOS <${gmailUser}>`, to: TO_EMAIL,
        subject: '✅ LifeOS — Connection Working!',
        html: buildTestEmail(),
      })
      return new Response(JSON.stringify({ success: true }), { headers: { ...CORS, 'Content-Type': 'application/json' } })
    }

    const supa = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
    const { data, error } = await supa.from('lifeos_data').select('data').eq('id', 'main').single()
    if (error) throw new Error('DB load failed: ' + error.message)
    if (!data?.data) throw new Error('DB data empty')

    const { subject, html } = buildEmail(type, data.data)
    await transporter.sendMail({ from: `LifeOS <${gmailUser}>`, to: TO_EMAIL, subject, html })
    return new Response(JSON.stringify({ success: true, type }), { headers: { ...CORS, 'Content-Type': 'application/json' } })
  } catch (e: any) {
    console.error('[send-report]', e.message)
    let msg = e.message
    if (msg?.includes('Invalid login') || msg?.includes('Username')) msg = 'Gmail auth failed. Check 2FA + App Password.'
    if (msg?.includes('ECONNREFUSED') || msg?.includes('ETIMEDOUT')) msg = 'Cannot connect to smtp.gmail.com:587'
    return new Response(JSON.stringify({ error: msg }), { status: 400, headers: { ...CORS, 'Content-Type': 'application/json' } })
  }
})

function buildEmail(type: string, DB: any) {
  if (type === 'daily')   return buildDaily(DB)
  if (type === 'weekly')  return buildWeekly(DB)
  if (type === 'monthly') return buildMonthly(DB)
  throw new Error('Unknown type: ' + type)
}

// ════════════════════════════════════════════════════════════════════════
// EMAIL CHROME
// ════════════════════════════════════════════════════════════════════════
function wrap(badge: string, accent: string, body: string): string {
  const sendTime = new Date().toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata', dateStyle: 'full', timeStyle: 'short',
  })
  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>LifeOS Report</title></head>
<body style="margin:0;padding:0;background:${BG};font-family:'Courier New',Courier,monospace;">
<table width="100%" cellpadding="0" cellspacing="0" bgcolor="${BG}">
<tr><td align="center" style="padding:24px 8px;">
<table width="640" cellpadding="0" cellspacing="0" style="max-width:640px;width:100%;">
<tr><td style="height:3px;background:linear-gradient(90deg,${accent},${BG});font-size:3px;line-height:3px;">&nbsp;</td></tr>
<tr><td bgcolor="${CARD}" style="background:${CARD};border:1px solid ${BORDER};border-top:none;padding:20px 24px 16px;">
  <table width="100%" cellpadding="0" cellspacing="0"><tr>
    <td style="vertical-align:middle;">
      <span style="font-size:26px;font-weight:900;letter-spacing:5px;color:${accent};">LIFE</span><span style="font-size:26px;font-weight:900;letter-spacing:5px;color:${T1};">OS</span>
      <div style="font-size:8px;letter-spacing:3px;color:${T3};margin-top:2px;">// COMMAND YOUR LIFE</div>
    </td>
    <td align="right" style="vertical-align:middle;">
      <div style="display:inline-block;padding:4px 14px;border:1px solid ${accent};font-size:8px;letter-spacing:2px;color:${accent};">${badge}</div>
      <div style="font-size:9px;color:${T3};margin-top:5px;">${sendTime} IST</div>
    </td>
  </tr></table>
</td></tr>
${body}
<tr><td bgcolor="${CARD2}" style="background:${CARD2};border:1px solid ${BORDER};border-top:1px solid ${BORDER};padding:12px 24px;text-align:center;">
  <div style="font-size:8px;letter-spacing:2px;color:${T3};">LIFEOS · AUTOMATED · DO NOT REPLY · ${TO_EMAIL}</div>
</td></tr>
<tr><td style="height:3px;background:linear-gradient(90deg,${BG},${accent});font-size:3px;line-height:3px;">&nbsp;</td></tr>
</table></td></tr></table></body></html>`
}

// ── Components ───────────────────────────────────────────────────────────
interface KPI { label: string; value: string; color?: string; sub?: string }

function kpiRow(items: KPI[]): string {
  const w = Math.floor(100 / items.length)
  return `<tr><td bgcolor="${BG}" style="background:${BG};padding:6px 24px;">
<table width="100%" cellpadding="0" cellspacing="0"><tr>
${items.map(it => `<td width="${w}%" style="padding:3px;vertical-align:top;">
  <table width="100%" cellpadding="0" cellspacing="0">
  <tr><td bgcolor="${CARD2}" style="background:${CARD2};border:1px solid ${BORDER};border-top:3px solid ${it.color || AMBER};padding:10px 6px;text-align:center;">
    <div style="font-size:7px;letter-spacing:2px;color:${T3};text-transform:uppercase;margin-bottom:5px;">${it.label}</div>
    <div style="font-size:${(it.value || '').length > 8 ? '15' : '19'}px;font-weight:bold;color:${it.color || AMBER};line-height:1.1;">${it.value}</div>
    ${it.sub ? `<div style="font-size:9px;color:${T2};margin-top:4px;">${it.sub}</div>` : ''}
  </td></tr>
  </table>
</td>`).join('')}
</tr></table>
</td></tr>`
}

function sec(label: string, icon = '', color = AMBER): string {
  return `<tr><td bgcolor="${BG}" style="background:${BG};padding:14px 24px 5px;">
<table width="100%" cellpadding="0" cellspacing="0"><tr>
  <td style="border-left:3px solid ${color};padding-left:9px;font-size:8px;letter-spacing:3px;color:${T3};text-transform:uppercase;">${icon ? icon + ' &nbsp;' : ''}${label}</td>
</tr></table>
</td></tr>`
}

function tblOpen(): string {
  return `<tr><td style="padding:0 24px 4px;"><table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid ${BORDER};">`
}
function tblClose(): string { return `</table></td></tr>` }

function tblHead(...cols: string[]): string {
  return `<tr bgcolor="${CARD2}">${cols.map((c, i) => `<th align="${i === cols.length - 1 ? 'right' : 'left'}" bgcolor="${CARD2}" style="background:${CARD2};padding:7px 11px;font-size:8px;letter-spacing:2px;color:${T3};font-weight:normal;border-bottom:1px solid ${BORDER};">${c}</th>`).join('')}</tr>`
}

function bar(label: string, value: string, p: number, color = AMBER, sub = ''): string {
  const filled = Math.max(0, Math.min(100, p))
  const c = p >= 100 ? GREEN : p >= 70 ? color : p >= 40 ? AMBER : RED
  return `<tr><td bgcolor="${CARD}" style="background:${CARD};padding:8px 11px;border-bottom:1px solid ${BORDER};">
  <table width="100%" cellpadding="0" cellspacing="0">
  <tr>
    <td style="font-size:12px;color:${T1};">${label}</td>
    <td align="right" style="font-size:12px;color:${c};font-weight:bold;">${value}</td>
  </tr>
  <tr><td colspan="2" style="padding-top:5px;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:${BORDER};">
    <tr>
      ${filled > 0 ? `<td width="${filled}%" bgcolor="${c}" style="background:${c};height:5px;font-size:1px;line-height:5px;">&nbsp;</td>` : ''}
      ${100 - filled > 0 ? `<td width="${100 - filled}%" style="height:5px;font-size:1px;line-height:5px;">&nbsp;</td>` : ''}
    </tr>
    </table>
  </td></tr>
  ${sub ? `<tr><td colspan="2" style="font-size:9px;color:${T3};padding-top:2px;">${sub}</td></tr>` : ''}
  </table>
</td></tr>`
}

function dRow(label: string, value: string, vc = T1, sub = ''): string {
  return `<tr>
    <td bgcolor="${CARD}" style="background:${CARD};padding:8px 11px;border-bottom:1px solid ${BORDER};font-size:12px;color:${T2};">${label}</td>
    <td align="right" bgcolor="${CARD}" style="background:${CARD};padding:8px 11px;border-bottom:1px solid ${BORDER};font-size:13px;color:${vc};font-weight:bold;">${value}${sub ? `<div style="font-size:9px;color:${T3};font-weight:normal;">${sub}</div>` : ''}</td>
  </tr>`
}

function iRow(icon: string, text: string, color = AMBER): string {
  return `<tr><td bgcolor="${CARD}" style="background:${CARD};padding:9px 11px;border-bottom:1px solid ${BORDER};border-left:3px solid ${color};">
    <span style="font-size:13px;">${icon}</span>
    <span style="font-size:12px;color:${T1};margin-left:8px;">${text}</span>
  </td></tr>`
}

function banner(msg: string, color: string): string {
  const rgb = color === GREEN ? '46,204,113' : color === RED ? '224,59,59' : '240,165,0'
  return `<tr><td style="padding:0 24px 8px;">
    <div style="background:rgba(${rgb},.08);border-left:4px solid ${color};padding:10px 14px;font-size:13px;color:${color};font-weight:bold;">${msg}</div>
  </td></tr>`
}

function sp(h = 12): string {
  return `<tr><td style="height:${h}px;font-size:${h}px;line-height:${h}px;">&nbsp;</td></tr>`
}

// ════════════════════════════════════════════════════════════════════════
// DAILY — 11PM IST every day
// ════════════════════════════════════════════════════════════════════════
function buildDaily(DB: any) {
  const t   = dateIST()
  const now = nowIST()

  // Finance
  const todayExp  = (DB.expenses || []).filter((e: any) => e.date === t)
  const spent     = todayExp.reduce((a: number, e: any) => a + e.amount, 0)
  const waste     = todayExp.filter((e: any) => e.tag === 'Waste').reduce((a: number, e: any) => a + e.amount, 0)
  const invest    = todayExp.filter((e: any) => e.tag === 'Investment').reduce((a: number, e: any) => a + e.amount, 0)
  const needs     = todayExp.filter((e: any) => e.tag === 'Need').reduce((a: number, e: any) => a + e.amount, 0)
  const budget    = DB.settings?.budget || 15000
  const daysInMo  = new Date(now.getUTCFullYear(), now.getUTCMonth() + 1, 0).getDate()
  const dailyBdg  = (DB.settings?.dailyBudget > 0) ? DB.settings.dailyBudget : Math.round(budget / daysInMo)
  const remaining = Math.max(0, dailyBdg - spent)
  const over      = spent > dailyBdg
  const balance   = DB.settings?.balance || 0
  const mPfxNow   = mPfx(now.getUTCFullYear(), now.getUTCMonth())

  // Month totals for context
  const monthSpent = (DB.expenses || []).filter((e: any) => e.date?.startsWith(mPfxNow)).reduce((a: number, e: any) => a + e.amount, 0)
  const monthInc   = (DB.income || []).filter((i: any) => i.date?.startsWith(mPfxNow)).reduce((a: number, i: any) => a + i.amount, 0)

  // Study
  const studyToday  = (DB.studyLog || []).filter((s: any) => s.date === t)
  const studyHrs    = studyToday.reduce((a: number, s: any) => a + s.hrs, 0)
  const studyTopics = [...new Set(studyToday.map((s: any) => s.topic).filter(Boolean))] as string[]

  // Habits
  const habits      = DB.habits || []
  const habitsDone  = habits.filter((h: any) => h.log?.includes(t)).length
  const habitPct    = pct(habitsDone, habits.length)

  // Tasks
  const pending     = (DB.tasks || []).filter((tk: any) => !tk.done)
  const doneToday   = (DB.tasks || []).filter((tk: any) => tk.done && tk.doneDate === t)
  const highPri     = pending.filter((tk: any) => tk.priority === 'high').slice(0, 3)
  const medPri      = pending.filter((tk: any) => tk.priority !== 'high').slice(0, 4)

  // Work logs
  const workLogs    = (DB.corpLogs || []).filter((l: any) => l.date === t)

  // Side income this month
  const sideGoal    = DB.settings?.sideGoal || 10000
  const monthSide   = (DB.income || []).filter((i: any) => i.date?.startsWith(mPfxNow) && i.type !== 'salary').reduce((a: number, i: any) => a + i.amount, 0)

  const dateLabel = new Date(t + 'T12:00:00Z').toLocaleDateString('en-IN', {
    timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })

  const expRows = todayExp.map((e: any) => {
    const c = e.tag === 'Waste' ? RED : e.tag === 'Investment' ? BLUE : GREEN
    return `<tr>
      <td bgcolor="${CARD}" style="background:${CARD};padding:8px 11px;border-bottom:1px solid ${BORDER};font-size:12px;color:${T1};">${e.desc || 'Unnamed'}</td>
      <td bgcolor="${CARD}" style="background:${CARD};padding:8px 11px;border-bottom:1px solid ${BORDER};font-size:10px;color:${T2};">${e.cat || '—'}</td>
      <td bgcolor="${CARD}" style="background:${CARD};padding:8px 11px;border-bottom:1px solid ${BORDER};"><span style="font-size:8px;color:${c};border:1px solid ${c};padding:2px 6px;">${e.tag}</span></td>
      <td align="right" bgcolor="${CARD}" style="background:${CARD};padding:8px 11px;border-bottom:1px solid ${BORDER};font-size:13px;color:${AMBER};font-weight:bold;">${fmt(e.amount)}</td>
    </tr>`
  }).join('')

  const habitRows = habits.map((h: any) => {
    const done = h.log?.includes(t)
    return iRow(done ? '✅' : '❌', h.name, done ? GREEN : RED)
  }).join('')

  const body = `
  <tr><td style="padding:12px 24px 4px;"><div style="font-size:11px;color:${T2};">📅 ${dateLabel}</div></td></tr>

  ${kpiRow([
    { label: 'Balance',      value: fmt(balance),   color: balance > 5000 ? GREEN : balance > 0 ? AMBER : RED },
    { label: 'Daily Budget', value: fmt(dailyBdg),  color: T2 },
    { label: 'Spent Today',  value: fmt(spent),     color: over ? RED : AMBER },
    { label: 'Remaining',    value: over ? '-' + fmt(spent - dailyBdg) : fmt(remaining), color: over ? RED : GREEN },
  ])}

  ${sec('Budget Status', '📊', over ? RED : GREEN)}
  ${tblOpen()}
  ${bar('Daily Budget Used', fmt(spent) + ' / ' + fmt(dailyBdg), pct(spent, dailyBdg), over ? RED : GREEN)}
  ${bar('Needs', fmt(needs), pct(needs, dailyBdg), BLUE, 'essential')}
  ${bar('Waste', fmt(waste), pct(waste, dailyBdg), waste > 0 ? RED : GREEN, waste > 0 ? 'avoidable spend' : 'zero waste!')}
  ${tblClose()}
  ${over ? banner('⚠️ Over budget by ' + fmt(spent - dailyBdg) + ' today', RED) : banner('✅ ' + fmt(remaining) + ' remaining of today\'s ' + fmt(dailyBdg) + ' budget', GREEN)}

  ${kpiRow([
    { label: 'Study Today',  value: studyHrs > 0 ? studyHrs.toFixed(1) + 'h' : '0h', color: studyHrs >= 2 ? GREEN : studyHrs > 0 ? AMBER : RED, sub: studyTopics.length ? studyTopics.join(', ') : 'no study' },
    { label: 'Habits',       value: habitsDone + '/' + habits.length, color: habitPct >= 80 ? GREEN : habitPct >= 50 ? AMBER : RED, sub: habitPct + '% done' },
    { label: 'Tasks Done',   value: String(doneToday.length), color: doneToday.length > 0 ? GREEN : T2, sub: pending.length + ' pending' },
    { label: 'Side Income',  value: fmt(monthSide), color: monthSide >= sideGoal ? GREEN : AMBER, sub: pct(monthSide, sideGoal) + '% of goal' },
  ])}

  ${sec("Today's Expenses", '💸', AMBER)}
  ${todayExp.length ? `${tblOpen()}${tblHead('DESCRIPTION', 'CATEGORY', 'TAG', 'AMOUNT')}${expRows}
  <tr bgcolor="${CARD2}"><td colspan="3" bgcolor="${CARD2}" style="background:${CARD2};padding:8px 11px;font-size:10px;letter-spacing:1px;color:${T3};">TOTAL</td>
    <td align="right" bgcolor="${CARD2}" style="background:${CARD2};padding:8px 11px;font-size:15px;color:${AMBER};font-weight:900;">${fmt(spent)}</td></tr>
  ${tblClose()}` : `${tblOpen()}${iRow('✅', 'No expenses today — great day for the wallet!', GREEN)}${tblClose()}`}

  ${habits.length ? sec('Habits', '🔥', GREEN) : ''}
  ${habits.length ? `${tblOpen()}${habitRows}${tblClose()}` : ''}

  ${(highPri.length || medPri.length) ? sec('Pending Tasks', '📌', AMBER) : ''}
  ${highPri.length ? `${tblOpen()}${highPri.map((tk: any) => iRow('🔴', '[HIGH] ' + tk.title + (tk.due ? ' · due ' + tk.due : ''), RED)).join('')}${tblClose()}` : ''}
  ${medPri.length ? `${tblOpen()}${medPri.map((tk: any) => iRow('○', tk.title, AMBER)).join('')}${tblClose()}` : ''}

  ${workLogs.length ? sec("Today's Work Log", '💼', CYAN) : ''}
  ${workLogs.length ? `${tblOpen()}${workLogs.map((l: any) => iRow(
    l.status === 'completed' ? '✅' : l.status === 'in-progress' ? '🔄' : '○',
    l.text, l.status === 'completed' ? GREEN : l.status === 'in-progress' ? CYAN : T2,
  )).join('')}${tblClose()}` : ''}

  ${sec('Month-to-Date', '📅', T3)}
  ${tblOpen()}
  ${bar('Month Budget', fmt(monthSpent) + ' / ' + fmt(budget), pct(monthSpent, budget), pct(monthSpent, budget) > 100 ? RED : AMBER)}
  ${dRow('Month Income', fmt(monthInc), GREEN)}
  ${dRow('Month Savings', fmt(Math.max(0, monthInc - monthSpent)), monthInc > monthSpent ? GREEN : RED)}
  ${tblClose()}
  ${sp(16)}`

  const dayStr = new Date(t + 'T12:00:00Z').toLocaleDateString('en-IN', { timeZone: 'UTC', weekday: 'short', day: '2-digit', month: 'short' })
  return {
    subject: `📊 LifeOS Daily — ${dayStr} · ${fmt(spent)} spent · ${habitsDone}/${habits.length} habits`,
    html: wrap('DAILY REPORT', over ? RED : AMBER, body),
  }
}

// ════════════════════════════════════════════════════════════════════════
// WEEKLY — Sunday 9PM IST
// ════════════════════════════════════════════════════════════════════════
function buildWeekly(DB: any) {
  const now = nowIST()

  // Build date arrays
  const days7: string[] = []
  const days14: string[] = []
  for (let i = 6; i >= 0; i--) days7.push(dateIST(i))
  for (let i = 13; i >= 7; i--) days14.push(dateIST(i))

  const wkLabel = `${new Date(days7[0] + 'T12:00:00Z').toLocaleDateString('en-IN', { timeZone: 'UTC', day: '2-digit', month: 'short' })} – ${new Date(days7[6] + 'T12:00:00Z').toLocaleDateString('en-IN', { timeZone: 'UTC', day: '2-digit', month: 'short', year: 'numeric' })}`

  // Finance
  const exp       = (DB.expenses || []).filter((e: any) => days7.includes(e.date))
  const prevExp   = (DB.expenses || []).filter((e: any) => days14.includes(e.date))
  const spent     = exp.reduce((a: number, e: any) => a + e.amount, 0)
  const prevSpent = prevExp.reduce((a: number, e: any) => a + e.amount, 0)
  const waste     = exp.filter((e: any) => e.tag === 'Waste').reduce((a: number, e: any) => a + e.amount, 0)
  const wastePct  = pct(waste, spent)
  const weekInc   = (DB.income || []).filter((i: any) => days7.includes(i.date)).reduce((a: number, i: any) => a + i.amount, 0)
  const savings   = Math.max(0, weekInc - spent)
  const budget    = DB.settings?.budget || 15000
  const weekBdg   = Math.round(budget / 4.3)
  const bdgPct    = pct(spent, weekBdg)

  // Study
  const studyLogs  = (DB.studyLog || []).filter((s: any) => days7.includes(s.date))
  const study      = studyLogs.reduce((a: number, s: any) => a + s.hrs, 0)
  const prevStudy  = (DB.studyLog || []).filter((s: any) => days14.includes(s.date)).reduce((a: number, s: any) => a + s.hrs, 0)
  const topicMap: Record<string, number> = {}
  studyLogs.forEach((s: any) => { if (s.topic) topicMap[s.topic] = (topicMap[s.topic] || 0) + s.hrs })

  // WFO
  const corpAtt = DB.corpAttendance || {}
  const wfoCount = days7.filter(d => { const v = corpAtt[d]; return v && (v.type || v) === 'wfo' }).length
  const wfhCount = days7.filter(d => { const v = corpAtt[d]; return v && (v.type || v) === 'wfh' }).length
  const wfoMins  = days7.reduce((a: number, d: string) => {
    const v = corpAtt[d]
    if (!v || (v.type || v) !== 'wfo') return a
    return a + (v.mins != null ? v.mins : (v.hrs || 0) * 60)
  }, 0)

  // Habits
  const habits = DB.habits || []
  const habitData = habits.map((h: any) => ({
    name:  h.name,
    days:  days7.map((d: string) => h.log?.includes(d) ? 1 : 0),
    score: days7.filter((d: string) => h.log?.includes(d)).length,
  }))
  const habitScoreAvg = habits.length
    ? Math.round(habitData.reduce((a: number, h: any) => a + h.score, 0) / habits.length / 7 * 100)
    : 0

  // Side income this month
  const mPfxNow = mPfx(now.getUTCFullYear(), now.getUTCMonth())
  const monthSide = (DB.income || []).filter((i: any) => i.date?.startsWith(mPfxNow) && i.type !== 'salary').reduce((a: number, i: any) => a + i.amount, 0)
  const sideGoal  = DB.settings?.sideGoal || 10000

  // Tasks
  const doneTasks = (DB.tasks || []).filter((tk: any) => tk.done && days7.includes(tk.doneDate || '')).length
  const pendTasks = (DB.tasks || []).filter((tk: any) => !tk.done).length

  // Invincibles
  const invTotal = (DB.debts || []).filter((d: any) => d.paid < d.total).reduce((a: number, d: any) => a + (d.total - d.paid), 0)

  // Category breakdown
  const cats: Record<string, number> = {}
  exp.forEach((e: any) => { cats[e.cat] = (cats[e.cat] || 0) + e.amount })
  const topCats = Object.entries(cats).sort((a, b) => (b[1] as number) - (a[1] as number)).slice(0, 6)

  // Top waste
  const topWaste = exp.filter((e: any) => e.tag === 'Waste').sort((a: any, b: any) => b.amount - a.amount).slice(0, 4)

  // WFO day cells
  const wfoCells = days7.map((d: string) => {
    const v   = corpAtt[d]
    const tp  = v ? (v.type || v) : ''
    const color = tp === 'wfo' ? GREEN : tp === 'wfh' ? BLUE : tp === 'leave' ? '#888' : tp === 'holiday' ? PURPLE : BORDER
    const lbl = tp === 'wfo' ? 'WFO' : tp === 'wfh' ? 'WFH' : tp === 'leave' ? 'LVE' : tp === 'holiday' ? 'HOL' : '—'
    const dayName = new Date(d + 'T12:00:00Z').toLocaleDateString('en-IN', { timeZone: 'UTC', weekday: 'short' }).slice(0, 3)
    return `<td width="14%" style="padding:3px;text-align:center;">
      <table width="100%" cellpadding="0" cellspacing="0">
      <tr><td bgcolor="${tp ? color + '22' : CARD2}" style="background:${tp ? color + '22' : CARD2};border:1px solid ${color};padding:6px 2px;text-align:center;">
        <div style="font-size:8px;color:${T3};letter-spacing:1px;">${dayName}</div>
        <div style="font-size:9px;font-weight:bold;color:${color};margin-top:3px;">${lbl}</div>
      </td></tr>
      </table>
    </td>`
  }).join('')

  // Habit grid
  const dayHeaders = days7.map((d: string) =>
    new Date(d + 'T12:00:00Z').toLocaleDateString('en-IN', { timeZone: 'UTC', weekday: 'short' }).slice(0, 1)
  ).join(' &nbsp; ')

  const habitGridRows = habitData.map((h: any) => {
    const dayCells = h.days.map((done: number) =>
      `<td style="padding:2px;"><div style="width:18px;height:18px;background:${done ? GREEN : BORDER};text-align:center;line-height:18px;font-size:9px;color:${done ? '#050810' : T3};">${done ? '✓' : ''}</div></td>`
    ).join('')
    const emoji = h.score >= 6 ? '🔥' : h.score >= 4 ? '📈' : h.score >= 2 ? '⚠️' : '❌'
    const c = h.score >= 5 ? GREEN : h.score >= 3 ? AMBER : RED
    return `<tr>
      <td bgcolor="${CARD}" style="background:${CARD};padding:6px 10px;border-bottom:1px solid ${BORDER};font-size:11px;color:${T1};white-space:nowrap;">${h.name}</td>
      <td bgcolor="${CARD}" style="background:${CARD};padding:6px;border-bottom:1px solid ${BORDER};">
        <table cellpadding="0" cellspacing="0"><tr>${dayCells}</tr></table>
      </td>
      <td align="right" bgcolor="${CARD}" style="background:${CARD};padding:6px 10px;border-bottom:1px solid ${BORDER};font-size:12px;color:${c};font-weight:bold;white-space:nowrap;">${h.score}/7 ${emoji}</td>
    </tr>`
  }).join('')

  // Insights
  const insights = []
  if (study >= 15)      insights.push(iRow('🔥', `Study CRUSHED: ${study.toFixed(1)}h / 15h — outstanding!`, GREEN))
  else if (study >= 10) insights.push(iRow('📈', `${study.toFixed(1)}h studied. ${(15 - study).toFixed(1)}h short of 15h target.`, AMBER))
  else                  insights.push(iRow('⚠️', `Only ${study.toFixed(1)}h studied. Target: 15h. Step it up.`, RED))
  if (wastePct <= 15)   insights.push(iRow('✅', `Waste at ${wastePct}% (${fmt(waste)}) — excellent discipline.`, GREEN))
  else if (wastePct <= 25) insights.push(iRow('⚠️', `Waste at ${wastePct}% (${fmt(waste)}). Aim for under 15%.`, AMBER))
  else                  insights.push(iRow('💸', `${wastePct}% waste (${fmt(waste)}). Major reduction needed.`, RED))
  if (wfoCount >= 3)    insights.push(iRow('🏢', `WFO target met: ${wfoCount}/3 days this week. ${hm(wfoMins)} total.`, GREEN))
  else                  insights.push(iRow('🏢', `WFO: ${wfoCount}/3 days. ${3 - wfoCount} more needed for full score.`, AMBER))
  if (prevSpent > 0 && spent <= prevSpent) insights.push(iRow('✅', `Spent ${fmt(prevSpent - spent)} less than last week. Improving!`, GREEN))
  else if (prevSpent > 0) insights.push(iRow('📉', `Spent ${fmt(spent - prevSpent)} more than last week (${fmt(prevSpent)}).`, RED))
  if (monthSide >= sideGoal) insights.push(iRow('🏆', `Side income goal ACHIEVED: ${fmt(monthSide)} this month!`, GREEN))
  else insights.push(iRow('📈', `Month side income: ${fmt(monthSide)} / ${fmt(sideGoal)} (${pct(monthSide, sideGoal)}%)`, AMBER))
  if (invTotal > 0)     insights.push(iRow('⚔️', `${fmt(invTotal)} in active Invincibles. Keep attacking.`, AMBER))
  else                  insights.push(iRow('🎉', 'No Invincibles — completely debt-free!', GREEN))
  if (study > prevStudy && prevStudy > 0) insights.push(iRow('📚', `+${(study - prevStudy).toFixed(1)}h more study than last week. Momentum building!`, GREEN))

  const body = `
  <tr><td style="padding:12px 24px 4px;"><div style="font-size:11px;color:${T2};">📅 ${wkLabel}</div></td></tr>

  ${kpiRow([
    { label: 'Total Spent',  value: fmt(spent),    color: bdgPct > 100 ? RED : AMBER,
      sub: prevSpent ? (spent <= prevSpent ? '▼ ' + fmt(prevSpent - spent) : '▲ ' + fmt(spent - prevSpent)) : '' },
    { label: 'Wasted',       value: fmt(waste),     color: wastePct > 20 ? RED : AMBER, sub: wastePct + '% of spend' },
    { label: 'Study Hours',  value: study.toFixed(1) + 'h', color: study >= 15 ? GREEN : study >= 8 ? AMBER : RED, sub: 'target 15h' },
    { label: 'WFO Days',     value: wfoCount + '/5', color: wfoCount >= 3 ? GREEN : AMBER, sub: wfhCount + ' WFH' },
  ])}
  ${kpiRow([
    { label: 'Week Income',  value: fmt(weekInc),  color: GREEN, sub: savings > 0 ? 'Saved ' + fmt(savings) : 'no surplus' },
    { label: 'Habit Score',  value: habitScoreAvg + '%', color: habitScoreAvg >= 80 ? GREEN : habitScoreAvg >= 50 ? AMBER : RED },
    { label: 'Side Income',  value: fmt(monthSide), color: monthSide >= sideGoal ? GREEN : AMBER, sub: pct(monthSide, sideGoal) + '% of goal' },
    { label: 'Tasks Done',   value: String(doneTasks), color: doneTasks > 0 ? GREEN : T2, sub: pendTasks + ' pending' },
  ])}

  ${sec('Office Attendance This Week', '🏢', CYAN)}
  <tr><td style="padding:0 24px 8px;">
    <table width="100%" cellpadding="0" cellspacing="0"><tr>${wfoCells}</tr></table>
    ${wfoMins > 0 ? `<div style="font-size:9px;color:${T3};margin-top:5px;text-align:right;">Total office time this week: <span style="color:${CYAN};">${hm(wfoMins)}</span></div>` : ''}
  </td></tr>

  ${sec('Budget vs Spending', '💰', AMBER)}
  ${tblOpen()}
  ${bar('Week Budget', fmt(spent) + ' / ' + fmt(weekBdg), bdgPct, bdgPct > 100 ? RED : GREEN)}
  ${bar('Needs', fmt(exp.filter((e: any) => e.tag === 'Need').reduce((a: number, e: any) => a + e.amount, 0)), pct(exp.filter((e: any) => e.tag === 'Need').reduce((a: number, e: any) => a + e.amount, 0), spent), BLUE)}
  ${bar('Waste', fmt(waste), wastePct, waste > 0 ? RED : GREEN)}
  ${tblClose()}

  ${topCats.length ? sec('Spending by Category', '📊', AMBER) : ''}
  ${topCats.length ? `${tblOpen()}${topCats.map(([cat, amt]) => bar(cat, fmt(amt as number) + ' (' + pct(amt as number, spent) + '%)', pct(amt as number, spent), AMBER)).join('')}${tblClose()}` : ''}

  ${topWaste.length ? sec('Top Waste Items', '🗑️', RED) : ''}
  ${topWaste.length ? `${tblOpen()}${topWaste.map((e: any) => dRow(e.desc || 'Unnamed', fmt(e.amount), RED, e.cat)).join('')}${tblClose()}` : ''}

  ${Object.keys(topicMap).length ? sec('Study by Topic', '📚', PURPLE) : ''}
  ${Object.keys(topicMap).length ? `${tblOpen()}
  ${Object.entries(topicMap).sort((a, b) => (b[1] as number) - (a[1] as number)).map(([topic, hrs]) => bar(topic, (hrs as number).toFixed(1) + 'h', pct(hrs as number, 15), PURPLE)).join('')}
  ${dRow('TOTAL', study.toFixed(1) + 'h / 15h target', study >= 15 ? GREEN : AMBER)}
  ${tblClose()}` : ''}

  ${habits.length ? sec('Habit Consistency (7 Days)', '🔥', GREEN) : ''}
  ${habits.length ? `<tr><td style="padding:0 24px 4px;">
    <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid ${BORDER};">
    <tr bgcolor="${CARD2}">
      <th align="left" bgcolor="${CARD2}" style="background:${CARD2};padding:7px 10px;font-size:8px;letter-spacing:2px;color:${T3};font-weight:normal;">HABIT</th>
      <th align="center" bgcolor="${CARD2}" style="background:${CARD2};padding:7px 10px;font-size:8px;color:${T3};font-weight:normal;">${dayHeaders}</th>
      <th align="right" bgcolor="${CARD2}" style="background:${CARD2};padding:7px 10px;font-size:8px;letter-spacing:2px;color:${T3};font-weight:normal;">SCORE</th>
    </tr>
    ${habitGridRows}
    </table>
  </td></tr>` : ''}

  ${sec('Weekly Insights', '💡', CYAN)}
  ${tblOpen()}${insights.join('')}${tblClose()}
  ${sp(16)}`

  return {
    subject: `⚡ LifeOS Weekly — ${wkLabel} · ${study.toFixed(1)}h study · ${fmt(spent)} spent`,
    html: wrap('WEEKLY REPORT', GREEN, body),
  }
}

// ════════════════════════════════════════════════════════════════════════
// MONTHLY — 1st of month, shows LAST month
// ════════════════════════════════════════════════════════════════════════
function buildMonthly(DB: any) {
  // Last month (this fn runs on 1st of new month)
  const now  = nowIST()
  const lm   = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 15))
  const m    = lm.getUTCMonth()
  const y    = lm.getUTCFullYear()
  const pfx  = mPfx(y, m)
  const monthName = lm.toLocaleDateString('en-IN', { timeZone: 'UTC', month: 'long', year: 'numeric' })

  // Finance
  const monthExp   = (DB.expenses || []).filter((e: any) => e.date?.startsWith(pfx))
  const monthInc   = (DB.income   || []).filter((i: any) => i.date?.startsWith(pfx))
  const totalSpent = monthExp.reduce((a: number, e: any) => a + e.amount, 0)
  const totalInc   = monthInc.reduce((a: number, i: any) => a + i.amount, 0)
  const waste      = monthExp.filter((e: any) => e.tag === 'Waste').reduce((a: number, e: any) => a + e.amount, 0)
  const savings    = Math.max(0, totalInc - totalSpent)
  const deficit    = Math.max(0, totalSpent - totalInc)
  const wastePct   = pct(waste, totalSpent)
  const savePct    = pct(savings, totalInc)
  const salary     = monthInc.filter((i: any) => i.type === 'salary').reduce((a: number, i: any) => a + i.amount, 0)
  const side       = monthInc.filter((i: any) => i.type !== 'salary' && i.type !== 'split' && i.type !== 'borrowed').reduce((a: number, i: any) => a + i.amount, 0)
  const sideGoal   = DB.settings?.sideGoal || 10000
  const budget     = DB.settings?.budget || 15000

  // Invincibles
  const debts      = DB.debts || []
  const activeDbts = debts.filter((d: any) => d.paid < d.total)
  const invTotal   = activeDbts.reduce((a: number, d: any) => a + (d.total - d.paid), 0)
  const invMonthly = activeDbts.reduce((a: number, d: any) => a + d.emi, 0)
  const invMonths  = invMonthly ? Math.ceil(invTotal / invMonthly) : 0
  const emisPaid   = activeDbts.filter((d: any) => (d.emiLog || []).some((e: any) => e.date?.startsWith(pfx))).length

  // Corporate
  const corpAtt    = DB.corpAttendance || {}
  const corpEnt    = Object.entries(corpAtt).filter(([d]) => d.startsWith(pfx))
  const wfoDays    = corpEnt.filter(([, v]: any) => (v.type || v) === 'wfo').length
  const wfhDays    = corpEnt.filter(([, v]: any) => (v.type || v) === 'wfh').length
  const wfoMins    = corpEnt.filter(([, v]: any) => (v.type || v) === 'wfo').reduce((a: number, [, v]: any) =>
    a + (v.mins != null ? v.mins : (v.hrs || 0) * 60), 0)

  // Study
  const studyLogs  = (DB.studyLog || []).filter((s: any) => s.date?.startsWith(pfx))
  const monthStudy = studyLogs.reduce((a: number, s: any) => a + s.hrs, 0)
  const topicMap: Record<string, number> = {}
  studyLogs.forEach((s: any) => { if (s.topic) topicMap[s.topic] = (topicMap[s.topic] || 0) + s.hrs })

  // Tasks
  const monthTasks = (DB.tasks || []).filter((tk: any) => tk.date?.startsWith(pfx) || tk.doneDate?.startsWith(pfx))
  const doneTasks  = monthTasks.filter((tk: any) => tk.done).length
  const taskRate   = monthTasks.length ? pct(doneTasks, monthTasks.length) : 0

  // Goals
  const goals = DB.goals || []

  // Net worth
  const totalInv  = (DB.investments || []).reduce((a: number, i: any) => a + i.amount, 0)
  const totalDebt = activeDbts.reduce((a: number, d: any) => a + (d.total - d.paid), 0)
  const netWorth  = totalInv - totalDebt

  // CIBIL
  const cibil        = DB.settings?.cibil || 0
  const cibilHist    = [...(DB.cibilHistory || [])].sort((a: any, b: any) => a.date.localeCompare(b.date))
  const prevCibil    = cibilHist.length >= 2 ? cibilHist[cibilHist.length - 2]?.score : null
  const cibilTrend   = cibil && prevCibil ? (cibil > prevCibil ? '▲ +' + (cibil - prevCibil) + ' since last entry' : cibil < prevCibil ? '▼ -' + (prevCibil - cibil) + ' since last entry' : '= No change') : ''
  const cibilGrade   = cibil >= 800 ? 'Excellent 🟢' : cibil >= 750 ? 'Very Good 🟢' : cibil >= 700 ? 'Good 🟡' : cibil >= 650 ? 'Fair 🟡' : cibil ? 'Poor 🔴' : '—'

  // Skills
  const skills        = DB.skills || []
  const activeSkills  = skills.filter((s: any) => s.comp < s.total).length
  const masteredSkills = skills.filter((s: any) => s.comp >= s.total && s.total > 0).length

  // Health Score (monthly view: 60h study target, 12 WFO days target)
  const savingsRate = totalInc > 0 ? Math.max(0, (totalInc - totalSpent) / totalInc) : 0
  const wasteRate   = totalSpent > 0 ? waste / totalSpent : 0
  const p1 = Math.min(15, Math.round(savingsRate / 0.25 * 15))
  const p2 = Math.max(0,  Math.round((1 - wasteRate / 0.40) * 15))
  const p3 = activeDbts.length === 0 ? 15 : Math.round(emisPaid / activeDbts.length * 15)
  const p4 = Math.min(10, Math.round(side / sideGoal * 10))
  const p5 = Math.min(15, Math.round(monthStudy / 60 * 15))
  const p6 = Math.min(15, Math.round(wfoDays / 12 * 15))
  const p7 = monthTasks.length ? Math.min(15, Math.round(taskRate / 100 * 15)) : 8
  const totalScore = p1 + p2 + p3 + p4 + p5 + p6 + p7
  const grade = totalScore >= 90 ? { g: 'S', label: 'ELITE',    color: GREEN  }
             : totalScore >= 75 ? { g: 'A', label: 'STRONG',   color: CYAN   }
             : totalScore >= 60 ? { g: 'B', label: 'GOOD',     color: AMBER  }
             : totalScore >= 45 ? { g: 'C', label: 'AVERAGE',  color: '#ff8c00' }
             :                   { g: 'D', label: 'WEAK',     color: RED    }

  const pillars = [
    { name: 'Savings Rate',      pts: p1, max: 15, detail: savePct + '% savings rate' },
    { name: 'Waste Control',     pts: p2, max: 15, detail: wastePct + '% waste rate' },
    { name: 'Invincibles',       pts: p3, max: 15, detail: emisPaid + '/' + activeDbts.length + ' EMIs paid' },
    { name: 'Side Income',       pts: p4, max: 10, detail: fmt(side) + ' / ' + fmt(sideGoal) },
    { name: 'Study Hours',       pts: p5, max: 15, detail: monthStudy.toFixed(1) + 'h / 60h' },
    { name: 'Office Attendance', pts: p6, max: 15, detail: wfoDays + ' WFO days' },
    { name: 'Tasks Done',        pts: p7, max: 15, detail: doneTasks + '/' + monthTasks.length + ' tasks' },
  ]

  const pillarRows = pillars.map(p => {
    const w = Math.round(p.pts / p.max * 100)
    const c = w >= 90 ? GREEN : w >= 60 ? AMBER : RED
    return `<tr>
      <td style="padding:6px 4px 6px 0;font-size:11px;color:${T2};border-bottom:1px solid ${BORDER};width:130px;">${p.name}</td>
      <td style="padding:6px 8px;border-bottom:1px solid ${BORDER};width:110px;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background:${BORDER};">
        <tr>
          ${w > 0 ? `<td width="${w}%" bgcolor="${c}" style="background:${c};height:4px;font-size:1px;line-height:4px;">&nbsp;</td>` : ''}
          ${100 - w > 0 ? `<td width="${100 - w}%" style="height:4px;font-size:1px;line-height:4px;">&nbsp;</td>` : ''}
        </tr>
        </table>
      </td>
      <td align="right" style="padding:6px 0;border-bottom:1px solid ${BORDER};font-size:12px;color:${c};font-weight:bold;white-space:nowrap;width:40px;">${p.pts}/${p.max}</td>
      <td style="padding:6px 0 6px 10px;border-bottom:1px solid ${BORDER};font-size:9px;color:${T3};">${p.detail}</td>
    </tr>`
  }).join('')

  // Categories
  const cats: Record<string, number> = {}
  monthExp.forEach((e: any) => { cats[e.cat] = (cats[e.cat] || 0) + e.amount })
  const topCats = Object.entries(cats).sort((a, b) => (b[1] as number) - (a[1] as number)).slice(0, 8)

  // Insights
  const insights = []
  if (savings > 0)          insights.push(iRow('💰', `Saved ${fmt(savings)} (${savePct}% of income). Well done!`, GREEN))
  else if (deficit > 0)     insights.push(iRow('🚨', `Overspent by ${fmt(deficit)}. Reduce expenses immediately.`, RED))
  if (wastePct <= 15)       insights.push(iRow('✅', `Waste at ${wastePct}% (${fmt(waste)}) — excellent control.`, GREEN))
  else if (wastePct <= 25)  insights.push(iRow('⚠️', `Waste at ${wastePct}% (${fmt(waste)}). Aim for under 15%.`, AMBER))
  else                      insights.push(iRow('💸', `${wastePct}% waste — ${fmt(waste)} burned. Cut it hard.`, RED))
  if (monthStudy >= 60)     insights.push(iRow('🔥', `${monthStudy.toFixed(1)}h studied — monthly target CRUSHED!`, GREEN))
  else if (monthStudy >= 40) insights.push(iRow('📚', `${monthStudy.toFixed(1)}h studied. ${(60 - monthStudy).toFixed(1)}h short of 60h target.`, AMBER))
  else                      insights.push(iRow('⚠️', `Only ${monthStudy.toFixed(1)}h studied. Monthly target is 60h.`, RED))
  if (side >= sideGoal)     insights.push(iRow('🏆', `Side income GOAL achieved: ${fmt(side)} earned this month!`, GREEN))
  else                      insights.push(iRow('📈', `Side: ${fmt(side)} / ${fmt(sideGoal)}. Gap: ${fmt(sideGoal - side)}.`, AMBER))
  if (activeDbts.length === 0) insights.push(iRow('🎉', 'DEBT FREE — No active Invincibles! Invest aggressively.', GREEN))
  else if (emisPaid === activeDbts.length) insights.push(iRow('✅', `All ${emisPaid} EMIs paid this month — full Invincibles score!`, GREEN))
  else insights.push(iRow('⚔️', `${emisPaid}/${activeDbts.length} EMIs paid. Missing payments cost you score points.`, RED))
  if (wfoDays >= 12)        insights.push(iRow('🏢', `${wfoDays} WFO days — ${hm(wfoMins)} total office time.`, GREEN))
  else                      insights.push(iRow('🏢', `${wfoDays} WFO days. Target ~12/month (3/week) for full score.`, AMBER))
  insights.push(iRow('🏆', `Life Health Score: ${totalScore}/100 — ${grade.label} (Grade ${grade.g})`, grade.color))
  if (cibil) insights.push(iRow('💳', `CIBIL: ${cibil} (${cibilGrade})${cibilTrend ? ' · ' + cibilTrend : ''}`, cibil >= 750 ? GREEN : AMBER))

  const body = `
  <tr><td style="padding:14px 24px 6px;">
    <div style="font-size:15px;font-weight:bold;color:${T1};">${monthName} — Complete Monthly Report</div>
    <div style="font-size:9px;color:${T3};margin-top:3px;letter-spacing:1px;">GENERATED ON 1ST — PREVIOUS MONTH COMPLETE DATA</div>
  </td></tr>

  ${kpiRow([
    { label: 'Total Income', value: fmt(totalInc),   color: GREEN },
    { label: 'Total Spent',  value: fmt(totalSpent), color: totalSpent > totalInc ? RED : AMBER },
    { label: 'Saved',        value: fmt(savings),    color: savings > 0 ? GREEN : RED, sub: savePct + '%' },
    { label: 'Wasted',       value: fmt(waste),      color: wastePct > 20 ? RED : AMBER, sub: wastePct + '%' },
  ])}
  ${kpiRow([
    { label: 'Salary',       value: fmt(salary),     color: T2 },
    { label: 'Side Income',  value: fmt(side),       color: side >= sideGoal ? GREEN : AMBER, sub: pct(side, sideGoal) + '% of ' + fmt(sideGoal) },
    { label: 'WFO Days',     value: String(wfoDays), color: wfoDays >= 12 ? GREEN : AMBER, sub: hm(wfoMins) + ' total' },
    { label: 'Study Hours',  value: monthStudy.toFixed(1) + 'h', color: monthStudy >= 60 ? GREEN : AMBER, sub: 'target 60h' },
  ])}

  ${sec('Life Health Score', '🏆', grade.color)}
  <tr><td style="padding:0 24px 8px;">
    <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid ${grade.color};">
    <tr>
      <td bgcolor="${CARD2}" style="background:${CARD2};padding:16px 14px;text-align:center;vertical-align:middle;width:110px;">
        <div style="font-size:52px;font-weight:900;color:${grade.color};line-height:1;">${totalScore}</div>
        <div style="font-size:7px;letter-spacing:3px;color:${T3};margin-top:4px;">OUT OF 100</div>
        <div style="margin-top:8px;padding:3px 10px;border:1px solid ${grade.color};display:inline-block;font-size:8px;letter-spacing:2px;color:${grade.color};">GRADE ${grade.g}</div>
        <div style="font-size:12px;color:${grade.color};font-weight:bold;margin-top:6px;">${grade.label}</div>
      </td>
      <td bgcolor="${CARD}" style="background:${CARD};padding:8px 12px;vertical-align:top;">
        <table width="100%" cellpadding="0" cellspacing="0">${pillarRows}</table>
      </td>
    </tr>
    </table>
  </td></tr>

  ${activeDbts.length ? sec('Invincibles Progress', '⚔️', AMBER) : ''}
  ${activeDbts.length ? `${tblOpen()}${activeDbts.map((d: any) => {
    const rem = d.total - d.paid
    const p   = pct(d.paid, d.total)
    const paid = (d.emiLog || []).some((e: any) => e.date?.startsWith(pfx))
    return bar(d.label + (paid ? ' ✓' : ' ⚠ EMI PENDING'), fmt(rem) + ' left · ' + fmt(d.emi) + '/mo', p, p >= 75 ? GREEN : AMBER, p + '% cleared')
  }).join('')}${dRow('Freedom In', invMonths ? invMonths + ' months' : '—', CYAN)}${tblClose()}` : `${tblOpen()}${iRow('🎉', 'No Invincibles! Completely debt-free!', GREEN)}${tblClose()}`}

  ${sec('Spending by Category', '💰', AMBER)}
  ${tblOpen()}${topCats.map(([cat, amt]) => bar(cat, fmt(amt as number), pct(amt as number, totalSpent), AMBER, pct(amt as number, totalSpent) + '% of total')).join('')}${dRow('TOTAL SPENT', fmt(totalSpent), AMBER)}${tblClose()}

  ${goals.length ? sec('Goals Progress', '🎯', BLUE) : ''}
  ${goals.length ? `${tblOpen()}${goals.map((g: any) => {
    const p = g.target ? pct(g.saved, g.target) : 0
    return bar(g.name, fmt(g.saved) + ' / ' + fmt(g.target), p, p >= 100 ? GREEN : BLUE, fmt(g.target - g.saved) + ' remaining')
  }).join('')}${tblClose()}` : ''}

  ${sec('Investments & Net Worth', '📈', GREEN)}
  ${tblOpen()}
  ${dRow('Total Invested', fmt(totalInv), GREEN)}
  ${dRow('Active Debts', fmt(totalDebt), totalDebt > 0 ? RED : GREEN)}
  ${dRow('Net Worth', (netWorth >= 0 ? '+' : '') + fmt(netWorth), netWorth >= 0 ? GREEN : RED, netWorth >= 0 ? '▲ Positive' : '▼ Negative — invest more!')}
  ${tblClose()}

  ${cibil ? sec('CIBIL Score', '💳', cibil >= 750 ? GREEN : AMBER) : ''}
  ${cibil ? `${tblOpen()}${bar('CIBIL Score', cibil + ' — ' + cibilGrade, pct(cibil - 300, 600), cibil >= 750 ? GREEN : cibil >= 650 ? AMBER : RED, cibilTrend)}${tblClose()}` : ''}

  ${Object.keys(topicMap).length ? sec('Study by Topic', '📚', PURPLE) : ''}
  ${Object.keys(topicMap).length ? `${tblOpen()}
  ${Object.entries(topicMap).sort((a, b) => (b[1] as number) - (a[1] as number)).map(([topic, hrs]) => bar(topic, (hrs as number).toFixed(1) + 'h', pct(hrs as number, monthStudy), PURPLE)).join('')}
  ${dRow('Active Topics', String(activeSkills), T1, masteredSkills + ' mastered this month')}
  ${tblClose()}` : ''}

  ${sec('Monthly Insights & Actions', '💡', CYAN)}
  ${tblOpen()}${insights.join('')}${tblClose()}
  ${sp(16)}`

  return {
    subject: `🗓️ LifeOS Monthly — ${monthName} · Score ${totalScore}/100 · Saved ${fmt(savings)}`,
    html: wrap('MONTHLY REPORT', CYAN, body),
  }
}

// ════════════════════════════════════════════════════════════════════════
// TEST EMAIL
// ════════════════════════════════════════════════════════════════════════
function buildTestEmail(): string {
  return wrap('CONNECTION TEST', GREEN, `
  <tr><td style="padding:40px 24px;text-align:center;">
    <div style="font-size:52px;line-height:1;">✅</div>
    <div style="font-size:18px;color:${GREEN};font-weight:bold;letter-spacing:2px;margin:14px 0 8px;">CONNECTION WORKING</div>
    <div style="font-size:12px;color:${T1};">Gmail SMTP configured correctly.</div>
    <div style="font-size:11px;color:${T3};margin-top:8px;">Daily · Weekly · Monthly reports are active.</div>
    ${sp(8)}
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:16px;"><tr>
      <td width="33%" style="padding:3px;text-align:center;">
        <div style="background:${CARD2};border:1px solid ${BORDER};border-top:3px solid ${AMBER};padding:10px;">
          <div style="font-size:7px;letter-spacing:2px;color:${T3};margin-bottom:5px;">DAILY</div>
          <div style="font-size:14px;font-weight:bold;color:${AMBER};">11PM</div>
          <div style="font-size:9px;color:${T2};margin-top:3px;">IST every day</div>
        </div>
      </td>
      <td width="33%" style="padding:3px;text-align:center;">
        <div style="background:${CARD2};border:1px solid ${BORDER};border-top:3px solid ${GREEN};padding:10px;">
          <div style="font-size:7px;letter-spacing:2px;color:${T3};margin-bottom:5px;">WEEKLY</div>
          <div style="font-size:14px;font-weight:bold;color:${GREEN};">Sunday</div>
          <div style="font-size:9px;color:${T2};margin-top:3px;">9PM IST</div>
        </div>
      </td>
      <td width="33%" style="padding:3px;text-align:center;">
        <div style="background:${CARD2};border:1px solid ${BORDER};border-top:3px solid ${CYAN};padding:10px;">
          <div style="font-size:7px;letter-spacing:2px;color:${T3};margin-bottom:5px;">MONTHLY</div>
          <div style="font-size:14px;font-weight:bold;color:${CYAN};">1st</div>
          <div style="font-size:9px;color:${T2};margin-top:3px;">of each month</div>
        </div>
      </td>
    </tr></table>
  </td></tr>`)
}
