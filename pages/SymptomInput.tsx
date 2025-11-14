import React, { useState, useEffect, useRef } from 'react';
import { useTranslations } from '../lib/i18n';
import { MicrophoneIcon } from '../components/Icons';

// Add type definitions for the Web Speech API to resolve TypeScript errors.
// The SpeechRecognition API is not a standard part of the DOM typings.
interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: (event: any) => void;
  onend: () => void;
  onerror: (event: any) => void;
  start: () => void;
  stop: () => void;
}

declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognition;
    webkitSpeechRecognition?: new () => SpeechRecognition;
  }
}

const supportedLanguages = [
  { code: 'en-IN', name: 'English (India)' },
  { code: 'hi-IN', name: 'हिन्दी (Hindi)' },
  { code: 'bn-IN', name: 'বাংলা (Bengali)' },
  { code: 'gu-IN', name: 'ગુજરાતી (Gujarati)' },
  { code: 'kn-IN', name: 'ಕನ್ನಡ (Kannada)' },
  { code: 'ml-IN', name: 'മലയാളം (Malayalam)' },
  { code: 'mr-IN', name: 'मराठी (Marathi)' },
  { code: 'ta-IN', name: 'தமிழ் (Tamil)' },
  { code: 'te-IN', name: 'తెలుగు (Telugu)' },
  { code: 'ur-IN', name: 'اردو (Urdu)' },
];

interface SymptomInputProps {
  onSubmit: (symptoms: string) => void;
}

const SymptomInput: React.FC<SymptomInputProps> = ({ onSubmit }) => {
  const { t } = useTranslations();
  const [symptoms, setSymptoms] = useState('');
  const [selectedLang, setSelectedLang] = useState('en-IN');
  const [isRecording, setIsRecording] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn("Speech recognition not supported in this browser.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    
    recognition.onresult = (event) => {
      let finalTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        }
      }
       setSymptoms(prev => prev.trim() ? prev + ' ' + finalTranscript : finalTranscript);
    };

    recognition.onend = () => {
      setIsRecording(false);
    };
    
    recognition.onerror = (event) => {
        console.error("Speech recognition error", event.error);
        setIsRecording(false);
    };

    recognitionRef.current = recognition;

    return () => {
        if(recognitionRef.current){
            recognitionRef.current.stop();
        }
    };
  }, []);
  
  const handleVoiceInput = () => {
    if (!recognitionRef.current) return;
    
    const recognition = recognitionRef.current;
    if (isRecording) {
      recognition.stop();
    } else {
      recognition.lang = selectedLang;
      recognition.start();
      setIsRecording(true);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!symptoms.trim()) return;
    onSubmit(symptoms);
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
        <div>
            <h1 className="text-3xl font-bold text-slate-900">{t('symptomChecker')}</h1>
            <p className="mt-1 text-slate-500">{t('describeSymptomsPrompt')}</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-lg p-6 md:p-8 space-y-6">
            <div className="relative">
                <label htmlFor="symptoms" className="block text-sm font-medium text-slate-700 mb-1">
                    {t('symptoms')}
                </label>
                <textarea
                    id="symptoms"
                    rows={8}
                    className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm shadow-sm placeholder-slate-400
                    focus:outline-none focus:ring-1 focus:ring-sky-500 focus:border-sky-500"
                    placeholder={t('symptomsPlaceholder')}
                    value={symptoms}
                    onChange={(e) => setSymptoms(e.target.value)}
                />
            </div>
            
            <div className="flex flex-col sm:flex-row items-center gap-4">
                <div className="w-full sm:w-auto flex-grow">
                    <label htmlFor="language" className="sr-only">{t('selectLanguage')}</label>
                    <select
                        id="language"
                        value={selectedLang}
                        onChange={(e) => setSelectedLang(e.target.value)}
                        className="block w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-sky-500 focus:border-sky-500"
                    >
                        {supportedLanguages.map(lang => (
                            <option key={lang.code} value={lang.code}>{lang.name}</option>
                        ))}
                    </select>
                </div>
                 <button
                    type="button"
                    onClick={handleVoiceInput}
                    className={`flex items-center justify-center gap-2 px-4 py-2 border rounded-md shadow-sm text-sm font-medium transition-colors w-full sm:w-auto ${isRecording ? 'bg-red-500 text-white border-red-500 hover:bg-red-600' : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'}`}
                    aria-label={isRecording ? t('stopRecording') : t('startRecording')}
                >
                    <MicrophoneIcon />
                    <span>{isRecording ? t('recording') : t('voiceInput')}</span>
                     {isRecording && <span className="relative flex h-3 w-3"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span><span className="relative inline-flex rounded-full h-3 w-3 bg-white"></span></span>}
                </button>
            </div>
            
            <div className="pt-4 border-t border-slate-200">
                <button
                    type="submit"
                    disabled={!symptoms.trim()}
                    className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-sky-600 hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 disabled:bg-sky-300 disabled:cursor-not-allowed"
                >
                   {t('submitSymptoms')}
                </button>
            </div>

        </form>
    </div>
  );
};

export default SymptomInput;
