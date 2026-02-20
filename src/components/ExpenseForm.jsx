import { useMemo, useState } from "react";

const CATEGORIES = ["Food", "Utensils", "Groceries", "Other"];

export default function ExpenseForm({ members, onSave, initialData }) {
  const [title, setTitle] = useState(initialData?.title || "");
  const [category, setCategory] = useState(initialData?.category || "Food");
  const [amount, setAmount] = useState(initialData?.amount ?? "");
  const [date, setDate] = useState(
    initialData?.date || new Date().toISOString().slice(0, 10)
  );
  const [note, setNote] = useState(initialData?.note || "");
  const [paidBy, setPaidBy] = useState(initialData?.paidByMemberId || "");
  const [splitType, setSplitType] = useState(initialData?.splitType || "equal");
  const [participants, setParticipants] = useState(initialData?.participants || []);
  const [customShares, setCustomShares] = useState(initialData?.customShares || {});


  const allMemberIds = useMemo(() => members.map((m) => m.id), [members]);

  const effectiveParticipants = useMemo(() => {
    if (participants && participants.length) return participants;
    // for create mode allow default all
    return initialData ? (initialData.participants?.length ? initialData.participants : allMemberIds) : allMemberIds;
  }, [participants, initialData, allMemberIds]);


  const equalPerHead = useMemo(() => {
    const a = Number(amount || 0);
    const n = effectiveParticipants.length || 1;
    return a ? (a / n).toFixed(2) : "0.00";
  }, [amount, effectiveParticipants.length]);

  const toggleParticipant = (id) => {
    setParticipants((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleCustomShareChange = (id, value) => {
    setCustomShares((prev) => ({ ...prev, [id]: value }));
  };

  const sumCustom = useMemo(() => {
    return effectiveParticipants.reduce((s, id) => s + Number(customShares[id] || 0), 0);
  }, [customShares, effectiveParticipants]);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!title.trim() || !amount || !paidBy) return;

        const payload = {
          title: title.trim(),
          category,
          amount: Number(amount),
          date,
          note: note.trim(),
          paidByMemberId: paidBy,
          splitType,
          participants: effectiveParticipants,
          customShares:
            splitType === "custom"
              ? Object.fromEntries(
                effectiveParticipants.map((id) => [id, Number(customShares[id] || 0)])
              )
              : null,
        };

        if (splitType === "custom") {
          const total = Number(amount);
          // allow minor rounding difference
          if (Math.abs(total - sumCustom) > 0.05) {
            alert("Custom split total must match Amount.");
            return;
          }
        }

        onSave(payload);
        setTitle("");
        setAmount("");
        setNote("");
        setParticipants([]);
        setCustomShares({});
        setSplitType("equal");
        setCategory("Food");
      }}
      className="space-y-4"
    >
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-sm text-zinc-600 dark:text-zinc-300">Purchase title</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="mt-1 w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-3 py-2 dark:text-white"
            placeholder="e.g., Weekend groceries"
          />
        </div>

        <div>
          <label className="text-sm text-zinc-600 dark:text-zinc-300">Category</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="mt-1 w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-3 py-2 dark:text-white"
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-sm text-zinc-600 dark:text-zinc-300">Amount</label>
          <input
            type="number"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="mt-1 w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-3 py-2 dark:text-white"
            placeholder="e.g., 120"
          />
        </div>

        <div>
          <label className="text-sm text-zinc-600 dark:text-zinc-300">Date</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="mt-1 w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-3 py-2 dark:text-white"
          />
        </div>

        <div>
          <label className="text-sm text-zinc-600 dark:text-zinc-300">Paid by</label>
          <select
            value={paidBy}
            onChange={(e) => setPaidBy(e.target.value)}
            className="mt-1 w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-3 py-2 dark:text-white"
          >
            <option value="">Select member</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-sm text-zinc-600 dark:text-zinc-300">Split</label>
          <select
            value={splitType}
            onChange={(e) => setSplitType(e.target.value)}
            className="mt-1 w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-3 py-2 dark:text-white"
          >
            <option value="equal">Equal split</option>
            <option value="custom">Custom split</option>
          </select>
        </div>
      </div>

      <div>
        <label className="text-sm text-zinc-600 dark:text-zinc-300">
          Participants (leave empty = all members)
        </label>
        <div className="mt-2 flex flex-wrap gap-2">
          {members.map((m) => {
            const active = effectiveParticipants.includes(m.id);
            const isExplicit = participants.includes(m.id);
            return (
              <button
                type="button"
                key={m.id}
                onClick={() => toggleParticipant(m.id)}
                className={`px-3 py-1 rounded-full text-sm border dark:text-white
                  ${active ? "bg-zinc-900 text-white border-zinc-900" : "bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200"}
                  ${participants.length === 0 ? "opacity-90" : ""}
                `}
                title={participants.length === 0 ? "All members included by default" : ""}
              >
                {m.name}{participants.length ? (isExplicit ? " ✓" : "") : ""}
              </button>
            );
          })}
        </div>
      </div>

      {splitType === "equal" ? (
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-3 bg-zinc-50 dark:bg-zinc-950">
          <div className="text-sm text-zinc-700 dark:text-zinc-300">
            Equal share per participant: <span className="font-semibold">{equalPerHead}</span>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-3 space-y-2">
          <div className="text-sm text-zinc-700 dark:text-zinc-300">
            Custom split (total must equal Amount)
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {effectiveParticipants.map((id) => {
              const m = members.find((x) => x.id === id);
              return (
                <div key={id} className="flex items-center justify-between gap-2">
                  <span className="text-sm dark:text-white">{m?.name}</span>
                  <input
                    type="number"
                    step="0.01"
                    value={customShares[id] ?? ""}
                    onChange={(e) => handleCustomShareChange(id, e.target.value)}
                    className="w-25 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-3 py-2 text-sm dark:text-white"
                    placeholder="0.00"
                  />
                </div>
              );
            })}
          </div>
          <div className="text-xs text-zinc-500">
            Custom total: {Number(sumCustom).toFixed(2)}
          </div>
        </div>
      )}

      <div>
        <label className="text-sm text-zinc-600 dark:text-zinc-300">Note (optional)</label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="mt-1 w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-3 py-2"
          rows={3}
          placeholder="e.g., Included cleaning items"
        />
      </div>

      <button className="w-full rounded-xl bg-zinc-900 text-white py-2 font-medium hover:opacity-90">
       {initialData ? "Update Expense" : "Add Expense"}
      </button>
    </form>
  );
}
