import { PROFILE_COLORS, PROFILE_COLOR_NAMES } from "~lib/types"

interface ColorPickerProps {
  selectedColor: string
  onChange: (color: string) => void
  className?: string
}

export function ColorPicker({
  selectedColor,
  onChange,
  className = "color-picker"
}: ColorPickerProps) {
  return (
    <fieldset style={{ border: "none", padding: 0 }}>
      <legend
        style={{
          display: "block",
          marginBottom: "6px",
          fontSize: "13px",
          fontWeight: 600,
          color: "var(--text-secondary)"
        }}>
        色
      </legend>
      <div
        className={className}
        role="radiogroup"
        aria-label="プロファイルの色を選択">
        {PROFILE_COLORS.map((color, index) => (
          <button
            key={color}
            type="button"
            className={`color-swatch ${selectedColor === color ? "selected" : ""}`}
            style={{ backgroundColor: color }}
            onClick={() => onChange(color)}
            role="radio"
            aria-checked={selectedColor === color}
            aria-label={PROFILE_COLOR_NAMES[index]}
          />
        ))}
      </div>
    </fieldset>
  )
}
