import { SwapOption } from '@/lib/types';
import ShiftBadge from './ShiftBadge';
import { formatSwedishDate } from '@/lib/schedule';

interface SwapCardProps {
  option: SwapOption;
  onRegister?: () => void;
  registered?: boolean;
}

const GROUP_BADGE: Record<number, string> = {
  1: 'bg-blue-100 text-blue-800',
  2: 'bg-green-100 text-green-800',
  3: 'bg-purple-100 text-purple-800',
  4: 'bg-orange-100 text-orange-800',
};

export default function SwapCard({ option, onRegister, registered }: SwapCardProps) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-gray-900">{option.partnerName}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${GROUP_BADGE[option.partnerGroup]}`}>
              Grupp {option.partnerGroup}
            </span>
            {option.dayOffset !== 0 && (
              <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
                {option.dayOffset === 1 ? 'Dagen efter' : 'Dagen innan'}
              </span>
            )}
          </div>
          {option.dayOffset !== 0 && (
            <div className="text-xs text-gray-400 mt-0.5">
              {formatSwedishDate(option.partnerDate)}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-1">
            <ShiftBadge type={option.myShift} size="sm" />
            <span className="text-gray-400 text-xs">⇄</span>
            <ShiftBadge type={option.partnerShift} size="sm" />
          </div>
          {registered ? (
            <span className="text-xs text-green-700 font-medium whitespace-nowrap">Registrerat ✓</span>
          ) : onRegister ? (
            <button
              onClick={onRegister}
              className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 whitespace-nowrap"
            >
              Registrera
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
