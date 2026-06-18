export const isNativeApp = () => {
  if (typeof window === 'undefined') return false;

  const platform = window.Capacitor?.getPlatform?.();
  return Boolean(
    window.Capacitor?.isNativePlatform?.() ||
    platform === 'android' ||
    platform === 'ios'
  );
};
