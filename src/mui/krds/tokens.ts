import { createTheme, type Theme } from '@mui/material'

/**
 * KRDS (Korean government design system, Standard style) tokens as consumed
 * by the grid. Every value is a CSS variable with the official light-mode
 * fallback, so the grid renders correctly in a host that defines nothing
 * and follows the host's overrides (high-contrast mode, font-size levels)
 * when it does. Source: HACCAP docs/design-system (foundations/tokens.md,
 * foundations/colors.md). Do not change the fallback HEX values.
 */
const v = (name: string, fallback: string) => `var(--krds-${name}, ${fallback})`

export const krds = {
  color: {
    textBasic: v('color-text-basic', '#1E2124'), textSubtle: v('color-text-subtle', '#464C53'), textDisabled: v('color-text-disabled', '#8A949E'),
    textPrimary: v('color-text-primary', '#0B50D0'), textDanger: v('color-text-danger', '#BD2C0F'), textSuccess: v('color-text-success', '#267337'),
    textWarning: v('color-text-warning', '#8A5C00'), textInformation: v('color-text-information', '#096AB3'), textInverse: v('color-text-basic-inverse', '#FFFFFF'),
    surfaceWhite: v('color-surface-white', '#FFFFFF'), surfaceGraySubtler: v('color-surface-gray-subtler', '#F4F5F6'), surfaceGraySubtle: v('color-surface-gray-subtle', '#E6E8EA'),
    surfaceDisabled: v('color-surface-disabled', '#CDD1D5'), surfacePrimarySubtler: v('color-surface-primary-subtler', '#ECF2FE'),
    surfaceDangerSubtler: v('color-surface-danger-subtler', '#FDEFEC'), surfaceWarningSubtler: v('color-surface-warning-subtler', '#FFF3DB'),
    surfaceSuccessSubtler: v('color-surface-success-subtler', '#EAF6EC'), surfaceInformationSubtler: v('color-surface-information-subtler', '#E7F4FE'),
    backgroundDim: v('color-background-dim', 'rgba(0,0,0,.75)'),
    borderGrayLight: v('color-border-gray-light', '#CDD1D5'), borderGray: v('color-border-gray', '#B1B8BE'), borderGrayDark: v('color-border-gray-dark', '#58616A'),
    borderPrimary: v('color-border-primary', '#256EF4'), borderDanger: v('color-border-danger', '#DE3412'), borderWarning: v('color-border-warning', '#9E6A00'),
    borderSuccess: v('color-border-success', '#228738'), borderInformation: v('color-border-information', '#0B78CB'), borderDisabled: v('color-border-disabled', '#B1B8BE'),
    dividerGrayLight: v('color-divider-gray-light', '#CDD1D5'),
    iconGray: v('color-icon-gray', '#33363D'), iconPrimary: v('color-icon-primary', '#256EF4'), iconDanger: v('color-icon-danger', '#DE3412'),
    iconWarning: v('color-icon-warning', '#9E6A00'), iconSuccess: v('color-icon-success', '#228738'), iconDisabled: v('color-icon-disabled', '#8A949E'),
    linkDefault: v('color-link-default', '#256EF4'), linkHover: v('color-link-hover', '#0B50D0'),
    buttonPrimaryFill: v('color-button-primary-fill', '#256EF4'), buttonPrimaryFillHover: v('color-button-primary-fill-hover', '#0B50D0'), buttonPrimaryFillPressed: v('color-button-primary-fill-pressed', '#083891'),
    buttonSecondaryFill: v('color-button-secondary-fill', '#ECF2FE'), buttonSecondaryFillHover: v('color-button-secondary-fill-hover', '#D8E5FD'), buttonSecondaryBorder: v('color-button-secondary-border', '#256EF4'),
    buttonTertiaryFillHover: v('color-button-tertiary-fill-hover', '#F4F5F6'), buttonTertiaryBorder: v('color-button-tertiary-border', '#58616A'),
    buttonDisabledFill: v('color-button-disabled-fill', '#CDD1D5'), buttonDisabledBorder: v('color-button-disabled-border', '#B1B8BE'),
    dangerFillHover: v('danger-10', '#FCDFD9'),
    inputBorder: v('color-input-border', '#58616A'), inputBorderActive: v('color-input-border-active', '#256EF4'), inputBorderError: v('color-input-border-error', '#DE3412'),
    inputBorderDisabled: v('color-input-border-disabled', '#B1B8BE'), inputSurface: v('color-input-surface', '#FFFFFF'), inputSurfaceDisabled: v('color-input-surface-disabled', '#CDD1D5'),
    actionPrimaryHover: v('color-action-primary-hover', '#ECF2FE'), actionPrimaryPressed: v('color-action-primary-pressed', '#D8E5FD'),
    actionPrimarySelected: v('color-action-primary-selected', '#ECF2FE'), actionPrimaryActive: v('color-action-primary-active', '#256EF4')
  },
  radius: { xs: v('radius-xs', '2px'), sm: v('radius-sm', '4px'), md: v('radius-md', '8px'), lg: v('radius-lg', '10px'), xl: v('radius-xl', '12px'), max: v('radius-max', '1000px') },
  /** regular / medium border widths; thicker in high-contrast mode */
  borderW: v('border-w', '1px'), borderWMd: v('border-w-md', '2px'),
  shadow: { 1: v('shadow-1', '0 1px 4px #0000000D'), 2: v('shadow-2', '0 4px 12px #00000014'), 3: v('shadow-3', '0 8px 24px #0000001F') },
  focusRing: v('box-shadow-outline', '0 0 0 4px #B1CEFB'),
  font: { family: v('font-family', '"Pretendard GOV", "Pretendard", "Noto Sans KR", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif') },
  fs: { h4: v('fs-h4', '19px'), bodyL: v('fs-body-l', '19px'), bodyM: v('fs-body-m', '17px'), bodyS: v('fs-body-s', '15px'), bodyXs: v('fs-body-xs', '13px') },
  gap: { 1: v('gap-1', '2px'), 2: v('gap-2', '4px'), 3: v('gap-3', '8px'), 4: v('gap-4', '12px'), 5: v('gap-5', '16px'), 6: v('gap-6', '20px'), 7: v('gap-7', '24px'), 8: v('gap-8', '32px') },
  /** fixed control heights (px): input small/medium/large, button xsmall..large, table row, badge, minimum touch target */
  size: { inputSm: 40, inputMd: 48, inputLg: 56, btnXs: 32, btnSm: 40, btnMd: 48, btnLg: 56, row: 48, badge: 24, touch: 44 }
} as const

/** Focus ring on any focused-by-keyboard element inside a grid or one of its overlays (accessibility.md: visible focus). */
export const focusRingSx = { '& :focus-visible': { outline: 'none', boxShadow: krds.focusRing } } as const

/** Visually hidden but readable by assistive technology (table caption, hints). */
export const srOnly = { position: 'absolute', width: 1, height: 1, padding: 0, margin: -1, overflow: 'hidden', clip: 'rect(0 0 0 0)', whiteSpace: 'nowrap', border: 0 } as const

/**
 * Global token sheet for hosts that do not ship the KRDS tokens.css.
 * Primitive + semantic tokens, radius, gaps, shadows, focus ring, font.
 *
 * Deliberate adaptation (documented in docs/design-system): the 5 user
 * font-size levels are implemented with a `--krds-scale` multiplier on the
 * type tokens instead of changing the root font-size, so an MUI host that
 * assumes a 16px root keeps working. `html.font-size-1..5` and
 * `html.high-contrast` behave as in KRDS.
 */
export const krdsTokensCss = `
:root{
  --krds-primary-5:#ECF2FE;--krds-primary-10:#D8E5FD;--krds-primary-20:#B1CEFB;--krds-primary-30:#86AFF9;--krds-primary-40:#4C87F6;--krds-primary-50:#256EF4;--krds-primary-60:#0B50D0;--krds-primary-70:#083891;--krds-primary-80:#052561;
  --krds-gray-0:#FFFFFF;--krds-gray-5:#F4F5F6;--krds-gray-10:#E6E8EA;--krds-gray-20:#CDD1D5;--krds-gray-30:#B1B8BE;--krds-gray-40:#8A949E;--krds-gray-50:#6D7882;--krds-gray-60:#58616A;--krds-gray-70:#464C53;--krds-gray-80:#33363D;--krds-gray-90:#1E2124;--krds-gray-95:#131416;
  --krds-danger-5:#FDEFEC;--krds-danger-10:#FCDFD9;--krds-danger-50:#DE3412;--krds-danger-60:#BD2C0F;
  --krds-warning-5:#FFF3DB;--krds-warning-30:#FFB114;--krds-warning-50:#9E6A00;--krds-warning-60:#8A5C00;
  --krds-success-5:#EAF6EC;--krds-success-50:#228738;--krds-success-60:#267337;
  --krds-information-5:#E7F4FE;--krds-information-50:#0B78CB;--krds-information-60:#096AB3;
  --krds-secondary-50:#346FB2;--krds-point-50:#D63D4A;
  --krds-color-text-basic:var(--krds-gray-90);--krds-color-text-subtle:var(--krds-gray-70);--krds-color-text-disabled:var(--krds-gray-40);
  --krds-color-text-primary:var(--krds-primary-60);--krds-color-text-danger:var(--krds-danger-60);--krds-color-text-success:var(--krds-success-60);--krds-color-text-warning:var(--krds-warning-60);--krds-color-text-information:var(--krds-information-60);--krds-color-text-basic-inverse:var(--krds-gray-0);
  --krds-color-surface-white:var(--krds-gray-0);--krds-color-surface-gray-subtler:var(--krds-gray-5);--krds-color-surface-gray-subtle:var(--krds-gray-10);--krds-color-surface-disabled:var(--krds-gray-20);
  --krds-color-surface-primary-subtler:var(--krds-primary-5);--krds-color-surface-danger-subtler:var(--krds-danger-5);--krds-color-surface-warning-subtler:var(--krds-warning-5);--krds-color-surface-success-subtler:var(--krds-success-5);--krds-color-surface-information-subtler:var(--krds-information-5);
  --krds-color-background-dim:rgba(0,0,0,.75);
  --krds-color-border-gray-light:var(--krds-gray-20);--krds-color-border-gray:var(--krds-gray-30);--krds-color-border-gray-dark:var(--krds-gray-60);
  --krds-color-border-primary:var(--krds-primary-50);--krds-color-border-danger:var(--krds-danger-50);--krds-color-border-warning:var(--krds-warning-50);--krds-color-border-success:var(--krds-success-50);--krds-color-border-information:var(--krds-information-50);--krds-color-border-disabled:var(--krds-gray-30);
  --krds-color-divider-gray-light:var(--krds-gray-20);
  --krds-color-icon-gray:var(--krds-gray-80);--krds-color-icon-primary:var(--krds-primary-50);--krds-color-icon-danger:var(--krds-danger-50);--krds-color-icon-warning:var(--krds-warning-50);--krds-color-icon-success:var(--krds-success-50);--krds-color-icon-disabled:var(--krds-gray-40);
  --krds-color-link-default:var(--krds-primary-50);--krds-color-link-hover:var(--krds-primary-60);
  --krds-color-button-primary-fill:var(--krds-primary-50);--krds-color-button-primary-fill-hover:var(--krds-primary-60);--krds-color-button-primary-fill-pressed:var(--krds-primary-70);
  --krds-color-button-secondary-fill:var(--krds-primary-5);--krds-color-button-secondary-fill-hover:var(--krds-primary-10);--krds-color-button-secondary-border:var(--krds-primary-50);
  --krds-color-button-tertiary-fill-hover:var(--krds-gray-5);--krds-color-button-tertiary-border:var(--krds-gray-60);--krds-color-button-disabled-fill:var(--krds-gray-20);--krds-color-button-disabled-border:var(--krds-gray-30);
  --krds-color-input-border:var(--krds-gray-60);--krds-color-input-border-active:var(--krds-primary-50);--krds-color-input-border-error:var(--krds-danger-50);--krds-color-input-border-disabled:var(--krds-gray-30);--krds-color-input-surface:var(--krds-gray-0);--krds-color-input-surface-disabled:var(--krds-gray-20);
  --krds-color-action-primary-hover:var(--krds-primary-5);--krds-color-action-primary-pressed:var(--krds-primary-10);--krds-color-action-primary-selected:var(--krds-primary-5);--krds-color-action-primary-active:var(--krds-primary-50);
  --krds-radius-xs:2px;--krds-radius-sm:4px;--krds-radius-md:8px;--krds-radius-lg:10px;--krds-radius-xl:12px;--krds-radius-max:1000px;
  --krds-gap-1:2px;--krds-gap-2:4px;--krds-gap-3:8px;--krds-gap-4:12px;--krds-gap-5:16px;--krds-gap-6:20px;--krds-gap-7:24px;--krds-gap-8:32px;
  --krds-border-w:1px;--krds-border-w-md:2px;
  --krds-shadow-1:0 1px 4px #0000000D;--krds-shadow-2:0 4px 12px #00000014;--krds-shadow-3:0 8px 24px #0000001F;
  --krds-box-shadow-outline:0 0 0 4px var(--krds-primary-20);
  --krds-font-family:"Pretendard GOV","Pretendard","Noto Sans KR",-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;
  --krds-scale:1;
  --krds-fs-h4:calc(19px * var(--krds-scale));--krds-fs-body-l:calc(19px * var(--krds-scale));--krds-fs-body-m:calc(17px * var(--krds-scale));--krds-fs-body-s:calc(15px * var(--krds-scale));--krds-fs-body-xs:calc(13px * var(--krds-scale));
}
html.font-size-1{--krds-scale:.896}html.font-size-2{--krds-scale:1}html.font-size-3{--krds-scale:1.088}html.font-size-4{--krds-scale:1.2}html.font-size-5{--krds-scale:1.296}
html.high-contrast{--krds-border-w:2px;--krds-border-w-md:3px;--krds-color-border-gray-light:var(--krds-gray-60);--krds-color-border-gray:var(--krds-gray-90);--krds-secondary-50:#268097}
`

/** MUI theme matching the KRDS tokens (primary/status palette, Pretendard GOV, 8px radius). Hosts may merge it into their own theme. */
export function createKrdsTheme(): Theme {
  return createTheme({
    palette: {
      primary: { main: '#256EF4', dark: '#0B50D0', light: '#4C87F6', contrastText: '#FFFFFF' },
      secondary: { main: '#346FB2', dark: '#1C589C', light: '#6B96C7', contrastText: '#FFFFFF' },
      error: { main: '#DE3412', dark: '#BD2C0F', light: '#F05F42' },
      warning: { main: '#9E6A00', dark: '#8A5C00', light: '#FFB114' },
      success: { main: '#228738', dark: '#267337', light: '#3FA654' },
      info: { main: '#0B78CB', dark: '#096AB3', light: '#2098F3' },
      text: { primary: '#1E2124', secondary: '#464C53', disabled: '#8A949E' },
      divider: '#CDD1D5',
      background: { default: '#FFFFFF', paper: '#FFFFFF' },
      action: { hover: '#ECF2FE', selected: '#ECF2FE', disabledBackground: '#CDD1D5', disabled: '#8A949E', focus: '#B1CEFB' }
    },
    shape: { borderRadius: 8 },
    typography: {
      fontFamily: '"Pretendard GOV", "Pretendard", "Noto Sans KR", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      fontSize: 15,
      button: { textTransform: 'none', fontWeight: 700 }
    }
  })
}
