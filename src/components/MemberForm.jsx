import { useState } from "react";

export default function MemberForm({ onSave }) {
  const [name, setName] = useState("");

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!name.trim()) return;
        onSave({ name: name.trim() });
        setName("");
      }}
      className="space-y-3"
    >
      <div>
        <label className="text-sm text-zinc-600 dark:text-zinc-300">Member name</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mt-1 w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-3 py-2 text-zinc-900 dark:text-zinc-100"
          placeholder="e.g., Riyas"
        />
      </div>
      <button className="w-full rounded-xl bg-zinc-900 text-white py-2 font-medium hover:opacity-90">
        Add Member
      </button>
    </form>
  );
}
