import test from 'node:test';
import assert from 'node:assert/strict';
import { safeUrl, cookieMetadata, failureReason, safeArguments } from '../src/diagnostics.mjs';

test('diagnostics redact URL credentials, query values and fragments while retaining names', () => {
  assert.equal(safeUrl('https://user:password@example.com/hourly?_guid_iss_=secret&token=hidden#private'), 'https://example.com/hourly?_guid_iss_=REDACTED&token=REDACTED');
  assert.equal(safeUrl('not a URL'), 'REDACTED');
  assert.equal(safeUrl('/hourly?token=private', 'https://example.com/original'), 'https://example.com/hourly?token=REDACTED');
});
test('cookie metadata never retains values or arbitrary nested fields', () => {
  assert.deepEqual(cookieMetadata({ name: 'guid', value: 'secret', domain: '.example.com', path: '/', secure: true, httpOnly: false, sameSite: 'None', expires: 123, nested: { token: 'private' } }), { name: 'guid', domain: '.example.com', path: '/', secure: true, httpOnly: false, sameSite: 'None', expires: 123 });
});
test('failures retain known browser reasons without leaking URLs, headers or values', () => {
  assert.equal(failureReason(new Error('page.goto: net::ERR_TOO_MANY_REDIRECTS at https://example.com/?token=secret Cookie: guid=private')), 'net::ERR_TOO_MANY_REDIRECTS');
  assert.equal(failureReason(new Error('Timeout 45000ms exceeded at https://example.com/?token=secret')), 'TIMEOUT');
  assert.equal(failureReason(new Error('Cookie: secret')), 'BROWSER_OR_EXTRACTION_FAILURE');
});
test('effective arguments retain flag names and redact profile and proxy values', () => {
  assert.deepEqual(safeArguments('/opt/chrome --headless=new --user-data-dir=/tmp/private --proxy-server=https://u:secret@proxy --no-sandbox\0'), ['--headless=REDACTED', '--user-data-dir=REDACTED', '--proxy-server=REDACTED', '--no-sandbox']);
});

test('scheduled rejections retain safe actionable categories',()=>{
 assert.equal(failureReason(new Error('Stale, future or inconsistent source generation timestamp')),'SOURCE_GENERATION_INVALID');
 assert.equal(failureReason(new Error('Structured and rendered hourly forecasts disagree')),'SOURCE_DISAGREEMENT');
 assert.equal(failureReason(new Error('Navigation did not reach the exact forecast source')),'FINAL_URL_MISMATCH');
});

test('coverage, schema and rendered-field rejections have distinct safe codes',()=>{
 for(const [message,code] of [
  ['Invalid near-term structured coverage','SOURCE_COVERAGE_INVALID'],
  ['Structured hourly coverage mismatch','STRUCTURED_SCHEMA_INVALID'],
  ['Malformed source UTC timestamp','SOURCE_TIME_INVALID'],
  ['Malformed wind: arbitrary private text','RENDERED_FIELD_INVALID'],
  ['Missing hourly field #private-selector','MISSING_DOM_FIELD'],
 ]) assert.equal(failureReason(new Error(message)),code);
});
