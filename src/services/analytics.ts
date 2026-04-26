// Analytics abstraction. Callers always import from here so we
// can swap providers (PostHog, Amplitude, Mixpanel) in one place.

type Properties = Record<string, unknown>;

interface Analytics {
  init: () => void;
  track: (event: string, properties?: Properties) => void;
  setUser: (userId: string, properties?: Properties) => void;
  identify: (userId: string, properties?: Properties) => void;
  group: (groupId: string, groupType: string, properties?: Properties) => void;
}

const noopAnalytics: Analytics = {
  init: () => undefined,
  track: () => undefined,
  setUser: () => undefined,
  identify: () => undefined,
  group: () => undefined,
};

let analytics: Analytics = noopAnalytics;
let initialised = false;

export function initAnalytics(): void {
  if (initialised) return;
  initialised = true;

  const postHogToken = process.env.EXPO_PUBLIC_POSTHOG_TOKEN;
  const postHogHost = process.env.EXPO_PUBLIC_POSTHOG_HOST;

  if (postHogToken && postHogHost) {
    try {
      // Lazy load PostHog to avoid bundling if not configured
      // import('posthog-react-native').then(({ default: PostHog }) => {
      //   analytics = {
      //     init: () => {
      //       PostHog.init(postHogToken, {
      //         host: postHogHost,
      //         flushAt: 1,
      //       });
      //     },
      //     track: (event, properties) => PostHog.capture(event, properties),
      //     setUser: (userId, properties) => PostHog.register(userId, properties),
      //     identify: (userId, properties) => PostHog.identify(userId, properties),
      //     group: (groupId, groupType, properties) => {
      //       PostHog.group(groupType, groupId, properties);
      //     },
      //   };
      //   analytics.init();
      // });
    } catch (e) {
      console.warn('[analytics] PostHog not configured or failed to load');
    }
  }
}

export function trackEvent(event: string, properties?: Properties): void {
  analytics.track(event, properties);
}

export function setUser(userId: string, properties?: Properties): void {
  analytics.setUser(userId, properties);
}

export function identifyUser(userId: string, properties?: Properties): void {
  analytics.identify(userId, properties);
}

export function setGroup(groupId: string, groupType: string, properties?: Properties): void {
  analytics.group(groupId, groupType, properties);
}
