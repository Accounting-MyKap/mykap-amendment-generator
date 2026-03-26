import React from 'react';
import { Printer } from 'lucide-react';

export function LoadingScreen() {
  return (
    <div className="fixed inset-0 bg-slate-50 flex flex-col items-center justify-center z-50">
      <div className="flex flex-col items-center gap-4">
        <div className="bg-blue-700 text-white p-4 rounded-2xl shadow-lg animate-pulse">
          <Printer size={36} />
        </div>
        <div className="text-center">
          <h1 className="text-xl font-bold text-slate-900">MyKap Amendments Generator</h1>
          <p className="text-sm text-slate-500 mt-1">Cargando datos...</p>
        </div>
        <div className="w-40 h-1 bg-slate-200 rounded-full overflow-hidden">
          <div
            className="h-full w-1/3 bg-blue-600 rounded-full"
            style={{ animation: 'slide 1.5s ease-in-out infinite' }}
          />
        </div>
      </div>
    </div>
  );
}
