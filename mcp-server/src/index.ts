#!/usr/bin/env node
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createServer } from "./server.js";

async function main(): Promise<void> {
  const server = createServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  // stdio 使用中は stdout を汚染しないよう、ログは stderr へ
  console.error("skill-vending MCP server running (stdio)");
}

main().catch((err) => {
  console.error("skill-vending MCP server failed to start:", err);
  process.exit(1);
});
