import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000';

const AgentChat = ({ artifact, type, evaluation }) => {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: "Hello! I'm your QA Agent. Ask me anything about this evaluation." }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const handleSend = async (e) => {
    if (e) e.preventDefault();
    if (!input.trim() || loading) return;

    const userMsg = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setLoading(true);

    try {
      const response = await fetch(`${BACKEND_URL}/agentic/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ artifact, type, evaluation, userQuestion: userMsg })
      });
      const data = await response.json();
      if (response.ok) {
        setMessages(prev => [...prev, { role: 'assistant', content: data.response }]);
      } else {
        setMessages(prev => [...prev, { role: 'assistant', content: "Sorry, I hit a snag: " + data.error }]);
      }
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', content: "Connection error. Please try again." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ 
      display: 'flex', flexDirection: 'column', height: '400px', 
      background: '#fff', borderRadius: 16, border: '1px solid #e2e8f0', overflow: 'hidden',
      marginTop: 24, boxShadow: '0 10px 15px -3px rgba(0,0,0,0.05)'
    }}>
      <div style={{ padding: '12px 16px', background: '#4f46e5', color: '#fff', fontWeight: 800, fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: 8 }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
        Agent Collaboration Chat
      </div>
      
      <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
        {messages.map((m, i) => (
          <div key={i} style={{ 
            alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
            maxWidth: '90%',
            padding: '12px 18px',
            borderRadius: m.role === 'user' ? '20px 20px 4px 20px' : '20px 20px 20px 4px',
            background: m.role === 'user' ? 'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)' : '#f8fafc',
            color: m.role === 'user' ? '#fff' : '#1e293b',
            fontSize: '0.88rem',
            lineHeight: 1.6,
            boxShadow: '0 2px 5px rgba(0,0,0,0.02)',
            border: m.role === 'user' ? 'none' : '1px solid #e2e8f0',
            letterSpacing: '0.01em'
          }}>
            {m.role === 'assistant' ? (
              <ReactMarkdown className="markdown-chat">
                {m.content}
              </ReactMarkdown>
            ) : m.content}
          </div>
        ))}
        {loading && <div style={{ alignSelf: 'flex-start', padding: '0 8px', color: '#94a3b8', fontSize: '0.75rem', fontWeight: 600 }}>Agent is thinking...</div>}
      </div>

      <form onSubmit={handleSend} style={{ padding: 12, borderTop: '1px solid #e2e8f0', display: 'flex', gap: 8 }}>
        <input 
          type="text" 
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask a question..."
          style={{ 
            flex: 1, padding: '8px 12px', borderRadius: 8, border: '1.5px solid #e2e8f0',
            fontSize: '0.82rem', outline: 'none'
          }}
        />
        <button 
          type="submit"
          disabled={loading}
          style={{ 
            padding: '8px 16px', background: '#4f46e5', color: '#fff', 
            border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: '1rem',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
        </button>
      </form>
    </div>
  );
};

export default AgentChat;
