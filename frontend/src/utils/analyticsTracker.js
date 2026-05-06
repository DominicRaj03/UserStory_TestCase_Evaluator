export const trackEvaluation = (type, artifact, results) => {
  try {
    const history = JSON.parse(localStorage.getItem('qa_agent_daily_tracker') || '[]');
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    
    const entry = {
      id: Date.now().toString(),
      date: today,
      timestamp: new Date().toISOString(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      type: type,
      score: results.totalScore || 0,
      maxScore: type === 'User Story' ? 30 : 25,
      grade: results.grade || (results.totalScore >= 20 ? 'B' : 'C'),
      deepEval: results.metrics ? 'Enabled' : 'Disabled',
      artifactPreview: (artifact || '').substring(0, 80) + '...',
      timeSaved: type === 'User Story' ? 45 : 30 // minutes saved per artifact vs manual
    };
    
    history.unshift(entry);
    localStorage.setItem('qa_agent_daily_tracker', JSON.stringify(history.slice(0, 200))); // Keep last 200
  } catch (e) {
    console.error('Failed to track evaluation:', e);
  }
};

export const getDailyStats = () => {
  try {
    const history = JSON.parse(localStorage.getItem('qa_agent_daily_tracker') || '[]');
    const today = new Date().toISOString().split('T')[0];
    
    const todaysEvals = history.filter(h => h.date === today);
    const timeSavedMins = todaysEvals.reduce((sum, h) => sum + h.timeSaved, 0);
    
    return {
      totalToday: todaysEvals.length,
      userStories: todaysEvals.filter(h => h.type === 'User Story').length,
      testCases: todaysEvals.filter(h => h.type === 'Test Case').length,
      timeSavedHrs: (timeSavedMins / 60).toFixed(1),
      averageScore: todaysEvals.length ? Math.round(todaysEvals.reduce((sum, h) => sum + (h.score / h.maxScore)*100, 0) / todaysEvals.length) : 0,
      history: history
    };
  } catch (e) {
    return { totalToday: 0, userStories: 0, testCases: 0, timeSavedHrs: '0.0', averageScore: 0, history: [] };
  }
};
