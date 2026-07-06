import { Router } from "express";
import { readDB, writeDB, genId } from "../utils/db.js";
import { success, fail } from "../utils/respond.js";

const router = Router();

/** Ensure group.members exists and return it. */
const memberIds = (group) => {
  if (!Array.isArray(group.members)) group.members = [];
  return group.members;
};

/** Ensure user.groups exists and return it. */
const userGroupIds = (user) => {
  if (!Array.isArray(user.groups)) user.groups = [];
  return user.groups;
};

const findGroup = (db, groupId) =>
  db.groups.find((g) => String(g.groupID) === groupId);
const findUser = (db, userId) =>
  db.users.find((u) => String(u.userID) === userId);

// ── Group CRUD ────────────────────────────────────────────────────────

router.get("/", (req, res) => {
  const db = readDB();
  const data = db.groups.map((g) => {
    const ids = memberIds(g).map(String);
    if (g.adminID && !ids.includes(String(g.adminID))) {
      ids.push(String(g.adminID));
    }
    return { ...g, members: ids.map(Number) };
  });
  success(res, { data });
});

router.get("/messages/all", (req, res) => {
  const db = readDB();
  success(res, { data: db.group_messages || [] });
});

router.get("/:groupId", (req, res) => {
  const db = readDB();
  const group = findGroup(db, req.params.groupId);
  if (!group) return fail(res, 404, "Group not found.");
  const ids = memberIds(group).map(String);
  if (group.adminID && !ids.includes(String(group.adminID))) {
    ids.push(String(group.adminID));
  }
  success(res, { data: { ...group, members: ids.map(Number) } });
});

router.post("/", (req, res) => {
  const db = readDB();
  const { adminID } = req.body;
  const admin = adminID ? findUser(db, String(adminID)) : null;
  if (adminID && !admin) return fail(res, 404, "Admin user not found.");

  const groupID = genId();
  const newGroup = { groupID, ...req.body, members: [] };
  if (adminID) memberIds(newGroup).push(adminID);
  db.groups.push(newGroup);

  // creator is automatically a member
  if (admin) userGroupIds(admin).push(groupID);

  writeDB(db);
  success(res, { message: "Groups created successfully.", data: newGroup }, 201);
});

router.put("/:groupId", (req, res) => {
  const db = readDB();
  const group = findGroup(db, req.params.groupId);
  if (!group) return fail(res, 404, "Group not found.");
  const { members, ...fields } = req.body; // membership isn't edited through this route
  Object.assign(group, fields);
  writeDB(db);
  success(res, { message: "Groups updated successfully." });
});

router.delete("/:groupId", (req, res) => {
  const db = readDB();
  const group = findGroup(db, req.params.groupId);
  if (!group) return fail(res, 404, "Group not found.");

  // clean up the groupID from every member's user.groups array
  memberIds(group).forEach((userId) => {
    const user = findUser(db, String(userId));
    if (user) {
      user.groups = userGroupIds(user).filter(
        (id) => String(id) !== req.params.groupId,
      );
    }
  });

  db.groups = db.groups.filter((g) => String(g.groupID) !== req.params.groupId);
  db.group_messages = (db.group_messages || []).filter(
    (m) => String(m.groupID) !== req.params.groupId,
  );
  writeDB(db);
  success(res, { message: "Groups deleted successfully." });
});

// ── Membership (embedded id arrays) ─────────────────────────────────────

router.get("/:groupId/members", (req, res) => {
  const db = readDB();
  const group = findGroup(db, req.params.groupId);
  if (!group) return fail(res, 404, "Group not found.");
  const ids = memberIds(group).map(String);
  if (group.adminID && !ids.includes(String(group.adminID))) {
    ids.push(String(group.adminID));
  }
  const data = db.users.filter((u) => ids.includes(String(u.userID)));
  success(res, { data });
});

const addMember = (req, res) => {
  const db = readDB();
  const { groupId, userId } = req.params;
  const group = findGroup(db, groupId);
  if (!group) return fail(res, 404, "Group not found.");
  const user = findUser(db, userId);
  if (!user) return fail(res, 404, "User not found.");

  const gMembers = memberIds(group);
  if (gMembers.map(String).includes(userId)) {
    return fail(res, 409, "User is already a member of this group.");
  }
  gMembers.push(userId);
  userGroupIds(user).push(group.groupID);
  writeDB(db);
  return { user, group };
};

const removeMember = (req, res) => {
  const db = readDB();
  const { groupId, userId } = req.params;
  const group = findGroup(db, groupId);
  if (!group) return fail(res, 404, "Group not found.");

  const gMembers = memberIds(group);
  const before = gMembers.length;
  group.members = gMembers.filter((id) => String(id) !== userId);
  if (group.members.length === before)
    return fail(res, 404, "Membership not found.");

  const user = findUser(db, userId);
  if (user) {
    user.groups = userGroupIds(user).filter((id) => String(id) !== groupId);
  }
  writeDB(db);
  return true;
};

router.post("/:groupId/members/add/:userId", (req, res) => {
  const result = addMember(req, res);
  if (result)
    success(res, { message: "User successfully added to the group." }, 201);
});

router.delete("/:groupId/members/remove/:userId", (req, res) => {
  const result = removeMember(req, res);
  if (result)
    success(res, { message: "User successfully removed from the group." });
});

// join/leave — same underlying arrays as add/remove above
router.post("/:groupId/join/:userId", (req, res) => {
  const result = addMember(req, res);
  if (result)
    success(res, { message: "User successfully joined the group." }, 201);
});

router.delete("/:groupId/leave/:userId", (req, res) => {
  const result = removeMember(req, res);
  if (result) success(res, { message: "User successfully left the group." });
});

// ── Group messages ───────────────────────────────────────────────────

router.get("/:groupId/messages", (req, res) => {
  const db = readDB();
  const rawMessages = (db.group_messages || []).filter(
    (m) => String(m.groupID) === req.params.groupId,
  );
  const data = rawMessages.map((m) => ({
    ...m,
    senderID: m.userID || m.senderID,
    messageID: m.groupMessageID || m.id,
    id: m.groupMessageID || m.id,
  }));
  success(res, { data });
});

router.post("/:groupId/messages/send/:userId", (req, res) => {
  const db = readDB();
  const group = findGroup(db, req.params.groupId);
  if (!group) return fail(res, 404, "Group not found.");

  db.group_messages = db.group_messages || [];
  db.group_messages.push({
    groupMessageID: genId(),
    groupID: req.params.groupId,
    userID: req.params.userId,
    message_text: req.body.message_text,
    timestamp: new Date().toISOString(),
  });
  writeDB(db);
  success(res, { message: "Message sent to the group successfully." }, 201);
});

router.get("/:groupId/friends", (req, res) => {
  const db = readDB();
  const group = findGroup(db, req.params.groupId);
  if (!group) return fail(res, 404, "Group not found.");
  const { userId } = req.query;
  const ids = memberIds(group).map(String);

  if (!userId) {
    const data = db.users.filter((u) => ids.includes(String(u.userID)));
    return success(res, { data });
  }

  const friendIds = db.friends
    .filter((f) => String(f.userID1) === userId || String(f.userID2) === userId)
    .map((f) =>
      String(f.userID1) === userId ? String(f.userID2) : String(f.userID1),
    );
  const data = db.users.filter(
    (u) =>
      ids.includes(String(u.userID)) && friendIds.includes(String(u.userID)),
  );
  success(res, { data });
});

export default router;
