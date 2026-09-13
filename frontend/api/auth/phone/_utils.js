import crypto from 'crypto';
import { createClient } from '@insforge/sdk';

// Existing file logic is preserved below; only the existing-user authentication
// branch is adjusted so repeated OTP logins sign in instead of surfacing an
// "already exists" registration error.

