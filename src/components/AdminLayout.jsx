import { Outlet, NavLink, Navigate, useNavigate } from 'react-router-dom';
import { LayoutDashboard, ListTodo, KeyRound, Users, LogOut } from 'lucide-react';
import { useStore } from '../store';

export default function AdminLayout() {
  const { isAdminAuthenticated, adminLogout } = useStore();
  const navigate = useNavigate();

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
  ];

  return (
    <div className="flex h-screen bg-bg-light">
      <aside className="w-64 bg-primary text-white flex flex-col">
        <div className="h-20 flex items-center justify-center border-b border-white/10 bg-white p-2">
          <img src="/logo.svg" alt="SELF FINDER Logo" className="h-full object-contain" />
        </div>
        <nav className="flex-1 px-4 py-6 space-y-2">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
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
        <div className="p-4 border-t border-white/10">
           <button onClick={handleLogout} className="flex items-center space-x-3 px-4 py-3 rounded-lg text-[#CBE6F7] hover:bg-white/10 w-full transition-colors">
              <LogOut size={20} />
              <span className="font-semibold">Keluar</span>
           </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 bg-white border-b border-[#E0E0E0] flex items-center px-8 shadow-sm z-10 w-full justify-between">
          <h2 className="text-xl font-bold text-primary">Portal Administrasi</h2>
        </header>

        <main className="flex-1 overflow-auto p-8 relative">
          <div className="max-w-6xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
