import type { CulturalPreset } from '../types/settings';

export const culturalPresets: CulturalPreset[] = [
  {
    id: 'pe_spanish',
    cultureCode: 'pe_PE',
    label: 'Perú – Español',
    languageCode: 'es-PE',
    messages: [
      {
        id: 'pe_oye_compadre',
        text: 'Oye compadre, ya basta con el celular.',
        tone: 'playful',
      },
      {
        id: 'pe_haz_un_descanso',
        text: 'Haz un descanso, tu mente te lo va a agradecer.',
        tone: 'gentle',
      },
      {
        id: 'pe_tomatito',
        text: 'Un ratito sin pantalla, ¿sí? Tu mente también necesita respirar.',
        tone: 'gentle',
      },
      {
        id: 'pe_ya_fue',
        text: 'Ya fue por hoy el scroll. Cierra el celular y regresa a tu mundo.',
        tone: 'playful',
      },
    ],
  },
  {
    id: 'mx_spanish',
    cultureCode: 'mx_MX',
    label: 'México – Español',
    languageCode: 'es-MX',
    messages: [
      {
        id: 'mx_oye',
        text: 'Oye, ya llevas un buen rato en el cel. Tómate una pausa chiquita.',
        tone: 'gentle',
      },
      {
        id: 'mx_descansito',
        text: 'Un descansito, ¿no? Afuera también hay cosas padres esperándote.',
        tone: 'playful',
      },
      {
        id: 'mx_ya_estuvo',
        text: 'Ya estuvo bueno de celular por hoy. Cierra la pantalla y date un respiro.',
        tone: 'playful',
      },
      {
        id: 'mx_pausa',
        text: 'Haz una pausa ya. Tu mente y tus ojos también necesitan descansar.',
        tone: 'stern',
      },
    ],
  },
  {
    id: 'us_english',
    cultureCode: 'us_US',
    label: 'United States – English',
    languageCode: 'en-US',
    messages: [
      {
        id: 'us_hey_friend',
        text: "Hey, you've been on your phone for a while. How about a quick breather?",
        tone: 'gentle',
      },
      {
        id: 'us_come_on',
        text: "Come on, you said you wanted a break.",
        tone: 'playful',
      },
      {
        id: 'us_scroll_pause',
        text: "Let's pause the scrolling for a bit. The offline world misses you.",
        tone: 'gentle',
      },
      {
        id: 'us_enough',
        text: "Okay, that's enough phone time for now. Put it down and give yourself a break.",
        tone: 'stern',
      },
    ],
  },
];
