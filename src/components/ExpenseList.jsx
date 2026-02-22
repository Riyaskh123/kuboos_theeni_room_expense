const ExpenseList = ({ expenses }) => {
  const total = expenses.reduce((sum, e) => sum + e.amount, 0);

  if (expenses.length === 0) {
    return (
      <p className="text-sm text-gray-500 text-center">
        No expenses added yet
      </p>
    );
  }

  return (
    <div>
      {/* List */}
      <div className="space-y-2 max-h-64 overflow-y-auto">
        {expenses.map((e) => (
          <div
            key={e.id}
            className="flex justify-between border-b pb-1 text-sm dark:text-white dark:border-zinc-800"
          >
            <span>{e.title}</span>
            <span className="font-medium dark:text-white">₹ {e.amount}</span>
          </div>
        ))}
      </div>

      {/* Total */}
      <div className="mt-4 text-right font-bold text-green-600 dark:text-green-400">
        Total: ₹ {total}
      </div>
    </div>
  );
};

export default ExpenseList;
