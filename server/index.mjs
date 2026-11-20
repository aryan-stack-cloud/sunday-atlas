import { createServer } from 'node:http'
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto'
import { createReadStream, existsSync, mkdirSync, readFileSync, realpathSync, statSync } from 'node:fs'
import { dirname, extname, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { DatabaseSync } from 'node:sqlite'

const root = fileURLToPath(new URL('../', import.meta.url))
const dist = resolve(root, 'dist')
const catalog = JSON.parse(readFileSync(resolve(root, 'src/catalog.json'), 'utf8'))
const trips = new Map(catalog.map(trip => [trip.id, trip]))
const sample = process.env.ATLAS_SAMPLE === '1'
const secureCookie = process.env.ATLAS_SECURE_COOKIE === '1'
const adminKey = process.env.ATLAS_ADMIN_KEY || ''
const host = process.env.HOST || '127.0.0.1'
const port = Number(process.env.PORT || 4173)
if (!existsSync(resolve(dist, 'index.html'))) throw new Error('Run npm run build before starting the server.')
if (adminKey && adminKey.length < 32) throw new Error('ATLAS_ADMIN_KEY must be at least 32 characters.')

const configuredDb = process.env.ATLAS_DB || resolve(root, 'data/sunday-atlas.sqlite')
const dbPath = configuredDb === ':memory:' ? configuredDb : resolve(configuredDb)
if (dbPath !== ':memory:') mkdirSync(dirname(dbPath), { recursive: true })
const db = new DatabaseSync(dbPath)
db.exec(`
  PRAGMA journal_mode=WAL;
  PRAGMA busy_timeout=5000;
  PRAGMA foreign_keys=ON;
  CREATE TABLE IF NOT EXISTS departures (
    trip TEXT NOT NULL, date TEXT NOT NULL, capacity INTEGER NOT NULL CHECK (capacity > 0),
    active INTEGER NOT NULL CHECK (active IN (0, 1)),
    PRIMARY KEY (trip, date)
  );
  CREATE TABLE IF NOT EXISTS bookings (
    id TEXT PRIMARY KEY, owner TEXT NOT NULL, request_key TEXT NOT NULL,
    trip TEXT NOT NULL, date TEXT NOT NULL, guests INTEGER NOT NULL CHECK (guests > 0),
    total INTEGER NOT NULL, name TEXT NOT NULL, email TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('pending','confirmed','declined','cancelled')),
    created TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(owner, request_key),
    FOREIGN KEY(trip, date) REFERENCES departures(trip, date)
  );
  CREATE INDEX IF NOT EXISTS departure_bookings ON bookings(trip, date, status);
`)
const dateFormat = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year:'numeric', month:'2-digit', day:'2-digit' })
const localDate = () => dateFormat.format(new Date())
function validDate(date) {
  return typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date) &&
    !Number.isNaN(Date.parse(date)) && new Date(date).toISOString().slice(0, 10) === date && date > localDate()
}
if (sample) {
  const insert = db.prepare('INSERT OR IGNORE INTO departures VALUES (?, ?, ?, 1)')
  const day = new Date(localDate() + 'T12:00:00Z')
  let slots = 0
  while (slots < 4) {
    day.setUTCDate(day.getUTCDate() + 1)
    if (![0, 6].includes(day.getUTCDay())) continue
    for (const trip of catalog) insert.run(trip.id, day.toISOString().slice(0, 10), trip.capacity)
    slots++
  }
}

const bookingFields = 'id, trip, date, guests, total, status'
const availability = db.prepare(`
  SELECT d.trip, d.date, d.capacity, d.active, d.capacity - COALESCE(sum(b.guests), 0) AS remaining
  FROM departures d LEFT JOIN bookings b ON d.trip = b.trip AND d.date = b.date
    AND b.status IN ('pending', 'confirmed')
  WHERE d.date > ?
  GROUP BY d.trip, d.date ORDER BY d.date, d.trip
`)
const reserved = db.prepare("SELECT COALESCE(sum(guests), 0) AS total FROM bookings WHERE trip=? AND date=? AND status IN ('pending','confirmed')")
const sessionPattern = /^[a-f0-9]{64}$/
const hash = input => createHash('sha256').update(input).digest()
const error = (status, message) => Object.assign(new Error(message), { status })
function owner(request) {
  const session = (request.headers.cookie || '').match(/(?:^|; )atlas_session=([a-f0-9]+)(?:;|$)/)?.[1]
  return session && sessionPattern.test(session) ? hash(session).toString('hex') : null
}
function session(request, response) {
  const existing = owner(request)
  if (existing) return existing
  const token = randomBytes(32).toString('hex')
  response.setHeader('Set-Cookie', 'atlas_session=' + token + '; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000' + (secureCookie ? '; Secure' : ''))
  return hash(token).toString('hex')
}
function json(response, data, status = 200) {
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' })
  response.end(JSON.stringify(data))
}
async function body(request) {
  if (!/^application\/json(?:;|$)/i.test(request.headers['content-type'] || '')) throw error(415, 'Send a JSON request.')
  const chunks = []
  let size = 0
  for await (const chunk of request) {
    size += chunk.length
    if (size > 8192) throw error(413, 'Request is too large.')
    chunks.push(chunk)
  }
  try {
    const result = JSON.parse(Buffer.concat(chunks).toString())
    if (!result || typeof result !== 'object' || Array.isArray(result)) throw new Error()
    return result
  } catch { throw error(400, 'Invalid request details.') }
}
function transaction(run) {
  db.exec('BEGIN IMMEDIATE')
  try {
    const result = run()
    db.exec('COMMIT')
    return result
  } catch (failure) { db.exec('ROLLBACK'); throw failure }
}

const limits = new Map()
function limit(request, channel, maximum) {
  const now = Date.now()
  if (limits.size > 4000) {
    for (const [key, value] of limits) if (value.until <= now) limits.delete(key)
    if (limits.size > 4000) throw error(429, 'Please retry in a minute.')
  }
  const key = channel + ':' + request.socket.remoteAddress
  let entry = limits.get(key)
  if (!entry || entry.until <= now) {
    entry = { until: now + 60_000, count: 0 }
    limits.set(key, entry)
  }
  if (++entry.count > maximum) throw error(429, 'Please retry in a minute.')
}

function createBooking(input, account) {
  const { trip, date, guests, requestKey } = input
  const details = trips.get(trip)
  const name = typeof input.name === 'string' ? input.name.trim() : ''
  const email = typeof input.email === 'string' ? input.email.trim().toLowerCase() : ''
  if (!details || !validDate(date) || !Number.isInteger(guests) || guests < 1 || guests > details.capacity ||
    typeof requestKey !== 'string' || !/^[a-f0-9-]{36}$/i.test(requestKey)) throw error(400, 'Choose a valid departure and guest count.')
  if (!sample && (name.length < 2 || name.length > 80 || email.length > 200 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) {
    throw error(400, 'Enter a name and valid email so the operator can contact you.')
  }
  return transaction(() => {
    const previous = db.prepare('SELECT ' + bookingFields + ' FROM bookings WHERE owner=? AND request_key=?').get(account, requestKey)
    if (previous) {
      if (previous.trip !== trip || previous.date !== date || previous.guests !== guests) throw error(409, 'Start a new request for different booking details.')
      return previous
    }
    const slot = db.prepare('SELECT capacity, active FROM departures WHERE trip=? AND date=?').get(trip, date)
    if (!slot?.active || slot.capacity - reserved.get(trip, date).total < guests) {
      throw error(409, 'Availability changed. Check another departure or choose fewer guests.')
    }
    const id = 'SA-' + randomBytes(12).toString('hex').toUpperCase()
    return db.prepare("INSERT INTO bookings (id,owner,request_key,trip,date,guests,total,name,email,status) VALUES (?,?,?,?,?,?,?,?,?,'pending') RETURNING " + bookingFields)
      .get(id, account, requestKey, trip, date, guests, details.price * guests, sample ? '' : name, sample ? '' : email)
  })
}
async function admin(request, response, pathname) {
  if (!adminKey) throw error(404, 'Operator tools are disabled.')
  limit(request, 'operator', 60)
  const authorization = request.headers.authorization || ''
  if (!timingSafeEqual(hash(authorization), hash('Bearer ' + adminKey))) throw error(401, 'Check the operator access key.')
  if (request.method === 'GET' && pathname === '/api/operator') {
    return json(response, {
      departures: availability.all(localDate()),
      bookings: db.prepare('SELECT ' + bookingFields + ', name, email FROM bookings WHERE date >= ? ORDER BY created DESC').all(localDate()),
    })
  }
  if (request.method === 'POST' && pathname === '/api/operator/departures') {
    const { trip, date, capacity, active } = await body(request)
    if (!trips.has(trip) || !validDate(date) || !Number.isInteger(capacity) ||
        capacity < 1 || capacity > trips.get(trip).capacity || typeof active !== 'boolean') {
      throw error(400, 'Check the experience, future date, and capacity.')
    }
    transaction(() => {
      if (reserved.get(trip, date).total > capacity) throw error(409, 'Capacity cannot be below the number of reserved spots.')
      db.prepare('INSERT INTO departures VALUES (?,?,?,?) ON CONFLICT(trip,date) DO UPDATE SET capacity=excluded.capacity, active=excluded.active')
        .run(trip, date, capacity, Number(active))
    })
    return json(response, { saved: true })
  }
  if (request.method === 'PATCH' && pathname.startsWith('/api/operator/bookings/')) {
    const { status } = await body(request)
    if (!['confirmed', 'declined'].includes(status)) throw error(400, 'Choose confirm or decline.')
    const updated = db.prepare("UPDATE bookings SET status=? WHERE id=? AND status='pending' RETURNING " + bookingFields)
      .get(status, pathname.split('/').at(-1))
    if (!updated) throw error(409, 'Only pending requests can be updated.')
    return json(response, updated)
  }
  throw error(404, 'Page not found.')
}

async function api(request, response, path) {
  if (request.method !== 'GET' && ['cross-site', 'same-site'].includes(request.headers['sec-fetch-site'])) {
    throw error(403, 'Open Sunday Atlas directly to change a booking.')
  }
  if (path.startsWith('/api/operator')) return admin(request, response, path)
  if (request.method === 'GET' && path === '/api/state') {
    const account = session(request, response)
    return json(response, {
      sample, operator: Boolean(adminKey), departures: availability.all(localDate()).filter(slot => slot.active),
      bookings: account ? db.prepare('SELECT ' + bookingFields + ' FROM bookings WHERE owner=? ORDER BY created DESC').all(account) : [],
    })
  }
  limit(request, 'booking-write', 25)
  if (request.method === 'POST' && path === '/api/bookings') {
    const input = await body(request)
    return json(response, createBooking(input, session(request, response)), 201)
  }
  if (request.method === 'DELETE' && path.startsWith('/api/bookings/')) {
    const updated = db.prepare("UPDATE bookings SET status='cancelled' WHERE id=? AND owner=? AND status IN ('pending','confirmed') AND date>? RETURNING " + bookingFields)
      .get(path.split('/').at(-1), owner(request), localDate())
    if (!updated) throw error(404, 'Booking could not be cancelled.')
    return json(response, updated)
  }
  throw error(404, 'Page not found.')
}

const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.webp': 'image/webp', '.woff2': 'font/woff2', '.svg': 'image/svg+xml' }
const distRoot = realpathSync(dist)
const server = createServer(async (request, response) => {
  response.setHeader('X-Content-Type-Options', 'nosniff')
  response.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.setHeader('Content-Security-Policy', "default-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'")
  try {
    const path = decodeURIComponent(new URL(request.url, 'http://localhost').pathname)
    if (path.startsWith('/api/')) return await api(request, response, path)
    if (!['GET', 'HEAD'].includes(request.method)) throw error(405, 'Method not allowed.')
    const file = resolve(distRoot, '.' + (path === '/' ? '/index.html' : path))
    if (!file.startsWith(distRoot + sep) || !existsSync(file) || !statSync(file).isFile() ||
        !realpathSync(file).startsWith(distRoot + sep)) throw error(404, 'File not found.')
    response.writeHead(200, {
      'Content-Type': types[extname(file)] || 'application/octet-stream',
      'Cache-Control': path.startsWith('/assets/') ? 'public, max-age=31536000, immutable' : 'no-cache',
      'Content-Length': statSync(file).size,
    })
    if (request.method === 'HEAD') return response.end()
    createReadStream(file).on('error', () => response.destroy()).pipe(response)
  } catch (failure) {
    if (!failure.status) console.error(failure)
    if (!response.headersSent) json(response, { error: failure.status ? failure.message : 'The booking service could not complete the request.' }, failure.status || 500)
    else response.destroy()
  }
})
server.listen(port, host, () => console.log('Sunday Atlas is listening on http://' + host + ':' + server.address().port))
