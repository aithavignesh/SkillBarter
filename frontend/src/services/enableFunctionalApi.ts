import { api } from './api';
import { functionalApi } from './functionalApi';

// The legacy API facade still contains migration guards for modules that have moved to InsForge.
// Override only those guards with the direct InsForge implementations so existing screens keep
// their current imports while their actions become real database operations.
const target = api as any;
for (const name of [
  'getMe','getUserProfile','updateMe','getNearbyUsers','addUserSkill','deleteUserSkill',
  'getMatches','connectNeighbor','disconnectNeighbor','proposeExchange','getExchanges',
  'acceptExchange','completeExchange','getNotifications','markNotificationRead',
  'markAllNotificationsRead','sendMessage','getFeed','createPost','likePost'
]) {
  if (typeof (functionalApi as any)[name] === 'function') {
    target[name] = (functionalApi as any)[name].bind(functionalApi);
  }
}
