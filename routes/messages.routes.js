import { Router } from 'express'
import { readDB, writeDB, genId } from '../utils/db.js'
import { success, fail } from '../utils/respond.js'

// Mounted at /api/messages (top-level CRUD)

const router = Router()

router.get('/', (req, res) => {
  const db = readDB()
  success(res, { data: db.messages })
})

router.get('/:messageId', (req, res) => {
  const db = readDB()
  const message = db.messages.find((m) => String(m.messageID) === req.params.messageId)
  if (!message) return fail(res, 404, 'Message not found.')
  success(res, { data: message })
})

router.post('/', (req, res) => {
  const db = readDB()
  db.messages.push({ messageID: genId(), timestamp: new Date().toISOString(), ...req.body })
  writeDB(db)
  success(res, { message: 'Message created successfully.' }, 201)
})

router.put('/:messageId', (req, res) => {
  const db = readDB()
  const message = db.messages.find((m) => String(m.messageID) === req.params.messageId)
  if (!message) return fail(res, 404, 'Message not found.')
  Object.assign(message, req.body)
  writeDB(db)
  success(res, { message: 'Message updated successfully.' })
})

router.delete('/:messageId', (req, res) => {
  const db = readDB()
  const before = db.messages.length
  db.messages = db.messages.filter((m) => String(m.messageID) !== req.params.messageId)
  if (db.messages.length === before) return fail(res, 404, 'Message not found.')
  writeDB(db)
  success(res, { message: 'Message deleted successfully.' })
})

export default router
