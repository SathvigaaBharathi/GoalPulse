import toast from 'react-hot-toast';
import { useState, useEffect } from 'react';
import axios from 'axios';
import useAuthStore from '../../store/useAuthStore';
import useCycleStore from '../../store/useCycleStore';
import { Target, CheckCircle2, Circle, AlertCircle } from 'lucide-react';

const TeamCheckIn = () => {
  const { token } = useAuthStore();
  const { window } = useCycleStore();
  const [teamData, setTeamData] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // State for adding comments
  const [comments, setComments] = useState({});

  const fetchTeam = async () => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const res = await axios.get(`${apiUrl}/api/checkins/team`, { headers: { Authorization: `Bearer ${token}` } });
      setTeamData(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeam();
  }, []);

  const handleMarkComplete = async (sheetId) => {
    const comment = comments[sheetId];
    if (!comment || comment.trim() === '') {
      return toast.error('A check-in comment is required to mark it complete.');
    }
    
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      await axios.post(`${apiUrl}/api/checkins/comments`, {
        goal_sheet_id: sheetId,
        quarter: window.phase, // 'Q1', 'Q2', etc.
        comment
      }, { headers: { Authorization: `Bearer ${token}` } });
      
      toast.success('Check-in completed!');
      fetchTeam(); // refresh to show comment
    } catch (err) {
      toast.error('Failed to save comment');
    }
  };

  if (loading) return <div className="p-8 text-center">Loading...</div>;

  const currentQ = window.phase;
  if (!currentQ || !currentQ.startsWith('Q')) {
    return <div className="p-8 text-center bg-white rounded-xl shadow-sm border border-gray-200">
      Not currently in a check-in phase.
    </div>;
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-primary">Team {currentQ} Check-ins</h1>
          <p className="text-gray-500 text-sm mt-1">Review team progress and provide mandatory feedback.</p>
        </div>
      </div>

      {teamData.length === 0 ? (
        <div className="p-8 text-center bg-white rounded-xl border border-gray-200 text-gray-500">
          No approved goal sheets found for your team.
        </div>
      ) : (
        <div className="space-y-8">
          {teamData.map(sheet => {
            const hasCommentForQ = sheet.comments.some(c => c.quarter === currentQ);
            
            return (
              <div key={sheet.sheet_id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                  <h2 className="text-lg font-bold">{sheet.employee_name}</h2>
                  {hasCommentForQ ? (
                    <span className="flex items-center gap-1 text-sm font-medium text-success bg-success/10 px-3 py-1 rounded-full border border-success/20">
                      <CheckCircle2 size={16} /> Reviewed
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-sm font-medium text-warning bg-warning/10 px-3 py-1 rounded-full border border-warning/20">
                      <AlertCircle size={16} /> Needs Review
                    </span>
                  )}
                </div>
                
                <div className="p-0 overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200 text-xs uppercase tracking-wider text-gray-500">
                        <th className="p-4 font-semibold w-1/3">Goal Title</th>
                        <th className="p-4 font-semibold">Target</th>
                        <th className="p-4 font-semibold">Actual</th>
                        <th className="p-4 font-semibold">Status</th>
                        <th className="p-4 font-semibold text-right flex items-center justify-end gap-1">
                          Score
                          <span 
                            className="cursor-help text-gray-400 hover:text-primary normal-case"
                            title="This is a progress indicator only. It does not represent a performance rating or appraisal score."
                          >
                            ⓘ
                          </span>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {sheet.goals.map(g => (
                        <tr key={g.id} className="hover:bg-gray-50/50">
                          <td className="p-4">
                            <div className="font-medium text-primary text-sm">{g.title}</div>
                            <div className="text-xs text-gray-500 mt-1">{g.uom_type}</div>
                          </td>
                          <td className="p-4 text-sm font-medium">{g.target_value || g.target_date || 'N/A'}</td>
                          <td className="p-4 text-sm">{g.actual_value || g.actual_date || <span className="text-gray-400 italic">No entry</span>}</td>
                          <td className="p-4">
                            {g.achievement_status === 'completed' ? <span className="text-success text-sm flex items-center gap-1"><CheckCircle2 size={14}/> Completed</span> :
                             g.achievement_status === 'on_track' ? <span className="text-warning text-sm flex items-center gap-1"><Target size={14}/> On Track</span> :
                             g.achievement_status === 'not_started' ? <span className="text-gray-500 text-sm flex items-center gap-1"><Circle size={14}/> Not Started</span> :
                             <span className="text-gray-400 text-sm">-</span>}
                          </td>
                          <td className="p-4 text-right">
                            {g.score !== null ? (
                              <div className="inline-flex items-center gap-1">
                                <div className="inline-flex items-center justify-center bg-gray-100 px-2 py-1 rounded font-bold text-sm min-w-[3rem]">
                                  {Math.round(g.score)}%
                                </div>
                                <span 
                                  className="cursor-help text-gray-400 text-xs"
                                  title="This is a progress indicator only. It does not represent a performance rating or appraisal score."
                                >
                                  ⓘ
                                </span>
                              </div>
                            ) : (
                              <span className="text-gray-400 text-sm">-</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="p-6 bg-gray-50/50 border-t border-gray-200">
                  {hasCommentForQ ? (
                    <div>
                      <h4 className="text-sm font-bold text-gray-700 mb-2">Your Check-in Comment ({currentQ}):</h4>
                      <p className="text-sm text-gray-600 bg-white p-4 rounded-lg border border-gray-200 italic">
                        "{sheet.comments.find(c => c.quarter === currentQ).comment}"
                      </p>
                    </div>
                  ) : (
                    <div className="bg-white p-4 rounded-lg border border-warning/30 shadow-sm">
                      <h4 className="text-sm font-bold text-gray-800 mb-2 flex items-center gap-2">
                        Manager Check-in Comment <span className="text-xs font-normal text-danger bg-danger/10 px-2 py-0.5 rounded">Required</span>
                      </h4>
                      <textarea
                        value={comments[sheet.sheet_id] || ''}
                        onChange={(e) => setComments({...comments, [sheet.sheet_id]: e.target.value})}
                        className="w-full p-3 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-accent focus:border-transparent outline-none min-h-[100px]"
                        placeholder="Add your review notes here before marking complete..."
                      />
                      <div className="mt-3 flex justify-end">
                        <button 
                          onClick={() => handleMarkComplete(sheet.sheet_id)}
                          className="bg-accent hover:bg-[#00a892] text-white px-4 py-2 rounded font-medium text-sm transition-colors"
                        >
                          Mark Check-in Complete
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default TeamCheckIn;
