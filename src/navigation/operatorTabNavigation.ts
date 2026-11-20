import { CommonActions, type NavigationState } from 'expo-router/react-navigation';

const TAB_NAMES = ['home', 'requests', 'sync', 'profile'];

/** Operator tabs are roots, not another screen pushed above an old task flow. */
export function operatorTabAction(state: NavigationState, href: string) {
  const target = TAB_NAMES.find(name => href === `/(drone)/${name}`);
  if (!target || !state.routeNames.includes(target)) return null;

  // Keep the original route keys (and mounted list state), collapse legacy
  // duplicate roots, and discard nested task history only on an explicit tab tap.
  const roots = state.routes.filter((route, index, routes) =>
    TAB_NAMES.includes(route.name) && routes.findIndex(item => item.name === route.name) === index);
  const targetIndex = roots.findIndex(route => route.name === target);
  // Pop to an existing root in its original order. Reordering mounted native
  // stack screens can leave Android's visible scene detached from router state.
  const routes = targetIndex >= 0 ? roots.slice(0, targetIndex + 1) : [...roots, { name: target }];
  if (state.index === state.routes.length - 1 && routes.length === state.routes.length &&
    routes.every((route, index) => route === state.routes[index])) return null;

  // SDK 58 requires a complete state. The router mints a key for a first visit;
  // existing keys/params are retained. Target only the Operator navigator.
  return { ...CommonActions.reset({ ...state, routes, index: routes.length - 1 }), target: state.key };
}
