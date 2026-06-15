import type { PropsWithChildren } from 'react';

interface FieldProps extends PropsWithChildren {
  label: string;
  htmlFor: string;
  error?: string;
}

export function Field({ label, htmlFor, error, children }: FieldProps) {
  return (
    <div className="space-y-2">
      <label htmlFor={htmlFor} className="text-sm font-medium text-slate-700">
        {label}
      </label>
      {children}
      {error ? (
        <p className="text-sm text-rose-600" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
