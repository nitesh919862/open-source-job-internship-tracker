import 'dotenv/config';
import crypto from 'crypto';
import readline from 'readline';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { connectDatabase, isMongoActive } from '../config/db.ts';
import { repository } from '../services/repository.ts';
import { isValidEmail } from '../utils/validators.ts';

const FORBIDDEN_PASSWORDS = new Set([
  'adminpassword123!',
  'seekerpassword123!',
  'password123!',
  'admin123456',
  'changeme123!',
  '123456789012',
]);

function parseCliArgs(argv: string[]): {
  email?: string;
  password?: string;
  name?: string;
  generate: boolean;
  promote: boolean;
  resetPassword: boolean;
} {
  const result: {
    email?: string;
    password?: string;
    name?: string;
    generate: boolean;
    promote: boolean;
    resetPassword: boolean;
  } = {
    generate: false,
    promote: false,
    resetPassword: false,
  };

  for (const arg of argv) {
    if (arg.startsWith('--email=')) {
      result.email = arg.slice('--email='.length).trim();
    } else if (arg.startsWith('--password=')) {
      result.password = arg.slice('--password='.length);
    } else if (arg.startsWith('--name=')) {
      result.name = arg.slice('--name='.length).trim();
    } else if (arg === '--generate') {
      result.generate = true;
    } else if (arg === '--promote') {
      result.promote = true;
    } else if (arg === '--reset-password') {
      result.resetPassword = true;
    }
  }

  return result;
}

function generateStrongPassword(length = 22): string {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lower = 'abcdefghijkmnopqrstuvwxyz';
  const digits = '23456789';
  const symbols = '!@#$%^&*()-_=+[]{}';
  const all = upper + lower + digits + symbols;

  const pick = (chars: string) => chars[crypto.randomInt(0, chars.length)];
  const required = [pick(upper), pick(lower), pick(digits), pick(symbols)];
  const rest = Array.from({ length: Math.max(8, length - required.length) }, () => pick(all));
  const combined = [...required, ...rest];

  for (let i = combined.length - 1; i > 0; i -= 1) {
    const j = crypto.randomInt(0, i + 1);
    [combined[i], combined[j]] = [combined[j], combined[i]];
  }
  return combined.join('');
}

function validateStrongPassword(password: string): string | null {
  if (password.length < 12) {
    return 'Admin password must be at least 12 characters long.';
  }
  if (FORBIDDEN_PASSWORDS.has(password.toLowerCase())) {
    return 'Cannot use a known demo or weak default password for an admin account.';
  }
  if (!/[A-Z]/.test(password)) {
    return 'Admin password must include at least one uppercase letter.';
  }
  if (!/[a-z]/.test(password)) {
    return 'Admin password must include at least one lowercase letter.';
  }
  if (!/[0-9]/.test(password)) {
    return 'Admin password must include at least one digit.';
  }
  if (!/[^A-Za-z0-9]/.test(password)) {
    return 'Admin password must include at least one special character.';
  }
  return null;
}

function promptLine(question: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

function promptHidden(question: string): Promise<string> {
  return new Promise((resolve) => {
    const stdin = process.stdin;
    const stdout = process.stdout;
    stdout.write(question);

    if (!stdin.isTTY) {
      const rl = readline.createInterface({ input: stdin, output: stdout });
      rl.question('', (ans) => {
        rl.close();
        resolve(ans);
      });
      return;
    }

    stdin.resume();
    stdin.setRawMode(true);
    stdin.setEncoding('utf8');

    let value = '';
    const onData = (ch: string) => {
      if (ch === '\n' || ch === '\r' || ch === '\u0004') {
        stdin.setRawMode(false);
        stdin.pause();
        stdin.removeListener('data', onData);
        stdout.write('\n');
        resolve(value);
      } else if (ch === '\u0003') {
        stdin.setRawMode(false);
        stdout.write('\n');
        process.exit(1);
      } else if (ch === '\u007f' || ch === '\b') {
        if (value.length > 0) {
          value = value.slice(0, -1);
          stdout.write('\b \b');
        }
      } else {
        value += ch;
        stdout.write('*');
      }
    };

    stdin.on('data', onData);
  });
}

async function main() {
  const args = parseCliArgs(process.argv.slice(2));

  let email = (args.email || process.env.ADMIN_INIT_EMAIL || '').trim().toLowerCase();
  let name = (args.name || process.env.ADMIN_INIT_NAME || '').trim();
  let password = args.password || process.env.ADMIN_INIT_PASSWORD || '';
  let generatedPassword = false;

  if (!email && process.stdin.isTTY) {
    email = (await promptLine('Admin email: ')).toLowerCase();
  }
  if (!name && process.stdin.isTTY) {
    name = await promptLine('Admin full name (default: Platform Administrator): ');
  }
  if (!name) {
    name = 'Platform Administrator';
  }

  if (!isValidEmail(email)) {
    throw new Error(
      'A valid unique admin email is required. Pass --email=you@domain.com or set ADMIN_INIT_EMAIL.'
    );
  }
  if (email === 'admin@opentrack.dev' || email === 'seeker@opentrack.dev') {
    throw new Error(
      'Refusing to initialize a production/manual admin with reserved sample email addresses.'
    );
  }

  if (args.generate) {
    password = generateStrongPassword(22);
    generatedPassword = true;
  } else if (!password && process.stdin.isTTY) {
    password = await promptHidden(
      'Admin password (min 12 chars, upper/lower/digit/symbol, or leave blank to generate): '
    );
    if (!password) {
      password = generateStrongPassword(22);
      generatedPassword = true;
    } else {
      const confirm = await promptHidden('Confirm admin password: ');
      if (password !== confirm) {
        throw new Error('Passwords do not match.');
      }
    }
  }

  if (!password) {
    throw new Error(
      'Admin password is required. Set ADMIN_INIT_PASSWORD, pass --password=..., or pass --generate.'
    );
  }

  const pwError = validateStrongPassword(password);
  if (pwError) {
    throw new Error(pwError);
  }

  await connectDatabase();
  if (process.env.NODE_ENV === 'production' && !isMongoActive()) {
    throw new Error('Production admin initialization requires an active MONGODB_URI connection.');
  }

  const existing = await repository.findUserByEmail(email);
  const passwordHash = await bcrypt.hash(password, 12);

  if (existing) {
    if (existing.role === 'admin' && !args.resetPassword) {
      console.log(`[InitAdmin] Admin account already exists for ${email} (no changes made).`);
      return;
    }
    if (existing.role === 'user' && !args.promote) {
      throw new Error(
        `A standard user already exists for ${email}. Pass --promote to elevate this account to admin.`
      );
    }

    if (existing.role !== 'admin') {
      await repository.updateUserRole(existing._id, 'admin');
    }
    if (args.resetPassword || args.promote) {
      await repository.updateUserPassword(existing._id, passwordHash);
    }

    console.log(
      `[InitAdmin] ${
        existing.role === 'admin'
          ? `Updated password for admin account ${email}.`
          : `Elevated ${email} to admin with the supplied secure password.`
      }`
    );
    if (generatedPassword) {
      console.log(`  Generated Password (store securely now, shown once): ${password}`);
    }
    return;
  }

  const created = await repository.createUser({
    name,
    email,
    passwordHash,
    role: 'admin',
    skills: ['Moderation', 'Administration'],
    headline: 'Platform Administrator',
    location: '',
    bio: '',
  });

  console.log(`[InitAdmin] Created admin account successfully:`);
  console.log(`  ID:    ${created._id}`);
  console.log(`  Name:  ${created.name}`);
  console.log(`  Email: ${created.email}`);
  console.log(`  Role:  ${created.role}`);
  if (generatedPassword) {
    console.log(`  Generated Password (store securely now, shown once): ${password}`);
  }
}

main()
  .catch((err) => {
    console.error(`[InitAdmin Error] ${err instanceof Error ? err.message : String(err)}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  });
