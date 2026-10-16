#!/usr/bin/env python3
"""Run against the local API. Creates two labelled test debts; does not delete data."""
import concurrent.futures
import datetime
import json
import urllib.error
import urllib.request
import uuid

BASE = 'http://127.0.0.1:8080/api/v1/debts'

def call(method, path='', body=None, expected=200):
    data = None if body is None else json.dumps(body).encode()
    request = urllib.request.Request(BASE + path, data=data, method=method,
                                     headers={'Content-Type': 'application/json'})
    try:
        with urllib.request.urlopen(request, timeout=15) as response:
            status, raw = response.status, response.read()
    except urllib.error.HTTPError as error:
        status, raw = error.code, error.read()
    result = json.loads(raw) if raw else None
    if expected is not None:
        assert status == expected, (method, path, status, result)
    return status, result

suffix = str(uuid.uuid4())[:8]
request = {'person': 'Smoke test ' + suffix, 'direction': 'receivable',
           'currency': 'ZAR', 'principal': 100000, 'purpose': 'Local API test'}
_, debt = call('POST', body=request, expected=201)
path = '/' + debt['id']
assert debt['outstanding'] == 100000 and debt['version'] == 0
_, loaded = call('GET', path)
assert loaded['id'] == debt['id']
call('GET', '?limit=0', expected=400)
call('POST', body={**request, 'principal': -1}, expected=400)
call('POST', body={**request, 'person': '   '}, expected=400)
payment = {'id': str(uuid.uuid4()), 'amount': 25000,
           'date': datetime.date.today().isoformat(), 'notes': 'Partial repayment'}
_, paid = call('POST', path + '/repayments', payment)
assert paid['outstanding'] == 75000 and paid['repaid'] == 25000 and paid['version'] == 1
_, retried = call('POST', path + '/repayments', payment)
assert len(retried['repayments']) == 1 and retried['outstanding'] == 75000
call('POST', path + '/repayments', {**payment, 'amount': 24000}, expected=409)
call('POST', path + '/repayments', {**payment, 'id': str(uuid.uuid4()), 'amount': 75001}, expected=409)
call('PUT', path, {**request, 'version': 0}, expected=409)
call('PUT', path, {**request, 'version': 1, 'principal': 20000}, expected=409)
call('PUT', path, {**request, 'version': 1, 'currency': 'USD'}, expected=409)
_, updated = call('PUT', path, {**request, 'version': 1, 'person': 'Edited smoke ' + suffix})
assert updated['version'] == 2

def concurrent_payment(_):
    return call('POST', path + '/repayments',
                {**payment, 'id': str(uuid.uuid4()), 'amount': 50000}, expected=None)[0]

with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
    statuses = list(pool.map(concurrent_payment, range(2)))
assert sorted(statuses) == [200, 409], statuses
_, final = call('GET', path)
assert final['outstanding'] == 25000 and len(final['repayments']) == 2
# A payment UUID must not be reusable on a different debt.
_, second = call('POST', body={**request, 'person': 'Second smoke ' + suffix}, expected=201)
call('POST', '/' + second['id'] + '/repayments', payment, expected=409)
print('PASS: create/read/edit, validation, stale updates, payment retries, limits, concurrent payments')
print('Test debts retained:', debt['id'], second['id'])
