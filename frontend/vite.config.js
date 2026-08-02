/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'

function playLogPlugin() {
  const logsDir = path.resolve(__dirname, '..', 'logs')

  return {
    name: 'play-log',
    configureServer(server) {
      server.middlewares.use('/api/logs', (req, res, next) => {
        if (req.method === 'GET') {
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ status: 'ok' }))
          return
        }

        if (req.method !== 'POST') {
          next()
          return
        }

        const sessionId = req.url?.replace(/^\//, '') || 'default'
        let body = ''

        req.on('data', (chunk) => { body += chunk })
        req.on('end', () => {
          try {
            if (!fs.existsSync(logsDir)) {
              fs.mkdirSync(logsDir, { recursive: true })
            }

            const filePath = path.join(logsDir, `session-${sessionId}.json`)
            let existing = []
            if (fs.existsSync(filePath)) {
              existing = JSON.parse(fs.readFileSync(filePath, 'utf-8'))
            }

            const entry = JSON.parse(body)
            if (Array.isArray(entry)) {
              existing.push(...entry)
            } else {
              existing.push(entry)
            }

            fs.writeFileSync(filePath, JSON.stringify(existing, null, 2))

            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ status: 'ok', count: existing.length }))
          } catch (err) {
            console.error('[play-log] Error:', err)
            res.statusCode = 500
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ status: 'error', message: String(err) }))
          }
        })
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), playLogPlugin()],
  server: {
    port: 5173,
    host: "localhost",
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test-setup.ts"],
    exclude: ["e2e/**", "node_modules/**"],
    coverage: {
      provider: "v8",
      include: ["src/**/*.{ts,tsx}"],
      exclude: ["src/test-setup.ts", "src/testUtils.ts", "**/*.spec.*", "**/*.test.*"],
      thresholds: {
        statements: 60,
        branches: 50,
        functions: 50,
        lines: 60,
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ["react", "react-dom"],
          motion: ["framer-motion"],
          state: ["zustand"],
        },
      },
    },
  },
})
