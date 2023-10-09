from fastapi import FastAPI, WebSocket
from apify_client import ApifyClient
import uvicorn
import re
import requests

app = FastAPI()

b_clients = {}
a_client = None

@app.websocket("/")
async def websocket_a(websocket: WebSocket):
	await websocket.accept()

	businesses = await websocket.receive_json()

	run_input = {
		"start_urls": [],
		"max_depth": 3,
	}
	for business in businesses:
		run_input['start_urls'].append({"url":f"https://www.google.com/search?q={business}"})
	res = {
		"type":"apify",
		"ref": "google..."
	}
	await websocket.send_json(res)
	client = ApifyClient("apify_api_6rpqhqCT3sS0K3nlf9P8Yq7CVQqbRn4B9FfQ")
	run = client.actor("olivine_oyster/google-search").call(run_input=run_input)

	total = len(run_input["start_urls"])

	result = client.dataset(run["defaultDatasetId"]).iterate_items()
	for index, item in enumerate(result):
		email = ''
		for url in item['url']:
			try:
				response = requests.get(url, timeout=30)
				email = re.findall(r"[a-z0-9\.\-+_]+@[a-z0-9\.\-+_]+\.[a-z]+", response.text)[0]
			except:
				pass
			if email:
				break
		res = {
			"type":"requests",
			"ref": {
				"status":[index, total],
				"email": email
			}
		}
		await websocket.send(res)

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0")