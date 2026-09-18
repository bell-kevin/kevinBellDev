import { useEffect, useRef } from 'react';

const STORAGE_KEY = 'kevinbell-theme';
const THEMES = ['auto', 'light', 'dark'] as const;
type Theme = typeof THEMES[number];

function isTheme(value: string | null): value is Theme {
  return THEMES.some((theme) => theme === value);
}

export default function ThemeControl() {
  const control = useRef<HTMLFieldSetElement>(null);

  useEffect(() => {
    const selectTheme = (theme: Theme) => {
      document.documentElement.dataset.theme = theme;
      const input = control.current?.querySelector<HTMLInputElement>(`input[value="${theme}"]`);
      if (input) input.checked = true;
    };

    // The prerendered radios also work with CSS alone. Hydration preserves any
    // choice made before the bundle loaded, unless there is a saved preference.
    const selected = control.current?.querySelector<HTMLInputElement>('input:checked')?.value;
    let theme: Theme = selected && isTheme(selected) ? selected : 'auto';
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (theme === 'auto' && isTheme(saved)) theme = saved;
    } catch {
      // Storage can be unavailable in a private or restricted browser.
    }
    selectTheme(theme);

    const syncTheme = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY || event.key === null) {
        selectTheme(isTheme(event.newValue) ? event.newValue : 'auto');
      }
    };
    window.addEventListener('storage', syncTheme);
    return () => window.removeEventListener('storage', syncTheme);
  }, []);

  const changeTheme = (theme: Theme) => {
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      // The selection still works for this visit without persistent storage.
    }
  };

  return (
    <fieldset ref={control} className="theme-control">
      <legend className="sr-only">Color theme (Auto follows your device)</legend>
      {THEMES.map((theme) => (
        <label key={theme} className="theme-option">
          <input
            type="radio"
            id={`theme-${theme}`}
            name="theme"
            value={theme}
            defaultChecked={theme === 'auto'}
            onChange={() => changeTheme(theme)}
          />
          <span>{theme[0].toUpperCase() + theme.slice(1)}</span>
        </label>
      ))}
    </fieldset>
  );
}
