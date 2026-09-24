"""Dev server that disables caching.

The plain http.server sends Last-Modified, and embedded preview panes will
happily serve a stale styles.css / main.js for the whole session. This makes
every response no-store so a refresh always shows the current files.
Production hosting is unaffected — this is only for local preview.
"""
import functools, http.server, socketserver, sys

class NoCache(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store, must-revalidate")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()

    def log_message(self, fmt, *args):
        sys.stderr.write("%s\n" % (fmt % args))

port = int(sys.argv[1]) if len(sys.argv) > 1 else 4173
socketserver.TCPServer.allow_reuse_address = True
with socketserver.TCPServer(("", port), NoCache) as httpd:
    print(f"serving on http://localhost:{port} (no-cache)")
    httpd.serve_forever()
