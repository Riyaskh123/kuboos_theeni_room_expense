export function round2(n) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/**
 * Calculates balances per member:
 * balance > 0 => should receive
 * balance < 0 => owes
 */
export function computeBalances(members, expenses) {
  const balances = {};
  members.forEach((m) => (balances[m.id] = 0));

  for (const e of expenses) {
    const amount = Number(e.amount || 0);
    if (!amount || !e.paidByMemberId) continue;

    // payer paid full amount
    balances[e.paidByMemberId] = round2((balances[e.paidByMemberId] || 0) + amount);

    // determine each participant share
    const participants = Array.isArray(e.participants) && e.participants.length
      ? e.participants
      : members.map((m) => m.id);

    if (e.splitType === "custom" && e.customShares) {
      for (const pid of participants) {
        const share = Number(e.customShares[pid] || 0);
        balances[pid] = round2((balances[pid] || 0) - share);
      }
    } else {
      // equal
      const per = participants.length ? amount / participants.length : 0;
      for (const pid of participants) {
        balances[pid] = round2((balances[pid] || 0) - per);
      }
    }
  }

  return balances;
}

/**
 * Greedy settlement suggestions: who pays whom
 */
export function suggestSettlements(balancesMap) {
  const creditors = [];
  const debtors = [];

  Object.entries(balancesMap).forEach(([id, bal]) => {
    const v = round2(Number(bal));
    if (v > 0) creditors.push({ id, amt: v });
    else if (v < 0) debtors.push({ id, amt: -v });
  });

  // sort biggest first
  creditors.sort((a, b) => b.amt - a.amt);
  debtors.sort((a, b) => b.amt - a.amt);

  const tx = [];
  let i = 0, j = 0;
  while (i < debtors.length && j < creditors.length) {
    const d = debtors[i];
    const c = creditors[j];
    const pay = Math.min(d.amt, c.amt);

    tx.push({ from: d.id, to: c.id, amount: round2(pay) });

    d.amt = round2(d.amt - pay);
    c.amt = round2(c.amt - pay);

    if (d.amt === 0) i++;
    if (c.amt === 0) j++;
  }
  return tx;
}
