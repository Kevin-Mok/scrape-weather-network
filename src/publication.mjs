import { mkdir, open, readFile, rename, rm } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { put as blobPut } from '@vercel/blob';
import { validateFeed } from './feed.mjs';
export async function publishAndSave(
  feed,
  output,
  { token, put = blobPut, local = false } = {},
) {
  validateFeed(feed);
  if (!local && !token)
    throw new Error(
      'Set BLOB_READ_WRITE_TOKEN in private configuration, or use --local',
    );
  const catalog = join(dirname(output), 'weather-conditions.json');
  if (resolve(output) === resolve(catalog))
    throw new Error(
      'weather-conditions.json is reserved for the condition catalog',
    );
  let conditions = [];
  try {
    conditions = JSON.parse(await readFile(catalog, 'utf8'));
    if (
      !Array.isArray(conditions) ||
      conditions.some((value) => typeof value !== 'string' || !value.trim())
    )
      throw new Error('Expected an array of nonempty condition names');
  } catch (error) {
    if (error.code !== 'ENOENT')
      throw new Error(
        `Cannot read condition catalog ${catalog}; repair or restore it before retrying`,
        { cause: error },
      );
  }
  conditions = [
    ...new Set([
      ...conditions,
      ...feed.hourly.map((row) => row.condition).filter((value) => value !== null),
    ]),
  ].sort();
  const body = JSON.stringify(feed, null, 2) + '\n';
  await mkdir(dirname(output), { recursive: true });
  const candidate = `${output}.${randomUUID()}.tmp`;
  const catalogCandidate = `${catalog}.${randomUUID()}.tmp`;
  let result = null;
  try {
    const file = await open(candidate, 'wx', 0o600);
    try {
      await file.writeFile(body);
      await file.sync();
    } finally {
      await file.close();
    }
    const catalogFile = await open(catalogCandidate, 'wx', 0o600);
    try {
      await catalogFile.writeFile(JSON.stringify(conditions, null, 2) + '\n');
      await catalogFile.sync();
    } finally {
      await catalogFile.close();
    }
    if (!local)
      result = await put('weather/scarborough-hourly.json', body, {
        access: 'public',
        addRandomSuffix: false,
        allowOverwrite: true,
        cacheControlMaxAge: 60,
        contentType: 'application/json',
        token,
      });
    await rename(catalogCandidate, catalog);
    await rename(candidate, output);
    return result;
  } finally {
    await Promise.all([
      rm(candidate, { force: true }),
      rm(catalogCandidate, { force: true }),
    ]);
  }
}
