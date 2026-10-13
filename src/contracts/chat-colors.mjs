const COLOR_KEYS = Object.freeze(['background', 'userBackground', 'userText', 'assistantText', 'composerBackground']);
export const DEFAULT_COLORS = Object.freeze({
  light: Object.freeze({ background: '#ffffff', userBackground: '#f4f4f4', userText: '#0d0d0d', assistantText: '#0d0d0d', composerBackground: '#ffffff' }),
  dark: Object.freeze({ background: '#212121', userBackground: '#303030', userText: '#ececec', assistantText: '#ececec', composerBackground: '#303030' }),
});
export function normalizeChatColors(value = {}) {
  const result = {};
  for (const key of COLOR_KEYS) {
    const color = value?.[key];
    result[key] = typeof color === 'string' && /^#[0-9a-f]{6}$/i.test(color) ? color.toLowerCase() : null;
  }
  return result;
}
export function validateColorChange(input) {
  if (!input || !COLOR_KEYS.includes(input.key) || (input.value !== null && (typeof input.value !== 'string' || !/^#[0-9a-f]{6}$/i.test(input.value))))
    throw new TypeError('Выберите цвет или укажите HEX в формате #RRGGBB.');
  return { key: input.key, value: input.value?.toLowerCase() ?? null };
}
