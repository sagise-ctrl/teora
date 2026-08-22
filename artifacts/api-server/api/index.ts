import { createServer } from "node:http";
import { toNodeJsHandler } from "@vercel/node";
import app from "../src/app.ts";

const server = createServer(app);

export default toNodeJsHandler(server);
