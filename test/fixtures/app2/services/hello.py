#!/usr/bin/python
from BaseHTTPServer import BaseHTTPRequestHandler,HTTPServer
import os

# We can access to the port the HTTP server have to listen to via TASK_PORT
PORT_NUMBER = int(os.environ['TASK_PORT'])

class myHandler(BaseHTTPRequestHandler):
    def do_POST(self):
        self.send_response(200)
        self.send_header('Content-type','application/json')
        self.end_headers()
        # EXECUTE APPLICATION LOGIC HERE AND RETURN JSON
        content_len = int(self.headers.getheader('content-length', 0))
        post_body = self.rfile.read(content_len)
        self.wfile.write('{"success" : true, "app": "python"}')

server = HTTPServer(('', PORT_NUMBER), myHandler)
server.serve_forever()
