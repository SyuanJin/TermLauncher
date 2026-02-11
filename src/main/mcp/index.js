/**
 * MCP Server 模組
 * 提供 Streamable HTTP transport 的 MCP Server，讓 AI 助手操控 TermLauncher
 */
const http = require('http');
const { createLogger } = require('../logger');

const logger = createLogger('MCP');

let httpServer = null;
let cachedModules = null;

/**
 * 動態載入 ESM 模組（MCP SDK + Zod）
 */
async function loadModules() {
  if (cachedModules) return cachedModules;
  const { McpServer } = await import('@modelcontextprotocol/sdk/server/mcp.js');
  const { StreamableHTTPServerTransport } =
    await import('@modelcontextprotocol/sdk/server/streamableHttp.js');
  const { z } = await import('zod');
  cachedModules = { McpServer, StreamableHTTPServerTransport, z };
  return cachedModules;
}

/**
 * 建立 MCP Server 實例並註冊所有工具
 */
function createMcpServer(McpServer, z) {
  const version = require('../../../package.json').version;

  const server = new McpServer({
    name: 'termlauncher',
    version,
  });

  // 註冊所有工具
  const { registerProjectTools } = require('./tools/projects');
  const { registerLauncherTools } = require('./tools/launchers');
  const { registerGroupTools } = require('./tools/groups');
  const { registerFavoriteTools } = require('./tools/favorites');
  const { registerRecentTools } = require('./tools/recent');

  registerProjectTools(server, z);
  registerLauncherTools(server, z);
  registerGroupTools(server, z);
  registerFavoriteTools(server, z);
  registerRecentTools(server, z);

  return server;
}

/**
 * 讀取 HTTP 請求 body（限制 1MB）
 */
const MAX_BODY_SIZE = 1024 * 1024; // 1MB

function readRequestBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', chunk => {
      data += chunk;
      if (data.length > MAX_BODY_SIZE) {
        req.destroy();
        reject(new Error('Request body too large'));
      }
    });
    req.on('end', () => {
      try {
        resolve(data ? JSON.parse(data) : undefined);
      } catch {
        reject(new Error('Invalid JSON'));
      }
    });
    req.on('error', reject);
  });
}

/**
 * 啟動 MCP Server
 * @param {number} port - 監聽埠號
 * @returns {Promise<Object>} { success, port?, error? }
 */
async function startMcpServer(port = 23549) {
  if (httpServer) {
    logger.warn('MCP Server already running');
    return { success: false, error: 'already-running' };
  }

  const { McpServer, StreamableHTTPServerTransport, z } = await loadModules();

  httpServer = http.createServer(async (req, res) => {
    const url = new URL(req.url, `http://127.0.0.1:${port}`);
    if (url.pathname !== '/mcp') {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Not found' }));
      return;
    }

    if (req.method === 'POST') {
      try {
        const body = await readRequestBody(req);
        const transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: undefined, // 無狀態模式
        });
        const server = createMcpServer(McpServer, z);
        await server.connect(transport);
        await transport.handleRequest(req, res, body);
        await server.close();
      } catch (err) {
        logger.error('MCP request error', err);
        if (!res.headersSent) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Internal server error' }));
        }
      }
    } else if (req.method === 'GET' || req.method === 'DELETE') {
      // 無狀態模式不支援 SSE 和 session 終止
      res.writeHead(405, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Method not allowed (stateless mode)' }));
    } else {
      res.writeHead(405, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Method not allowed' }));
    }
  });

  return new Promise(resolve => {
    httpServer.on('error', err => {
      logger.error('MCP Server error', err);
      httpServer = null;
      if (err.code === 'EADDRINUSE') {
        resolve({ success: false, error: 'port-in-use' });
      } else {
        resolve({ success: false, error: err.message });
      }
    });

    httpServer.listen(port, '127.0.0.1', () => {
      logger.info(`MCP Server started on http://127.0.0.1:${port}/mcp`);
      resolve({ success: true, port });
    });
  });
}

/**
 * 停止 MCP Server
 * @returns {Promise<Object>} { success, error? }
 */
async function stopMcpServer() {
  if (!httpServer) {
    return { success: false, error: 'not-running' };
  }

  return new Promise(resolve => {
    httpServer.close(() => {
      logger.info('MCP Server stopped');
      httpServer = null;
      resolve({ success: true });
    });
  });
}

/**
 * 取得 MCP Server 狀態
 * @returns {Object} { running, port? }
 */
function getMcpStatus() {
  return {
    running: !!httpServer,
    port: httpServer ? httpServer.address()?.port : null,
  };
}

module.exports = {
  startMcpServer,
  stopMcpServer,
  getMcpStatus,
};
