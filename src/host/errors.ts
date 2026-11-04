/**
 * Errors shared by the Host half of the Git Graph plugin.
 *
 * A {@link GitError} is a user-correctable failure: the route answers with the
 * status it carries and shows its message as-is. Anything else is a bug and is
 * reported as HTTP 500.
 */

/** A user-correctable Git failure carrying the HTTP status the route answers with. */
export class GitError extends Error {
  /** HTTP status the route should answer with. */
  readonly status: number

  /** Set when the failure left a conflicted merge/rebase behind. */
  readonly conflict?: boolean

  /**
   * @param message - text shown to the caller.
   * @param status - HTTP status to answer with.
   * @param conflict - whether a conflict marker should be added to the envelope.
   */
  constructor(message: string, status = 422, conflict = false) {
    super(message)
    this.name = 'GitError'
    this.status = status
    if (conflict) this.conflict = true
  }
}
