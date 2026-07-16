import { useEffect, useMemo, useState } from "react";
import {
  collection,
  addDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  doc,
  updateDoc,
  deleteDoc,
} from "firebase/firestore";

import { db } from "./firebase";
import Modal from "./components/Modal";
import MemberForm from "./components/MemberForm";
import ExpenseForm from "./components/ExpenseForm";
import { computeBalances, suggestSettlements, round2 } from "./utils/calc";
import ExpenseList from "./components/ExpenseList";

const ROOM_ID = "room"; // simple single-room start
const ADMIN_PASSCODE = "KuboosTeeni@2k26"; // Simple gatekeep for local admin operations

export default function App() {
  const [members, setMembers] = useState([]);
  const [expenses, setExpenses] = useState([]);

  // Month State (Format: YYYY-MM)
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });

  const [openMember, setOpenMember] = useState(false);
  const [openExpense, setOpenExpense] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [openView, setOpenView] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const [memberExpenses, setMemberExpenses] = useState([]);

  // Admin States
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminPassInput, setAdminPassInput] = useState("");
  const [showAdminPanel, setShowAdminPanel] = useState(false);

  // Sync Members
  useEffect(() => {
    const membersRef = collection(db, "rooms", ROOM_ID, "members");
    const q1 = query(membersRef, orderBy("createdAt", "asc"));
    const unsub1 = onSnapshot(q1, (snap) => {
      setMembers(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return () => unsub1();
  }, []);

  // Sync Expenses
  useEffect(() => {
    const expensesRef = collection(db, "rooms", ROOM_ID, "expenses");
    const q2 = query(expensesRef, orderBy("createdAt", "desc"));
    const unsub2 = onSnapshot(q2, (snap) => {
      setExpenses(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return () => unsub2();
  }, []);

  // Filter expenses by selected YYYY-MM
  const filteredExpenses = useMemo(() => {
    return expenses.filter((e) => {
      if (!e.date) return false;
      return e.date.startsWith(selectedMonth);
    });
  }, [expenses, selectedMonth]);

  // Compute stats based ONLY on current month's filtered data
  const totals = useMemo(() => {
    const total = filteredExpenses.reduce((s, e) => s + Number(e.amount || 0), 0);
    return { total: round2(total) };
  }, [filteredExpenses]);

  const balances = useMemo(() => {
    return computeBalances(members, filteredExpenses);
  }, [members, filteredExpenses]);

  const settlements = useMemo(() => suggestSettlements(balances), [balances]);

  const memberName = (id) => members.find((m) => m.id === id)?.name || "Unknown";

  const openViewModal = (member) => {
    setSelectedMember(member);
    setMemberExpenses(
      filteredExpenses.filter((e) => e.paidByMemberId === member.id)
    );
    setOpenView(true);
  };

  // Actions
  const addMember = async ({ name }) => {
    await addDoc(collection(db, "rooms", ROOM_ID, "members"), {
      name,
      createdAt: serverTimestamp(),
    });
    setOpenMember(false);
  };

  const removeMember = async (id) => {
    if (window.confirm("Are you sure you want to delete this member?")) {
      await deleteDoc(doc(db, "rooms", ROOM_ID, "members", id));
    }
  };

  const deleteExpense = async (id) => {
    if (window.confirm("Delete this expense permanently?")) {
      await deleteDoc(doc(db, "rooms", ROOM_ID, "expenses", id));
      setOpenExpense(false);
      setEditingExpense(null);
    }
  };

  const addExpense = async (payload) => {
    await addDoc(collection(db, "rooms", ROOM_ID, "expenses"), {
      ...payload,
      createdAt: serverTimestamp(),
    });
    setOpenExpense(false);
  };

  const updateExpense = async (expenseId, payload) => {
    const ref = doc(db, "rooms", ROOM_ID, "expenses", expenseId);
    await updateDoc(ref, {
      ...payload,
      updatedAt: serverTimestamp(),
    });
    setEditingExpense(null);
    setOpenExpense(false);
  };

  const handleAdminLogin = (e) => {
    e.preventDefault();
    if (adminPassInput === ADMIN_PASSCODE) {
      setIsAdmin(true);
      setShowAdminPanel(true);
    } else {
      alert("Incorrect admin passcode!");
    }
    setAdminPassInput("");
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black text-zinc-950 dark:text-zinc-50">
      <div className="max-w-6xl mx-auto p-4 md:p-8">

        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-6">
          <div className="flex">
            <div className="flex flex-col">
              <h1 className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-500">
                Kuboos Theeni
              </h1>
              <h2 className="text-lg font-semibold text-zinc-700 dark:text-zinc-300">
                Room Expense Manager
              </h2>
              <p className="text-zinc-500 dark:text-zinc-400 text-sm mt-1">
                Track food, utensils, and shared purchases. Split fairly.
              </p>
            </div>
            <button
              onClick={() => {
                if (isAdmin) setShowAdminPanel(!showAdminPanel);
                else {
                  const pass = prompt("Enter Admin Passcode:");
                  if (pass === ADMIN_PASSCODE) {
                    setIsAdmin(true);
                    setShowAdminPanel(true);
                  } else if (pass !== null) {
                    alert("Unauthorized!");
                  }
                }
              }}
              className={`rounded-xl px-4 py-2 text-sm font-medium transition-colors h-[35px] md:hidden ${isAdmin
                  ? "bg-purple-600 text-white hover:bg-purple-700"
                  : "bg-zinc-200 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 hover:bg-zinc-300 dark:hover:bg-zinc-700"
                }`}
            >
              {isAdmin ? (showAdminPanel ? "Hide" : "Show") : "🔒"}
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Month Filter Dropdown */}
            <div className="flex items-center gap-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800  rounded-xl px-3 py-1.5 shadow-sm">
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="bg-transparent border-none text-sm font-semibold focus:outline-none focus:ring-0 cursor-pointer dark:text-white [color-scheme:dark]"
              />
            </div>

            <button
              onClick={() => {
                setEditingExpense(null);
                setOpenExpense(true);
              }}
              className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 text-sm font-medium transition-colors"
              disabled={!members.length}
              title={!members.length ? "Add at least one member first" : ""}
            >
              + Add Expense
            </button>

            <button
              onClick={() => {
                if (isAdmin) setShowAdminPanel(!showAdminPanel);
                else {
                  const pass = prompt("Enter Admin Passcode:");
                  if (pass === ADMIN_PASSCODE) {
                    setIsAdmin(true);
                    setShowAdminPanel(true);
                  } else if (pass !== null) {
                    alert("Unauthorized!");
                  }
                }
              }}
              className={`rounded-xl px-4 py-2 text-sm font-medium transition-colors hidden md:block ${isAdmin
                  ? "bg-purple-600 text-white hover:bg-purple-700"
                  : "bg-zinc-200 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 hover:bg-zinc-300 dark:hover:bg-zinc-700"
                }`}
            >
              {isAdmin ? (showAdminPanel ? "Hide Admin" : "Show Admin") : "Admin Login"}
            </button>
          </div>
        </header>

        {/* Admin Dashboard Panel */}
        {isAdmin && showAdminPanel && (
          <section className="mt-6 p-5 rounded-2xl border-2 border-dashed border-purple-500/40 bg-purple-50/10 dark:bg-purple-950/5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-purple-700 dark:text-purple-400 flex items-center gap-2">
                ⚙️ System Admin Panel
              </h3>
              <button
                onClick={() => setIsAdmin(false)}
                className="text-xs text-red-500 hover:underline"
              >
                Logout Admin
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Member Operations */}
              <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="font-semibold text-sm text-zinc-700 dark:text-zinc-300">Manage Members</h4>
                  <button
                    onClick={() => setOpenMember(true)}
                    className="text-xs bg-emerald-600 text-white px-2.5 py-1 rounded-md hover:bg-emerald-700"
                  >
                    + Add New
                  </button>
                </div>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {members.map(m => (
                    <div key={m.id} className="flex justify-between items-center text-sm p-2 bg-zinc-50 dark:bg-zinc-900 rounded-lg">
                      <span>{m.name}</span>
                      <button
                        onClick={() => removeMember(m.id)}
                        className="text-xs text-rose-500 hover:text-rose-700 font-semibold"
                      >
                        Delete
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Tips & Database Status */}
              <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 flex flex-col justify-between">
                <div>
                  <h4 className="font-semibold text-sm text-zinc-700 dark:text-zinc-300 mb-2">Room Stats Overview</h4>
                  <ul className="text-xs text-zinc-500 space-y-1">
                    <li>Total Registered Members: <span className="font-semibold">{members.length}</span></li>
                    <li>All-time System Expenses: <span className="font-semibold">{expenses.length}</span></li>
                    <li>Active Month Expenses: <span className="font-semibold">{filteredExpenses.length}</span></li>
                  </ul>
                </div>
                <div className="text-xs text-purple-500 italic mt-4">
                  Note: Deleting a member will clear them from calculations but historical spending cards remain intact.
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Main Content Grid */}
        <main className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Left: Monthly Expenses List */}
          <section className="lg:col-span-2 space-y-4">
            <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-5 shadow-sm">
              <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-900 pb-3">
                <h2 className="font-semibold text-lg text-zinc-900 dark:text-zinc-100">
                  Expenses for {new Date(selectedMonth + "-02").toLocaleString("default", { month: "long", year: "numeric" })}
                </h2>
                <div className="text-sm bg-zinc-100 dark:bg-zinc-900 px-3 py-1 rounded-full text-zinc-700 dark:text-zinc-300">
                  Total Spent: <span className="font-bold text-emerald-600 dark:text-emerald-500">{totals.total.toFixed(2)}</span>
                </div>
              </div>

              <div className="mt-4 space-y-3 max-h-[60vh] overflow-y-auto pr-1">
                {!filteredExpenses.length ? (
                  <div className="text-sm text-zinc-500 py-8 text-center">No expenses recorded for this month.</div>
                ) : (
                  filteredExpenses.map((e) => (
                    <div
                      key={e.id}
                      className="rounded-xl border border-zinc-100 dark:border-zinc-900 bg-zinc-50/50 dark:bg-zinc-900/30 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 hover:border-zinc-300 dark:hover:border-zinc-800 transition-colors"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-zinc-900 dark:text-zinc-100">{e.title}</span>
                          <span className="text-xs px-2.5 py-0.5 rounded-full bg-zinc-200/60 dark:bg-zinc-800/80 text-zinc-700 dark:text-zinc-300 font-medium">
                            {e.category}
                          </span>
                        </div>
                        <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                          Paid by <span className="font-medium text-zinc-800 dark:text-zinc-200">{memberName(e.paidByMemberId)}</span> • {e.date}
                          {e.note ? ` • "${e.note}"` : ""}
                        </div>
                        <div className="text-xs text-zinc-400 mt-0.5">
                          Split Strategy: <span className="capitalize">{e.splitType}</span> • {e.participants?.length || members.length} involved
                        </div>
                      </div>
                      <div className="flex items-center gap-3 justify-between sm:justify-end">
                        <div className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
                          {Number(e.amount).toFixed(2)}
                        </div>
                        <div className="flex gap-1.5">
                          <button
                            onClick={() => {
                              setEditingExpense(e);
                              setOpenExpense(true);
                            }}
                            className="rounded-lg px-2.5 py-1 text-xs border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100"
                          >
                            Edit
                          </button>
                          {isAdmin && (
                            <button
                              onClick={() => deleteExpense(e.id)}
                              className="rounded-lg px-2.5 py-1 text-xs border border-red-200 dark:border-red-950/50 bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 hover:bg-red-100"
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </section>

          {/* Right Sidebar: Member Statuses & Balances */}
          <aside className="space-y-4">
            <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-5 shadow-sm">
              <h2 className="font-semibold text-zinc-900 dark:text-zinc-100 text-lg">Monthly Balances</h2>
              <p className="text-xs text-zinc-500 mt-1">
                Calculated strictly from <span className="font-semibold underline">{new Date(selectedMonth + "-02").toLocaleString("default", { month: "short", year: "numeric" })}</span> transactions.
              </p>

              <div className="mt-4 space-y-2 max-h-[40vh] overflow-y-auto pr-1">
                {!members.length ? (
                  <div className="text-sm text-zinc-500">No members to display balances for.</div>
                ) : (
                  members.map((m) => {
                    const b = balances[m.id] ?? 0;
                    const pos = b >= 0;
                    return (
                      <div
                        key={m.id}
                        className="flex items-center justify-between rounded-xl border border-zinc-100 dark:border-zinc-900 bg-zinc-50/50 dark:bg-zinc-900/30 p-3"
                      >
                        <div>
                          <div className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">{m.name}</div>
                          <button
                            onClick={() => openViewModal(m)}
                            className="text-[11px] text-blue-500 hover:underline mt-0.5"
                          >
                            Show Purchases
                          </button>
                        </div>
                        <div className={`text-sm font-bold px-2.5 py-1 rounded-lg ${pos
                            ? "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400"
                            : "bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400"
                          }`}>
                          {pos ? "+" : ""}{round2(b).toFixed(2)}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Settlements Panel */}
            <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-5 shadow-sm">
              <h2 className="font-semibold text-zinc-900 dark:text-zinc-100">Settlements</h2>
              <div className="mt-3 space-y-2">
                {!settlements.length ? (
                  <div className="text-sm text-zinc-500">Everything clear for this month!</div>
                ) : (
                  settlements.map((t, idx) => (
                    <div key={idx} className="rounded-xl border border-zinc-100 dark:border-zinc-900 p-3 text-xs flex justify-between items-center bg-zinc-50/50 dark:bg-zinc-900/10">
                      <div>
                        <span className="font-bold text-zinc-800 dark:text-zinc-200">{memberName(t.from)}</span>
                        <span className="text-zinc-500 mx-1">pays</span>
                        <span className="font-bold text-zinc-800 dark:text-zinc-200">{memberName(t.to)}</span>
                      </div>
                      <span className="font-extrabold text-emerald-600 dark:text-emerald-500 bg-emerald-50 dark:bg-emerald-950/20 px-2 py-0.5 rounded">
                        {Number(t.amount).toFixed(2)}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </aside>
        </main>
      </div>

      {/* Modals */}
      <Modal open={openMember} title="Add Member" onClose={() => setOpenMember(false)}>
        <MemberForm onSave={addMember} />
      </Modal>

      <Modal open={openExpense} title="Expense Details" onClose={() => setOpenExpense(false)}>
        <ExpenseForm
          members={members}
          initialData={editingExpense}
          onSave={(payload) => {
            if (editingExpense) return updateExpense(editingExpense.id, payload);
            return addExpense(payload);
          }}
        />
      </Modal>

      <Modal
        open={openView}
        title={`${selectedMember?.name}'s Spending - ${new Date(selectedMonth + "-02").toLocaleString("default", { month: "long" })}`}
        onClose={() => setOpenView(false)}
      >
        <ExpenseList expenses={memberExpenses} />
      </Modal>
    </div>
  );
}