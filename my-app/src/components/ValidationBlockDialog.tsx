import { AlertCircle } from 'lucide-react';

interface ValidationBlockDialogProps {
  message: string;
  onDismiss: () => void;
  title?: string;
}

const ValidationBlockDialog = ({
  message,
  onDismiss,
  title = 'Submission Blocked',
}: ValidationBlockDialogProps) => {
  const lines = message
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="validation-block-title"
    >
      <div className="bg-white rounded-lg w-full max-w-lg shadow-2xl overflow-hidden flex flex-col">
        <div className="bg-[#2c3e76] text-white px-6 py-4 flex items-center gap-3">
          <AlertCircle size={22} className="text-red-300 shrink-0" strokeWidth={2.25} />
          <h3 id="validation-block-title" className="text-xl font-semibold tracking-wide">
            {title}
          </h3>
        </div>

        <div className="p-6 bg-[#f0f4f8]">
          {lines.length > 1 ? (
            <ol className="space-y-4 list-none m-0 p-0">
              {lines.map((line, index) => (
                <li
                  key={index}
                  className="flex gap-3 items-start bg-white rounded-md border-l-4 border-red-500 px-4 py-3 shadow-sm"
                >
                  <span className="text-[#2c3e76] font-bold text-sm mt-0.5 shrink-0">
                    {index + 1}.
                  </span>
                  <span className="text-gray-900 text-[15px] leading-relaxed">{line}</span>
                </li>
              ))}
            </ol>
          ) : (
            <div className="bg-white rounded-md border-l-4 border-red-500 px-4 py-4 shadow-sm">
              <p className="text-gray-900 text-[15px] leading-relaxed whitespace-pre-line">
                {message}
              </p>
            </div>
          )}
        </div>

        <div className="px-6 py-4 bg-white flex justify-end border-t border-gray-200">
          <button
            type="button"
            onClick={onDismiss}
            className="px-16 py-2.5 bg-[#2c3e76] text-white font-bold rounded-md hover:bg-[#1e2a52] transition-colors"
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
};

export default ValidationBlockDialog;
