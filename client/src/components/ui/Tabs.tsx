import clsx from 'clsx';

export function Tabs({
  tabs,
  active,
  onChange,
}: {
  tabs: { key: string; label: string; icon?: React.ReactNode }[];
  active: string;
  onChange: (key: string) => void;
}) {
  return (
    <div className="flex gap-1 glass rounded-xl p-1 overflow-x-auto">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          onClick={() => onChange(tab.key)}
          className={clsx(
            'flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-all',
            active === tab.key ? 'gradient-brand text-white shadow-md' : 'text-gray-400 hover:text-white hover:bg-white/5'
          )}
        >
          {tab.icon}
          {tab.label}
        </button>
      ))}
    </div>
  );
}
