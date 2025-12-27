import React from 'react';

const Header: React.FC = () => {
  return (
    <header className="mb-6">
      <div className="flex items-center gap-2">
        <div className="w-12 h-12 bg-yellow-400 border-2 border-black dark:border-white rounded-full flex items-center justify-center text-2xl shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,1)] animate-bounce-slow">
          🤖
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white leading-none">Agent Academy</h1>
          <p className="text-sm text-blue-500 dark:text-blue-400 font-medium">Powering your digital dreams!</p>
        </div>
      </div>
    </header>
  );
};

export default Header;