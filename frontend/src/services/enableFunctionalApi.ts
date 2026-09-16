import { api } from './api';
import { functionalApi } from './functionalApi';
import { exchangeFunctionalApi } from './exchangeFunctionalApi';
import './enableSocialApi';

// The legacy API facade still contains migration guards for modules that have moved to InsForge.
// Override those guards with direct InsForge implementations while keeping existing imports stable.
const target = api as any;
for (const name of [
  'getMe','getUserProfile','updateMe','getNearbyUsers','addUserSkill','deleteUserSkill',
  'getMatches','connectNeighbor','disconnectNeighbor','proposeExchange','getExchanges',
  'acceptExchange','completeExchange','getNotifications','markNotificationRead',
  'markAllNotificationsRead','sendMessage','getFeed','createPost','likePost'
]) {
  if (typeof (functionalApi as any)[name] === 'function') target[name] = (functionalApi as any)[name].bind(functionalApi);
}

for (const name of ['rejectExchange','cancelExchange','getExchangeDetails']) {
  if (typeof (exchangeFunctionalApi as any)[name] === 'function') target[name] = (exchangeFunctionalApi as any)[name].bind(exchangeFunctionalApi);
}
