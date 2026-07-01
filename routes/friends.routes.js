import { Router } from "express";
import { readDB, writeDB, genId } from "../utils/db.js";
import { success, fail } from "../utils/respond.js";

const router = Router();

router.get("/:friendshipId/messages", (req, res) => {
  const db = readDB();
  const friendship = db.friends.find(
    (f) => String(f.friendshipID) === req.params.friendshipId,
  );
  if (!friendship) return fail(res, 404, "Friendship not found.");
  const { userID1, userID2 } = friendship;
  const data = db.messages.filter(
    (m) =>
      (String(m.senderID) === String(userID1) &&
        String(m.receiverID) === String(userID2)) ||
      (String(m.senderID) === String(userID2) &&
        String(m.receiverID) === String(userID1)),
  );
  success(res, { data });
});

router.post("/:friendshipId/messages/send", (req, res) => {
  const db = readDB();
  const friendship = db.friends.find(
    (f) => String(f.friendshipID) === req.params.friendshipId,
  );
  if (!friendship) return fail(res, 404, "Friendship not found.");
  const { senderID, message_text } = req.body;
  const receiverID =
    String(senderID) === String(friendship.userID1)
      ? friendship.userID2
      : friendship.userID1;
  db.messages.push({
    messageID: genId(),
    senderID,
    receiverID,
    message_text,
    timestamp: new Date().toISOString(),
  });
  writeDB(db);
  success(res, { message: "Message sent successfully." }, 201);
});

export default router;
