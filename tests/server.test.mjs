import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { randomBytes, randomUUID } from 'node:crypto'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { once } from 'node:events'
import { test } from 'node:test'

test('operator-managed requests survive a restart', async () => {
  const folder = await mkdtemp(join(tmpdir(), 'sunday-atlas-test-'))
  const admin = randomBytes(24).toString('hex')
  let child
  let base
  async function start() {
    child = spawn(process.execPath, ['server/index.mjs'], {
      env: { ...process.env, PORT: '0', HOST: '127.0.0.1', ATLAS_DB: join(folder, 'atlas.sqlite'), ATLAS_ADMIN_KEY: admin, ATLAS_SAMPLE: '0' },
      stdio: ['ignore', 'pipe', 'inherit'],
    })
    const output = await Promise.race([
      once(child.stdout, 'data').then(([value]) => value.toString()),
      once(child, 'exit').then(() => { throw new Error('Booking server stopped during startup') }),
    ])
    base = output.trim().split(' ').at(-1)
  }
  async function stop() {
    if (!child || child.exitCode !== null || child.signalCode) return
    const exited = once(child, 'exit')
    child.kill()
    await exited
  }
  const request = (path, method = 'GET', input, headers = {}) => fetch(base + '/api/' + path, {
    method, headers: { ...headers, ...(input && { 'Content-Type': 'application/json' }) },
    body: input && JSON.stringify(input),
  })
  try {
    await start()
    const first = await request('state')
    const cookie = first.headers.get('set-cookie').split(';')[0]
    const headers = { Cookie: cookie }
    const auth = { Authorization: 'Bearer ' + admin }
    assert.deepEqual((await first.json()).departures, [])
    const date = new Date(Date.now() + 4 * 86400000).toISOString().slice(0, 10)
    const slot = { trip: 'lodhi', date, capacity: 3, active: true }
    assert.equal((await request('operator/departures', 'POST', slot, auth)).status, 200)
    const input = { trip: slot.trip, date, guests: 2, requestKey: randomUUID() }
    assert.equal((await request('bookings', 'POST', input, headers)).status, 400)
    const reply = await request('bookings', 'POST', { ...input, name: 'Test Visitor', email: 'visitor@example.test' }, headers)
    assert.equal(reply.status, 201)
    const reservation = await reply.json()
    assert.equal(reservation.status, 'pending')
    assert.equal(reservation.total, 1500)
    assert.equal(reservation.email, undefined)
    await stop()
    await start()
    const after = await (await request('state', 'GET', undefined, headers)).json()
    assert.equal(after.bookings[0].id, reservation.id)
    assert.equal(after.departures[0].remaining, 1)
    assert.equal((await request('operator/departures', 'POST', { ...slot, capacity: 1 }, auth)).status, 409)
    assert.equal((await request('operator/bookings/' + reservation.id, 'PATCH', { status: 'declined' }, auth)).status, 200)
    assert.equal((await (await request('state')).json()).departures[0].remaining, 3)
    const operator = await (await request('operator', 'GET', undefined, auth)).json()
    assert.equal(operator.bookings[0].email, 'visitor@example.test')
  } finally {
    await stop()
    await rm(folder, { recursive: true, force: true })
  }
})
