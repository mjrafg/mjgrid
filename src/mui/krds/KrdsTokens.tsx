import { krdsTokensCss } from './tokens'

/** Renders the KRDS token sheet once. Put it next to MjProvider in hosts that do not ship tokens.css. */
export function KrdsTokens() {
  return <style data-krds-tokens="">{krdsTokensCss}</style>
}
