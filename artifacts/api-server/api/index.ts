import type { VercelRequest, VercelResponse } from "@vercel/node";
import app from "./_handler";

const handler = (
  req: VercelRequest,
  res: VercelResponse
): void | Promise<void> => {
  return app(req, res);
};

export default handler;
