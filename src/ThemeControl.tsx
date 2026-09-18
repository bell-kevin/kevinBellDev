const THEMES = ['auto', 'light', 'dark'] as const;

export default function ThemeControl() {
  return (
    <fieldset className="theme-control">
      <legend className="sr-only">Color theme (Auto follows your device)</legend>
      {THEMES.map((theme) => (
        <label key={theme} className="theme-option">
          <input
            type="radio"
            id={`theme-${theme}`}
            name="theme"
            value={theme}
            defaultChecked={theme === 'auto'}
          />
          <span>{theme[0].toUpperCase() + theme.slice(1)}</span>
        </label>
      ))}
    </fieldset>
  );
}
