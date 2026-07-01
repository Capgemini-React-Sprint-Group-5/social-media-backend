import { Router } from 'express'
import { readDB, writeDB, genId } from '../utils/db.js'
import { success, fail } from '../utils/respond.js'

// Mounted at /api/comments (top-level, not post-scoped)

const router = Router()

router.get('/', (req, res) => {
  const db = readDB()
  success(res, { data: db.comments })
})

router.get('/:commentId', (req, res) => {
  const db = readDB()
  const comment = db.comments.find((c) => String(c.commentID) === req.params.commentId)
  if (!comment) return fail(res, 404, 'Comment not found.')
  success(res, { data: comment })
})

router.post('/', (req, res) => {
  const db = readDB()
  db.comments.push({ commentID: genId(), timestamp: new Date().toISOString(), ...req.body })
  writeDB(db)
  success(res, { message: 'Comment created successfully.' }, 201)
})

router.put('/:commentId', (req, res) => {
  const db = readDB()
  const comment = db.comments.find((c) => String(c.commentID) === req.params.commentId)
  if (!comment) return fail(res, 404, 'Comment not found.')
  Object.assign(comment, req.body)
  writeDB(db)
  success(res, { message: 'Comment updated successfully.' })
})

router.delete('/:commentId', (req, res) => {
  const db = readDB()
  const before = db.comments.length
  db.comments = db.comments.filter((c) => String(c.commentID) !== req.params.commentId)
  if (db.comments.length === before) return fail(res, 404, 'Comment not found.')
  writeDB(db)
  success(res, { message: 'Comment deleted successfully.' })
})

export default router
