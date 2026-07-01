# smp-backend

Plain Express mock backend — no database, just reads/writes db.json on disk.
Routes and response shapes match Endpoints.csv exactly.

## Run

    npm install
    npm start          # or: npm run dev  (auto-restarts on file changes)

Starts on http://localhost:3000

## Response shape

Success:  { "status": "success", "data": ... }            (GET)
          { "status": "success", "message": "..." }        (POST/PUT/DELETE)
Error:    { "status": "error", "message": "..." }

## Notes

- db.json is the database. Every write (POST/PUT/DELETE) persists straight
  back to this file — restart the server to reset to whatever's on disk,
  or hand-edit db.json between runs.
- Two collections were added beyond the ER diagram, since nothing in the
  diagram backs group membership or group chat but Endpoints.csv requires
  both: `group_members` ({ groupID, userID }) and `group_messages`
  ({ groupMessageID, groupID, userID, message_text, timestamp }).
- IDs are plain strings generated at request time (see utils/db.js genId).
