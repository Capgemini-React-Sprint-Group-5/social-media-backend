// Two tiny helpers so every route replies in the same shape:
//   success → { status: "success", data: ... }  or  { status: "success", message: "..." }
//   fail    → { status: "error", message: "..." }

export const success = (res, payload, code = 200) =>
  res.status(code).json({ status: 'success', ...payload })

export const fail = (res, code, message) =>
  res.status(code).json({ status: 'error', message })
