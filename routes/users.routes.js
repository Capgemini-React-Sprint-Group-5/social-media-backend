import { Router } from "express";
import { readDB, writeDB, genId } from "../utils/db.js";
import { success, fail } from "../utils/respond.js";

const router = Router();

// ── Basic CRUD ─────────────────────────────────────────────────────────

router.get("/all", (req, res) => {
  const db = readDB();
  success(res, { data: db.users });
});

router.get("/search/:username", (req, res) => {
  const db = readDB();
  const users = db.users.filter((u) =>
    u.username.toLowerCase().includes(req.params.username.toLowerCase()),
  );
  success(res, { data: users });
});

router.get("/:userId", (req, res) => {
  const db = readDB();
  const user = db.users.find((u) => String(u.userID) === req.params.userId);
  if (!user) return fail(res, 404, "User not found.");
  success(res, { data: user });
});

//New Register
router.post("/", (req, res) => {
  const db = readDB();
  db.users.push({ userID: genId(), ...req.body, groups: [] });
  writeDB(db);
  success(res, { message: "User created successfully." }, 201);
});

// Login User
router.post("/login", (req, res) => {
  const db = readDB();
  const { username, password } = req.body;
  const user = db.users.find(
    (u) => u.username === username && u.password === password,
  );
  if (!user) return fail(res, 401, "Invalid username or password.");
  success(res, { data: user });
});

router.put("/update/:userId", (req, res) => {
  const db = readDB();
  const user = db.users.find((u) => String(u.userID) === req.params.userId);
  if (!user) return fail(res, 404, "User not found.");
  Object.assign(user, req.body);
  writeDB(db);
  success(res, { message: "User updated successfully." });
});

router.delete("/delete/:userId", (req, res) => {
  const db = readDB();
  const before = db.users.length;
  db.users = db.users.filter((u) => String(u.userID) !== req.params.userId);
  if (db.users.length === before) return fail(res, 404, "User not found.");
  writeDB(db);
  success(res, { message: "User deleted successfully." });
});

// ── Friends ────────────────────────────────────────────────────────────

router.get("/:userId/friends", (req, res) => {
  const db = readDB();
  const { userId } = req.params;
  const data = db.friends
    .filter((f) => String(f.userID1) === userId || String(f.userID2) === userId)
    .map((f) => ({
      friendshipID: f.friendshipID,
      friendId: String(f.userID1) === userId ? f.userID2 : f.userID1,
      status: f.status,
    }));
  success(res, { data });
});

router.post("/:userId/friends/:friendId", (req, res) => {
  const db = readDB();
  const { userId, friendId } = req.params;
  const existing = db.friends.find(
    (f) =>
      (String(f.userID1) === userId && String(f.userID2) === friendId) ||
      (String(f.userID1) === friendId && String(f.userID2) === userId),
  );
  if (existing) {
    existing.status = "accepted";
  } else {
    db.friends.push({
      friendshipID: genId(),
      userID1: userId,
      userID2: friendId,
      status: "accepted",
    });
  }
  writeDB(db);
  success(res, { message: "Friend added successfully." });
});

router.delete("/:userId/friends/:friendId", (req, res) => {
  const db = readDB();
  const { userId, friendId } = req.params;
  const before = db.friends.length;
  db.friends = db.friends.filter(
    (f) =>
      !(
        (String(f.userID1) === userId && String(f.userID2) === friendId) ||
        (String(f.userID1) === friendId && String(f.userID2) === userId)
      ),
  );
  if (db.friends.length === before)
    return fail(res, 404, "Friendship not found.");
  writeDB(db);
  success(res, { message: "Friend removed successfully." });
});

router.get("/:userId/friend-requests/pending", (req, res) => {
  const db = readDB();
  const { userId } = req.params;
  const data = db.friends.filter(
    (f) => f.status === "pending" && String(f.userID2) === String(userId),
  );
  success(res, { data });
});

router.post("/:userId/friend-requests/send/:friendId", (req, res) => {
  const db = readDB();
  const { userId, friendId } = req.params;
  const existing = db.friends.find(
    (f) =>
      (String(f.userID1) === userId && String(f.userID2) === friendId) ||
      (String(f.userID1) === friendId && String(f.userID2) === userId),
  );
  if (existing) {
    return fail(res, 409, "Friend request already exists.");
  }
  db.friends.push({
    friendshipID: genId(),
    userID1: userId,
    userID2: friendId,
    status: "pending",
  });

  // Notify the recipient that they got a friend request, unless self-request.
  if (String(userId) !== String(friendId)) {
    const sender = db.users.find((u) => String(u.userID) === String(userId));
    const senderName = sender?.username || "someone";
    db.notifications.push({
      notificationID: genId(),
      userID: friendId,
      fromUserID: userId,
      type: "friend_request",
      content: `You got a friend request from ${senderName}`,
      read: false,
      timestamp: new Date().toISOString(),
    });
  }

  writeDB(db);
  success(res, { message: "Friend request sent successfully." }, 201);
});

router.get("/:userId/friends/groups", (req, res) => {
  const db = readDB();
  const { userId } = req.params;
  const friendIds = db.friends
    .filter((f) => String(f.userID1) === userId || String(f.userID2) === userId)
    .map((f) =>
      String(f.userID1) === userId ? String(f.userID2) : String(f.userID1),
    );
  // "groups where a friend is a member" — checked against each group's own
  // embedded members array (no join table).
  const data = db.groups.filter((g) =>
    (g.members || []).some((m) => friendIds.includes(String(m))),
  );
  success(res, { data });
});

router.get("/:userId/friend-requests/sent", (req, res) => {
  const db = readDB();
  const { userId } = req.params;
  const data = db.friends.filter(
    (f) =>
      f.status === "pending" &&
      String(f.userID1) === String(userId)
  );
  success(res, { data });
});

router.delete("/:userId/friend-requests/cancel/:friendId", (req, res) => {
  const db = readDB();
  const { userId, friendId } = req.params;
  const before = db.friends.length;
  db.friends = db.friends.filter(
    (f) =>
      !(
        f.status === "pending" &&
        String(f.userID1) === String(userId) &&
        String(f.userID2) === String(friendId)
      )
  );
  if (before === db.friends.length) {
    return fail(res, 404, "Friend request not found.");
  }
  writeDB(db);
  success(res, {
    message: "Friend request cancelled successfully.",
  });
});

// ── Posts / comments / likes authored/received by this user ─────────────

router.get("/:userId/posts", (req, res) => {
  const db = readDB();
  const data = db.posts.filter((p) => String(p.userID) === req.params.userId);
  success(res, { data });
});

router.get("/:userId/posts/comments", (req, res) => {
  const db = readDB();
  const postIds = db.posts
    .filter((p) => String(p.userID) === req.params.userId)
    .map((p) => String(p.postID));
  const data = db.comments.filter((c) => postIds.includes(String(c.postID)));
  success(res, { data });
});

router.get("/:userId/posts/likes", (req, res) => {
  const db = readDB();
  const postIds = db.posts
    .filter((p) => String(p.userID) === req.params.userId)
    .map((p) => String(p.postID));
  const data = db.likes.filter((l) => postIds.includes(String(l.postID)));
  success(res, { data });
});

router.get("/:userId/likes", (req, res) => {
  const db = readDB();
  const data = db.likes.filter((l) => String(l.userID) === req.params.userId);
  success(res, { data });
});

// ── Messages ──────────────────────────────────────────────────────────

router.get("/:userId/messages/:otherUserId", (req, res) => {
  const db = readDB();
  const { userId, otherUserId } = req.params;
  const data = db.messages.filter(
    (m) =>
      (String(m.senderID) === userId && String(m.receiverID) === otherUserId) ||
      (String(m.senderID) === otherUserId && String(m.receiverID) === userId),
  );
  success(res, { data });
});

router.post("/:userId/messages/send/:otherUserId", (req, res) => {
  const db = readDB();
  const { userId, otherUserId } = req.params;
  db.messages.push({
    messageID: genId(),
    senderID: userId,
    receiverID: otherUserId,
    message_text: req.body.message_text,
    timestamp: new Date().toISOString(),
  });

  // Notify the receiver that they got a message, unless messaging themself.
  if (String(userId) !== String(otherUserId)) {
    const sender = db.users.find((u) => String(u.userID) === String(userId));
    const senderName = sender?.username || "someone";
    db.notifications.push({
      notificationID: genId(),
      userID: otherUserId,
      fromUserID: userId,
      type: "message",
      content: `You have a new message from ${senderName}`,
      read: false,
      timestamp: new Date().toISOString(),
    });
  }

  writeDB(db);
  success(res, { message: "Message sent successfully." }, 201);
});

// ── Notifications ─────────────────────────────────────────────────────

router.get("/:userId/notifications", (req, res) => {
  const db = readDB();
  const data = db.notifications.filter(
    (n) => String(n.userID) === req.params.userId,
  );
  success(res, { data });
});

router.put("/:userId/notifications/mark-all-read", (req, res) => {
  const db = readDB();
  const { userId } = req.params;
  let updated = 0;
  db.notifications.forEach((n) => {
    if (String(n.userID) === userId && !n.read) {
      n.read = true;
      updated += 1;
    }
  });
  writeDB(db);
  success(res, { message: `${updated} notification(s) marked as read.` });
});

router.delete("/:userId/notifications/delete-all", (req, res) => {
  const db = readDB();
  const { userId } = req.params;
  const before = db.notifications.length;
  db.notifications = db.notifications.filter(
    (n) => String(n.userID) !== userId,
  );
  const removed = before - db.notifications.length;
  writeDB(db);
  success(res, { message: `${removed} notification(s) deleted.` });
});

router.put("/:userId/notifications/mark-read/:notificationId", (req, res) => {
  const db = readDB();
  const notif = db.notifications.find(
    (n) =>
      String(n.notificationID) === req.params.notificationId &&
      String(n.userID) === req.params.userId,
  );
  if (!notif) return fail(res, 404, "Notification not found.");
  notif.read = true;
  writeDB(db);
  success(res, { message: "Notification marked as read successfully." });
});

router.delete("/:userId/notifications/delete/:notificationId", (req, res) => {
  const db = readDB();
  const before = db.notifications.length;
  db.notifications = db.notifications.filter(
    (n) =>
      !(
        String(n.notificationID) === req.params.notificationId &&
        String(n.userID) === req.params.userId
      ),
  );
  if (db.notifications.length === before)
    return fail(res, 404, "Notification not found.");
  writeDB(db);
  success(res, { message: "Notification deleted successfully." });
});

// ── Groups this user belongs to ──────────────────────────────────────

router.get("/:userId/groups", (req, res) => {
  const db = readDB();
  const user = db.users.find((u) => String(u.userID) === req.params.userId);
  if (!user) return fail(res, 404, "User not found.");
  const groupIds = (user.groups || []).map(String);
  const data = db.groups.filter((g) => groupIds.includes(String(g.groupID)));
  success(res, { data });
});

export default router;