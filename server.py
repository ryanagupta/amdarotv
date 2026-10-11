#!/usr/bin/env python3
"""
Amdaro TV - Dedicated Media Station X (MSX) HTTP Server
Runs a local web server with full CORS headers, auto-detects LAN IP,
and dynamically substitutes {PREFIX} and {SERVER} in all JSON files.
"""

import sys
import socket
import os
from http.server import HTTPServer, SimpleHTTPRequestHandler

PORT = 8080

def get_lan_ip():
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(('8.8.8.8', 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return '127.0.0.1'

class CORSRequestHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, HEAD')
        self.send_header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Range')
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200, "OK")
        self.end_headers()

    def do_GET(self):
        # Serve dynamic JSON with resolved tokens
        clean_path = self.path.split('?')[0].lstrip('/')
        if not clean_path:
            clean_path = 'index.html'

        file_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), clean_path)

        if os.path.isfile(file_path) and clean_path.endswith('.json'):
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    content = f.read()

                host_header = self.headers.get('Host', f"{get_lan_ip()}:{PORT}")
                content = content.replace('{PREFIX}', 'http://').replace('{SERVER}', host_header)

                body = content.encode('utf-8')
                self.send_response(200)
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self.send_header('Content-Length', str(len(body)))
                self.end_headers()
                self.wfile.write(body)
                return
            except Exception as e:
                self.send_error(500, str(e))
                return

        return super().do_GET()

def run():
    ip = get_lan_ip()
    port = PORT
    if len(sys.argv) > 1:
        try:
            port = int(sys.argv[1])
        except ValueError:
            pass

    server_address = ('0.0.0.0', port)
    
    try:
        httpd = HTTPServer(server_address, CORSRequestHandler)
    except OSError:
        port = port + 1
        server_address = ('0.0.0.0', port)
        httpd = HTTPServer(server_address, CORSRequestHandler)

    msx_address = f"{ip}:{port}"

    print("=" * 64)
    print("           AMDARO TV - MEDIA STATION X SERVER")
    print("=" * 64)
    print(f" Web Server Active on: http://{msx_address}/")
    print("-" * 64)
    print(" INSTRUCTIONS FOR YOUR TV (LG webOS / Media Station X):")
    print(" 1. Open the 'Media Station X' app on your TV.")
    print(" 2. Navigate to: Settings -> Start Parameter -> Setup")
    print(" 3. In the input box, enter ONLY this (NO forward slashes):")
    print(f"    -->  {msx_address}  <--")
    print(" 4. Press OK / click the checkmark.")
    print(" 5. Amdaro TV will automatically launch full screen!")
    print("=" * 64)
    print("Press Ctrl+C to stop the server.\n")

    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n[MSX Server] Server stopped.")

if __name__ == '__main__':
    run()
