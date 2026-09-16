import assert from 'node:assert';
import {
  createOtpChallenge,
  verifyOtpChallenge,
  normalizePhone,
  sanitizeEnvValue,
} from './api/auth/phone/_utils.js';
import { getSmsProviderConfig } from './api/auth/phone/smsProvider.js';

console.log('Running SkillBarter OTP Authentication Unit Tests...');

// Phone normalization
assert.strictEqual(normalizePhone('7028554230'), '+917028554230');
assert.strictEqual(normalizePhone('07028554230'), '+917028554230');
assert.strictEqual(normalizePhone('+917028554230'), '+917028554230');
assert.strictEqual(normalizePhone('+14155552671'), '+14155552671');
assert.throws(() => normalizePhone('invalid'), /Enter a valid mobile number/);
console.log('  [PASS] Phone normalization');

// Environment sanitization
assert.strictEqual(sanitizeEnvValue('  "AC12345"  '), 'AC12345');
assert.strictEqual(sanitizeEnvValue("'secret_key'\r\n"), 'secret_key');
assert.strictEqual(sanitizeEnvValue('`backticked`'), 'backticked');
console.log('  [PASS] Environment value sanitization');

// Cryptographic OTP challenge
const testSecret = 'unit_test_phone_secret_key_32bytes_long!';
const challenge = createOtpChallenge('+917028554230', '123456', testSecret);
assert.strictEqual(challenge.otp, '123456');
assert.ok(challenge.token);
assert.strictEqual(verifyOtpChallenge('+917028554230', '123456', challenge.token, testSecret), true);
assert.strictEqual(verifyOtpChallenge('+917028554230', '654321', challenge.token, testSecret), false);
assert.strictEqual(verifyOtpChallenge('+919999999999', '123456', challenge.token, testSecret), false);
console.log('  [PASS] OTP cryptographic challenge generation and verification');

// India-first SMS provider selection
const previousProvider = process.env.SMS_PROVIDER;
const previousKey = process.env.TWOFACTOR_API_KEY;
delete process.env.SMS_PROVIDER;
process.env.TWOFACTOR_API_KEY = 'test-key';
assert.strictEqual(getSmsProviderConfig().provider, '2factor');
assert.strictEqual(getSmsProviderConfig().twoFactorApiKey, 'test-key');
console.log('  [PASS] 2Factor is the default provider when no provider override is set');

if (previousProvider === undefined) delete process.env.SMS_PROVIDER;
else process.env.SMS_PROVIDER = previousProvider;
if (previousKey === undefined) delete process.env.TWOFACTOR_API_KEY;
else process.env.TWOFACTOR_API_KEY = previousKey;

console.log('All OTP authentication tests passed successfully!');
