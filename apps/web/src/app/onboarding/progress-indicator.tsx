'use client';

import { Check } from 'lucide-react';

const STEPS = ['Welcome', 'Hosting', 'Subscription', 'AI Provider', 'Plan', 'Messengers', 'Skills', 'Setup & Connect', 'Ready'];

export default function ProgressIndicator({ currentStep }: { currentStep: number }) {
  return (
    <div className="w-full max-w-2xl mb-8">
      {/* Mobile: dots only */}
      <div className="flex items-center justify-center gap-2 sm:hidden">
        {STEPS.map((_, i) => (
          <button
            key={i}
            type="button"
            className="relative flex items-center justify-center"
            aria-label={`Step ${i + 1}: ${STEPS[i]}${i < currentStep ? ' (completed)' : i === currentStep ? ' (current)' : ''}`}
          >
            <div
              className={`w-3 h-3 rounded-full transition-all duration-300 flex items-center justify-center ${
                i < currentStep
                  ? 'bg-purple-600 scale-100'
                  : i === currentStep
                    ? 'bg-purple-600 scale-125 ring-2 ring-purple-600/30'
                    : 'bg-slate-700 scale-100'
              }`}
            >
              {i < currentStep && (
                <Check className="w-2 h-2 text-white" strokeWidth={3} />
              )}
            </div>
          </button>
        ))}
      </div>

      {/* Desktop: segments with labels */}
      <div className="hidden sm:block">
        {/* Progress bar track */}
        <div className="relative flex items-center justify-between">
          {/* Background line */}
          <div className="absolute top-3 left-0 right-0 h-0.5 bg-slate-700" />
          {/* Filled line */}
          <div
            className="absolute top-3 left-0 h-0.5 bg-purple-600 transition-all duration-500 ease-out"
            style={{ width: `${(currentStep / (STEPS.length - 1)) * 100}%` }}
          />

          {STEPS.map((label, i) => (
            <div key={i} className="relative flex flex-col items-center z-10" style={{ width: 0 }}>
              {/* Dot / checkmark */}
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center transition-all duration-300 border-2 ${
                  i < currentStep
                    ? 'bg-purple-600 border-purple-600 scale-100'
                    : i === currentStep
                      ? 'bg-purple-600 border-purple-600 scale-110 shadow-lg shadow-purple-600/40'
                      : 'bg-slate-900 border-slate-700 scale-100'
                }`}
              >
                {i < currentStep ? (
                  <Check className="w-3 h-3 text-white" strokeWidth={3} />
                ) : (
                  <span className={`text-[10px] font-bold ${
                    i === currentStep ? 'text-white' : 'text-slate-500'
                  }`}>
                    {i + 1}
                  </span>
                )}
              </div>
              {/* Label */}
              <span
                className={`absolute top-8 text-[10px] font-medium whitespace-nowrap transition-colors duration-300 ${
                  i < currentStep
                    ? 'text-purple-400'
                    : i === currentStep
                      ? 'text-white'
                      : 'text-slate-500'
                }`}
              >
                {label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
