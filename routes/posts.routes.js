import { Router } from 'express'
import { readDB, writeDB, genId } from '../utils/db.js'
import { success, fail } from '../utils/respond.js'

// Mounted at /api/posts (plural) — comments and likes nested under a post,
// matching Endpoints.csv exactly (yes, singular /api/post + plural
// /api/posts both exist in the spec).

const router = Router()

// Comments on a post
router.get('/:postId/comments', (req, res) => {
  const db = readDB()
  const data = db.comments.filter((c) => String(c.postID) === req.params.postId)
  success(res, { data })
})

router.post('/:postId/comments', (req, res) => {
  const db = readDB()
  db.comments.push({
    commentID: genId(),
    postID: req.params.postId,
    timestamp: new Date().toISOString(),
    ...req.body,
  })
  writeDB(db)
  success(res, { message: 'Comment added to post successfully.' }, 201)
})

router.delete('/:postId/comments/:commentId', (req, res) => {
  const db = readDB()
  const before = db.comments.length
  db.comments = db.comments.filter(
    (c) => !(String(c.commentID) === req.params.commentId && String(c.postID) === req.params.postId)
  )
  if (db.comments.length === before) return fail(res, 404, 'Comment not found.')
  writeDB(db)
  success(res, { message: 'Comment deleted successfully.' })
})

// Likes on a post
router.get('/:postId/likes', (req, res) => {
  const db = readDB()
  const data = db.likes.filter((l) => String(l.postID) === req.params.postId)
  success(res, { data })
})

router.post('/:postId/likes/add/:userId', (req, res) => {
  const db = readDB()
  const { postId, userId } = req.params
  const already = db.likes.some((l) => String(l.postID) === postId && String(l.userID) === userId)
  if (already) return fail(res, 409, 'User already liked this post.')
  db.likes.push({ likeID: genId(), postID: postId, userID: userId, timestamp: new Date().toISOString() })
  writeDB(db)
  success(res, { message: 'Like added to the post successfully.' }, 201)
})

router.delete('/:postId/likes/remove/:likeId', (req, res) => {
  const db = readDB()
  const before = db.likes.length
  db.likes = db.likes.filter(
    (l) => !(String(l.likeID) === req.params.likeId && String(l.postID) === req.params.postId)
  )
  if (db.likes.length === before) return fail(res, 404, 'Like not found.')
  writeDB(db)
  success(res, { message: 'Like removed from the post successfully.' })
})

export default router
