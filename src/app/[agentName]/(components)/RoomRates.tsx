import React from 'react';

export interface RoomRate {
  label: string;
  value: string;
  people: number;
  icon?: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  highlight?: boolean;
}

export interface RoomRatesProps {
  rates: RoomRate[];
  selectedRate: RoomRate;
  onSelect: (rate: RoomRate) => void;
}

const RoomRates: React.FC<RoomRatesProps> = ({ rates, selectedRate, onSelect }) => {
  return (
    <div className="listingSection__wrap">
      {/* HEADING */}
      <div>
        <h2 className="text-2xl font-medium">Room Rates </h2>
        <span className="block mt-2 text-neutral-500 dark:text-neutral-400">
          Prices by room type
        </span>
      </div>
      <div className="w-14 border-b border-neutral-200 dark:border-neutral-700"></div>
      {/* CONTENT */}
      <div className="flow-root">
        <div className="text-sm sm:text-base text-neutral-6000 dark:text-neutral-300 -mb-4">
          {rates.map((item) => (
            <div
              key={item.label}
              className={`p-4 flex justify-between items-center space-x-4 rounded-lg cursor-pointer transition-all duration-150 ${
                selectedRate.label === item.label
                  ? 'bg-blue-100 dark:bg-blue-800 border border-blue-400'
                  : item.highlight
                    ? 'bg-neutral-100 dark:bg-neutral-800'
                    : ''
              }`}
              onClick={() => onSelect(item)}
            >
              <span className="flex items-end ">
                {item.icon && <item.icon />}
                <span className="ml-2">{item.label}</span>
              </span>
              <span>INR {item.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default RoomRates;
