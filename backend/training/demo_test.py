import asyncio
import json
import urllib.request
import websockets


def start_session():
    body = json.dumps({
        "participant_id": "demo-001",
        "session_name": "Demo Expo Go",
    }).encode("utf-8")
    req = urllib.request.Request(
        "http://127.0.0.1:8000/session/start",
        data=body,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode("utf-8"))


async def run_demo(session_id):
    uri = f"ws://127.0.0.1:8000/ws/{session_id}"
    async with websockets.connect(uri) as ws:
        for i in range(5):
            msg = {
                "type": "multi_modal",
                "width": 640,
                "height": 480,
            }
            await ws.send(json.dumps(msg))
            response = await asyncio.wait_for(ws.recv(), timeout=10)
            data = json.loads(response)
            print(f"[{i + 1}] {json.dumps(data, ensure_ascii=False)}")
        resp = await asyncio.wait_for(ws.recv(), timeout=10)
        print("status:", json.dumps(json.loads(resp), ensure_ascii=False))


if __name__ == "__main__":
    session = start_session()
    print(f"Sessao criada: {session['session_id']}")
    asyncio.run(run_demo(session["session_id"]))