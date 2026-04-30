import React, { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ImagePlus, X, ArrowUp, Mic, Check, Square, LoaderCircle } from 'lucide-react';

const joinVoiceText = (left, right) => {
  const cleanLeft = (left || '').trimEnd();
  const cleanRight = (right || '').trim();

  if (!cleanRight) return cleanLeft;
  return cleanLeft ? `${cleanLeft} ${cleanRight}` : cleanRight;
};

const getSpeechRecognitionLanguage = () => {
  if (typeof navigator === 'undefined') return '';
  return navigator.languages?.find(Boolean) || navigator.language || '';
};

const MotionDiv = motion.div;
const MotionButton = motion.button;
const VOICE_WARMUP_MS = 4200;

export default function ChatInput({
  input, setInput, isTyping, handleSend, handleStop,
  attachedImage, setAttachedImage, textareaRef,
  supportsImageInput = false
}) {
  const fileInputRef = useRef(null);
  const inputRef = useRef(input);
  const dragCounterRef = useRef(0);
  const recognitionRef = useRef(null);
  const recognitionRunningRef = useRef(false);
  const recognitionStartPendingRef = useRef(false);
  const recognitionWantedRef = useRef(false);
  const acceptVoiceResultsRef = useRef(false);
  const warmupTimerRef = useRef(null);
  const restartAfterWarmupRef = useRef(false);
  const voicePreparingRef = useRef(false);
  const baseTranscriptRef = useRef('');
  const finalTranscriptRef = useRef('');

  const [focused, setFocused] = useState(false);
  const [justSent, setJustSent] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState('idle');
  const [voiceError, setVoiceError] = useState('');
  const [isVoicePreparing, setIsVoicePreparing] = useState(false);

  const speechRecognitionSupported = typeof window !== 'undefined'
    && Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);
  const isVoiceConnecting = voiceStatus === 'connecting';
  const isListening = voiceStatus === 'listening';
  const showVoiceLoader = isVoiceConnecting || isVoicePreparing;
  const imageUploadTitle = supportsImageInput
    ? 'Attach image'
    : 'Images are not available for this model';

  const resizeTextarea = useCallback((target = textareaRef?.current) => {
    if (!target) return;
    target.style.height = 'auto';
    target.style.height = `${Math.min(target.scrollHeight, 200)}px`;
  }, [textareaRef]);

  const updateInputFromVoice = useCallback((value) => {
    setInput(value);
    if (typeof window !== 'undefined') {
      window.requestAnimationFrame(() => resizeTextarea());
    }
  }, [resizeTextarea, setInput]);

  useEffect(() => {
    if (input === '' && textareaRef?.current) {
      textareaRef.current.style.height = 'auto';
    }
  }, [input, textareaRef]);

  useEffect(() => {
    inputRef.current = input;
  }, [input]);

  const clearWarmupTimer = useCallback(() => {
    if (!warmupTimerRef.current) return;
    window.clearTimeout(warmupTimerRef.current);
    warmupTimerRef.current = null;
  }, []);

  const startRecognitionEngine = useCallback((recognition) => {
    if (recognitionRunningRef.current || recognitionStartPendingRef.current) return;

    try {
      recognitionStartPendingRef.current = true;
      recognition.start();
    } catch (error) {
      recognitionStartPendingRef.current = false;
      recognitionWantedRef.current = false;
      setVoiceStatus('idle');
      setVoiceError('Voice input could not be started.');
      console.warn('[VoiceInput] Browser recognition start failed:', error);
    }
  }, []);

  const createRecognition = useCallback(() => {
    if (typeof window === 'undefined') return null;
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return null;
    if (recognitionRef.current) return recognitionRef.current;

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    const language = getSpeechRecognitionLanguage();
    if (language) recognition.lang = language;

    recognition.onstart = () => {
      recognitionStartPendingRef.current = false;
      recognitionRunningRef.current = true;
      setVoiceStatus('listening');
      setVoiceError('');

      if (restartAfterWarmupRef.current) {
        restartAfterWarmupRef.current = false;
        acceptVoiceResultsRef.current = true;
        voicePreparingRef.current = false;
        baseTranscriptRef.current = inputRef.current.trim() ? `${inputRef.current.trimEnd()} ` : '';
        finalTranscriptRef.current = '';
        setIsVoicePreparing(false);
      }
    };

    recognition.onresult = (event) => {
      if (!acceptVoiceResultsRef.current) return;

      let interimTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const transcript = event.results[i][0]?.transcript || '';
        if (event.results[i].isFinal) {
          finalTranscriptRef.current = joinVoiceText(finalTranscriptRef.current, transcript);
        } else {
          interimTranscript = joinVoiceText(interimTranscript, transcript);
        }
      }

      const liveTranscript = joinVoiceText(finalTranscriptRef.current, interimTranscript);
      updateInputFromVoice(joinVoiceText(baseTranscriptRef.current, liveTranscript));
    };

    recognition.onerror = (event) => {
      if (event.error === 'no-speech') return;
      if (event.error === 'aborted' && (!recognitionWantedRef.current || restartAfterWarmupRef.current || voicePreparingRef.current)) return;

      const messageByError = {
        'audio-capture': 'No microphone was found.',
        'not-allowed': 'Microphone permission was blocked.',
        'service-not-allowed': 'Microphone permission was blocked.',
        network: 'Voice input could not reach the speech service.',
      };
      setVoiceError(messageByError[event.error] || 'Voice input stopped unexpectedly.');

      if (['audio-capture', 'not-allowed', 'service-not-allowed', 'network'].includes(event.error)) {
        recognitionWantedRef.current = false;
        recognitionStartPendingRef.current = false;
        acceptVoiceResultsRef.current = false;
        restartAfterWarmupRef.current = false;
        voicePreparingRef.current = false;
        clearWarmupTimer();
        setIsVoicePreparing(false);
        setVoiceStatus('idle');
      }
    };

    recognition.onend = () => {
      recognitionRunningRef.current = false;
      recognitionStartPendingRef.current = false;
      if (recognitionWantedRef.current) {
        startRecognitionEngine(recognition);
      } else {
        setVoiceStatus('idle');
      }
    };

    recognitionRef.current = recognition;
    return recognition;
  }, [clearWarmupTimer, startRecognitionEngine, updateInputFromVoice]);

  const startVoiceInput = useCallback(() => {
    const recognition = createRecognition();
    if (!recognition) {
      setVoiceError('Voice input is not supported in this browser.');
      setVoiceStatus('idle');
      return;
    }

    baseTranscriptRef.current = inputRef.current.trim() ? `${inputRef.current.trimEnd()} ` : '';
    finalTranscriptRef.current = '';
    recognitionWantedRef.current = true;
    acceptVoiceResultsRef.current = false;
    restartAfterWarmupRef.current = false;
    voicePreparingRef.current = true;
    clearWarmupTimer();
    setIsVoicePreparing(true);
    setVoiceStatus('connecting');
    setVoiceError('');
    startRecognitionEngine(recognition);

    warmupTimerRef.current = window.setTimeout(() => {
      warmupTimerRef.current = null;
      if (!recognitionWantedRef.current || !recognitionRef.current) return;
      restartAfterWarmupRef.current = true;
      acceptVoiceResultsRef.current = false;
      baseTranscriptRef.current = inputRef.current.trim() ? `${inputRef.current.trimEnd()} ` : '';
      finalTranscriptRef.current = '';

      try {
        recognitionRef.current.abort();
      } catch (error) {
        console.warn('[VoiceInput] Browser recognition warmup restart failed:', error);
        restartAfterWarmupRef.current = false;
        acceptVoiceResultsRef.current = true;
        voicePreparingRef.current = false;
        setIsVoicePreparing(false);
      }
    }, VOICE_WARMUP_MS);
  }, [clearWarmupTimer, createRecognition, startRecognitionEngine]);

  const stopVoiceInput = useCallback(() => {
    recognitionWantedRef.current = false;
    recognitionStartPendingRef.current = false;
    acceptVoiceResultsRef.current = false;
    restartAfterWarmupRef.current = false;
    voicePreparingRef.current = false;
    clearWarmupTimer();
    setIsVoicePreparing(false);
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (error) {
        console.warn('[VoiceInput] Browser recognition stop failed:', error);
      }
    }
    setVoiceStatus('idle');
  }, [clearWarmupTimer]);

  useEffect(() => {
    createRecognition();
  }, [createRecognition]);

  useEffect(() => {
    return () => {
      recognitionWantedRef.current = false;
      recognitionStartPendingRef.current = false;
      acceptVoiceResultsRef.current = false;
      restartAfterWarmupRef.current = false;
      voicePreparingRef.current = false;
      clearWarmupTimer();
      setIsVoicePreparing(false);
      if (!recognitionRef.current) return;
      try {
        recognitionRef.current.abort();
      } catch (error) {
        console.warn('[VoiceInput] Browser recognition abort failed:', error);
      }
    };
  }, [clearWarmupTimer]);

  const toggleVoiceInput = () => {
    if (isListening || isVoiceConnecting) {
      stopVoiceInput();
    } else {
      startVoiceInput();
    }
  };

  const handleTextChange = (e) => {
    setInput(e.target.value);
    resizeTextarea(e.target);
  };

  const handleImageSelect = (e) => {
    if (!supportsImageInput) {
      e.target.value = '';
      return;
    }
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setAttachedImage({ dataUrl: ev.target.result, name: file.name });
    };
    reader.readAsDataURL(file);
  };

  const onKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSendWithAnimation = () => {
    setJustSent(true);
    handleSend();
    setTimeout(() => setJustSent(false), 1500);
  };

  const processFile = (file) => {
    if (!supportsImageInput) return;
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setAttachedImage({ dataUrl: ev.target.result, name: file.name });
    };
    reader.readAsDataURL(file);
  };

  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!supportsImageInput) return;
    dragCounterRef.current++;
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragOver(true);
    }
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!supportsImageInput) return;
    dragCounterRef.current--;
    if (dragCounterRef.current === 0) {
      setIsDragOver(false);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    dragCounterRef.current = 0;
    if (!supportsImageInput) return;
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      processFile(files[0]);
    }
  };

  const hasContent = input.trim() || attachedImage;

  return (
    <div
      className="relative rounded-[1.5rem] bg-[#0d0d12]/60 backdrop-blur-2xl border border-white/[0.08] shadow-[0_16px_40px_rgba(0,0,0,0.4)] transition-all duration-500 group/input focus-within:border-primary/30 focus-within:bg-[#0d0d12]/80 focus-within:shadow-[0_16px_50px_rgba(138,43,226,0.12)]"
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <AnimatePresence>
        {isDragOver && (
          <MotionDiv
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 flex items-center justify-center bg-[#03000a]/80 backdrop-blur-xl rounded-[2.5rem] border-2 border-dashed border-primary/20"
          >
            <MotionDiv
              initial={{ scale: 0.9, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              className="flex flex-col items-center gap-4"
            >
              <div className="w-16 h-16 rounded-[1.5rem] bg-primary/10 flex items-center justify-center border border-primary/20 shadow-[0_0_30px_rgba(138,43,226,0.1)]">
                <MotionDiv
                  animate={{ y: [0, -6, 0] }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                >
                  <ImagePlus className="w-8 h-8 text-primary" />
                </MotionDiv>
              </div>
              <div className="text-center">
                <p className="text-[11px] font-black text-white uppercase tracking-[0.4em] italic leading-none mb-2">Upload image</p>
                <p className="text-[9px] text-gray-500 font-bold uppercase tracking-widest">Drop the image here</p>
              </div>
            </MotionDiv>
          </MotionDiv>
        )}
      </AnimatePresence>

      <div className="px-0 py-0 relative z-10">
        <AnimatePresence>
          {attachedImage && (
            <MotionDiv
              initial={{ opacity: 0, y: 15, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 15, scale: 0.95 }}
              className="mb-4 inline-flex items-center gap-3 p-2.5 pr-4 rounded-[1.2rem] bg-white/[0.03] border border-white/10 shadow-2xl"
            >
              <div className="relative w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 border border-white/5 shadow-inner">
                <img src={attachedImage.dataUrl} alt="upload" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-primary/5" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest truncate max-w-[140px]">{attachedImage.name}</p>
                <p className="text-[8px] font-bold text-gray-600 uppercase mt-0.5 tracking-[0.2em]">Image attached</p>
              </div>
              <button
                onClick={() => setAttachedImage(null)}
                className="p-2 rounded-xl hover:bg-white/10 text-gray-600 hover:text-white transition-all duration-500 ml-1"
              >
                <X className="w-4 h-4" />
              </button>
            </MotionDiv>
          )}
        </AnimatePresence>

        <div
          onClick={(e) => {
            if (e.target.tagName !== 'BUTTON' && e.target.tagName !== 'INPUT' && e.target.tagName !== 'svg' && !e.target.closest('button')) {
              textareaRef?.current?.focus();
            }
          }}
          className="flex items-center gap-3 px-4 py-3 relative cursor-text"
        >
          {focused && (
            <div className="absolute inset-0 rounded-[1.5rem] border border-primary/20 blur-md pointer-events-none opacity-30" />
          )}

          <div className="flex items-center gap-0.5 sm:gap-1 shrink-0">
            <button
              type="button"
              onClick={() => {
                if (supportsImageInput) fileInputRef.current?.click();
              }}
              disabled={!supportsImageInput}
              className={`p-2 sm:p-2.5 rounded-2xl transition-all duration-500 group/icon ${
                supportsImageInput
                  ? 'hover:bg-white/5 text-gray-500 hover:text-primary'
                  : 'text-gray-700 opacity-45 cursor-not-allowed'
              }`}
              title={imageUploadTitle}
              aria-label={imageUploadTitle}
            >
              <ImagePlus className={`w-4 h-4 sm:w-4.5 sm:h-4.5 transition-transform ${supportsImageInput ? 'group-hover/icon:scale-110' : ''}`} />
            </button>
            <button
              type="button"
              onClick={toggleVoiceInput}
              disabled={!speechRecognitionSupported}
              aria-pressed={isListening || isVoiceConnecting}
              aria-label={showVoiceLoader ? 'Waiting for voice input' : isListening ? 'Stop voice input' : 'Start voice input'}
              className={`relative p-2 sm:p-2.5 rounded-2xl transition-all duration-500 group/icon ${
                showVoiceLoader
                  ? 'bg-primary/10 text-primary'
                  : isListening
                  ? 'bg-primary/15 text-primary shadow-[0_0_18px_rgba(138,43,226,0.25)]'
                  : 'hover:bg-white/5 text-gray-500 hover:text-white'
              } ${!speechRecognitionSupported ? 'opacity-40 cursor-not-allowed' : ''}`}
              title={
                !speechRecognitionSupported
                  ? 'Voice input is not supported in this browser'
                  : showVoiceLoader
                    ? 'Waiting for voice input'
                    : isListening
                      ? 'Stop voice input'
                      : 'Voice input'
              }
            >
              {(isListening || isVoiceConnecting) && (
                <span className="absolute inset-1 rounded-2xl border border-primary/40 animate-ping" />
              )}
              {showVoiceLoader ? (
                <LoaderCircle className="relative z-10 w-4 h-4 sm:w-4.5 sm:h-4.5 animate-spin" />
              ) : (
                <Mic className="relative z-10 w-4 h-4 sm:w-4.5 sm:h-4.5 group-hover/icon:scale-110 transition-transform" />
              )}
            </button>
          </div>

          <div className="w-px h-8 bg-white/5 shrink-0 hidden sm:block" />

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImageSelect}
            className="hidden"
            accept="image/*"
            disabled={!supportsImageInput}
          />

          <textarea
            ref={textareaRef}
            rows={1}
            value={input}
            onChange={handleTextChange}
            onKeyDown={onKeyDown}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder="Ask LudusGen AI anything..."
            className="w-full bg-transparent border-none focus:ring-0 focus:outline-none text-white placeholder-zinc-500 py-2 px-2 text-[14.5px] font-medium resize-none scrollbar-hide leading-relaxed relative z-10"
          />

          <div className="shrink-0">
            <MotionButton
              onClick={isTyping ? handleStop : (hasContent ? handleSendWithAnimation : undefined)}
              disabled={!hasContent && !isTyping}
              whileTap={(hasContent || isTyping) ? { scale: 0.92 } : {}}
              className={`w-11 h-11 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center transition-all duration-700 relative overflow-hidden group/send ${isTyping
                  ? 'bg-red-500/10 border border-red-500/20 text-red-500 shadow-[0_0_20px_rgba(239,68,68,0.1)] hover:bg-red-500/20 hover:border-red-500/40'
                  : hasContent
                    ? 'bg-primary text-white shadow-[0_10px_30px_rgba(138,43,226,0.3)] hover:shadow-[0_15px_40px_rgba(138,43,226,0.4)] hover:scale-105'
                    : 'bg-white/[0.04] text-gray-700 pointer-events-none'
                }`}
            >
              <AnimatePresence mode="wait">
                {justSent ? (
                  <MotionDiv
                    key="sent"
                    initial={{ scale: 0, rotate: -90 }}
                    animate={{ scale: 1, rotate: 0 }}
                    exit={{ scale: 0, opacity: 0 }}
                    transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                  >
                    <Check className="w-6 h-6 text-white" />
                  </MotionDiv>
                ) : isTyping ? (
                  <MotionDiv
                    key="stop"
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                    className="flex items-center justify-center"
                  >
                    <Square className="w-5 h-5 fill-current" />
                  </MotionDiv>
                ) : (
                  <MotionDiv
                    key="send"
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                  >
                    <ArrowUp className="w-6 h-6" />
                  </MotionDiv>
                )}
              </AnimatePresence>
            </MotionButton>
          </div>
        </div>
        <AnimatePresence>
          {voiceError && (
            <MotionDiv
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className="px-5 pb-3 -mt-1 text-[10px] font-bold text-amber-300/80"
            >
              {voiceError}
            </MotionDiv>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
