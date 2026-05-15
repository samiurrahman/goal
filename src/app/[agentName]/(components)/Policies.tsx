import React, { FC, ReactNode } from 'react';

interface PoliciesProps {
  data: {
    cancellation: string;
    checkIn: string;
    checkOut: string;
    notes: string[];
  };
}

const ClockIcon = (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="w-3.5 h-3.5"
    aria-hidden
  >
    <circle cx="12" cy="12" r="9" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);

const RefreshIcon = (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="w-3.5 h-3.5"
    aria-hidden
  >
    <polyline points="1 4 1 10 7 10" />
    <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
  </svg>
);

const PolicyRow: FC<{ icon: ReactNode; label: string; value: string }> = ({
  icon,
  label,
  value,
}) => (
  <div className="flex items-center justify-between gap-3 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/50 px-3.5 py-3">
    <span className="flex items-center gap-2 min-w-0 text-[13px] font-medium text-neutral-600 dark:text-neutral-300">
      <span className="text-neutral-500 dark:text-neutral-400 flex-shrink-0">{icon}</span>
      {label}
    </span>
    <span className="text-[13.5px] font-semibold text-neutral-900 dark:text-neutral-100 text-right flex-shrink-0">
      {value}
    </span>
  </div>
);

const Policies: FC<PoliciesProps> = ({ data }) => {
  const rows: { icon: ReactNode; label: string; value: string }[] = [];
  if (data.checkIn) rows.push({ icon: ClockIcon, label: 'Hotel check-in', value: data.checkIn });
  if (data.checkOut)
    rows.push({ icon: ClockIcon, label: 'Hotel check-out', value: data.checkOut });
  if (data.cancellation)
    rows.push({ icon: RefreshIcon, label: 'Cancellation', value: data.cancellation });

  const cleanNotes = (data.notes || []).map((n) => String(n || '').trim()).filter(Boolean);

  return (
    <div className="rounded-3xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 p-6 sm:p-8">
      <p className="text-[11.5px] font-semibold uppercase tracking-[0.08em] text-primary-700 dark:text-primary-400">
        Things to know
      </p>
      <h2 className="mt-2 text-[20px] sm:text-[22px] font-semibold leading-tight tracking-tight text-neutral-900 dark:text-neutral-100">
        Policies &amp; check-in
      </h2>

      {rows.length > 0 ? (
        <div className="mt-5 grid gap-2.5">
          {rows.map((row) => (
            <PolicyRow key={row.label} icon={row.icon} label={row.label} value={row.value} />
          ))}
        </div>
      ) : null}

      {cleanNotes.length > 0 ? (
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50/60 dark:border-amber-700/50 dark:bg-amber-900/20 px-4 py-3 text-[13px] leading-relaxed text-amber-900 dark:text-amber-200">
          {cleanNotes.length === 1 ? (
            <p className="m-0">
              <strong className="font-bold">Important.</strong> {cleanNotes[0]}
            </p>
          ) : (
            <>
              <p className="m-0 font-bold">Important</p>
              <ul className="mt-2 space-y-1.5 list-disc pl-4 marker:text-amber-700 dark:marker:text-amber-400">
                {cleanNotes.map((note, idx) => (
                  <li key={idx}>{note}</li>
                ))}
              </ul>
            </>
          )}
        </div>
      ) : null}

      {rows.length === 0 && cleanNotes.length === 0 ? (
        <p className="mt-5 text-[13.5px] text-neutral-500 dark:text-neutral-400">
          No policies added yet.
        </p>
      ) : null}
    </div>
  );
};

export default Policies;
