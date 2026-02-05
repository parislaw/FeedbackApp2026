
import React, { useState, useRef, useEffect } from 'react';
import { Message, Scenario } from '../types';
import { geminiService } from '../services/geminiService';
import { Chat } from '@google/genai';

interface ChatInterfaceProps {
  scenario: Scenario;
  onComplete: (transcript: Message[]) => void;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({ scenario, onComplete }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [chatSession, setChatSession] = useState<Chat | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const initChat = async () => {
      const chat = await geminiService.createPersonaChat(scenario);
      setChatSession(chat);
      
      // Start message from AI
      setIsTyping(true);
      const firstResponse = await chat.sendMessage({ message: "Start the conversation naturally based on our context." });
      setMessages([{ role: 'model', text: firstResponse.text }]);
      setIsTyping(false);
    };
    initChat();
  }, [scenario]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const handleSend = async () => {
    if (!inputText.trim() || !chatSession || isTyping) return;

    const userMsg: Message = { role: 'user', text: inputText };
    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setIsTyping(true);

    try {
      const response = await chatSession.sendMessage({ message: inputText });
      setMessages(prev => [...prev, { role: 'model', text: response.text }]);
    } catch (error) {
      console.error("Chat error:", error);
      setMessages(prev => [...prev, { role: 'model', text: "Sorry, I'm having trouble responding right now." }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="flex flex-col h-[600px] bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
      {/* Header */}
      <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col gap-2">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="font-bold text-slate-800">Conversation with {scenario.persona.name}</h2>
            <p className="text-xs text-slate-500 uppercase tracking-widest">{scenario.title}</p>
          </div>
          <button 
            onClick={() => onComplete(messages)}
            className="px-4 py-2 bg-slate-800 text-white rounded-lg text-sm font-semibold hover:bg-slate-700 transition-colors"
          >
            End Conversation & Get Report
          </button>
        </div>
        
        {/* Persona Traits for user calibration */}
        <div className="flex flex-wrap gap-2 mt-1">
          {scenario.persona.characteristics.map((trait, idx) => (
            <span key={idx} className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded text-[10px] font-bold border border-blue-100 uppercase tracking-tight">
              {trait}
            </span>
          ))}
        </div>
      </div>

      {/* Messages */}
      <div 
        ref={scrollRef}
        className="flex-grow p-6 overflow-y-auto space-y-4 bg-slate-50/30"
      >
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] rounded-2xl px-4 py-3 shadow-sm ${
              m.role === 'user' 
                ? 'bg-blue-600 text-white rounded-tr-none' 
                : 'bg-white text-slate-800 rounded-tl-none border border-slate-200'
            }`}>
              <p className="text-sm leading-relaxed">{m.text}</p>
            </div>
          </div>
        ))}
        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-white border border-slate-200 text-slate-400 rounded-2xl rounded-tl-none px-4 py-3 animate-pulse shadow-sm">
              <span className="text-xs font-semibold">...Typing</span>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-4 border-t border-slate-200 bg-slate-50">
        <div className="flex gap-2">
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Type your feedback message here..."
            className="flex-grow bg-white border border-slate-300 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none h-20 shadow-inner"
          />
          <button 
            onClick={handleSend}
            disabled={isTyping}
            className="px-6 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 font-bold shadow-md active:translate-y-0.5 transform"
          >
            Send
          </button>
        </div>
        <p className="text-[10px] text-slate-400 mt-2 text-center">
          Remember Flores: Assertions (Facts) vs. Assessments (Judgments). Ground your assessments.
        </p>
      </div>
    </div>
  );
};
