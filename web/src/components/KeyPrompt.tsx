import { useState } from "react";

interface Props {
  message: string | null;
  onSave: (key: string) => void;
  onDemo: () => void;
}

export function KeyPrompt({ message, onSave, onDemo }: Props) {
  const [value, setValue] = useState("");
  const [err, setErr] = useState<string | null>(null);
  return (
    <div className="keyprompt">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const v = value.trim();
          if (!v) return setErr("Enter the device key first.");
          onSave(v);
        }}
      >
        <h1>Family dashboard</h1>
        <p>Enter this screen's device key to connect it to the family calendar.</p>
        {message && <p className="bad">{message}</p>}
        <input
          type="password"
          autoComplete="off"
          placeholder="Device key"
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setErr(null);
          }}
        />
        {err && <p className="bad small">{err}</p>}
        <div className="row">
          <button type="submit" className="primary">Connect</button>
          <button type="button" onClick={onDemo}>Try with sample data</button>
        </div>
      </form>
    </div>
  );
}
