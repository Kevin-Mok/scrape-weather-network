export function safeUrl(value, base) {
  try {
    const url = new URL(value, base);
    if (!['http:', 'https:', 'chrome:'].includes(url.protocol)) return url.protocol;
    const query = [...url.searchParams.keys()].map((key) => `${encodeURIComponent(key)}=REDACTED`).join('&');
    return `${url.origin}${url.pathname}${query ? '?' + query : ''}`;
  } catch { return 'REDACTED'; }
}
export function cookieMetadata(cookie = {}) {
  return Object.fromEntries(['name', 'domain', 'path', 'secure', 'httpOnly', 'sameSite', 'expires'].filter((key) => Object.hasOwn(cookie, key)).map((key) => [key, cookie[key]]));
}
export function failureReason(error) {
  const message = `${error?.message || ''} ${error?.cause?.message || ''}`;
  if (/Set BLOB_READ_WRITE_TOKEN/.test(message)) return 'CREDENTIALS_MISSING';
  if (/near-term structured coverage/.test(message)) return 'SOURCE_COVERAGE_INVALID';
  if (/structured (?:forecast|hourly|column)|hourly hydration/i.test(message)) return 'STRUCTURED_SCHEMA_INVALID';
  if (/source UTC timestamp|UTC\/local timestamp/.test(message)) return 'SOURCE_TIME_INVALID';
  if (/Missing hourly field/.test(message)) return 'MISSING_DOM_FIELD';
  if (/Missing |Malformed (?:wind|temperature|feels-like|humidity|precipitation)/.test(message)) return 'RENDERED_FIELD_INVALID';
  if (/source generation timestamp/.test(message)) return 'SOURCE_GENERATION_INVALID';
  if (/Structured and rendered hourly forecasts disagree/.test(message)) return 'SOURCE_DISAGREEMENT';
  if (/exact forecast source/.test(message)) return 'FINAL_URL_MISMATCH';
  if (/sandbox verification failed/.test(message)) return 'SANDBOX_NOT_VERIFIED';
  return message.match(/net::ERR_[A-Z_]+/)?.[0] || (/tim(?:e|ed)[ -]?out/i.test(message) ? 'TIMEOUT' : 'BROWSER_OR_EXTRACTION_FAILURE');
}
export function safeArguments(value) {
  return (value.match(/--[a-zA-Z0-9-]+(?:=[^\s\0]+)?/g) || []).map((arg) => arg.replace(/=.*/, '=REDACTED'));
}
export async function capturePage(context, page, report, cacheDisabled) {
  const session = await context.newCDPSession(page);
  const { targetInfo } = await session.send('Target.getTargetInfo');
  const targetId = targetInfo.targetId;
  const { frameTree } = await session.send('Page.getFrameTree');
  const mainFrameId = frameTree.frame.id;
  report.targets.push({ targetId, mainFrameId, initialUrl: safeUrl(page.url()) });
  const documents = new Set();
  session.on('Network.requestWillBeSent', (event) => {
    if (event.type !== 'Document') return;
    documents.add(event.requestId);
    report.documents.push({ targetId, event: 'request', requestId: event.requestId, frameId: event.frameId, mainFrame: event.frameId === mainFrameId, method: event.request.method, url: safeUrl(event.request.url), initiator: event.initiator.type, redirect: event.redirectResponse ? { status: event.redirectResponse.status, url: safeUrl(event.redirectResponse.url), destination: safeUrl(Object.entries(event.redirectResponse.headers).find(([name]) => name.toLowerCase() === 'location')?.[1] || event.request.url, event.redirectResponse.url), cacheControl: Object.entries(event.redirectResponse.headers).find(([name]) => name.toLowerCase() === 'cache-control')?.[1], fromDiskCache: event.redirectResponse.fromDiskCache } : undefined });
  });
  session.on('Network.responseReceived', (event) => {
    if (event.type === 'Document') report.documents.push({ targetId, event: 'response', requestId: event.requestId, frameId: event.frameId, mainFrame: event.frameId === mainFrameId, status: event.response.status, url: safeUrl(event.response.url), fromDiskCache: event.response.fromDiskCache });
  });
  session.on('Network.loadingFailed', (event) => {
    if (documents.has(event.requestId)) report.documents.push({ targetId, event: 'failed', requestId: event.requestId, reason: failureReason(new Error(event.errorText)) });
  });
  session.on('Network.requestWillBeSentExtraInfo', (event) => {
    report.cookies.push({ targetId, event: 'sent', requestId: event.requestId, cookies: event.associatedCookies.map(({ cookie, blockedReasons }) => ({ ...cookieMetadata(cookie), blockedReasons })) });
  });
  session.on('Network.responseReceivedExtraInfo', (event) => {
    report.cookies.push({ targetId, event: 'received', requestId: event.requestId, status: event.statusCode, blocked: event.blockedCookies.map(({ cookie, blockedReasons }) => ({ ...cookieMetadata(cookie), blockedReasons })) });
  });
  await session.send('Network.enable');
  if (cacheDisabled) await session.send('Network.setCacheDisabled', { cacheDisabled: true });
  return session;
}
