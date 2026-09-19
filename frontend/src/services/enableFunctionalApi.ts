import { api } from './api';
import { functionalApi } from './functionalApi';
import { exchangeFunctionalApi } from './exchangeFunctionalApi';
import { connectionRequestsApi } from './connectionRequestsApi';
import './enableSocialApi';

// The legacy API facade still contains migration guards for modules that have moved to InsForge.
// Override those guards with direct InsForge implementations while keeping existing imports stable.
const target = api as any;
for (const name of [
  'getMe','getUserProfile','updateMe','getNearbyUsers','addUserSkill','deleteUserSkill',
  'getMatches','connectNeighbor','disconnectNeighbor','proposeExchange','getExchanges',
  'acceptExchange','completeExchange','updateExchangeSchedule','getNotifications','markNotificationRead',
  'markAllNotificationsRead','sendMessage','getFeed','createPost','likePost','getReviews','submitReview','getTrustDetails'
]) {
  if (typeof (functionalApi as any)[name] === 'function') target[name] = (functionalApi as any)[name].bind(functionalApi);
}

// LinkedIn-style connection requests are handled separately so the existing
// exchange/matching APIs remain unchanged.
for (const name of ['connectNeighbor','getConnectionRequests','acceptConnectionRequest','rejectConnectionRequest','getConnectionStatus']) {
  if (typeof (connectionRequestsApi as any)[name] === 'function') target[name] = (connectionRequestsApi as any)[name].bind(connectionRequestsApi);
}

for (const name of ['rejectExchange','cancelExchange','getExchangeDetails']) {
  if (typeof (exchangeFunctionalApi as any)[name] === 'function') target[name] = (exchangeFunctionalApi as any)[name].bind(exchangeFunctionalApi);
}
