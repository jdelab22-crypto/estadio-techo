# Servidor de la vista previa (puerto 3390). Además de servir archivos, recibe
# POST /guardar?nombre=x con un PNG y lo escribe en tomas/x.png (solo localhost).
import functools, http.server as h, os, re, urllib.parse
RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
class N(h.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-cache'); super().end_headers()
    def do_POST(self):
        u = urllib.parse.urlparse(self.path)
        nombre = re.sub(r'[^a-z0-9_-]', '', urllib.parse.parse_qs(u.query).get('nombre', [''])[0].lower())
        if u.path != '/guardar' or not nombre:
            self.send_response(400); self.end_headers(); return
        datos = self.rfile.read(int(self.headers.get('Content-Length', 0)))
        os.makedirs(os.path.join(RAIZ, 'tomas'), exist_ok=True)
        with open(os.path.join(RAIZ, 'tomas', nombre + '.png'), 'wb') as f: f.write(datos)
        self.send_response(201); self.end_headers()
h.ThreadingHTTPServer(('127.0.0.1', 3390), functools.partial(N, directory=RAIZ)).serve_forever()
