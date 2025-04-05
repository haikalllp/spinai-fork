import http from "http";
import url from "url";
import fs from "fs";
import path from "path";

const PORT = process.env.PORT || 3000;
const API_DIR = path.join(process.cwd(), "api");

// Create a simple HTTP server
const server = http.createServer(async (req, res) => {
  try {
    // Parse URL
    const parsedUrl = url.parse(req.url || "", true);
    let { pathname, query } = parsedUrl;

    // Collect request body for POST/PUT requests
    const chunks: Buffer[] = [];

    req.on("data", (chunk) => {
      chunks.push(Buffer.from(chunk));
    });

    req.on("end", async () => {
      try {
        // Convert body to JSON if present
        const body =
          chunks.length > 0 ? JSON.parse(Buffer.concat(chunks).toString()) : {};

        // Create Vercel-like request object
        const vercelReq: any = {
          query,
          cookies: {},
          headers: req.headers,
          body,
          method: req.method,
          url: req.url,
        };

        // Create Vercel-like response object
        const vercelRes: any = {
          status: (statusCode: number) => {
            res.statusCode = statusCode;
            return vercelRes;
          },
          json: (data: any) => {
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify(data));
            return vercelRes;
          },
          send: (data: any) => {
            res.end(data);
            return vercelRes;
          },
          setHeader: (name: string, value: string) => {
            res.setHeader(name, value);
            return vercelRes;
          },
          getHeader: (name: string) => {
            return res.getHeader(name);
          },
          removeHeader: (name: string) => {
            res.removeHeader(name);
            return vercelRes;
          },
          end: (data?: any) => {
            res.end(data);
            return vercelRes;
          },
        };

        // Handle API routes dynamically
        try {
          // Remove trailing slash if present
          pathname = pathname?.replace(/\/$/, "") || "";

          // Default to /api/index if root path
          if (pathname === "" || pathname === "/") {
            pathname = "/api/index";
          }

          // If not an api route and doesn't start with /api, add it
          if (!pathname.startsWith("/api")) {
            pathname = `/api${pathname}`;
          }

          // Convert URL path to file path
          let filePath = pathname.replace(/^\/api/, "");

          // If path is empty, use index
          if (filePath === "") {
            filePath = "/index";
          }

          // Try different file extensions and variations
          const possiblePaths = [
            path.join(API_DIR, `${filePath}.ts`), // /api/users.ts
            path.join(API_DIR, `${filePath}.js`), // /api/users.js
            path.join(API_DIR, `${filePath}/index.ts`), // /api/users/index.ts
            path.join(API_DIR, `${filePath}/index.js`), // /api/users/index.js
            path.join(API_DIR, filePath.substring(1) + ".ts"), // api/users.ts (without leading slash)
            path.join(API_DIR, filePath.substring(1) + ".js"), // api/users.js (without leading slash)
          ];

          let handlerPath: string | undefined = undefined;

          // Find the first path that exists
          for (const possiblePath of possiblePaths) {
            if (fs.existsSync(possiblePath)) {
              handlerPath = possiblePath;
              break;
            }
          }

          if (!handlerPath) {
            console.warn(`No handler found for ${pathname}`);
            res.statusCode = 404;
            res.end(
              JSON.stringify({ error: `API route ${pathname} not found` })
            );
            return;
          }

          // Log the request
          console.log(
            `[${new Date().toISOString()}] ${
              req.method
            } ${pathname} -> ${path.relative(process.cwd(), handlerPath)}`
          );

          // Load the handler dynamically
          const handlerModule = await import(`file://${handlerPath}`);
          const handler = handlerModule.default;

          if (typeof handler !== "function") {
            throw new Error(`Handler for ${pathname} is not a function`);
          }

          // Call the handler
          await handler(vercelReq, vercelRes);
        } catch (err) {
          console.error(`Error handling ${pathname}:`, err);
          res.statusCode = 500;
          res.end(
            JSON.stringify({
              error: "Internal Server Error",
              details: (err as Error).message,
            })
          );
        }
      } catch (err) {
        console.error("Error processing request:", err);
        res.statusCode = 500;
        res.end(JSON.stringify({ error: "Internal Server Error" }));
      }
    });
  } catch (err) {
    console.error("Server error:", err);
    res.statusCode = 500;
    res.end(JSON.stringify({ error: "Internal Server Error" }));
  }
});

server.listen(PORT, () => {
  console.log(`🚀 Development server running at http://localhost:${PORT}`);
  console.log(`API endpoints are available at:`);
  console.log(`  http://localhost:${PORT}/api/[endpoint]`);
  console.log(`  http://localhost:${PORT}/[endpoint]`);
  console.log(`Press Ctrl+C to stop`);
});
