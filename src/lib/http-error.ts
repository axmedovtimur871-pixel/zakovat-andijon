/** An error whose message is safe to show to the (admin) user, with an HTTP status. */
export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}
