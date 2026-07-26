import { cn } from "@/utils/cn";

export type ProcessingStepId =
  | "queued"
  | "metadata"
  | "downloading"
  | "transcribing"
  | "generating"
  | "saving"
  | "completed";

interface ProcessingStep {
  id: ProcessingStepId;
  label: string;
}

const DEFAULT_STEPS: ProcessingStep[] = [
  { id: "queued", label: "Queued" },
  { id: "metadata", label: "Fetching Metadata" },
  { id: "downloading", label: "Downloading Audio" },
  { id: "transcribing", label: "Transcribing" },
  { id: "generating", label: "Generating AI Notes" },
  { id: "saving", label: "Saving" },
  { id: "completed", label: "Completed" },
];

interface ProcessingStepsProps {
  currentStep: ProcessingStepId;
  steps?: ProcessingStep[];
  progressMessage?: string | null;
  className?: string;
}

export function ProcessingSteps({
  currentStep,
  steps = DEFAULT_STEPS,
  progressMessage,
  className,
}: ProcessingStepsProps) {
  const currentIndex = steps.findIndex((s) => s.id === currentStep);

  return (
    <div className={cn("space-y-0", className)} role="progressbar" aria-label="Processing progress" aria-valuemin={0} aria-valuemax={steps.length - 1} aria-valuenow={Math.max(0, currentIndex)}>
      {steps.map((step, index) => {
        const isCompleted = index < currentIndex;
        const isCurrent = index === currentIndex;
        const isPending = index > currentIndex;

        return (
          <div key={step.id} className="flex items-start gap-3">
            {/* Timeline indicator column */}
            <div className="flex flex-col items-center">
              {/* Step dot */}
              <div
                className={cn(
                  "flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full border-2 text-xs font-semibold transition-all duration-500",
                  isCompleted && "border-green-500 bg-green-500 text-white shadow-sm shadow-green-200 dark:shadow-green-900",
                  isCurrent && "border-primary-500 bg-primary-500 text-white shadow-sm shadow-primary-200 dark:shadow-primary-900",
                  isPending && "border-gray-300 bg-white text-gray-400 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-500",
                )}
              >
                {isCompleted ? (
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                ) : isCurrent ? (
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-white" />
                  </span>
                ) : (
                  <span className="h-2 w-2 rounded-full bg-current" />
                )}
              </div>
              {/* Connector line */}
              {index < steps.length - 1 && (
                <div
                  className={cn(
                    "mt-1 h-8 w-0.5 transition-colors duration-500",
                    isCompleted ? "bg-green-400" : "bg-gray-200 dark:bg-gray-700",
                  )}
                />
              )}
            </div>

            {/* Step content */}
            <div className={cn("flex-1 pb-2", index === steps.length - 1 && "pb-0")}>
              <div className="flex flex-col">
                <span
                  className={cn(
                    "text-sm font-medium transition-all duration-300",
                    isCompleted && "text-green-700 dark:text-green-400",
                    isCurrent && "text-primary-700 dark:text-primary-300 font-semibold",
                    isPending && "text-gray-400 dark:text-gray-500",
                  )}
                >
                  {isCompleted && "✓ "}{isCurrent && "● "}{step.label}
                </span>
                {isCurrent && progressMessage && (
                  <span className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                    {progressMessage}
                  </span>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
