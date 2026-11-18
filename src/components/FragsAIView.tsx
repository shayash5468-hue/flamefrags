import React, { useState, useRef, useEffect } from 'react';
import {
  ChatMessage,
  DetectiveTaskType,
  ExplanationLevel,
  PsiFileRecord,
  ResearchNote,
} from '../types';
import { PSI_INVESTIGATIONS_REGISTRY } from '../data/psiRegistry';
import { sound } from '../utils/audio';
import { askFragsAI } from '../services/geminiClientService';
import { buildEvidenceChainForAiReply } from '../services/evidenceChainService';
import { EvidenceChainPanel } from './features/EvidenceChainPanel';
import { ExperimentDetectivePanel } from './features/ExperimentDetectivePanel';
import { stripLatex } from '../utils/plainText';
import {
  Bot,
  Send,
  Sparkles,
  BookMarked,
  Download,
  Atom,
  X,
  Trash2,
  Search,
  MessageSquare,
  Copy,
  Check,
  RotateCcw,
} from 'lucide-react';
import { synthesizeFragsReply } from '../services/fragsAiEngine';

export type FragsAiMode = 'chat' | 'detective';

export interface FragsAIViewProps {
  datasets: PsiFileRecord[];
  selectedDatasetId: string;
  onSelectDatasetId: (id: string) => void;
  uploadedDataset?: PsiFileRecord | null;
  onClearUploadedData?: () => void;
  selectedInvestigationId: string;
  onSelectInvestigationId: (id: string) => void;
  mode: FragsAiMode;
  onChangeMode: (mode: FragsAiMode) => void;
  pendingAiRequest?: { query: string; investigationId?: string; nonce: number } | null;
  pendingDetectiveTask?: { task: DetectiveTaskType; datasetId?: string; nonce: number } | null;
  onInspectDataset?: (datasetId: string) => void;
  onInspectInvestigationDna?: (investigationId: string) => void;
  onOpenResearchGaps?: () => void;
  onOpenHabitatBridge?: (investigationId?: string) => void;
}

export const FragsAIView: React.FC<FragsAIViewProps> = ({
  datasets,
  selectedDatasetId,
  onSelectDatasetId,
  uploadedDataset,
  onClearUploadedData,
  selectedInvestigationId,
  onSelectInvestigationId,
  mode,
  onChangeMode,
  pendingAiRequest,
  pendingDetectiveTask,
  onInspectDataset,
  onInspectInvestigationDna,
}) => {
  const [explanationLevel, setExplanationLevel] = useState<ExplanationLevel>('student');
  const [savedNotes, setSavedNotes] = useState<ResearchNote[]>([
    {
      id: 'note-1',
      title: 'PSI-20: FLEX Cool-Flame Radical Chemistry',
      summary:
        'Heptane droplets sustain combustion at 250°C without visible chemiluminescence, driven by low-temperature alkylperoxy radical isomerization. Re-ignition hazard upon re-ventilation.',
      experimentRef: 'PSI-20 (FLEX)',
      timestamp: '2026-11-08 08:15',
      tags: ['cool-flame', 'FLEX', 'kinetics'],
    },
  ]);
  const [showNotesDrawer, setShowNotesDrawer] = useState<boolean>(false);
  const [activeModel, setActiveModel] = useState<string>('NASA PSI Research Engine');
  const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null);

  const initialChatMessage: ChatMessage = {
    id: 'init',
    sender: 'assistant',
    text: `Hello explorer! I am Frags, your AI Combustion Research Assistant directly connected to NASA's 24 Physical Sciences Informatics (PSI) microgravity investigations.\n\nAsk me anything about 0G vs 1G flame shapes, cool flame chemistry at 250°C, the Low-Flow Paradox, spacecraft fire accidents (Apollo 1, Mir 1997), or upload your own experimental dataset for instant physical interpretation!`,
    timestamp: '00:00',
    explanationLevel: 'student',
    evidenceChain: buildEvidenceChainForAiReply({
      originalQuestion: 'System Initialization Overview',
      aiReply:
        'Grounded in indexed NASA PSI records including PSI-20 (FLEX), PSI-25 (BASS-II), PSI-98 (Saffire-I), and PSI-159 (ACME CFI-G).',
      focusedInvestigationId: 'PSI-20',
      sourceLabel: 'NASA PSI Registry',
    }),
    suggestedQuestions: [
      'Why did heptane droplets keep burning at 250°C after visible flameout in PSI-20 FLEX?',
      'How did the Mir 1997 crew survive a 2-meter blowtorch fire in microgravity?',
      'Why does a 0.05 m/s air draft produce the highest spacecraft fire spread rate?',
      'Why will materials in Artemis lunar habitats (34% O₂, 8.2 psia) burn 240% faster?',
    ],
  };

  const [messages, setMessages] = useState<ChatMessage[]>([initialChatMessage]);

  const [inputQuery, setInputQuery] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const lastExplainedRef = useRef<string | null>(null);
  const lastNonceRef = useRef<number>(0);

  const handleCopyText = (msgId: string, text: string) => {
    sound.playClick();
    navigator.clipboard.writeText(text);
    setCopiedMsgId(msgId);
    setTimeout(() => setCopiedMsgId(null), 2000);
  };

  const handleClearChat = () => {
    sound.playClick();
    setMessages([initialChatMessage]);
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  useEffect(() => {
    if (uploadedDataset && lastExplainedRef.current !== uploadedDataset.id && mode === 'chat') {
      lastExplainedRef.current = uploadedDataset.id;
      handleSendMessage(
        `Explain the physical combustion parameters and findings in dataset "${uploadedDataset.filename}": rows=${uploadedDataset.qualityReport?.totalRows || 0}, columns=[${uploadedDataset.columns?.join(', ')}]`
      );
    }
  }, [uploadedDataset, mode]);

  useEffect(() => {
    if (pendingAiRequest && pendingAiRequest.nonce !== lastNonceRef.current) {
      lastNonceRef.current = pendingAiRequest.nonce;
      onChangeMode('chat');
      handleSendMessage(pendingAiRequest.query, pendingAiRequest.investigationId);
    }
  }, [pendingAiRequest]);

  const handleSendMessage = async (queryText?: string, overrideInvId?: string) => {
    const q = (queryText || inputQuery).trim();
    if (!q || isTyping) return;

    sound.playClick();
    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      sender: 'user',
      text: q,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages(prev => [...prev, userMsg]);
    if (!queryText) setInputQuery('');
    setIsTyping(true);

    const activeInvFocus = selectedInvestigationId || 'all';
    const lowerQ = q.toLowerCase();
    const isAskingAboutDataset =
      /\b(dataset|upload|csv|txt|xlsx|rows?|columns?|metrics?|audit|sample|anomaly|parameters?)\b/i.test(lowerQ) ||
      (uploadedDataset ? lowerQ.includes(uploadedDataset.filename.toLowerCase()) : false);
    const activeDatasetForAi = isAskingAboutDataset
      ? (uploadedDataset || datasets.find(d => d.id === selectedDatasetId) || null)
      : null;
    const contextDatasetForChain = activeDatasetForAi || uploadedDataset || null;

    try {
      const promptQuery =
        activeInvFocus && activeInvFocus !== 'all'
          ? `[Focused Investigation: ${activeInvFocus}] ${q}`
          : q;

      const historyContext = messages.slice(-4).map(m => ({ sender: m.sender, text: m.text }));
      const result = await askFragsAI(promptQuery, explanationLevel, historyContext, activeDatasetForAi);

      setActiveModel(result.source);

      const chain = buildEvidenceChainForAiReply({
        originalQuestion: q,
        aiReply: result.reply,
        focusedInvestigationId: activeInvFocus,
        uploadedData: contextDatasetForChain,
        sourceLabel: result.source,
      });

      const suggestions = (result.suggestedQuestions && result.suggestedQuestions.length > 0)
        ? result.suggestedQuestions
        : [
            'Why are flames in zero gravity spherical and blue?',
            'Explain how cool flames burn at 250°C in FLEX',
            'How does the Low-Flow Paradox affect spacecraft fire safety?',
          ];

      setMessages(prev => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          sender: 'assistant',
          text: result.reply,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          explanationLevel,
          sourceModel: result.source,
          evidenceChain: chain,
          suggestedQuestions: suggestions,
        },
      ]);
    } catch (err) {
      console.error('Chat error:', err);
      const synth = synthesizeFragsReply(q, explanationLevel, messages.slice(-4).map(m => ({ sender: m.sender, text: m.text })), activeDatasetForAi);
      setMessages(prev => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          sender: 'assistant',
          text: synth.reply,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          explanationLevel,
          sourceModel: synth.source,
          evidenceChain: buildEvidenceChainForAiReply({
            originalQuestion: q,
            aiReply: synth.reply,
            focusedInvestigationId: activeInvFocus,
            uploadedData: contextDatasetForChain,
            sourceLabel: synth.source,
          }),
          suggestedQuestions: synth.suggestedQuestions,
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  const saveToNotes = (msg: ChatMessage) => {
    sound.playClick();
    const newNote: ResearchNote = {
      id: Date.now().toString(),
      title: `Finding: ${msg.text.slice(0, 35)}...`,
      summary: msg.text.slice(0, 220) + '...',
      experimentRef: selectedInvestigationId !== 'all' ? selectedInvestigationId : 'NASA PSI Combustion Science',
      timestamp: new Date().toISOString().replace('T', ' ').slice(0, 16),
      tags: ['Frags-AI', 'Evidence-Chain', explanationLevel],
    };
    setSavedNotes(prev => [newNote, ...prev]);
  };

  const exportNotesAsTxt = () => {
    sound.playClick();
    const content = savedNotes
      .map(
        n =>
          `TITLE: ${n.title}\nEXPERIMENT: ${n.experimentRef}\nDATE: ${n.timestamp}\nSUMMARY:\n${n.summary}\n-----------------------------------\n`
      )
      .join('\n');

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `FlameFrags_Research_Notes_${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-5 font-sans">
      {/* Top Controls Bar */}
      <div className="rounded-xl border border-slate-800 bg-[#0a0f1c]/95 p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-cyan-950 border border-cyan-700/70 flex items-center justify-center">
            <Bot className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-display font-bold text-lg text-white">Frags AI & Experiment Detective</h2>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-cyan-950/70 text-cyan-300 border border-cyan-800">
                {activeModel.toUpperCase()}
              </span>
            </div>
            <p className="text-xs text-slate-400 font-mono">
              Evidence-chained research assistant & real statistical dataset detective
            </p>
          </div>
        </div>

        {/* Mode Switcher + Depth + Notes */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="inline-flex items-center bg-[#060913] p-1 rounded-lg border border-slate-800 text-xs font-mono">
            <button
              type="button"
              onClick={() => {
                sound.playClick();
                onChangeMode('chat');
              }}
              className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 cursor-pointer transition-colors ${
                mode === 'chat' ? 'bg-cyan-600 text-white font-semibold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Research Chat</span>
            </button>
            <button
              type="button"
              onClick={() => {
                sound.playClick();
                onChangeMode('detective');
              }}
              className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 cursor-pointer transition-colors ${
                mode === 'detective' ? 'bg-indigo-600 text-white font-semibold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Search className="w-3.5 h-3.5" />
              <span>Experiment Detective</span>
            </button>
          </div>

          {mode === 'chat' && (
            <>
              <div className="flex items-center bg-[#060913] p-1 rounded-lg border border-slate-800 text-xs font-mono">
                {(['beginner', 'student', 'advanced'] as ExplanationLevel[]).map((level) => (
                  <button
                    key={level}
                    onClick={() => {
                      sound.playClick();
                      setExplanationLevel(level);
                    }}
                    className={`px-2.5 py-1 rounded capitalize transition cursor-pointer ${
                      explanationLevel === level
                        ? 'bg-slate-800 text-cyan-300 font-semibold'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {level}
                  </button>
                ))}
              </div>

              <button
                onClick={() => {
                  sound.playClick();
                  setShowNotesDrawer(!showNotesDrawer);
                }}
                className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 text-xs font-mono flex items-center gap-1.5 transition cursor-pointer"
              >
                <BookMarked className="w-3.5 h-3.5 text-amber-400" />
                <span>Notes ({savedNotes.length})</span>
              </button>

              <button
                onClick={handleClearChat}
                title="Reset chat to start a new inquiry"
                className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-cyan-300 border border-slate-700 text-xs font-mono flex items-center gap-1 transition cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5 text-slate-400 hover:text-cyan-400" />
                <span className="hidden sm:inline">Reset</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* MODE 1: EXPERIMENT DETECTIVE */}
      {mode === 'detective' ? (
        <ExperimentDetectivePanel
          datasets={datasets}
          activeDatasetId={pendingDetectiveTask?.datasetId || selectedDatasetId}
          onSelectDatasetId={onSelectDatasetId}
          onInspectDataset={onInspectDataset}
          onInspectInvestigationDna={onInspectInvestigationDna}
          initialTask={pendingDetectiveTask?.task || 'highest-temperature'}
          onSendSummaryToAi={(summaryPrompt) => {
            onChangeMode('chat');
            handleSendMessage(summaryPrompt);
          }}
        />
      ) : (
        /* MODE 2: RESEARCH CHAT WITH EVIDENCE CHAIN */
        <>
          {/* Investigation Focus & Cross-Module Links */}
          <div className="p-3 rounded-lg bg-[#0a0f1c]/95 border border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <span className="text-slate-400 shrink-0 flex items-center gap-1">
                <Atom className="w-3.5 h-3.5 text-cyan-400" />
                <span>Focus Investigation:</span>
              </span>
              <select
                value={selectedInvestigationId || 'all'}
                onChange={(e) => onSelectInvestigationId(e.target.value)}
                className="px-2.5 py-1 rounded bg-[#060913] border border-slate-700 text-cyan-300 font-mono text-xs max-w-md w-full"
              >
                <option value="all">All 24 NASA PSI Combustion Investigations</option>
                {PSI_INVESTIGATIONS_REGISTRY.map((inv) => (
                  <option key={inv.id} value={inv.id}>
                    {inv.id}: {inv.title}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            <div className={showNotesDrawer ? 'lg:col-span-8 space-y-4' : 'lg:col-span-12 space-y-4'}>
              <div className="rounded-xl border border-slate-800 bg-[#090e1a]/95 h-[600px] flex flex-col overflow-hidden">
                {/* Messages Scroll Area */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
                  {uploadedDataset && (
                    <div className="p-3.5 rounded-lg bg-[#0b1523] border border-cyan-800/70 space-y-2.5">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                        <div className="flex items-center gap-2.5">
                          <Sparkles className="w-4 h-4 text-cyan-400 shrink-0" />
                          <div>
                            <div className="font-mono text-xs font-semibold text-white">
                              Active Dataset: {uploadedDataset.filename}
                            </div>
                            <p className="text-[11px] text-slate-300 font-mono">
                              {uploadedDataset.qualityReport?.totalRows || 0} rows · Columns: [{uploadedDataset.columns?.slice(0, 5).join(', ')}]
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              sound.playClick();
                              onChangeMode('detective');
                            }}
                            className="px-3 py-1.5 rounded bg-indigo-600 hover:bg-indigo-500 text-white font-mono text-xs font-semibold cursor-pointer"
                          >
                            Open in Detective
                          </button>
                          {onClearUploadedData && (
                            <button
                              onClick={onClearUploadedData}
                              className="px-2.5 py-1.5 rounded bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white font-mono text-xs border border-slate-700 cursor-pointer"
                            >
                              Clear
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
                    >
                      <div className="flex items-center gap-2 text-[10px] font-mono text-slate-500 mb-1">
                        <span>{msg.sender === 'user' ? 'RESEARCHER' : 'FRAGS AI'}</span>
                        <span>·</span>
                        <span>{msg.timestamp}</span>
                        {msg.explanationLevel && (
                          <span className="capitalize px-1.5 py-0.2 rounded bg-slate-900 border border-slate-800 text-cyan-400">
                            {msg.explanationLevel}
                          </span>
                        )}
                      </div>

                      <div
                        className={`max-w-[92%] rounded-xl p-4 text-xs sm:text-sm leading-relaxed whitespace-pre-line ${
                          msg.sender === 'user'
                            ? 'bg-cyan-700 text-white font-medium rounded-tr-none'
                            : 'bg-[#0b1120] text-slate-200 border border-slate-800 rounded-tl-none font-sans w-full sm:w-auto'
                        }`}
                      >
                        {msg.sender === 'assistant' ? stripLatex(msg.text) : msg.text}

                        {msg.sender === 'assistant' && msg.evidenceChain && (
                          <EvidenceChainPanel
                            chain={msg.evidenceChain}
                            defaultOpen={false}
                            onInspectDataset={onInspectDataset}
                            onInspectInvestigationDna={onInspectInvestigationDna}
                          />
                        )}

                        {msg.sender === 'assistant' && (
                          <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-[10px] font-mono">
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => saveToNotes(msg)}
                                className="px-2 py-0.5 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-amber-300 flex items-center gap-1 border border-slate-800 cursor-pointer"
                              >
                                <BookMarked className="w-3 h-3 text-amber-400" />
                                <span>Save Note</span>
                              </button>
                              <button
                                onClick={() => handleCopyText(msg.id, msg.text)}
                                className="px-2 py-0.5 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-cyan-300 flex items-center gap-1 border border-slate-800 cursor-pointer"
                              >
                                {copiedMsgId === msg.id ? (
                                  <>
                                    <Check className="w-3 h-3 text-emerald-400" />
                                    <span className="text-emerald-300">Copied!</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy className="w-3 h-3 text-slate-400" />
                                    <span>Copy</span>
                                  </>
                                )}
                              </button>
                            </div>
                            <span className="text-slate-500">{msg.sourceModel || 'PSI Grounded'}</span>
                          </div>
                        )}
                      </div>

                      {msg.suggestedQuestions && (
                        <div className="mt-2.5 flex flex-wrap gap-1.5 max-w-[92%]">
                          {msg.suggestedQuestions.map((sq, idx) => (
                            <button
                              key={idx}
                              onClick={() => handleSendMessage(sq)}
                              className="px-2.5 py-1 rounded-md bg-slate-900 hover:bg-cyan-950 text-slate-400 hover:text-cyan-300 border border-slate-800 text-[11px] font-mono transition text-left cursor-pointer"
                            >
                              → {sq}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}

                  {isTyping && (
                    <div className="flex items-center gap-2 text-xs font-mono text-cyan-400 p-2">
                      <span>● Analyzing PSI investigations & building Evidence Chain...</span>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>

                {/* Input Bar */}
                <div className="p-3 bg-[#060a14] border-t border-slate-800 flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Ask Frags about cool flames, low-flow paradox, partial-gravity gaps, or habitat assumptions..."
                    value={inputQuery}
                    onChange={(e) => setInputQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSendMessage();
                    }}
                    className="flex-1 px-4 py-2.5 rounded-lg bg-[#0b1120] border border-slate-700 text-xs sm:text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                  />
                  <button
                    onClick={() => handleSendMessage()}
                    disabled={!inputQuery.trim() || isTyping}
                    className="px-5 py-2.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 text-white font-semibold text-xs sm:text-sm transition flex items-center gap-2 cursor-pointer"
                  >
                    <span>Ask AI</span>
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {showNotesDrawer && (
              <div className="lg:col-span-4 space-y-4">
                <div className="rounded-xl border border-amber-900/40 bg-[#0a0f1c]/95 p-5 h-[600px] flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                      <h3 className="font-display font-bold text-base text-white flex items-center gap-2">
                        <BookMarked className="w-4 h-4 text-amber-400" />
                        <span>Research Notes ({savedNotes.length})</span>
                      </h3>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={exportNotesAsTxt}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 cursor-pointer"
                          title="Export Notes as TXT"
                        >
                          <Download className="w-4 h-4 text-cyan-400" />
                        </button>
                        <button
                          onClick={() => {
                            sound.playClick();
                            setShowNotesDrawer(false);
                          }}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 cursor-pointer"
                          title="Close Notes"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="mt-3 space-y-3 overflow-y-auto max-h-[450px] pr-1">
                      {savedNotes.map((note) => (
                        <div key={note.id} className="p-3.5 rounded-lg bg-[#060913] border border-slate-800 space-y-1.5 text-xs">
                          <div className="font-semibold text-white flex items-start justify-between gap-2">
                            <span>{note.title}</span>
                            <button
                              onClick={() => {
                                sound.playClick();
                                setSavedNotes(prev => prev.filter(n => n.id !== note.id));
                              }}
                              className="text-slate-500 hover:text-red-400 transition shrink-0 cursor-pointer"
                              title="Delete Note"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          <p className="text-slate-300 text-[11px] leading-relaxed">{note.summary}</p>
                          <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] font-mono text-slate-500">
                            <span>Ref: {note.experimentRef}</span>
                            <span>{note.timestamp.split(' ')[0]}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-800">
                    <button
                      onClick={exportNotesAsTxt}
                      className="w-full py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-mono text-cyan-300 border border-cyan-800/60 flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Export Notes (.txt)</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};
