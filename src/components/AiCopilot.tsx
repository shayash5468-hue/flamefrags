import React, { useState, useRef, useEffect } from 'react';
import { sound } from '../utils/audio';
import { 
  Bot, 
  X, 
  Send, 
  Sparkles, 
  HelpCircle, 
  Flame, 
  ShieldAlert, 
  BookOpen,
  MessageSquare
} from 'lucide-react';

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  quickTopic?: string;
}

interface AiCopilotProps {
  isOpen: boolean;
  onClose: () => void;
}

const KNOWLEDGE_RESPONSES: { [key: string]: string } = {
  'blue_flame': `Why is a microgravity flame blue?\n\n1. Absence of Buoyant Convection: On Earth, hot gases rise rapidly (buoyancy), drawing in fresh oxygen and producing high temperatures (~1400°C) that cause carbon particles (soot) to incandesce in bright yellow and orange light.\n\n2. Pure Molecular Diffusion: In zero gravity (10⁻⁶ g), buoyancy is absent. Oxygen reaches the fuel solely through slow molecular diffusion. Combustion happens in a perfectly spherical boundary envelope.\n\n3. Excited Radical Emission: Because the burning is slower and soot formation is suppressed or trapped, the primary visible light comes from chemiluminescent emissions of excited CH* radicals (blue, ~430 nm) and C2* Swan bands (blue-green, ~516 nm). The flame is dim, dome-like, and ghostly blue!`,

  'cool_flame': `Explain the Cool Flame hazard in spacecraft:\n\n1. Discovery on ISS (FLEX): In 2012, astronauts observed isolated heptane droplets. When the visible hot flame (~1400°C) extinguished, the droplet kept evaporating and shrinking!\n\n2. Invisible Reaction: The droplet was undergoing "cool flame" combustion at low temperatures (200°C - 300°C). It produces zero visible light and very low infrared radiation, making it completely invisible to the human eye.\n\n3. The Re-ignition Trap: If astronauts assume the fire is out and open a rack door or re-enable ventilation, introducing fresh oxygen can cause the cool-flame radical pool to flash-ignite into a catastrophic hot explosion without warning! ISS protocol mandates waiting for multiple sensor validations before declaring all clear.`,

  'low_flow': `The Low-Flow Extinction Paradox (BASS Discovery):\n\nOn Earth, blowing on a small candle blows it out. In zero-gravity:\n• Zero Airflow (Quiescent): The flame blankets itself in its own carbon dioxide and water vapor exhaust and slowly suffocates within seconds.\n• Critical Low Flow (0.05 to 0.15 m/s): A slight draft (such as normal ISS air loop ventilation or even an astronaut floating by) provides just enough oxygen to sustain burning, but not enough convective velocity to cool or blow out the flame.\n• Paradoxical Result: Turning off ventilation helps smother the fire, but astronauts moving quickly can fan smoldering embers back to life!`,

  'avionics_smolder': `Emergency Response Protocol for Smoldering in Avionics Bay:\n\nStep 1: Sound station alarm and broadcast "FIRE IN NODE 3 AVIONICS" over intercom.\nStep 2: Immediately don PBE (Personal Breathing Equipment) oxygen hoods.\nStep 3: Cut electrical power breakers to de-energize the rack.\nStep 4: Close IMV (Inter-Module Ventilation) isolation dampers to contain smoke.\nStep 5: Insert Portable Fire Extinguisher (PFE) nozzle into the rack fire access port and discharge Fine Water Mist. Keep seal intact to avoid toxic gas discharge into the cabin!\nStep 6: Sample atmosphere with Dräeger tubes for HCN, CO, and HCl before removing PBE.`,

  'acoustic_extinction': `Acoustic Fire Extinction Physics:\n\nSound waves at specific low frequencies (typically 30–60 Hz) can extinguish flames without any chemical residues.\n\n• Principle: Acoustic pressure waves produce alternating high and low-pressure zones that oscillate air velocity and thin the combustion boundary layer.\n• Thermal Decoupling: The rapid acoustic displacement separates the hot reaction zone from the fuel surface vapor, cooling the flame below its kinetic flammability limit.\n• Spacecraft Benefit: Acoustic suppressors leave no water droplets or powders to foul electronic racks or ECLSS filters.`,

  'saffire_vs_bass': `Saffire vs BASS Comparison:\n\n• BASS (Burning and Suppression of Solids): Small samples (acrylic rods, fabrics) burned inside the ISS Microgravity Science Glovebox (MSG) operated directly by astronauts. Mapped microgravity flammability limits and low-flow thresholds.\n\n• Saffire (Spacecraft Fire Experiment): Large-scale fires (up to 1-meter long fabric sheets and avionics racks) conducted inside uncrewed Cygnus cargo vehicles after departing ISS and prior to destructive atmospheric reentry. Proved that large fires spread stealthily and validated spacecraft smoke migration CFD models.`
};

export const AiCopilot: React.FC<AiCopilotProps> = ({ isOpen, onClose }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      sender: 'assistant',
      text: 'AI Safety Copilot online. I am trained on NASA Physical Sciences Informatics (PSI) combustion research, ISS emergency flight rules (FDIR 1.102), and microgravity fire science. How can I assist your mission?',
      timestamp: '00:00'
    }
  ]);
  const [inputQuery, setInputQuery] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  if (!isOpen) return null;

  const handleSend = (textToSend?: string) => {
    const query = (textToSend || inputQuery).trim();
    if (!query) return;

    sound.playClick();
    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      sender: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    if (!textToSend) setInputQuery('');
    setIsTyping(true);

    // AI Response generation
    setTimeout(() => {
      const lower = query.toLowerCase();
      let reply = '';

      if (lower.includes('blue') || lower.includes('color') || lower.includes('colour')) {
        reply = KNOWLEDGE_RESPONSES['blue_flame'];
      } else if (lower.includes('cool flame') || lower.includes('flex')) {
        reply = KNOWLEDGE_RESPONSES['cool_flame'];
      } else if (lower.includes('low flow') || lower.includes('paradox') || lower.includes('airflow')) {
        reply = KNOWLEDGE_RESPONSES['low_flow'];
      } else if (lower.includes('avionics') || lower.includes('smolder') || lower.includes('rack')) {
        reply = KNOWLEDGE_RESPONSES['avionics_smolder'];
      } else if (lower.includes('acoustic') || lower.includes('sound')) {
        reply = KNOWLEDGE_RESPONSES['acoustic_extinction'];
      } else if (lower.includes('saffire') || lower.includes('bass')) {
        reply = KNOWLEDGE_RESPONSES['saffire_vs_bass'];
      } else if (lower.includes('protocol') || lower.includes('sop') || lower.includes('emergency') || lower.includes('step')) {
        reply = KNOWLEDGE_RESPONSES['avionics_smolder'];
      } else {
        reply = `Analysis for "${query}":\n\nIn microgravity environments (10⁻⁶ g), combustion dynamics are fundamentally governed by molecular diffusion rather than buoyancy-driven convection. Key operational recommendations:\n• Isolate inter-module ventilation (IMV) immediately to cut forced oxidizer supply.\n• Verify that equipment racks are de-energized to prevent re-ignition arcs.\n• Monitor Dräeger sample tubes for toxic HCN, CO, and fluorinated polymer breakdown products prior to clearing PBE mask removal.\n\nRefer to ISS Flight Rule FDIR 1.102 and NASA PSI mission datasets (BASS, Saffire, FLEX) for detailed parameters.`;
      }

      setIsTyping(false);
      setMessages(prev => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          sender: 'assistant',
          text: reply,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6">
      <div className="glass-panel w-full max-w-2xl h-[620px] rounded-2xl flex flex-col overflow-hidden border-cyan-500/40 shadow-glow">
        {/* Header */}
        <div className="p-4 bg-[#080d1c] border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-cyan-950 border border-cyan-500/50 flex items-center justify-center">
              <Bot className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-display font-bold text-base text-white">
                  Microgravity Combustion AI Copilot
                </h3>
                <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-cyan-950 text-cyan-300 border border-cyan-800">
                  ONLINE
                </span>
              </div>
              <p className="text-[11px] font-mono text-slate-400">
                NASA Space Apps · ISS Safety Directives
              </p>
            </div>
          </div>

          <button
            onClick={() => { sound.playClick(); onClose(); }}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Suggestion Chips */}
        <div className="px-4 py-2 bg-[#050813] border-b border-slate-800/80 flex items-center gap-2 overflow-x-auto text-[11px] font-mono">
          <span className="text-slate-500 shrink-0">Quick Topics:</span>
          {[
            { label: 'Why is flame blue?', text: 'Why is a microgravity flame blue?' },
            { label: 'Cool flame hazard', text: 'Explain cool flame hazard' },
            { label: 'Low-flow paradox', text: 'What is the low-flow extinction paradox?' },
            { label: 'Avionics fire protocol', text: 'Protocol for smoldering in avionics bay' },
            { label: 'Acoustic extinction', text: 'Acoustic extinction physics' },
          ].map((chip) => (
            <button
              key={chip.label}
              onClick={() => handleSend(chip.text)}
              className="px-2.5 py-1 rounded-full bg-slate-900 hover:bg-cyan-950 text-slate-300 hover:text-cyan-300 border border-slate-700/80 shrink-0 transition"
            >
              {chip.label}
            </button>
          ))}
        </div>

        {/* Messages Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
            >
              <div className="flex items-center gap-1.5 text-[10px] font-mono text-slate-500 mb-1">
                <span>{msg.sender === 'user' ? 'ASTRONAUT OPERATOR' : 'AI SAFETY COPILOT'}</span>
                <span>·</span>
                <span>{msg.timestamp}</span>
              </div>
              <div
                className={`max-w-[85%] rounded-2xl p-4 text-xs sm:text-sm leading-relaxed whitespace-pre-line ${
                  msg.sender === 'user'
                    ? 'bg-cyan-600 text-white font-medium rounded-tr-none'
                    : 'bg-[#0d1629] text-slate-200 border border-slate-800 rounded-tl-none font-mono text-xs'
                }`}
              >
                {msg.text}
              </div>
            </div>
          ))}

          {isTyping && (
            <div className="flex items-center gap-2 text-xs font-mono text-cyan-400 p-2">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
              <span>Analyzing NASA PSI datasets and flight rules...</span>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Footer */}
        <div className="p-3 bg-[#080d1c] border-t border-slate-800 flex items-center gap-2">
          <input
            type="text"
            placeholder="Ask about microgravity combustion, NASA PSI missions, or fire drills..."
            value={inputQuery}
            onChange={(e) => setInputQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSend();
            }}
            className="flex-1 px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-400 font-mono"
          />
          <button
            onClick={() => handleSend()}
            disabled={!inputQuery.trim()}
            className="p-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 text-white transition shadow-glow"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
