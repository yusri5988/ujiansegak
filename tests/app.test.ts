import { describe, it, expect } from 'vitest'
import app from '../src/app/app'

describe('web routes', () => {
  it('GET / returns HTML application', async () => {
    const res = await app.request('http://localhost/')
    expect(res.status).toBe(200)
    const text = await res.text()
    expect(text).toContain('Ujian SEGAK')
  })

  it('GET /health returns status ok', async () => {
    const res = await app.request('http://localhost/health')
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json).toMatchObject({ status: 'ok' })
  })
})

describe('api routes', () => {
  it('GET /api/auth/me without token requires auth', async () => {
    const res = await app.request('http://localhost/api/auth/me')
    expect(res.status).toBe(401)
  })
})
