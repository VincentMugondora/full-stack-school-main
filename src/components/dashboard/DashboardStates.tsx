"use client";

import { ReactNode } from "react";
import { Loader2 } from "lucide-react";

interface DashboardLoaderProps {
  message?: string;
}

export function DashboardLoader({ message = "Loading..." }: DashboardLoaderProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[300px] p-8">
      <Loader2 className="h-8 w-8 animate-spin text-gray-400 mb-4" />
      <p className="text-gray-500 text-sm">{message}</p>
    </div>
  );
}

interface DashboardErrorProps {
  title?: string;
  message?: string;
  retry?: () => void;
}

export function DashboardError({ 
  title = "Something went wrong", 
  message = "Failed to load dashboard data",
  retry 
}: DashboardErrorProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[300px] p-8 bg-red-50 rounded-lg">
      <h3 className="text-red-700 font-semibold mb-2">{title}</h3>
      <p className="text-red-600 text-sm text-center mb-4">{message}</p>
      {retry && (
        <button 
          onClick={retry}
          className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors text-sm"
        >
          Try Again
        </button>
      )}
    </div>
  );
}

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  message: string;
  action?: {
    label: string;
    href: string;
  };
}

export function EmptyState({ icon, title, message, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[200px] p-8 bg-gray-50 rounded-lg border border-dashed border-gray-300">
      {icon && <div className="mb-4 text-gray-400">{icon}</div>}
      <h3 className="text-gray-700 font-medium mb-2">{title}</h3>
      <p className="text-gray-500 text-sm text-center mb-4 max-w-md">{message}</p>
      {action && (
        <a 
          href={action.href}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm"
        >
          {action.label}
        </a>
      )}
    </div>
  );
}
