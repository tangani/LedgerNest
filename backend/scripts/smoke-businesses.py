#!/usr/bin/env python3
"""Run against the local ledgerlocal backend. Creates clearly named test businesses; never deletes data."""
import argparse
import json
import uuid
from concurrent.futures import ThreadPoolExecutor
from datetime import date, timedelta
from urllib.error import HTTPError
from urllib.request import Request, urlopen

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--base-url', default='http://127.0.0.1:8080')
args = parser.parse_args()
base = args.base_url.rstrip('/') + '/api/v1/businesses'
created = []

def request(method, path='', body=None, expected=200):
    payload = None if body is None else json.dumps(body).encode()
    req = Request(base + path, data=payload, method=method, headers={'Content-Type': 'application/json'})
    try:
        with urlopen(req, timeout=15) as response:
            status, data = response.status, json.load(response)
    except HTTPError as error:
        status = error.code
        data = json.loads(error.read())
    if expected is not None:
        assert status == expected, (method, path, status, expected, data)
    return status, data

def create():
    _, business = request('POST', body={'name': 'API smoke test ' + str(uuid.uuid4())[:8], 'currency': 'ZAR'}, expected=201)
    created.append(business['id'])
    print('Created test business:', business['id'], flush=True)
    return business

def transaction(kind, amount):
    return {'id': str(uuid.uuid4()), 'kind': kind, 'amount': amount, 'date': date.today().isoformat(), 'notes': 'API smoke test'}

def metadata(business, **changes):
    return dict({'name': business['name'], 'currency': business['currency'], 'description': 'Updated by smoke test', 'version': business['version']}, **changes)

def totals(business, contributed, returned):
    assert (business['contributed'], business['returned'], business['invested']) == (contributed, returned, contributed-returned), business

try:
    request('GET', '?limit=0', expected=400)
    request('GET', '/' + str(uuid.uuid4()), expected=404)
    request('POST', body={'name': ' ', 'currency': 'ZAR'}, expected=400)
    request('POST', body={'name': 'Invalid currency', 'currency': 'EUR'}, expected=400)
    business = create()
    path = '/' + business['id']
    totals(business, 0, 0)
    assert business['version'] == 0
    _, business = request('PUT', path, metadata(business))
    assert business['version'] == 1
    request('PUT', path, metadata(business, version=0), expected=409)
    request('PUT', path, {'name': 'No version', 'currency': 'ZAR'}, expected=400)
    request('POST', path+'/transactions', transaction('capital_return', 1), expected=409)
    contribution = transaction('contribution', 100000)
    _, funded = request('POST', path+'/transactions', contribution)
    totals(funded, 100000, 0)
    _, retried = request('POST', path+'/transactions', contribution)
    assert retried == funded, 'Retry must not change version, totals, or transaction history'
    request('POST', path+'/transactions', {**contribution, 'amount': 1}, expected=409)
    request('PUT', path, metadata(funded, currency='USD'), expected=409)
    request('PUT', path, metadata(business), expected=409)  # A transaction invalidates older metadata versions.
    for bad in [transaction('profit', 1), transaction('contribution', 0), transaction('contribution', -1),
                {**transaction('contribution', 1), 'date': (date.today()+timedelta(days=2)).isoformat()}]:
        request('POST', path+'/transactions', bad, expected=400)
    _, after_return = request('POST', path+'/transactions', transaction('capital_return', 25000))
    totals(after_return, 100000, 25000)
    request('POST', path+'/transactions', transaction('capital_return', 75001), expected=409)
    # Two simultaneous returns cannot both spend the same remaining capital.
    with ThreadPoolExecutor(max_workers=2) as pool:
        futures = [pool.submit(request, 'POST', path+'/transactions', transaction('capital_return', 50000), None) for _ in range(2)]
        statuses = sorted(f.result()[0] for f in futures)
    assert statuses == [200, 409], statuses
    _, final = request('GET', path)
    totals(final, 100000, 75000)
    assert len(final['transactions']) == 3
    # Simultaneous retries of one ID add exactly one contribution.
    simultaneous = transaction('contribution', 100)
    with ThreadPoolExecutor(max_workers=2) as pool:
        futures = [pool.submit(request, 'POST', path+'/transactions', simultaneous) for _ in range(2)]
        for future in futures:
            future.result()
    _, final = request('GET', path)
    totals(final, 100100, 75000)
    assert len(final['transactions']) == 4
    other = create()
    other_path = '/' + other['id']
    request('POST', other_path+'/transactions', contribution, expected=409)
    _, unchanged = request('GET', other_path)
    totals(unchanged, 0, 0)
    assert unchanged['version'] == 0, 'Cross-business duplicate must roll back'
    # Check cumulative bound without approaching Long overflow.
    request('POST', other_path+'/transactions', transaction('contribution', 100000000000))
    request('POST', other_path+'/transactions', transaction('contribution', 1), expected=409)
    _, page = request('GET', '?limit=1&offset=0')
    assert len(page) == 1
    print('PASS: CRUD subset, validation, version conflicts, currency lock, derived totals, retry idempotency, concurrent returns, concurrent duplicate contributions, rollback and money limit.')
finally:
    print('Test businesses retained (no deletion performed):', ', '.join(created))
