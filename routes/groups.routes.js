import { Router } from 'express'
import { readDB, writeDB, genId } from '../utils/db.js'
import { success, fail } from '../utils/respond.js'

// Mounted at /api/groups
// NOTE: the ER diagram has no membership/group-message tables, so this
// backend adds two small collections to db.json to back them:
// group_members: [{ groupID, userID }], group_messages: [{ groupMessageID, groupID, userID, message_text, timestamp }]

const router = Router()

router.get('/', (req, res) => {
  const db = readDB()
  success(res, { data: db.groups })
})

router.get('/:groupId', (req, res) => {
  const db = readDB()
  const group = db.groups.find((g) => String(g.groupID) === req.params.groupId)
  if (!group) return fail(res, 404, 'Group not found.')
  success(res, { data: group })
})

router.post('/', (req, res) => {
  const db = readDB()
  db.groups.push({ groupID: genId(), ...req.body })
  writeDB(db)
  success(res, { message: 'Groups created successfully.' }, 201)
})

router.put('/:groupId', (req, res) => {
  const db = readDB()
  const group = db.groups.find((g) => String(g.groupID) === req.params.groupId)
  if (!group) return fail(res, 404, 'Group not found.')
  Object.assign(group, req.body)
  writeDB(db)
  success(res, { message: 'Groups updated successfully.' })
})

router.delete('/:groupId', (req, res) => {
  const db = readDB()
  const before = db.groups.length
  db.groups = db.groups.filter((g) => String(g.groupID) !== req.params.groupId)
  if (db.groups.length === before) return fail(res, 404, 'Group not found.')
  writeDB(db)
  success(res, { message: 'Groups deleted successfully.' })
})

// ── Membership ────────────────────────────────────────────────────────

router.get('/:groupId/members', (req, res) => {
  const db = readDB()
  const memberIds = db.group_members
    .filter((m) => String(m.groupID) === req.params.groupId)
    .map((m) => String(m.userID))
  const data = db.users.filter((u) => memberIds.includes(String(u.userID)))
  success(res, { data })
})

router.post('/:groupId/members/add/:userId', (req, res) => {
  const db = readDB()
  const { groupId, userId } = req.params
  const already = db.group_members.some((m) => String(m.groupID) === groupId && String(m.userID) === userId)
  if (already) return fail(res, 409, 'User is already a member of this group.')
  db.group_members.push({ groupID: groupId, userID: userId })
  writeDB(db)
  success(res, { message: 'User successfully added to the group.' }, 201)
})

router.delete('/:groupId/members/remove/:userId', (req, res) => {
  const db = readDB()
  const before = db.group_members.length
  db.group_members = db.group_members.filter(
    (m) => !(String(m.groupID) === req.params.groupId && String(m.userID) === req.params.userId)
  )
  if (db.group_members.length === before) return fail(res, 404, 'Membership not found.')
  writeDB(db)
  success(res, { message: 'User successfully removed from the group.' })
})

// join/leave — aliases over the same membership records as above
router.post('/:groupId/join/:userId', (req, res) => {
  const db = readDB()
  const { groupId, userId } = req.params
  const already = db.group_members.some((m) => String(m.groupID) === groupId && String(m.userID) === userId)
  if (already) return fail(res, 409, 'User is already a member of this group.')
  db.group_members.push({ groupID: groupId, userID: userId })
  writeDB(db)
  success(res, { message: 'User successfully joined the group.' }, 201)
})

router.delete('/:groupId/leave/:userId', (req, res) => {
  const db = readDB()
  const before = db.group_members.length
  db.group_members = db.group_members.filter(
    (m) => !(String(m.groupID) === req.params.groupId && String(m.userID) === req.params.userId)
  )
  if (db.group_members.length === before) return fail(res, 404, 'Membership not found.')
  writeDB(db)
  success(res, { message: 'User successfully left the group.' })
})

// ── Group messages ───────────────────────────────────────────────────

router.get('/:groupId/messages', (req, res) => {
  const db = readDB()
  const data = db.group_messages.filter((m) => String(m.groupID) === req.params.groupId)
  success(res, { data })
})

router.post('/:groupId/messages/send/:userId', (req, res) => {
  const db = readDB()
  const { groupId, userId } = req.params
  db.group_messages.push({
    groupMessageID: genId(),
    groupID: groupId,
    userID: userId,
    message_text: req.body.message_text,
    timestamp: new Date().toISOString(),
  })
  writeDB(db)
  success(res, { message: 'Message sent to the group successfully.' }, 201)
})

// Friends who are members of this group. Pass ?userId=<id> to scope "whose
// friends" — without it, this just returns every member.
router.get('/:groupId/friends', (req, res) => {
  const db = readDB()
  const { groupId } = req.params
  const { userId } = req.query
  const memberIds = db.group_members.filter((m) => String(m.groupID) === groupId).map((m) => String(m.userID))

  if (!userId) {
    const data = db.users.filter((u) => memberIds.includes(String(u.userID)))
    return success(res, { data })
  }

  const friendIds = db.friends
    .filter((f) => String(f.userID1) === userId || String(f.userID2) === userId)
    .map((f) => (String(f.userID1) === userId ? String(f.userID2) : String(f.userID1)))
  const data = db.users.filter((u) => memberIds.includes(String(u.userID)) && friendIds.includes(String(u.userID)))
  success(res, { data })
})

export default router
