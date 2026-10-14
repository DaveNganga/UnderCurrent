#!/usr/bin/env python3
"""Local-only static server; no packages, accounts, or network downloads required."""
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
import argparse
import functools
import webbrowser
parser=argparse.ArgumentParser()
parser.add_argument('--port',type=int,default=5173)
parser.add_argument('--open',action='store_true')
args=parser.parse_args()
root=Path(__file__).resolve().parent
class Handler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control','no-cache')
        super().end_headers()
try:
    server=ThreadingHTTPServer(('127.0.0.1',args.port),functools.partial(Handler,directory=str(root)))
except OSError as e:
    raise SystemExit(f'Could not start on port {args.port}: {e}\nTry: python3 server.py --port 5174 --open')
url=f'http://127.0.0.1:{args.port}'
print(f'UNDERCURRENT is ready: {url}\nKeep this window open while playing. Ctrl+C stops the game server.',flush=True)
if args.open:webbrowser.open(url)
try:server.serve_forever()
except KeyboardInterrupt:server.server_close()
