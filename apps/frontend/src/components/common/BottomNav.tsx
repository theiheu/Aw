import React from 'react';
import { ScaleIcon, BarChartIcon, SettingsIcon, DatabaseIcon, ListIcon } from './icons';
import { AppScreen } from '../../types';

interface BottomNavProps {
  activeScreen: AppScreen;
  setActiveScreen: (screen: AppScreen) => void;
  isUserMode?: boolean;
}

const NavItem: React.FC<{
  icon: React.ReactNode;
  label: string;
  isActive: boolean;
  onClick: () => void;
}> = ({ icon, label, isActive, onClick }) => (
  <button
    onClick={onClick}
    className={`flex flex-col items-center justify-center w-full pt-2 pb-1 transition-colors duration-200 ${
      isActive ? 'text-brand-primary' : 'text-slate-500'
    }`}
  >
    {icon}
    <span className="text-[10px] mt-1 font-medium">{label}</span>
  </button>
);

export const BottomNav: React.FC<BottomNavProps> = ({ activeScreen, setActiveScreen, isUserMode }) => {
  const allItems = [
    { screen: 'main' as AppScreen, label: 'Cân', icon: <ScaleIcon className="w-6 h-6" /> },
    { screen: 'ticketSubmission' as AppScreen, label: 'Phiếu', icon: <ListIcon className="w-6 h-6" /> },
    { screen: 'dataHub' as AppScreen, label: 'Dữ liệu', icon: <DatabaseIcon className="w-6 h-6" /> },
    { screen: 'reports' as AppScreen, label: 'Báo cáo', icon: <BarChartIcon className="w-6 h-6" /> },
    { screen: 'settings' as AppScreen, label: 'Cài đặt', icon: <SettingsIcon className="w-6 h-6" /> },
  ];

  const items = isUserMode
    ? allItems.filter((i) => i.screen === 'main' || i.screen === 'ticketSubmission')
    : allItems;

  return (
    <div className="fixed bottom-0 left-0 right-0 h-16 bg-white border-t border-slate-200 flex md:hidden z-50 shadow-[0_-5px_15px_-5px_rgba(0,0,0,0.1)] overflow-x-auto">
      {items.map((i) => (
        <NavItem
          key={i.screen}
          icon={i.icon}
          label={i.label}
          isActive={activeScreen === i.screen}
          onClick={() => setActiveScreen(i.screen)}
        />
      ))}
    </div>
  );
};
