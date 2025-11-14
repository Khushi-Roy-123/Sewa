import React from 'react';
import { HomeIcon, CalendarIcon, PillIcon, FileTextIcon, UserIcon, LogoutIcon, StethoscopeIcon, HeartbeatIcon, FaceSmileIcon, CurrencyDollarIcon } from './Icons';
import { useTranslations } from '../lib/i18n';
import GlobalSearch from './GlobalSearch';

interface NavLinkProps {
  href: string;
  icon: React.ReactNode;
  label: string;
  isActive: boolean;
}

const NavLink: React.FC<NavLinkProps> = ({ href, icon, label, isActive }) => {
  const activeClasses = 'bg-sky-100 text-sky-600';
  const inactiveClasses = 'text-slate-600 hover:bg-slate-100 hover:text-slate-900';
  const navigate = () => { window.location.hash = href; };
  
  return (
    <button
      onClick={navigate}
      className={`group flex items-center w-full px-4 py-3 text-sm font-medium rounded-lg transition-colors duration-150 text-left ${isActive ? activeClasses : inactiveClasses}`}
    >
      {icon}
      <span className="ml-4">{label}</span>
    </button>
  );
};

const MobileNavLink: React.FC<NavLinkProps> = ({ href, icon, label, isActive }) => {
    const activeClasses = 'text-sky-600';
    const inactiveClasses = 'text-slate-500 hover:text-sky-600';
    const navigate = () => { window.location.hash = href; };

    return (
        <button onClick={navigate} className={`flex flex-col items-center justify-center space-y-1 w-full ${isActive ? activeClasses : inactiveClasses}`}>
            {icon}
            <span className="text-xs">{label}</span>
        </button>
    );
}

interface LayoutProps {
    children: React.ReactNode;
    onLogout: () => void;
}

const Layout: React.FC<LayoutProps> = ({ children, onLogout }) => {
  const currentHash = window.location.hash || '#/';
  const { t } = useTranslations();

  const navItems = [
    { href: '#/', label: t('dashboard'), icon: <HomeIcon /> },
    { href: '#/symptoms', label: t('symptomChecker'), icon: <StethoscopeIcon /> },
    { href: '#/appointments', label: t('appointments'), icon: <CalendarIcon /> },
    { href: '#/medications', label: t('medications'), icon: <PillIcon /> },
    { href: '#/records', label: t('records'), icon: <FileTextIcon /> },
    { href: '#/vitals', label: t('vitalSigns'), icon: <HeartbeatIcon /> },
    { href: '#/mental-health', label: t('mentalHealth'), icon: <FaceSmileIcon /> },
    { href: '#/drug-prices', label: t('drugPrices'), icon: <CurrencyDollarIcon /> },
  ];
  
  const bottomNavItems = [ ...navItems.slice(0, 4), { href: '#/profile', label: t('profile'), icon: <UserIcon /> } ];
  const desktopNavItems = [ ...navItems, { href: '#/profile', label: t('profile'), icon: <UserIcon /> } ];


  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-gray-100 text-slate-800">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex md:w-64 flex-col fixed inset-y-0 z-20">
        <div className="flex flex-col flex-grow border-r border-slate-200 bg-white pt-5 pb-4 overflow-y-auto">
          <div className="flex items-center flex-shrink-0 px-4">
            <svg className="h-8 w-auto text-sky-500" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2L4 5v6.09c0 4.97 3.41 9.32 8 10.91 4.59-1.59 8-5.94 8-10.91V5l-8-3zm-1 15v-4H7v-2h4V7h2v4h4v2h-4v4h-2z"/>
            </svg>
            <span className="ml-3 text-xl font-bold text-slate-800">Sewa</span>
          </div>
          <nav className="mt-8 flex-1 px-4 space-y-2">
            {desktopNavItems.map(item => (
              <NavLink key={item.href} {...item} isActive={currentHash === item.href} />
            ))}
          </nav>
          <div className="mt-auto px-4 space-y-2">
             <button
              onClick={onLogout}
              className="group flex items-center w-full px-4 py-3 text-sm font-medium rounded-lg text-slate-600 hover:bg-red-50 hover:text-red-600 transition-colors duration-150"
            >
              <LogoutIcon />
              <span className="ml-4">{t('logout')}</span>
            </button>
          </div>
        </div>
      </aside>

      <div className="md:pl-64 flex flex-col flex-1">
        <header className="sticky top-0 z-10 bg-gray-100/80 backdrop-blur-sm border-b border-slate-200">
            <div className="mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-end h-16">
                    <GlobalSearch />
                </div>
            </div>
        </header>
        <main className="flex-1 pb-20 md:pb-0">
            <div className="p-4 sm:p-6 lg:p-8">
                {children}
            </div>
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 bg-white border-t border-slate-200 shadow-lg z-10">
        <div className="flex justify-around h-16 items-center">
            {bottomNavItems.map(item => (
                <MobileNavLink key={item.href} {...item} isActive={currentHash === item.href} />
            ))}
        </div>
      </nav>
    </div>
  );
};

export default Layout;