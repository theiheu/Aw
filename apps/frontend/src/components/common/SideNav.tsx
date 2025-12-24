import React from 'react';
import { ScaleIcon, BarChartIcon, SettingsIcon, DatabaseIcon, ListIcon } from './icons';
import { AppScreen } from '../../types';

interface SideNavProps {
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
  <li className="px-2">
    <button
      onClick={onClick}
      className={`flex items-center w-full px-4 py-3 transition-all duration-200 text-left rounded-lg relative ${
        isActive
          ? 'bg-brand-primary text-white shadow-lg'
          : 'text-slate-400 hover:bg-slate-800 hover:text-white'
      }`}
    >
      {isActive && (
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-brand-accent rounded-r-full"></div>
      )}
      {icon}
      <span className="ml-4 font-semibold">{label}</span>
    </button>
  </li>
);

export const SideNav: React.FC<SideNavProps> = ({ activeScreen, setActiveScreen, isUserMode }) => {
  const allNavItems = [
    { screen: 'main', label: 'Cân & Phiếu', icon: <ScaleIcon className="w-6 h-6" /> },
    { screen: 'ticketSubmission', label: 'Phiếu Của Tôi', icon: <ListIcon className="w-6 h-6" /> },
    { screen: 'dataHub', label: 'Quản lý dữ liệu', icon: <DatabaseIcon className="w-6 h-6" /> },
    { screen: 'reports', label: 'Báo cáo', icon: <BarChartIcon className="w-6 h-6" /> },
    { screen: 'settings', label: 'Cài đặt', icon: <SettingsIcon className="w-6 h-6" /> },
  ];

  const navItems = isUserMode
    ? allNavItems.filter((i) => i.screen === 'main' || i.screen === 'ticketSubmission')
    : allNavItems;

  return (
    <div className="hidden md:flex flex-col w-64 bg-brand-dark text-white fixed h-full z-20">
      <div className="p-4 border-b border-slate-700">
        <h1 className="text-xl font-bold text-center tracking-wider">TRẠM CÂN</h1>
      </div>
      <nav className="flex-grow pt-4">
        <ul className="space-y-2">
          {navItems.map((item) => (
            <NavItem
              key={item.screen}
              icon={item.icon}
              label={item.label}
              isActive={activeScreen === item.screen}
              onClick={() => setActiveScreen(item.screen as AppScreen)}
            />
          ))}
        </ul>
      </nav>
      <div className="p-4 text-xs text-center text-slate-500 border-t border-slate-700">
        <p>Phiên bản 1.4.2</p>
      </div>
    </div>
  );
};
