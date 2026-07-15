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
  const out = document.getElementById('test-output') || document.body;
  let html = '<h2>Tests</h2>';

  for (const t of tests) {
    try {
      const ret = t.fn();
      if (ret instanceof Promise) await ret;
      passed++;
      html += `<div class="pass">\u2713 ${t.name}</div>`;
    } catch (e) {
      failed++;
      html += `<div class="fail">\u2717 ${t.name}<br><span class="err">${e.message}</span></div>`;
    }
  }

  const total = passed + failed;
  const ok = failed === 0;
  html += `<div class="summary ${ok ? 'pass' : 'fail'}">${passed}/${total} passed${failed ? `, ${failed} failed` : ''}</div>`;
  out.innerHTML = html;
}

export { passed, failed };
