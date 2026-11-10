import { useEffect } from "react";

type Props = {
  message: string | null;
  onDismiss: () => void;
};

export default function Toast({ message, onDismiss }: Props) {
  useEffect(() => {
    if (!message) return;
    const timer = window.setTimeout(onDismiss, 4000);
    return () => window.clearTimeout(timer);
  }, [message, onDismiss]);

  if (!message) return null;

  return (
    <div className="animate-toast fixed bottom-5 right-5 z-50 max-w-sm rounded-lg bg-slate-900 px-4 py-2.5 text-xs text-white shadow-lg">
      {message}
    </div>
  );
}
