export type View =
  | "home"
  | "explore"
  | "proof"
  | "review"
  | "reviews"
  | "verify"
  | "method"
  | "about";
export function routeView(): View {
  const route = location.pathname.slice(1);
  return [
    "explore",
    "proof",
    "review",
    "reviews",
    "verify",
    "method",
    "about",
  ].includes(route)
    ? (route as View)
    : "home";
}
