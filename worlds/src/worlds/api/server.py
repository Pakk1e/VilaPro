from __future__ import annotations

import json
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

from worlds.simulation import (
    SimulationRequest,
    SimulationRequestError,
    SimulationService,
    SimulationServiceError,
)

HOST = "0.0.0.0"
PORT = 8001


class WorldsAPIHandler(BaseHTTPRequestHandler):
    ALLOWED_ORIGINS = {
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "https://vadovsky-tech.com",
        "https://www.vadovsky-tech.com",
    }

    def _send_cors_headers(self):
        origin = self.headers.get("Origin")
        if origin in self.ALLOWED_ORIGINS:
            self.send_header("Access-Control-Allow-Origin", origin)
            self.send_header("Access-Control-Allow-Credentials", "true")
        self.send_header("Vary", "Origin")

    def _send_json(self, status: int, payload: dict):
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self._send_cors_headers()
        self.end_headers()
        self.wfile.write(body)

    def _read_json(self):
        content_length = self.headers.get("Content-Length")
        if not content_length:
            raise ValueError("Missing Content-Length")
        try:
            length = int(content_length)
        except ValueError as exc:
            raise ValueError("Invalid Content-Length") from exc
        raw = self.rfile.read(length)
        try:
            return json.loads(raw.decode("utf-8"))
        except json.JSONDecodeError as exc:
            raise ValueError("Invalid JSON") from exc

    def do_OPTIONS(self):
        if self.path != "/simulate":
            self.send_response(404)
            self._send_cors_headers()
            self.end_headers()
            return
        self.send_response(204)
        self.send_header("Access-Control-Allow-Methods", "POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self._send_cors_headers()
        self.end_headers()

    def do_GET(self):
        if self.path == "/health":
            self._send_json(200, {"ok": True, "service": "worlds"})
            return
        self._send_json(404, {"ok": False, "error": "Not found"})

    def do_POST(self):
        if self.path != "/simulate":
            self._send_json(404, {"ok": False, "error": "Not found"})
            return

        try:
            request = SimulationRequest.from_dict(self._read_json())

            response = SimulationService().simulate(
                request.world_source,
                instances=list(request.instances),
                simulation=request.simulation.to_dict(),
            )

            self._send_json(
                200,
                {
                    "ok": True,
                    "analysis": response.analysis,
                    "status": response.status,
                    "node_voltages": response.node_voltages,
                    "branch_currents": response.branch_currents,
                    "components": response.components,
                },
            )

        except (SimulationRequestError, SimulationServiceError, ValueError) as exc:
            self._send_json(400, {"ok": False, "error": str(exc)})
        except Exception as exc:
            self._send_json(500, {"ok": False, "error": str(exc)})

    def log_message(self, format, *args):
        print(f"[WorldsAPI] {self.address_string()} - {format % args}")


def create_server():
    return ThreadingHTTPServer((HOST, PORT), WorldsAPIHandler)


def main() -> None:
    server = create_server()
    print(f"Worlds API listening on http://{HOST}:{PORT}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nStopping Worlds API...")
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
