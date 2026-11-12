"""Minimal DDP client over a raw SockJS WebSocket (stdlib only: ssl+socket, RFC 6455).
Throttled so that at most one request/call per second leaves the client."""
import json, time, random, string, socket, ssl, os, base64, struct, hashlib
HOST = "informator.poverenik.rs"
UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"

class DDP:
    def __init__(self, min_interval=1.05):
        self.min_interval = min_interval; self._last = 0.0; self.id = 0; self.buf = []
        s = socket.create_connection((HOST, 443), timeout=60)
        self.s = ssl.create_default_context().wrap_socket(s, server_hostname=HOST)
        sid = "".join(random.choice(string.ascii_lowercase + string.digits) for _ in range(8))
        path = f"/sockjs/{random.randint(100,999)}/{sid}/websocket"
        key = base64.b64encode(os.urandom(16)).decode()
        self.s.sendall((f"GET {path} HTTP/1.1\r\nHost: {HOST}\r\nUpgrade: websocket\r\nConnection: Upgrade\r\n"
                        f"Sec-WebSocket-Key: {key}\r\nSec-WebSocket-Version: 13\r\nOrigin: https://{HOST}\r\n"
                        f"User-Agent: {UA}\r\n\r\n").encode())
        hdr = b""
        while b"\r\n\r\n" not in hdr: hdr += self.s.recv(1)
        if b" 101 " not in hdr.split(b"\r\n")[0]: raise RuntimeError(hdr.decode())
        self._frames = b""
        assert self._recv_text() == "o"
        self._send({"msg": "connect", "version": "1", "support": ["1", "pre2", "pre1"]})
        while not any(m.get("msg") == "connected" for m in self.buf): self._pump()
    def _throttle(self):
        d = time.time() - self._last
        if d < self.min_interval: time.sleep(self.min_interval - d)
        self._last = time.time()
    def _ws_send(self, text):
        p = text.encode(); n = len(p); mask = os.urandom(4)
        h = bytes([0x81])
        if n < 126: h += bytes([0x80 | n])
        elif n < 65536: h += bytes([0x80 | 126]) + struct.pack(">H", n)
        else: h += bytes([0x80 | 127]) + struct.pack(">Q", n)
        self.s.sendall(h + mask + bytes(b ^ mask[i % 4] for i, b in enumerate(p)))
    def _readn(self, n):
        b = b""
        while len(b) < n:
            c = self.s.recv(n - len(b))
            if not c: raise EOFError("closed")
            b += c
        return b
    def _recv_text(self):
        data = b""
        while True:
            b1, b2 = self._readn(2); op = b1 & 0x0F; n = b2 & 0x7F
            if n == 126: n = struct.unpack(">H", self._readn(2))[0]
            elif n == 127: n = struct.unpack(">Q", self._readn(8))[0]
            pl = self._readn(n)
            if op == 0x9: continue          # ping from proxy
            if op == 0x8: raise EOFError("ws closed")
            data += pl
            if b1 & 0x80: return data.decode()
    def _send(self, m):
        self._ws_send(json.dumps([json.dumps(m)]))
    def _pump(self):
        t = self._recv_text()
        if t.startswith("a"):
            for s in json.loads(t[1:]):
                m = json.loads(s)
                if m.get("msg") == "ping": self._send({"msg": "pong"}); continue
                self.buf.append(m)
        elif t.startswith("c"): raise EOFError(t)
    def call(self, method, *params):
        self._throttle()
        self.id += 1; mid = str(self.id)
        self._send({"msg": "method", "method": method, "params": list(params), "id": mid})
        while True:
            for m in self.buf:
                if m.get("msg") == "result" and m.get("id") == mid:
                    self.buf.remove(m)
                    if "error" in m: raise RuntimeError(m["error"])
                    return m.get("result")
            self._pump()
