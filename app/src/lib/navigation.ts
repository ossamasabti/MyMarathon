import { router, type Href } from 'expo-router';

/** Go back, or to `fallback` when there is no history (e.g. after a page reload on the web). */
export function goBack(fallback: Href = '/') {
  if (router.canGoBack()) router.back();
  else router.replace(fallback);
}
