import { useEffect, useMemo, useState } from "react";
import { collection, addDoc, onSnapshot, orderBy, query, serverTimestamp } from "firebase/firestore";
import { db } from "./firebase";
import Modal from "./components/Modal";
import MemberForm from "./components/MemberForm";
import ExpenseForm from "./components/ExpenseForm";
import { computeBalances, suggestSettlements, round2 } from "./utils/calc";

const ROOM_ID = "room"; // simple single-room start

export default function App() {
  const [members, setMembers] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [openMember, setOpenMember] = useState(false);
  const [openExpense, setOpenExpense] = useState(false);

  useEffect(() => {
    const membersRef = collection(db, "rooms", ROOM_ID, "members");
    const q1 = query(membersRef, orderBy("createdAt", "asc"));
    const unsub1 = onSnapshot(q1, (snap) => {
      setMembers(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });

    const expensesRef = collection(db, "rooms", ROOM_ID, "expenses");
    const q2 = query(expensesRef, orderBy("createdAt", "desc"));
    const unsub2 = onSnapshot(q2, (snap) => {
      setExpenses(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });

    return () => {
      unsub1();
      unsub2();
    };
  }, []);

  const totals = useMemo(() => {
    const total = expenses.reduce((s, e) => s + Number(e.amount || 0), 0);
    return { total: round2(total) };
  }, [expenses]);

  const balances = useMemo(() => computeBalances(members, expenses), [members, expenses]);
  const settlements = useMemo(() => suggestSettlements(balances), [balances]);

  const memberName = (id) => members.find((m) => m.id === id)?.name || "Unknown";

  const addMember = async ({ name }) => {
    console.log(name);
    await addDoc(collection(db, "rooms", ROOM_ID, "members"), {
      name,
      createdAt: serverTimestamp(),
    });
    setOpenMember(false);
  };

  const addExpense = async (payload) => {
    await addDoc(collection(db, "rooms", ROOM_ID, "expenses"), {
      ...payload,
      createdAt: serverTimestamp(),
    });
    setOpenExpense(false);
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black">
      <div className="max-w-6xl mx-auto p-4 md:p-8">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl md:text-3xl font-bold text-zinc-900 dark:text-zinc-100">
              Kuboos Theeni - Expense Manager
            </h1>
            <p className="text-zinc-600 dark:text-zinc-400">
              Track food, utensils, and shared purchases. Split fairly.
            </p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setOpenMember(true)}
              className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-green px-4 py-2 font-medium"
            >
              + Add Member
            </button>
            <button
              onClick={() => setOpenExpense(true)}
              className="rounded-xl bg-green-900 text-white px-4 py-2 font-medium hover:opacity-90"
              disabled={!members.length}
              title={!members.length ? "Add at least one member first" : ""}
            >
              + Add Expense
            </button>
          </div>
        </header>

        <main className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-4">
          <section className="lg:col-span-2 space-y-4">
            <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-4">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-zinc-900 dark:text-zinc-100">Expenses</h2>
                <div className="text-sm text-zinc-600 dark:text-zinc-400">
                  Total: <span className="font-semibold">{totals.total.toFixed(2)}</span>
                </div>
              </div>

              <div className="mt-4 space-y-3 max-h-[calc(100vh-20rem)] overflow-y-auto">
                {!expenses.length ? (
                  <div className="text-sm text-zinc-500">No expenses yet.</div>
                ) : (
                  expenses.map((e) => (
                    <div
                      key={e.id}
                      className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-3 flex flex-col md:flex-row md:items-center md:justify-between gap-2"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-zinc-900 dark:text-zinc-100">{e.title}</span>
                          <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200">
                            {e.category}
                          </span>
                        </div>
                        <div className="text-sm text-zinc-600 dark:text-zinc-400">
                          Paid by <span className="font-medium">{memberName(e.paidByMemberId)}</span> • {e.date}
                          {e.note ? ` • ${e.note}` : ""}
                        </div>
                        <div className="text-xs text-zinc-500">
                          Split: {e.splitType} • Participants: {(e.participants || []).length}
                        </div>
                      </div>
                      <div className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                        {Number(e.amount).toFixed(2)}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </section>

          <aside className="space-y-4">
            <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-4">
              <h2 className="font-semibold text-zinc-900 dark:text-zinc-100">Members & Balances</h2>
              <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
                Positive = should receive, Negative = owes.
              </p>

              <div className="mt-3 space-y-2 max-h-[calc(100vh-20rem)] overflow-y-auto grid grid-cols-2 gap-2">
                {!members.length ? (
                  <div className="text-sm text-zinc-500">Add members to start.</div>
                ) : (
                  members.map((m) => {
                    const b = balances[m.id] ?? 0;
                    const pos = b >= 0;
                    return (
                      <div key={m.id} className="flex items-center justify-between rounded-xl border border-zinc-200 dark:border-zinc-800 p-3 flex-col md:flex-row md:width-full">
                        <div className="font-medium text-zinc-900 dark:text-zinc-100">{m.name}</div>
                        <div className={`font-semibold ${pos ? "text-emerald-600" : "text-rose-600"}`}>
                          {round2(b).toFixed(2)}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-4">
              <h2 className="font-semibold text-zinc-900 dark:text-zinc-100">Settle Up (Suggested)</h2>
              <div className="mt-3 space-y-2">
                {!settlements.length ? (
                  <div className="text-sm text-zinc-500">No settlements needed.</div>
                ) : (
                  settlements.map((t, idx) => (
                    <div key={idx} className="rounded-xl border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 p-3 text-sm">
                      <span className="font-medium">{memberName(t.from)}</span> pays{" "}
                      <span className="font-medium">{memberName(t.to)}</span>{" "}
                      <span className="font-semibold">{Number(t.amount).toFixed(2)}</span>
                    </div>
                  ))
                )}
              </div>
            </div> */}

            {/* <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-4">
              <h2 className="font-semibold text-zinc-900 dark:text-zinc-100">Tips</h2>
              <ul className="mt-2 text-sm text-zinc-600 dark:text-zinc-400 list-disc pl-5 space-y-1">
                <li>Add all members first.</li>
                <li>Leave participants empty to include everyone.</li>
                <li>Use custom split for uneven sharing.</li>
              </ul>
            </div> */}
          </aside>
        </main>
      </div>

      <Modal open={openMember} title="Add Member" onClose={() => setOpenMember(false)}>
        <MemberForm onSave={addMember} />
      </Modal>

      <Modal open={openExpense} title="Add Expense" onClose={() => setOpenExpense(false)}>
        <ExpenseForm members={members} onSave={addExpense} />
      </Modal>
    </div>
  );
}
