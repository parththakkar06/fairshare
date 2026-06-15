import { zodResolver } from '@hookform/resolvers/zod';
import { motion } from 'framer-motion';
import { ArrowRight, Layers3, LockKeyhole, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, Navigate, useLocation, useNavigate } from 'react-router';

import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { getApiErrorMessage } from '@/features/auth/auth-api';
import {
  loginSchema,
  registerSchema,
  type LoginFormValues,
  type RegisterFormValues,
} from '@/features/auth/auth.schemas';
import { useAuth } from '@/features/auth/auth-context-value';

interface AuthPageProps {
  mode: 'login' | 'register';
}

export function AuthPage({ mode }: AuthPageProps) {
  const { user, login, register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [serverError, setServerError] = useState<string | null>(null);
  const isRegister = mode === 'register';
  const loginForm = useForm<LoginFormValues>({ resolver: zodResolver(loginSchema) });
  const registerForm = useForm<RegisterFormValues>({ resolver: zodResolver(registerSchema) });
  const errors = isRegister ? registerForm.formState.errors : loginForm.formState.errors;
  const isSubmitting = isRegister
    ? registerForm.formState.isSubmitting
    : loginForm.formState.isSubmitting;
  const emailRegistration = isRegister
    ? registerForm.register('email')
    : loginForm.register('email');
  const passwordRegistration = isRegister
    ? registerForm.register('password')
    : loginForm.register('password');
  const handleSubmit = isRegister
    ? registerForm.handleSubmit((values) => submit(values))
    : loginForm.handleSubmit((values) => submit(values));

  if (user) return <Navigate to="/" replace />;

  async function submit(values: LoginFormValues | RegisterFormValues) {
    setServerError(null);
    try {
      if (isRegister && 'name' in values) {
        await register({ name: values.name, email: values.email, password: values.password });
      } else {
        await login({ email: values.email, password: values.password });
      }
      const destination = (location.state as { from?: string } | null)?.from ?? '/';
      void navigate(destination, { replace: true });
    } catch (error) {
      setServerError(getApiErrorMessage(error));
    }
  }

  return (
    <main className="app-page relative min-h-screen overflow-hidden px-5 py-6 sm:px-8">
      <div className="relative z-10 mx-auto grid min-h-[calc(100vh-3rem)] max-w-6xl items-center gap-10 lg:grid-cols-[1fr_0.82fr]">
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="hidden max-w-xl lg:block"
        >
          <div className="mb-10 flex items-center gap-3 font-semibold tracking-tight">
            <span className="grid size-11 place-items-center rounded-2xl bg-slate-950 text-white shadow-lg">
              <Layers3 className="size-5" />
            </span>
            Splitwise
          </div>
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-indigo-600">
            Shared expenses, made clear
          </p>
          <h1 className="mt-5 text-5xl font-semibold text-slate-950 xl:text-6xl">
            Less calculating. More enjoying the group.
          </h1>
          <div className="mt-9 flex gap-6 text-sm text-slate-600">
            <span className="flex items-center gap-2">
              <LockKeyhole className="size-4 text-indigo-600" />
              Secure sessions
            </span>
            <span className="flex items-center gap-2">
              <Sparkles className="size-4 text-indigo-600" />
              Built for groups
            </span>
          </div>
        </motion.section>

        <motion.section
          key={mode}
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass-card mx-auto w-full max-w-md p-6 sm:p-8"
        >
          <div className="mb-8 lg:hidden">
            <span className="flex items-center gap-3 font-semibold">
              <Layers3 className="size-5" />
              Splitwise
            </span>
          </div>
          <p className="text-sm font-semibold text-indigo-600">
            {isRegister ? 'Create account' : 'Welcome back'}
          </p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
            {isRegister ? 'Start sharing clearly' : 'Sign in to continue'}
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            {isRegister
              ? 'Set up your account in under a minute.'
              : 'Your groups and balances are waiting.'}
          </p>

          <form
            className="mt-8 space-y-5"
            onSubmit={(event) => void handleSubmit(event)}
            noValidate
          >
            {isRegister ? (
              <Field
                label="Name"
                htmlFor="name"
                error={registerForm.formState.errors.name?.message}
              >
                <Input
                  id="name"
                  autoComplete="name"
                  placeholder="Your name"
                  {...registerForm.register('name')}
                />
              </Field>
            ) : null}
            <Field label="Email" htmlFor="email" error={errors.email?.message}>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                {...emailRegistration}
              />
            </Field>
            <Field label="Password" htmlFor="password" error={errors.password?.message}>
              <Input
                id="password"
                type="password"
                autoComplete={isRegister ? 'new-password' : 'current-password'}
                placeholder="At least 8 characters"
                {...passwordRegistration}
              />
            </Field>
            {isRegister ? (
              <Field
                label="Confirm password"
                htmlFor="confirmPassword"
                error={registerForm.formState.errors.confirmPassword?.message}
              >
                <Input
                  id="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  placeholder="Repeat your password"
                  {...registerForm.register('confirmPassword')}
                />
              </Field>
            ) : null}

            {serverError ? (
              <p role="alert" className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {serverError}
              </p>
            ) : null}
            <Button className="w-full" size="lg" type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Please wait...' : isRegister ? 'Create account' : 'Sign in'}
              <ArrowRight className="size-4" />
            </Button>
          </form>

          <p className="mt-7 text-center text-sm text-slate-500">
            {isRegister ? 'Already have an account?' : 'New to Splitwise?'}{' '}
            <Link
              className="font-semibold text-indigo-600 hover:text-indigo-500"
              to={isRegister ? '/login' : '/register'}
            >
              {isRegister ? 'Sign in' : 'Create account'}
            </Link>
          </p>
        </motion.section>
      </div>
    </main>
  );
}
