import assert from 'node:assert';
import {
  createOtpChallenge,
  verifyOtpChallenge,
  normalizePhone,
  sanitizeEnvValue,
  getTwilioAuthCredentials,
  mapTwilioErrorToSafeMessage,
} from './api/auth/phone/_utils.js';

console.log('Running SkillBarter OTP & Twilio Authentication Unit Tests...');

// 1. Phone Normalization Tests
assert.strictEqual(normalizePhone('7028554230'), '+917028554230');
assert.strictEqual(normalizePhone('07028554230'), '+917028554230');
assert.strictEqual(normalizePhone('+917028554230'), '+917028554230');
assert.strictEqual(normalizePhone('+14155552671'), '+14155552671');
assert.throws(() => normalizePhone('invalid'), /Enter a valid mobile number/);
console.log('  [PASS] Phone normalization');

// 2. Sanitization Tests
assert.strictEqual(sanitizeEnvValue('  "AC12345"  '), 'AC12345');
assert.strictEqual(sanitizeEnvValue("'secret_key'\r\n"), 'secret_key');
assert.strictEqual(sanitizeEnvValue('`backticked`'), 'backticked');
console.log('  [PASS] Environment value sanitization');

// 3. Challenge Cryptographic Tests
const testSecret = 'unit_test_phone_secret_key_32bytes_long!';
const challenge = createOtpChallenge('+917028554230', '123456', testSecret);
assert.strictEqual(challenge.otp, '123456');
assert.ok(challenge.token);

const valid = verifyOtpChallenge('+917028554230', '123456', challenge.token, testSecret);
assert.strictEqual(valid, true, 'Valid OTP should pass');

const wrongOtp = verifyOtpChallenge('+917028554230', '654321', challenge.token, testSecret);
assert.strictEqual(wrongOtp, false, 'Incorrect OTP must fail');

const wrongPhone = verifyOtpChallenge('+919999999999', '123456', challenge.token, testSecret);
assert.strictEqual(wrongPhone, false, 'Mismatched phone must fail');
console.log('  [PASS] OTP cryptographic challenge generation and verification');

// 4. Twilio Auth Credential Priority Tests
const origEnv = { ...process.env };

// Case A: API Key Priority
process.env.TWILIO_ACCOUNT_SID = 'AC11111111111111111111111111111111';
process.env.TWILIO_AUTH_TOKEN = 'token2222222222222222222222222222';
process.env.TWILIO_API_KEY_SID = 'SK33333333333333333333333333333333';
process.env.TWILIO_API_KEY_SECRET = 'secret444444444444444444444444444';
process.env.TWILIO_FROM_NUMBER = '+15005550006';

const apiKeyCreds = getTwilioAuthCredentials();
assert.strictEqual(apiKeyCreds.authType, 'api_key');
assert.strictEqual(apiKeyCreds.accountSid, 'AC11111111111111111111111111111111');
assert.strictEqual(
  apiKeyCreds.authHeader,
  'Basic ' + Buffer.from('SK33333333333333333333333333333333:secret444444444444444444444444444').toString('base64')
);
console.log('  [PASS] Priority 1: Twilio API Key authentication');

// Case B: Fallback to Account SID + Auth Token
delete process.env.TWILIO_API_KEY_SID;
delete process.env.TWILIO_API_KEY_SECRET;

const authTokenCreds = getTwilioAuthCredentials();
assert.strictEqual(authTokenCreds.authType, 'auth_token');
assert.strictEqual(authTokenCreds.accountSid, 'AC11111111111111111111111111111111');
assert.strictEqual(
  authTokenCreds.authHeader,
  'Basic ' + Buffer.from('AC11111111111111111111111111111111:token2222222222222222222222222222').toString('base64')
);
console.log('  [PASS] Priority 2: Account SID + Auth Token fallback');

// 5. Error Translation Mapping Tests
const err20003 = mapTwilioErrorToSafeMessage(20003, 401, 'Authenticate', {
  accountSidPrefix: 'AC',
  accountSidLength: 34,
  authCredentialLength: 32,
  authCredentialType: 'auth_token',
});
assert.ok(err20003.includes('Twilio authentication failed (20003)'));

const errSender = mapTwilioErrorToSafeMessage(21606, 400, 'Invalid sender', {});
assert.strictEqual(errSender, 'Twilio sender is invalid or not SMS-enabled.');

const errDest = mapTwilioErrorToSafeMessage(21408, 400, 'Geo blocked', {});
assert.strictEqual(errDest, 'SMS delivery to this destination is not permitted.');

const errTrial = mapTwilioErrorToSafeMessage(21608, 400, 'Unverified trial', {});
assert.strictEqual(errTrial, 'This number must be verified in the Twilio trial account.');
console.log('  [PASS] Safe error message mapping');

// Restore env
for (const key of Object.keys(process.env)) {
  if (!(key in origEnv)) delete process.env[key];
}
Object.assign(process.env, origEnv);

console.log('All OTP and Twilio authentication tests passed successfully!');
