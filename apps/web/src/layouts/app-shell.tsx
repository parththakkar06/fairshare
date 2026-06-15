import {
  BarChart3,
  CircleDollarSign,
  LayoutDashboard,
  Layers3,
  LogOut,
  Menu,
  UsersRound,
  WalletCards,
  X,
} from 'lucide-react';
import { useState } from 'react';
import { NavLink, Outlet } from 'react-router';

import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/features/auth/auth-context-value';
import { cn } from '@/lib/utils';

const navigation = [
  { label: 'Overview', to: '/', icon: LayoutDashboard, disabled: false },
  { label: 'Groups', to: '/groups', icon: UsersRound, disabled: false },
  { label: 'Expenses', to: '/expenses', icon: WalletCards, disabled: false },
  { label: 'Settlements', to: '/settlements', icon: CircleDollarSign, disabled: false },
  { label: 'Analytics', to: '/analytics', icon: BarChart3, disabled: false },
] as const;

export function AppShell() {
  const { user, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[linear-gradient(145deg,#f8fafc_0%,#f4f6ff_48%,#f0fdfa_100%)]">
      <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-white/80 bg-white/70 px-4 backdrop-blur-xl lg:hidden">
        <Brand />
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setMobileOpen((open) => !open)}
          aria-label="Toggle navigation"
        >
          {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
        </Button>
      </header>

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-white/80 bg-white/75 p-5 shadow-2xl shadow-slate-900/5 backdrop-blur-2xl transition-transform lg:translate-x-0',
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex items-center justify-between">
          <Brand />
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setMobileOpen(false)}
            aria-label="Close navigation"
          >
            <X className="size-5" />
          </Button>
        </div>

        <nav className="mt-10 space-y-1.5" aria-label="Main navigation">
          {navigation.map((item) => (
            <NavLink
              key={item.label}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  'flex h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-sm font-medium transition',
                  item.disabled
                    ? 'text-slate-500 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-55'
                    : isActive
                    ? 'bg-slate-950 text-white shadow-lg shadow-slate-950/10'
                    : 'text-slate-600 hover:bg-slate-100',
                )
              }
              aria-disabled={item.disabled}
              tabIndex={item.disabled ? -1 : undefined}
              onClick={item.disabled ? (event) => event.preventDefault() : undefined}
            >
              <item.icon className="size-[18px]" aria-hidden="true" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="mt-auto">
          <div className="mb-3 rounded-2xl border border-indigo-100 bg-indigo-50/70 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-indigo-600">Workspace</p>
            <p className="mt-2 text-sm font-medium text-slate-800">Premium group expense control</p>
            <p className="mt-1 text-xs leading-5 text-slate-500">Review balances, settlements, spend trends, and active groups.</p>
          </div>
          <div className="flex items-center gap-3 border-t border-slate-200/70 pt-4">
            <Avatar name={user?.name ?? 'User'} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-slate-900">{user?.name}</p>
              <p className="truncate text-xs text-slate-500">{user?.email}</p>
            </div>
            <Button variant="ghost" size="icon" onClick={() => void logout()} aria-label="Sign out">
              <LogOut className="size-4" />
            </Button>
          </div>
        </div>
      </aside>

      {mobileOpen ? (
        <button
          className="fixed inset-0 z-40 bg-slate-950/20 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
          aria-label="Close navigation overlay"
        />
      ) : null}

      <main className="lg:pl-72">
        <Outlet />
      </main>

      <nav
        className="fixed inset-x-3 bottom-3 z-30 grid grid-cols-5 rounded-2xl border border-white/80 bg-white/85 p-2 shadow-xl shadow-slate-900/10 backdrop-blur-xl lg:hidden"
        aria-label="Mobile navigation"
      >
        {navigation.map((item) => (
          <NavLink
            key={item.label}
            to={item.to}
            className={({ isActive }) =>
              cn(
                'flex min-w-0 flex-col items-center gap-1 rounded-xl px-1 py-1.5 text-[10px] font-medium sm:text-[11px]',
                item.disabled ? 'text-slate-400' : isActive ? 'bg-slate-950 text-white' : 'text-slate-500',
              )
            }
            aria-disabled={item.disabled}
            tabIndex={item.disabled ? -1 : undefined}
            onClick={item.disabled ? (event) => event.preventDefault() : undefined}
          >
            <item.icon className="size-4" />
            {item.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}

function Brand() {
  return (
    <div className="flex items-center gap-3 font-semibold tracking-tight text-slate-950">
      <span className="grid size-10 place-items-center rounded-2xl bg-slate-950 text-white shadow-lg shadow-slate-950/15">
        <Layers3 className="size-5" aria-hidden="true" />
      </span>
      <span>Splitwise</span>
    </div>
  );
}
