import { insforge } from '../lib/insforge';
import { hydrateMonetizationState } from './monetization';

void (async () => {
  try {
    const auth = await insforge.auth.getCurrentUser();
    const email = auth.data?.user?.email;
    if (!auth.error && email) {
      const result = await insforge.database.from('users').select('id').eq('email', email).maybeSingle();
      if (!result.error && result.data?.id) await hydrateMonetizationState(Number(result.data.id));
    }
  } catch (error) {
    console.warn('Monetization hydration skipped:', error);
  }
})();
