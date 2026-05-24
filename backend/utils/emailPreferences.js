const DEFAULT_EMAIL_NOTIFICATIONS = {
  newFollower: true,
  newMessage: true,
  missedCall: true,
  newComment: true,
  newReaction: true,
  contentPublished: true,
};

const resolveEmailNotificationSettings = (user = {}) => {
  const fromUser = user?.emailNotifications || {};
  return {
    ...DEFAULT_EMAIL_NOTIFICATIONS,
    ...fromUser,
    // Keep content-published system controlled (not user-toggleable)
    contentPublished: true,
  };
};

const isEmailNotificationEnabled = (user, key) => {
  const settings = resolveEmailNotificationSettings(user);
  return settings[key] !== false;
};

module.exports = {
  DEFAULT_EMAIL_NOTIFICATIONS,
  resolveEmailNotificationSettings,
  isEmailNotificationEnabled,
};
