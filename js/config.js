export const DEFAULTS = Object.freeze({
  PREFIXE_ID:   'BIM26-',
  SEL:          'GI-BIM-DLA-2026',
  SEPARATEUR:   '-',
  QR_EC:        'Q',

  THEME:   'Initiation au processus BIM dans la gestion des projets Immobiliers',
  LIEU:    'DOUALA',
  NUMERO_THEME: 3,
  DATES:   ['2026-08-04', '2026-08-05', '2026-08-06'],
  TZ_OFFSET_MIN: 60,

  H_DEBUT_MATIN: '07:00',
  H_BASCULE:     '13:00',
  H_FIN_MIDI:    '17:30',

  FREQ_HZ:      10,
  DEBOUNCE_MS:  3000,
  ROI_RATIO:    0.5,

  BADGES_PAR_PAGE: 8,
  MULTI_APPAREILS: false,

  SCHEMA_VERSION: 2,

  SEUIL_ABSENCE_MIN: 20,
});

let _overrides = {};

export function hydrateConfig(o) {
  _overrides = { ...o };
}

/** Fusionne un objet partiel dans les overrides existants. */
export function mergeConfig(partial) {
  _overrides = { ..._overrides, ...partial };
}

export function getConfig() {
  return { ...DEFAULTS, ..._overrides };
}
