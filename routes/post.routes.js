import { Router } from "express";
import { readDB, writeDB, genId } from "../utils/db.js";
import { success, fail } from "../utils/respond.js";

// Mounted at /api/post (singular — matches Endpoints.csv exactly)

const router = Router();

router.get("/:postId", (req, res) => {
  const db = readDB();
  const post = db.posts.find((p) => String(p.postID) === req.params.postId);
  if (!post) return fail(res, 404, "Post not found.");
  success(res, { data: post });
});

router.post("/", (req, res) => {
  const db = readDB();
  db.posts.push({
    postID: genId(),
    timestamp: new Date().toISOString(),
    ...req.body,
  });
  writeDB(db);
  success(res, { message: "Post created successfully." }, 201);
});

router.put("/update/:postId", (req, res) => {
  const db = readDB();
  const post = db.posts.find((p) => String(p.postID) === req.params.postId);
  if (!post) return fail(res, 404, "Post not found.");
  Object.assign(post, req.body);
  writeDB(db);
  success(res, { message: "Post updated successfully." });
});

router.delete("/delete/:postId", (req, res) => {
  const db = readDB();
  const before = db.posts.length;
  db.posts = db.posts.filter((p) => String(p.postID) !== req.params.postId);
  if (db.posts.length === before) return fail(res, 404, "Post not found.");
  writeDB(db);
  success(res, { message: "Post deleted successfully." });
});

export default router;
