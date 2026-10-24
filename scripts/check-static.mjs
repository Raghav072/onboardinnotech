// Static guardrails (Milestones 1 to 3). Run with: npm run check:static
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, extname } from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const failures = [];
const fail = (msg) => failures.push(msg);

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name === '.next') continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

const sourceFiles = [...walk(join(root, 'src')), ...walk(join(root, 'public'))].filter((f) =>
  ['.ts', '.tsx', '.css', '.svg', '.json', '.webmanifest'].includes(extname(f)),
);

// 1. Removed features must not exist in the shipped source.
const FORBIDDEN = [/achievement/i, /premium/i, /roadmap/i, /subscri/i, /composer/i, /info hub/i];
// 2. Old prototype palette must be gone.
const OLD_PALETTE = [/#6757e8/i, /#dff8ef/i, /#eeeaff/i];
// 3. Nothing secret-shaped in source.
const SECRETS = [/AIza[0-9A-Za-z_-]{20,}/, /sk[-_](live|test)[-_][A-Za-z0-9]{10,}/, /-----BEGIN [A-Z ]*PRIVATE KEY-----/, /eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{10,}\./];

for (const file of sourceFiles) {
  const text = readFileSync(file, 'utf8');
  const rel = file.slice(root.length);
  // Narrow exception: the messaging thread needs one Supabase Realtime channel method.
  // Mask only that exact method token; all other removed-feature references remain blocked.
  let checkedText = text;
  if (rel === 'src/components/messaging/MessageThread.tsx') {
    const calls = text.match(/\.subscribe\s*\(/g) ?? [];
    if (calls.length !== 1) fail(`${rel}: expected exactly one Realtime channel lifecycle call, found ${calls.length}`);
    checkedText = text.replace(/\.subscribe\s*\(/g, '.realtimeAttach(');
  }
  for (const re of FORBIDDEN) if (re.test(checkedText)) fail(`${rel}: removed-feature term ${re}`);
  for (const re of OLD_PALETTE) if (re.test(text)) fail(`${rel}: old prototype colour ${re}`);
  for (const re of SECRETS) if (re.test(text)) fail(`${rel}: secret-like value ${re}`);
}

// 4. Brand palette present, exactly.
const brand = readFileSync(join(root, 'src/lib/brand.ts'), 'utf8');
for (const hex of ['#2391FF', '#FFF83F', '#FFCD54', '#F70063']) {
  if (!brand.includes(hex)) fail(`src/lib/brand.ts: missing ${hex}`);
}

// 5. Env hygiene.
const gitignore = readFileSync(join(root, '.gitignore'), 'utf8');
if (!/^\.env$/m.test(gitignore) || !gitignore.includes('!.env.example')) fail('.gitignore must ignore .env files and keep .env.example');
for (const f of readdirSync(root)) {
  if (f.startsWith('.env') && f !== '.env.example') fail(`${f}: real env file must not be in the project`);
}
if (existsSync(join(root, '.env.example'))) {
  for (const line of readFileSync(join(root, '.env.example'), 'utf8').split('\n')) {
    const m = /^([A-Z0-9_]+)=(.*)$/.exec(line);
    if (!m) continue;
    const [, key, value] = m;
    if (value && !['false', 'staging'].includes(value)) fail(`.env.example: ${key} must be a placeholder, found a value`);
    if (key.startsWith('NEXT_PUBLIC_') && /SERVICE|SECRET|MERCHANT/.test(key)) fail(`.env.example: ${key} must not be public`);
  }
} else fail('.env.example missing');

// 6. Server-only secrets must never be referenced from src in Milestone 1.
for (const file of sourceFiles) {
  const text = readFileSync(file, 'utf8');
  if (/process\.env\.(SUPABASE_SERVICE_ROLE_KEY|GEMINI_API_KEY|PAYTM_)/.test(text)) fail(`${file.slice(root.length)}: reads a server secret before its milestone`);
}

// 7. Milestone 2: the service-role key must never be used by app code.
for (const file of sourceFiles) {
  const rel = file.slice(root.length);
  const text = readFileSync(file, 'utf8');
  if (/SUPABASE_SERVICE_ROLE|createClient\([^)]*service/i.test(text)) fail(`${rel}: references the Supabase service-role key`);
  if (/service_role/.test(text) && rel !== 'src/lib/env.ts') fail(`${rel}: mentions service_role (only src/lib/env.ts may, to REJECT such keys)`);
}

// 8. Client components must not import server-only modules.
for (const file of sourceFiles.filter((f) => /\.tsx?$/.test(f))) {
  const text = readFileSync(file, 'utf8');
  if (/^['"]use client['"]/m.test(text.split('\n').slice(0, 3).join('\n')) && /supabase\/server|supabase\/middleware|next\/headers/.test(text))
    fail(`${file.slice(root.length)}: client component imports a server-only module`);
}

// 9. Every table created in a migration must enable Row Level Security.
const migDir = join(root, 'supabase/migrations');
if (existsSync(migDir)) {
  const sql = readdirSync(migDir).filter((f) => f.endsWith('.sql')).map((f) => readFileSync(join(migDir, f), 'utf8')).join('\n');
  for (const m of sql.matchAll(/create table\s+(?:if not exists\s+)?(public\.\w+)/gi)) {
    const t = m[1].replace('.', '\\.');
    if (!new RegExp(`alter table\\s+${t}\\s+enable row level security`, 'i').test(sql)) fail(`supabase/migrations: ${m[1]} has no "enable row level security"`);
  }
  if (/using\s*\(\s*true\s*\)/i.test(sql)) fail('supabase/migrations: a policy uses "using (true)"');
}

// 10. Milestone 3: every SQL function must pin its search_path, and discovery must stay on the safe path.
if (existsSync(migDir)) {
  for (const f of readdirSync(migDir).filter((n) => n.endsWith('.sql'))) {
    const text = readFileSync(join(migDir, f), 'utf8').replace(/--.*$/gm, '');
    for (const block of text.split(/create (?:or replace )?function /i).slice(1)) {
      const name = /^([\w.]+)/.exec(block)?.[1] ?? '?';
      if (!/set search_path\s*=/i.test(block.split(/\$\$;/)[0] ?? block)) fail(`supabase/migrations/${f}: function ${name} does not set search_path`);
    }
  }
}
const DISCOVERY_FILES = sourceFiles.filter((f) => /src\/(lib\/discovery|components\/people|app\/(discover|alumni|people))\//.test(f));
for (const file of DISCOVERY_FILES) {
  const text = readFileSync(file, 'utf8');
  const rel = file.slice(root.length);
  if (/\.from\(\s*['"`](profiles|private_profiles)['"`]/.test(text)) fail(`${rel}: discovery code must not query base profile tables`);
  if (/private_profiles/.test(text)) fail(`${rel}: discovery code must not reference private_profiles`);
}

if (failures.length) {
  console.error(`check-static: ${failures.length} problem(s)`);
  for (const f of failures) console.error(' - ' + f);
  process.exit(1);
}
console.log(`check-static: OK (${sourceFiles.length} files scanned)`);
