
import React, { useState, useEffect } from 'react';

interface OnboardingModalProps {
  onClose: () => void;
}

const SLIDES = [
  {
    title: "Welcome to Agent Academy! 🤖",
    content: "Your central command for managing a squad of <strong class='text-blue-600 dark:text-blue-300'>whimsical AI agents</strong>. <br/><br/>They code, they write, they research, and sometimes they daydream about electric sheep. This dashboard is your bridge to their digital world.",
    icon: "👋",
    color: "bg-blue-400",
    borderColor: "border-blue-400",
    textColor: "text-blue-600 dark:text-blue-400",
    shadow: "shadow-blue-400/50"
  },
  {
    title: "Meet Your Squad 👥",
    content: "Each agent has a unique <em>personality</em> and <em>specialty</em>. <br/><br/>💻 <strong>Sparky</strong> handles code.<br/>✍️ <strong>Inkwell</strong> writes poetry.<br/>🧠 <strong>Zetta</strong> crunches data.<br/><br/>You can assign them tasks, check their status, and even 'upgrade' their systems over time.",
    icon: "🆔",
    color: "bg-pink-400",
    borderColor: "border-pink-400",
    textColor: "text-pink-600 dark:text-pink-400",
    shadow: "shadow-pink-400/50"
  },
  {
    title: "The Global Council 💬",
    content: "Need a team effort? Head to the <strong>Council</strong> tab. Chat with all agents at once! <br/><br/>Toggle <strong class='text-yellow-600 dark:text-yellow-300'>Team Brainstorm</strong> (🔥) to let them debate amongst themselves indefinitely until they find the perfect solution for you.",
    icon: "🔥",
    color: "bg-yellow-400",
    borderColor: "border-yellow-400",
    textColor: "text-yellow-700 dark:text-yellow-400",
    shadow: "shadow-yellow-400/50"
  },
  {
    title: "Workflow Orchestrator 🎼",
    content: "For complex tasks, visit the <strong>Orchestrator</strong>. <br/>Build visual workflows by connecting nodes. <br/><br/>Chain outputs together: <br/><em class='bg-purple-100 dark:bg-purple-900/50 px-2 py-1 rounded'>Fetch News → Summarize → Write Blog Post</em>. <br/><br/>It's visual programming for AI!",
    icon: "⚡",
    color: "bg-purple-400",
    borderColor: "border-purple-400",
    textColor: "text-purple-600 dark:text-purple-400",
    shadow: "shadow-purple-400/50"
  },
  {
    title: "You Have the Power ⚙️",
    content: "In <strong>Settings</strong>, you can switch between Google Gemini and OpenAI models. <br/><br/>Tweak agent 'Cuteness Levels', toggle Dark Mode, and configure API keys. <br/><br/><strong>Ready to begin?</strong>",
    icon: "🎛️",
    color: "bg-green-400",
    borderColor: "border-green-400",
    textColor: "text-green-600 dark:text-green-400",
    shadow: "shadow-green-400/50"
  }
];

const OnboardingModal: React.FC<OnboardingModalProps> = ({ onClose }) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  
  const nextSlide = () => {
    if (currentSlide < SLIDES.length - 1) {
      setCurrentSlide(prev => prev + 1);
    } else {
      onClose();
    }
  };

  const prevSlide = () => {
    if (currentSlide > 0) {
      setCurrentSlide(prev => prev - 1);
    }
  };

  const slide = SLIDES[currentSlide];

  // Helper to allow simple HTML in content strings safely-ish
  const renderContent = (html: string) => {
      return { __html: html };
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-300">
      <div className="bg-[#FFFDE7] dark:bg-zinc-900 w-full max-w-2xl h-[650px] max-h-[90vh] border-4 border-black dark:border-white wobbly-border shadow-[15px_15px_0px_0px_rgba(0,0,0,1)] dark:shadow-[15px_15px_0px_0px_rgba(255,255,255,1)] overflow-hidden relative flex flex-col transition-all duration-300">
        
        {/* Animated Background Blob */}
        <div 
            className={`absolute -top-32 -right-32 w-80 h-80 rounded-full opacity-20 transition-all duration-700 ease-in-out ${slide.color} blur-3xl`}
            style={{ transform: `translate(${currentSlide * 15}px, ${currentSlide * 10}px)` }}
        />
        <div 
            className={`absolute -bottom-32 -left-32 w-80 h-80 rounded-full opacity-20 transition-all duration-700 ease-in-out ${slide.color} blur-3xl`}
            style={{ transform: `translate(-${currentSlide * 15}px, -${currentSlide * 10}px)` }}
        />

        {/* Progress Bar */}
        <div className="h-2 w-full bg-gray-200 dark:bg-zinc-800 flex shrink-0 border-b-2 border-black dark:border-white">
            {SLIDES.map((s, idx) => (
                <div 
                    key={idx} 
                    className={`h-full flex-1 transition-all duration-500 ease-out ${idx <= currentSlide ? s.color : 'bg-transparent'}`}
                />
            ))}
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col items-center justify-center p-6 md:p-12 text-center relative overflow-y-auto no-scrollbar">
             
             {/* 
                Animation Wrapper with Key
                Changing the key triggers a full re-render of children, restarting animations.
             */}
             <div 
                key={currentSlide} 
                className="flex flex-col items-center w-full max-w-lg mx-auto"
             >
                {/* Icon Container */}
                <div className="relative mb-8 group animate-in zoom-in duration-500 delay-0 fill-mode-backwards">
                    {/* Pulsing Ring */}
                    <div className={`absolute -inset-4 rounded-full opacity-40 animate-ping ${slide.color}`}></div>
                    
                    <div className={`relative w-32 h-32 md:w-40 md:h-40 rounded-full border-4 border-black dark:border-white flex items-center justify-center text-6xl md:text-7xl shadow-xl ${slide.shadow} ${slide.color} transition-colors duration-500 animate-[bounce-slow_3s_infinite]`}>
                        {slide.icon}
                    </div>
                </div>
                
                {/* Title */}
                <h2 className={`text-3xl md:text-4xl font-black italic text-gray-900 dark:text-white mb-6 leading-tight underline decoration-4 underline-offset-4 transition-colors duration-500 ${slide.borderColor} animate-in slide-in-from-bottom-8 fade-in duration-700 delay-100 fill-mode-both`}>
                    {slide.title}
                </h2>
                
                {/* Content */}
                <div 
                    className="text-base md:text-lg font-medium text-gray-700 dark:text-gray-300 leading-relaxed animate-in slide-in-from-bottom-8 fade-in duration-700 delay-200 fill-mode-both space-y-4"
                    dangerouslySetInnerHTML={renderContent(slide.content)}
                />
             </div>
        </div>

        {/* Footer Controls */}
        <div className="p-4 md:p-6 border-t-4 border-black dark:border-white bg-white/90 dark:bg-zinc-800/90 backdrop-blur-sm flex justify-between items-center shrink-0 z-10 relative">
            <button 
                onClick={prevSlide}
                disabled={currentSlide === 0}
                className="px-4 md:px-6 py-3 rounded-2xl font-black uppercase text-xs disabled:opacity-30 hover:bg-gray-100 dark:hover:bg-zinc-700 dark:text-white transition-colors flex items-center gap-2 border-2 border-transparent hover:border-black dark:hover:border-white"
            >
                <span>←</span>
                <span className="hidden sm:inline">Back</span>
            </button>
            
            {/* Dots */}
            <div className="flex gap-3">
                {SLIDES.map((_, idx) => (
                    <div 
                        key={idx}
                        className={`w-2.5 h-2.5 rounded-full border-2 border-black dark:border-white transition-all duration-300 ${
                            idx === currentSlide 
                            ? 'bg-black dark:bg-white scale-125' 
                            : 'bg-transparent opacity-40'
                        }`}
                    />
                ))}
            </div>

            <button 
                onClick={nextSlide}
                className={`px-6 md:px-8 py-3 rounded-2xl border-2 border-black dark:border-white font-black uppercase text-xs shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] active:translate-y-0.5 active:shadow-none transition-all duration-300 hover:scale-105 flex items-center gap-2 ${
                    currentSlide === SLIDES.length - 1 
                    ? 'bg-green-400 hover:bg-green-300 text-black' 
                    : `${slide.color} text-black`
                }`}
            >
                {currentSlide === SLIDES.length - 1 ? (
                    <><span>Let's Go!</span> <span>🚀</span></>
                ) : (
                    <><span>Next</span> <span>→</span></>
                )}
            </button>
        </div>

        {/* Skip Button */}
        <button 
            onClick={onClose}
            className="absolute top-4 right-4 text-[10px] font-black uppercase text-gray-400 hover:text-black dark:hover:text-white tracking-widest bg-white/50 dark:bg-black/20 px-3 py-1.5 rounded-xl backdrop-blur-sm border border-transparent hover:border-black dark:hover:border-white transition-all"
        >
            Skip Intro
        </button>

      </div>
    </div>
  );
};

export default OnboardingModal;
