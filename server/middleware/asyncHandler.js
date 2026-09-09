// Express 4 does not catch rejected promises returned from route handlers, so
// an async handler that throws would hang the request instead of responding.
// Wrapping a handler in asyncHandler() forwards any rejection to the generic
// error-handling middleware at the bottom of server/index.js.
export function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

export default asyncHandler;
