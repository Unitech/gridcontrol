#!/usr/bin/python
from BaseHTTPServer import BaseHTTPRequestHandler,HTTPServer
import os

PORT_NUMBER = int(os.environ['TASK_PORT'])

class myHandler(BaseHTTPRequestHandler):
    #Handler for the GET requests
    def do_GET(self):
        self.send_response(200)
        self.send_header('Content-type','text/data')
        self.end_headers()
        self.wfile.write("Hello World !")
        return

server = HTTPServer(('', PORT_NUMBER), myHandler)
server.serve_forever()
