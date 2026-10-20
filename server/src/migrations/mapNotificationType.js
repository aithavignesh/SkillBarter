const TARGET_NOTIFICATION_TYPES = new Set([
  "exchange_request",
  "exchange_update",
  "message",
  "review",
  "post_like",
  "post_comment",
  "system"
]);

/**
 * Convert a source notification type only when an explicit, reviewed mapping exists.
 * This deliberately has no implicit normalization or fallback: source values must be
 * inventoried first, and unknown values must be reviewed rather than silently changed.
 */
export function mapNotificationType(sourceType, explicitMap) {
  if (typeof sourceType !== "string" || sourceType.length === 0) {
    throw new TypeError("Source notification type must be a non-empty string");
  }
  if (!explicitMap || typeof explicitMap !== "object" || !Object.hasOwn(explicitMap, sourceType)) {
    throw new Error(`Unmapped source notification type: ${sourceType}`);
  }

  const targetType = explicitMap[sourceType];
  if (!TARGET_NOTIFICATION_TYPES.has(targetType)) {
    throw new Error(`Invalid target notification type for source value ${sourceType}`);
  }
  return targetType;
}

export const targetNotificationTypes = Object.freeze([...TARGET_NOTIFICATION_TYPES]);
