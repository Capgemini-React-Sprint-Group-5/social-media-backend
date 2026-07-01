import express from "express";
import cors from "cors";

import usersRouter from "./routes/users.routes.js";
import postRouter from "./routes/post.routes.js";
import postsRouter from "./routes/posts.routes.js";
import commentsRouter from "./routes/comments.routes.js";
import messagesRouter from "./routes/messages.routes.js";
import friendsRouter from "./routes/friends.routes.js";
import groupsRouter from "./routes/groups.routes.js";

const app = express();

app.use(cors());
app.use(express.json());

app.use("/Users", usersRouter);
app.use("/Post", postRouter); // singular — matches Endpoints.csv
app.use("/Posts", postsRouter); // plural — comments/likes nested under a post
app.use("/Comments", commentsRouter);
app.use("/Messages", messagesRouter);
app.use("/Friends", friendsRouter);
app.use("/Groups", groupsRouter);

// Unmatched routes
app.use((req, res) => {
  res.status(404).json({ status: "error", message: "Route not found." });
});

// Malformed JSON body, etc. — keep the same response shape as everything else
app.use((err, req, res, next) => {
  res.status(400).json({ status: "error", message: err.message });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`SMP mock backend running on http://localhost:${PORT}`);
});
