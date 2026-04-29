'use client';

import { XMarkIcon } from '@heroicons/react/24/outline';

const XClearIcon = () => {
  return (
    <span className="w-4 h-4 rounded-full bg-primary-500 text-white flex items-center justify-center ml-3 cursor-pointer">
      <XMarkIcon className="h-3 w-3" />
    </span>
  );
};

export default XClearIcon;
