import { spawn } from 'node:child_process';
import assert from 'node:assert/strict';

const container = process.argv[2] ?? 'loc34-postgres';
function sql(query) {
  return new Promise((resolve, reject) => {
    const child = spawn('docker', ['exec', container, 'psql', '-U', 'postgres', '-At', '-v', 'ON_ERROR_STOP=1', '-c', query]);
    let output = '';
    child.stdout.on('data', data => { output += data; });
    child.stderr.on('data', data => { output += data; });
    child.on('error', reject);
    child.on('close', code => code === 0 ? resolve(output) : reject(new Error(output)));
  });
}
const identity = "set role authenticated; set request.jwt.claim.sub='00000000-0000-0000-0000-000000000006';";
const results = await Promise.all(Array.from({ length: 20 }, (_, i) => sql(identity +
  (i % 2 ? "select save_discovery_source('skipped');" : "select save_discovery_source('submitted','douyin');"))));
const answers = results.map(output => JSON.parse(output.trim().split('\n').at(-1)));
for (const answer of answers) assert.deepEqual(answer, answers[0]);
assert.equal((await sql("select count(*) from discovery_sources where user_id='00000000-0000-0000-0000-000000000006';")).trim(), '1');
console.log('PASS: 20 concurrent submit/skip requests converge on one immutable response', answers[0]);
