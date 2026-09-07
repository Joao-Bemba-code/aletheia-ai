import asyncio
import json
import urllib.request
import websockets


def start_session():
    body = json.dumps({
        "participant_id": "teste-001",
        "session_name": "Entrevista Teste",
    }).encode("utf-8")
    req = urllib.request.Request(
        "http://127.0.0.1:8000/session/start",
        data=body,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode("utf-8"))


async def send_transcript(session_id):
    uri = f"ws://127.0.0.1:8000/ws/{session_id}"
    async with websockets.connect(uri) as ws:
        msg = {
            "type": "transcript",
            "text": "Eu acho que nao sei se podemos considerar isto completamente verdadeiro, mas sim, eu juro que sim. Eh... hm... na verdade nao tenho certeza se deveria afirmar isso.",
        }
        await ws.send(json.dumps(msg))
        response = await asyncio.wait_for(ws.recv(), timeout=5)
        data = json.loads(response)
        print(json.dumps(data, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    session = start_session()
    print(f"Sessao criada: {session['session_id']}")
    asyncio.run(send_transcript(session["session_id"]))