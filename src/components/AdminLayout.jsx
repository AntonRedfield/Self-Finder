import { Outlet, NavLink, Navigate, useNavigate } from 'react-router-dom';
import { LayoutDashboard, ListTodo, KeyRound, Users, LogOut, Menu, X, MessageSquareQuote, Settings2 } from 'lucide-react';
import { useStore } from '../store';
import { useState } from 'react';
import Footer from './Footer';

export default function AdminLayout() {
  const { isAdminAuthenticated, adminLogout } = useStore();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (!isAdminAuthenticated) {
    return <Navigate to="/admin/login" replace />;
  }

  const handleLogout = () => {
    adminLogout();
    navigate('/admin/login');
  };

  const navItems = [
    { to: '/admin/dashboard', icon: <LayoutDashboard size={20} />, label: 'Dasbor' },
    { to: '/admin/questions', icon: <ListTodo size={20} />, label: 'Pertanyaan' },
    { to: '/admin/tokens', icon: <KeyRound size={20} />, label: 'Token' },
    { to: '/admin/results', icon: <Users size={20} />, label: 'Hasil' },
    { to: '/admin/captions', icon: <MessageSquareQuote size={20} />, label: 'Kontak & Keterangan' },
    { to: '/admin/settings', icon: <Settings2 size={20} />, label: 'Pengaturan' },
  ];

  return (
    <div className="flex h-screen print:h-auto bg-bg-light print:bg-white">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/40 z-30 md:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed md:static inset-y-0 left-0 z-40
        w-64 bg-primary text-white flex flex-col
        transform transition-transform duration-300 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        md:translate-x-0
        print:hidden
      `}>
        <div className="h-20 flex items-center justify-center border-b border-white/10 bg-white p-2 shrink-0">
          <img src="/logo.svg" alt="SELF FINDER Logo" className="h-full object-contain" />
        </div>
        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors duration-200 ${
                  isActive ? 'bg-secondary text-white' : 'text-[#CBE6F7] hover:bg-white/10'
                }`
              }
            >
              {item.icon}
              <span className="font-semibold">{item.label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="p-4 border-t border-white/10 shrink-0">
          <button onClick={handleLogout} className="flex items-center space-x-3 px-4 py-3 rounded-lg text-[#CBE6F7] hover:bg-white/10 w-full transition-colors">
            <LogOut size={20} />
            <span className="font-semibold">Keluar</span>
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden print:overflow-visible min-w-0">
        <header className="h-14 md:h-16 bg-white border-b border-[#E0E0E0] flex items-center px-4 md:px-8 shadow-sm z-10 shrink-0 print:hidden">
          <button onClick={() => setSidebarOpen(true)} className="md:hidden mr-3 text-primary">
            <Menu size={24} />
          </button>
          <h2 className="text-lg md:text-xl font-bold text-primary truncate">Portal Administrasi</h2>
        </header>

        <main className="flex-1 overflow-auto print:overflow-visible p-4 md:p-8 relative flex flex-col">
          <div className="max-w-6xl mx-auto w-full flex-1">
            <Outlet />
          </div>
          <Footer className="mt-auto py-4" />
        </main>
      </div>
    </div>
  );
}
