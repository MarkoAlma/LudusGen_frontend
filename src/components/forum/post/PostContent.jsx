import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Quote, List, Code, Check, Copy, CheckCircle2, BarChart2 } from 'lucide-react';

function PollWidget({ poll, onVote, color }) {
  if (!poll) return null;
  const totalVotes = poll.options.reduce((acc, opt) => acc + (opt.votes || 0), 0);

  return (
    <div className="my-10 p-8 md:p-10 bg-white/[0.03] border border-white/5 rounded-[2.5rem] relative overflow-hidden group">
       <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
          <BarChart2 className="w-20 h-20 text-white" />
       </div>
       
       <div className="relative z-10">
          <div className="flex items-center gap-3 mb-8">
             <div className="w-8 h-8 rounded-xl bg-primary/20 flex items-center justify-center">
                <BarChart2 className="w-4 h-4 text-primary" />
             </div>
             <h4 className="text-xl font-black text-white italic tracking-tight">{poll.question}</h4>
          </div>

          <div className="space-y-4">
             {poll.options.map((opt) => {
                const percent = totalVotes > 0 ? Math.round(((opt.votes || 0) / totalVotes) * 100) : 0;
                return (
                   <button 
                     key={opt.id}
                     onClick={() => onVote(opt.id)}
                     className="w-full relative group/opt overflow-hidden rounded-2xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] transition-all p-5 text-left"
                   >
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${percent}%` }}
                        className="absolute inset-y-0 left-0 bg-primary/10 border-r border-primary/20 pointer-events-none"
                        transition={{ duration: 1, ease: "easeOut" }}
                      />
                      <div className="relative flex items-center justify-between pointer-events-none">
                         <span className="text-sm font-bold text-gray-300 group-hover/opt:text-white transition-colors">{opt.label}</span>
                         <span className="text-xs font-black text-primary">{percent}%</span>
                      </div>
                   </button>
                );
             })}
          </div>

          <p className="mt-6 text-[10px] font-black uppercase text-gray-600 tracking-widest text-right">
             Összesen {totalVotes} szavazat • LudusGen Polls
          </p>
       </div>
    </div>
  );
}

export default function PostContent({ content, color, poll, onVote }) {
  const [copiedIndex, setCopiedIndex] = useState(null);

  const handleCopy = (text, index) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const renderMarkdown = (text) => {
    if (!text) return null;
    
    // Improved bold, italics and links parsing
    const processInlines = (str) => {
      return str
        .replace(/\*\*(.*?)\*\*/g, '<strong class="text-white font-black italic">$1</strong>')
        .replace(/\*(.*?)\*/g, '<em class="italic text-gray-300">$1</em>')
        .replace(/`([^`]+)`/g, '<code class="px-1.5 py-0.5 rounded-md bg-white/5 text-primary text-[0.9em] font-mono border border-white/5">$1</code>')
        .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" class="text-primary hover:underline transition-all" target="_blank">$1</a>');
    };

    const parts = text.split(/(```[\s\S]*?```)/g);
    
    return parts.map((part, i) => {
      if (part.startsWith("```")) {
        const lines = part.split("\n");
        const lang = lines[0].slice(3).trim().toLowerCase() || "code";
        const code = lines.slice(1, -1).join("\n");
        
        return (
          <div key={i} className="my-10 rounded-[2.5rem] overflow-hidden border border-white/10 shadow-3xl group/code relative"
               style={{ background: "rgba(5,5,15,0.6)" }}>
             <div className="bg-white/[0.04] px-8 py-4 border-b border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                   <div className="w-2 h-2 rounded-full bg-primary/40" />
                   <span className="text-[10px] font-black uppercase text-gray-500 tracking-[0.3em] font-mono">{lang}</span>
                </div>
                <button 
                  onClick={() => handleCopy(code, i)}
                  className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-500 hover:text-white transition-all group/btn"
                >
                   {copiedIndex === i ? (
                     <><CheckCircle2 className="w-4 h-4 text-primary animate-pulse" /> Copied!</>
                   ) : (
                     <><Copy className="w-4 h-4 group-hover/btn:scale-110 transition-transform" /> Copy Code</>
                   )}
                </button>
             </div>
             <pre className="p-8 md:p-10 overflow-x-auto text-sm font-mono text-gray-300 scrollbar-thin leading-relaxed">
                <code>{code}</code>
             </pre>
          </div>
        );
      }

      return (
        <div key={i} className="prose-ludus text-gray-400 font-medium text-lg leading-relaxed space-y-8">
          {part.split("\n\n").map((para, pi) => (
             <div key={pi}>
                {para.split("\n").map((line, li) => {
                  if (line.startsWith("## ")) return (
                    <div key={li} className="flex flex-col gap-2 mt-12 mb-6">
                       <h2 className="text-2xl md:text-3xl font-black text-white italic tracking-tighter">{line.slice(3)}</h2>
                       <div className="w-12 h-1 bg-primary/30 rounded-full" />
                    </div>
                  );
                  if (line.startsWith("# ")) return (
                    <div key={li} className="relative mt-16 mb-8 group/h1">
                       <div className="absolute -left-6 top-1 bottom-1 w-1 bg-primary/20 rounded-full group-hover/h1:bg-primary/50 transition-colors" />
                       <h1 className="text-4xl md:text-5xl font-black text-white italic tracking-tighter">{line.slice(2)}</h1>
                    </div>
                  );
                  if (line.startsWith("> ")) return (
                    <blockquote key={li} className="pl-8 border-l-4 border-primary/50 bg-white/[0.02] p-8 rounded-3xl italic text-gray-300 my-8 shadow-xl">
                      <Quote className="w-5 h-5 text-primary/30 mb-4" />
                      <p className="leading-relaxed text-base md:text-lg">{line.slice(2)}</p>
                    </blockquote>
                  );
                  if (line.startsWith("- ")) return (
                    <div key={li} className="flex items-start gap-4 my-3 text-gray-400">
                       <div className="w-1.5 h-1.5 rounded-full bg-primary/40 mt-2.5 flex-shrink-0" />
                       <span className="text-base" dangerouslySetInnerHTML={{ __html: processInlines(line.slice(2)) }} />
                    </div>
                  );
                  return <div key={li} className="mb-2 leading-relaxed" dangerouslySetInnerHTML={{ __html: processInlines(line) }} />;
                })}
             </div>
          ))}
        </div>
      );
    });
  };

  return (
    <div className="glass-panel p-10 md:p-14 rounded-[3.5rem] border border-white/5 relative overflow-hidden mb-12 shadow-2xl">
       {/* Aesthetic Gradient Top Left */}
       <div className="absolute top-0 left-0 w-64 h-64 bg-primary/5 blur-[80px] pointer-events-none" />
       
       <div className="relative z-10">
          {renderMarkdown(content)}
          
          {poll && (
             <PollWidget poll={poll} onVote={onVote} color={color} />
          )}
       </div>

       {/* Decorative Footer */}
       <div className="mt-16 flex items-center justify-between pt-8 border-t border-white/5">
          <div className="flex gap-2">
             <span className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-700">Content Quality Verified</span>
             <Sparkles className="w-3 h-3 text-primary/50" />
          </div>
          <p className="text-[9px] font-black uppercase tracking-[0.2rem] text-gray-800">LudusGen Editorial v2.0</p>
       </div>
    </div>
  );
}

const Sparkles = ({ className }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M12 3v3m0 12v3M5.3 5.3l2.1 2.1m9.2 9.2l2.1 2.1M3 12h3m12 0h3M5.3 18.7l2.1-2.1m9.2-9.2l2.1-2.1"></path>
  </svg>
);
