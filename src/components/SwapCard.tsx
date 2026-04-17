import { SwapOption } from '@/lib/types';
import ShiftBadge from './ShiftBadge';
import { formatSwedishDate, SHIFT_INFO } from '@/lib/schedule';

interface SwapCardProps {
  option: SwapOption;
  onRegister?: () => void;
  registered?: boolean;
}

const GROUP_LABELS: Record<number, string> = {
  1: 'Grupp 1',
  2: 'Grupp 2',
  3: 'Grupp 3',
  4: 'Grupp 4',
};

const GROUP_BADGE: Record<number, string> = {
  1: 'bg-blue-100 text-blue-800',
  2: 'bg-green-100 text-green-800',
  3: 'bg-purple-100 text-purple-800',
  4: 'bg-orange-100 text-orange-800',
};

export default function SwapCard({ option, onRegister, registered }: SwapCardProps) {
  const borderClass = option.valid
    ? 'border-green-200 bg-green-50'
    : 'border-red-200 bg-red-50';

  const iconClass = option.valid ? 'text-green-500' : 'text-red-500';

  return (
    <div className={`rounded-lg border p-4 ${borderClass}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Status-ikon */}
          <span className={`text-xl ${iconClass}`}>{option.valid ? '✓' : '✗'}</span>

          {/* Partnerinfo */}
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-gray-900">{option.partnerName}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${GROUP_BADGE[option.partnerGroup]}`}>
                {GROUP_LABELS[option.partnerGroup]}
              </span>
              {option.dayOffset !== 0 && (
                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                  {option.dayOffset === 1 ? 'Dagen efter' : 'Dagen innan'}
                </span>
              )}
            </div>
            <div className="text-xs text-gray-500 mt-0.5">
              Deras pass: {SHIFT_INFO[option.partnerShift].duration}
              {option.dayOffset !== 0 && (
                <span className="ml-1">· {formatSwedishDate(option.partnerDate)}</span>
              )}
            </div>
          </div>
        </div>

        {/* Skiftbytes-illustration */}
        <div className="flex items-center gap-1 shrink-0">
          <ShiftBadge type={option.myShift} size="sm" />
          <span className="text-gray-400 text-sm">⇄</span>
          <ShiftBadge type={option.partnerShift} size="sm" />
        </div>
      </div>

      {/* Felmeddelande */}
      {!option.valid && option.reason && (
        <p className="mt-2 text-xs text-red-700 bg-red-100 rounded px-2 py-1">
          {option.reason}
        </p>
      )}

      {option.valid && (
        <div className="mt-2 flex items-center justify-between gap-2">
          <p className="text-xs text-green-700">
            Bytet uppfyller 11h-viloregeln för båda parter.
          </p>
          {registered ? (
            <span className="text-xs text-green-700 font-medium shrink-0">Registrerat ✓</span>
          ) : onRegister ? (
            <button
              onClick={onRegister}
              className="text-xs bg-blue-600 text-white px-3 py-1 rounded-lg hover:bg-blue-700 shrink-0"
            >
              Registrera byte
            </button>
          ) : null}
        </div>
      )}
    </div>
  );
}
