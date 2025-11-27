export default ({ config }) => {
  return {
    ...config,
    extra: {
      ...config.extra,
      nativeNotifyAppId: process.env.NATIVE_NOTIFY_APP_ID,
      nativeNotifyAppToken: process.env.NATIVE_NOTIFY_APP_TOKEN,
    },
  };
};
