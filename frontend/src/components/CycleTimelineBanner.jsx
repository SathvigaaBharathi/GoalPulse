import { useEffect } from 'react';
import useCycleStore from '../store/useCycleStore';
import { Calendar, AlertCircle } from 'lucide-react';
import { formatDistanceToNow, differenceInDays } from 'date-fns';

const CycleTimelineBanner = () => {
  const { window, loading, fetchWindow } = useCycleStore();

  useEffect(() => {
    fetchWindow();
  }, [fetchWindow]);

  if (loading || !window.isOpen || !window.phase) return null;

  const closesAtDate = new Date(window.closesAt);
  const daysRemaining = differenceInDays(closesAtDate, new Date());
  
  const isUrgent = daysRemaining <= 7;

  return (
    <div className={`${isUrgent ? 'bg-warning/20 text-warning-dark' : 'bg-accent/10 text-primary'} px-4 py-2 border-b ${isUrgent ? 'border-warning/30' : 'border-accent/20'} flex items-center justify-center gap-2 text-sm font-medium`}>
      {isUrgent ? <AlertCircle size={16} /> : <Calendar size={16} />}
      <span>
        {window.phase} {window.phase === 'Phase 1' ? 'Goal-Setting' : 'Check-in'} window is open until {closesAtDate.toLocaleDateString()}. {daysRemaining} days remaining.
      </span>
    </div>
  );
};

export default CycleTimelineBanner;
