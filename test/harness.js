const tests = [];
let running = false;
let passed = 0;
let failed = 0;

export function test(name, fn) {
  if (running) throw new Error(`test() appelée après le lancement : "${name}"`);
  tests.push({ name, fn });
}

export function assert(cond, msg) {
  if (!cond) throw new Error(msg || 'Assertion failed');
}

export function assertEq(a, b, msg) {
  if (a !== b) throw new Error(
    msg || `Expected ${JSON.stringify(a)} === ${JSON.stringify(b)}`
  );
}

export async function run() {
  running = true;
  passed = 0;
  failed = 0;
  let out;
  try { out = document.getElementById('test-output') || document.body; } catch {}

  for (const t of tests) {
    try {
      const ret = t.fn();
      if (ret instanceof Promise) await ret;
      passed++;
      if (out) out.innerHTML += `<div class="pass">\u2713 ${t.name}</div>`;
      else console.log(`  \u2713 ${t.name}`);
    } catch (e) {
      failed++;
      const msg = `\u2717 ${t.name} \u2014 ${e.message}`;
      if (out) out.innerHTML += `<div class="fail">${msg}</div>`;
      else console.log(`  ${msg}`);
    }
  }

  const total = passed + failed;
  const ok = failed === 0;
  const summary = `${passed}/${total} passed${failed ? `, ${failed} failed` : ''}`;
  if (out) out.innerHTML += `<div class="summary ${ok ? 'pass' : 'fail'}">${summary}</div>`;
  else console.log(`---\n${summary}`);
}

export { passed, failed };
