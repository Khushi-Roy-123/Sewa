import React, { useState, useRef, useEffect, useMemo } from 'react';
// FIX: Removed unexported 'LiveSession' type from import.
import { GoogleGenAI, LiveServerMessage, Modality, Blob, FunctionDeclaration, Type } from "@google/genai";
import { useTranslations } from '../lib/i18n';
import { PlayIcon, PauseIcon, SparklesIcon, BookOpenIcon, PencilIcon, TrashIcon, XIcon, MicrophoneIcon } from '../components/Icons';

declare global {
  interface Window {
    Recharts: any;
    webkitAudioContext: typeof AudioContext;
  }
}
const { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } = window.Recharts || {};

// --- Audio Helper Functions for Live API ---
function encode(bytes: Uint8Array) {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}
function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}
async function decodeAudioData(data: Uint8Array, ctx: AudioContext, sampleRate: number, numChannels: number): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}
function createBlob(data: Float32Array): Blob {
  const l = data.length;
  const int16 = new Int16Array(l);
  for (let i = 0; i < l; i++) {
    int16[i] = data[i] * 32768;
  }
  return { data: encode(new Uint8Array(int16.buffer)), mimeType: 'audio/pcm;rate=16000' };
}
// --- End Audio Helpers ---

const MOOD_STORAGE_KEY = 'moodHistory';
const JOURNAL_STORAGE_KEY = 'journalEntries';

const moods = [
    { name: 'Happy', emoji: '😊' }, { name: 'Good', emoji: '🙂' },
    { name: 'Neutral', emoji: '😐' }, { name: 'Worried', emoji: '😕' },
    { name: 'Sad', emoji: '😞' },
];

interface MoodEntry {
    mood: string;
    date: string; // YYYY-MM-DD
}

interface JournalEntry {
    id: string;
    date: string; // ISO string
    content: string;
}

const MoodTracker: React.FC<{ onMoodSelect: (mood: string) => void }> = ({ onMoodSelect }) => {
    const { t } = useTranslations();
    const [lastMood, setLastMood] = useState<string | null>(null);
    const [moodSubmitted, setMoodSubmitted] = useState(false);

    const handleMoodSelect = (mood: string) => {
        setLastMood(mood);
        setMoodSubmitted(true);
        onMoodSelect(mood);
        setTimeout(() => setMoodSubmitted(false), 3000);
    };

    return (
        <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-bold text-slate-800">{t('moodTrackerTitle')}</h2>
            <div className="flex justify-around items-center mt-4 py-4">
                {moods.map(mood => (
                    <button
                        key={mood.name} onClick={() => handleMoodSelect(mood.name)}
                        className={`text-5xl p-2 rounded-full transition-transform duration-200 hover:scale-125 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 ${lastMood === mood.name ? 'transform scale-125' : ''}`}
                        aria-label={mood.name}
                    > {mood.emoji} </button>
                ))}
            </div>
            {moodSubmitted && <p className="text-center text-sm text-green-600 mt-2">{t('moodRecorded')}</p>}
        </div>
    );
};

const MoodHistoryChart: React.FC<{ moodHistory: MoodEntry[] }> = ({ moodHistory }) => {
    const { t } = useTranslations();
    const moodScores: { [key: string]: number } = { Happy: 5, Good: 4, Neutral: 3, Worried: 2, Sad: 1 };

    const data = useMemo(() => {
        const last7Days = Array.from({ length: 7 }, (_, i) => {
            const d = new Date();
            d.setDate(d.getDate() - i);
            return d.toISOString().split('T')[0];
        }).reverse();

        return last7Days.map(date => {
            const entry = moodHistory.find(h => h.date === date);
            return {
                name: new Date(date).toLocaleDateString('en-us', { weekday: 'short' }),
                score: entry ? moodScores[entry.mood] : 0,
            };
        });
    }, [moodHistory]);

    if (!BarChart) return null;

    return (
        <div className="bg-white rounded-xl shadow-lg p-6 h-64">
            <h3 className="font-semibold text-slate-700 mb-4">{t('yourMoodThisWeek')}</h3>
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data} margin={{ top: 0, right: 10, left: -20, bottom: -10 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis domain={[0, 5]} hide={true} />
                    <Tooltip cursor={{ fill: 'rgba(241, 245, 249, 0.5)' }} contentStyle={{ borderRadius: '0.5rem' }} />
                    <Bar dataKey="score" fill="#38bdf8" radius={[4, 4, 0, 0]} />
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
};


const MeditationGuide: React.FC<{ playTrigger: boolean; onPlayComplete: () => void }> = ({ playTrigger, onPlayComplete }) => {
    const { t } = useTranslations();
    const [isPlaying, setIsPlaying] = useState(false);
    const audioRef = useRef<HTMLAudioElement>(null);
    
    useEffect(() => {
        // This effect handles the programmatic play triggered by the AI companion.
        if (playTrigger && audioRef.current) {
            const playPromise = audioRef.current.play();
            // The play() method returns a promise. We should handle it to avoid race conditions.
            if (playPromise !== undefined) {
                playPromise.catch(error => {
                    // Ignore AbortError which can happen if another action interrupts playback.
                    if (error.name !== 'AbortError') {
                        console.error("Meditation audio playback error:", error);
                    }
                }).finally(() => {
                    // Reset the trigger state only after the play action has settled.
                    onPlayComplete();
                });
            } else {
                // If playPromise is undefined (older browsers), reset immediately.
                onPlayComplete();
            }
        }
    }, [playTrigger, onPlayComplete]);

    const togglePlayPause = () => {
        const audio = audioRef.current;
        if (!audio) return;
        
        if (audio.paused) {
            audio.play().catch(error => {
                if (error.name !== 'AbortError') {
                    console.error("Error attempting to play audio:", error);
                }
            });
        } else {
            audio.pause();
        }
    };

    const audioSrc = "https://storage.googleapis.com/aistudio-hosting/samples/meditation.mp3";

    return (
        <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-bold text-slate-800 text-center">{t('meditationTitle')}</h2>
            <p className="text-slate-500 mt-2 mb-4 text-center">{t('meditationDesc')}</p>
            <audio 
                ref={audioRef} 
                onPlay={() => setIsPlaying(true)} 
                onPause={() => setIsPlaying(false)} 
                onEnded={() => setIsPlaying(false)}
                preload="auto"
            >
                <source src={audioSrc} type="audio/mpeg" />
                Your browser does not support the audio element.
            </audio>
            <div className="flex items-center justify-center">
                <button
                    onClick={togglePlayPause}
                    className="p-3 rounded-full bg-sky-600 text-white hover:bg-sky-700 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500"
                    aria-label={isPlaying ? "Pause" : "Play"}
                > {isPlaying ? <PauseIcon /> : <PlayIcon />} </button>
            </div>
        </div>
    );
};

const AICompanion: React.FC<{ onSuggestMeditation: () => void }> = ({ onSuggestMeditation }) => {
    const { t } = useTranslations();
    const [status, setStatus] = useState<'idle' | 'connecting' | 'active' | 'error'>('idle');
    const [transcriptionHistory, setTranscriptionHistory] = useState<{ user: string; model: string }[]>([]);
    
    const sessionPromiseRef = useRef<Promise<any> | null>(null);
    const resourcesRef = useRef<{
        inputAudioContext?: AudioContext;
        outputAudioContext?: AudioContext;
        stream?: MediaStream;
        scriptProcessor?: ScriptProcessorNode;
        mediaStreamSource?: MediaStreamAudioSourceNode;
        outputNode?: GainNode;
        sources?: Set<AudioBufferSourceNode>;
    }>({});
    const nextStartTimeRef = useRef(0);
    const currentInputTranscriptionRef = useRef('');
    const currentOutputTranscriptionRef = useRef('');

    const stopConversation = () => {
        if (sessionPromiseRef.current) {
            sessionPromiseRef.current.then(session => session.close()).catch(console.error);
            sessionPromiseRef.current = null;
        }
        
        resourcesRef.current.scriptProcessor?.disconnect();
        resourcesRef.current.mediaStreamSource?.disconnect();
        resourcesRef.current.stream?.getTracks().forEach(track => track.stop());
        
        if (resourcesRef.current.inputAudioContext?.state !== 'closed') {
           resourcesRef.current.inputAudioContext?.close().catch(console.error);
        }
        if (resourcesRef.current.outputAudioContext?.state !== 'closed') {
            resourcesRef.current.outputAudioContext?.close().catch(console.error);
        }

        resourcesRef.current = {};
        setStatus('idle');
    };

    const startConversation = async () => {
        setStatus('connecting');
        setTranscriptionHistory([]);
        currentInputTranscriptionRef.current = '';
        currentOutputTranscriptionRef.current = '';
        nextStartTimeRef.current = 0;

        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
            const suggestMeditation: FunctionDeclaration = {
                name: 'suggestMeditation',
                description: 'Suggests a guided meditation to the user.',
                parameters: { type: Type.OBJECT, properties: {} },
            };
            
            const inputAudioContext = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 });
            const outputAudioContext = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 24000 });
            const outputNode = outputAudioContext.createGain();
            const sources = new Set<AudioBufferSourceNode>();
            resourcesRef.current = { inputAudioContext, outputAudioContext, outputNode, sources };

            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            resourcesRef.current.stream = stream;

            sessionPromiseRef.current = ai.live.connect({
                model: 'gemini-2.5-flash-native-audio-preview-09-2025',
                callbacks: {
                    onopen: () => {
                        setStatus('active');
                        const source = inputAudioContext.createMediaStreamSource(stream);
                        const scriptProcessor = inputAudioContext.createScriptProcessor(4096, 1, 1);
                        
                        resourcesRef.current.mediaStreamSource = source;
                        resourcesRef.current.scriptProcessor = scriptProcessor;

                        scriptProcessor.onaudioprocess = (audioProcessingEvent) => {
                            const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
                            const pcmBlob = createBlob(inputData);
                            sessionPromiseRef.current?.then((session) => {
                                session.sendRealtimeInput({ media: pcmBlob });
                            });
                        };
                        source.connect(scriptProcessor);
                        scriptProcessor.connect(inputAudioContext.destination);
                    },
                    onmessage: async (message: LiveServerMessage) => {
                        if (message.serverContent?.inputTranscription) {
                            currentInputTranscriptionRef.current += message.serverContent.inputTranscription.text;
                        }
                        if (message.serverContent?.outputTranscription) {
                            currentOutputTranscriptionRef.current += message.serverContent.outputTranscription.text;
                        }
                        if (message.serverContent?.turnComplete) {
                            const fullInput = currentInputTranscriptionRef.current.trim();
                            const fullOutput = currentOutputTranscriptionRef.current.trim();
                            if (fullInput || fullOutput) {
                                setTranscriptionHistory(prev => [...prev, { user: fullInput, model: fullOutput }]);
                            }
                            currentInputTranscriptionRef.current = '';
                            currentOutputTranscriptionRef.current = '';
                        }
                        if (message.toolCall) {
                            for (const fc of message.toolCall.functionCalls) {
                                if (fc.name === 'suggestMeditation') {
                                    onSuggestMeditation();
                                    sessionPromiseRef.current?.then((session) => {
                                        session.sendToolResponse({
                                            functionResponses: { id: fc.id, name: fc.name, response: { result: "ok" } }
                                        });
                                    });
                                }
                            }
                        }
                        const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData.data;
                        if (base64Audio && outputAudioContext && outputNode && sources) {
                             nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outputAudioContext.currentTime);
                             const audioBuffer = await decodeAudioData(decode(base64Audio), outputAudioContext, 24000, 1);
                             const sourceNode = outputAudioContext.createBufferSource();
                             sourceNode.buffer = audioBuffer;
                             sourceNode.connect(outputNode);
                             sourceNode.addEventListener('ended', () => { sources.delete(sourceNode); });
                             sourceNode.start(nextStartTimeRef.current);
                             nextStartTimeRef.current += audioBuffer.duration;
                             sources.add(sourceNode);
                        }
                        if (message.serverContent?.interrupted) {
                            for (const sourceNode of sources.values()) {
                                sourceNode.stop();
                                sources.delete(sourceNode);
                            }
                            nextStartTimeRef.current = 0;
                        }
                    },
                    onerror: (e: ErrorEvent) => {
                        console.error('Live session error:', e);
                        setStatus('error');
                        stopConversation();
                    },
                    onclose: (e: CloseEvent) => {
                        console.debug('Live session closed');
                        stopConversation();
                    },
                },
                config: {
                    responseModalities: [Modality.AUDIO],
                    outputAudioTranscription: {},
                    inputAudioTranscription: {},
                    speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } } },
                    systemInstruction: t('aiCompanionSystemInstruction'),
                    tools: [{ functionDeclarations: [suggestMeditation] }],
                },
            });

        } catch (error) {
            console.error('Failed to start conversation:', error);
            setStatus('error');
            stopConversation();
        }
    };
    
    const toggleConversation = () => {
        if (status === 'active' || status === 'connecting') {
            stopConversation();
        } else {
            startConversation();
        }
    };

    return (
        <div className="bg-white rounded-xl shadow-lg p-6 flex flex-col h-full">
            <h2 className="text-xl font-bold text-slate-800 text-center flex items-center justify-center gap-2">
                <SparklesIcon />
                {t('aiCompanionTitle')}
            </h2>
            <div className="flex-grow mt-4 bg-slate-50 rounded-lg p-4 space-y-4 overflow-y-auto min-h-[200px]">
                {transcriptionHistory.length === 0 && status === 'idle' && (
                    <p className="text-center text-slate-500 pt-10">Press the microphone to start talking.</p>
                )}
                 {status === 'connecting' && <p className="text-center text-slate-500 pt-10">Connecting...</p>}
                 {status === 'error' && <p className="text-center text-red-500 pt-10">Connection failed. Please try again.</p>}
                 {transcriptionHistory.map((turn, index) => (
                    <div key={index} className="space-y-2">
                        {turn.user && <div className="text-right"><span className="bg-sky-500 text-white text-sm rounded-lg px-3 py-2 inline-block max-w-xs break-words">{turn.user}</span></div>}
                        {turn.model && <div className="text-left"><span className="bg-slate-200 text-slate-800 text-sm rounded-lg px-3 py-2 inline-block max-w-xs break-words">{turn.model}</span></div>}
                    </div>
                ))}
            </div>
            <div className="mt-4 flex justify-center">
                <button
                    onClick={toggleConversation}
                    className={`p-4 rounded-full text-white transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 ${
                        status === 'active' ? 'bg-red-500 hover:bg-red-600' : 
                        status === 'connecting' ? 'bg-yellow-500 cursor-wait' : 
                        'bg-sky-600 hover:bg-sky-700'
                    }`}
                    aria-label={status === 'active' ? "Stop conversation" : "Start conversation"}
                >
                   {status === 'connecting' ? 
                     <svg className="animate-spin h-6 w-6 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>
                     : <MicrophoneIcon />}
                </button>
            </div>
        </div>
    );
};

const Journal: React.FC = () => {
    const { t } = useTranslations();
    const [entries, setEntries] = useState<JournalEntry[]>([]);
    const [newEntry, setNewEntry] = useState('');
    const [editingEntry, setEditingEntry] = useState<JournalEntry | null>(null);
    const [expandedEntries, setExpandedEntries] = useState<Set<string>>(new Set());
    
    useEffect(() => {
        try {
            const stored = localStorage.getItem(JOURNAL_STORAGE_KEY);
            if (stored) setEntries(JSON.parse(stored));
        } catch (e) { console.error("Failed to parse journal entries", e); }
    }, []);

    const saveEntries = (updatedEntries: JournalEntry[]) => {
        setEntries(updatedEntries);
        localStorage.setItem(JOURNAL_STORAGE_KEY, JSON.stringify(updatedEntries));
    };

    const handleSaveEntry = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newEntry.trim()) return;
        const entry: JournalEntry = { id: new Date().toISOString(), date: new Date().toISOString(), content: newEntry.trim() };
        saveEntries([entry, ...entries]);
        setNewEntry('');
    };
    
    const handleDelete = (id: string) => {
        if (window.confirm(t('deleteConfirmation'))) {
            saveEntries(entries.filter(e => e.id !== id));
        }
    };
    
    const handleEditSave = (content: string) => {
        if (!editingEntry) return;
        saveEntries(entries.map(e => e.id === editingEntry.id ? { ...e, content } : e));
        setEditingEntry(null);
    };

    const toggleExpand = (id: string) => {
        const newSet = new Set(expandedEntries);
        newSet.has(id) ? newSet.delete(id) : newSet.add(id);
        setExpandedEntries(newSet);
    };
    
    const EntryContent: React.FC<{ content: string; id: string }> = ({ content, id }) => {
        const isLong = content.length > 150;
        const isExpanded = expandedEntries.has(id);
        const displayContent = isLong && !isExpanded ? `${content.substring(0, 150)}...` : content;
        
        return (
            <p className="text-slate-600 text-sm whitespace-pre-wrap">
                {displayContent}
                {isLong && (
                     <button onClick={() => toggleExpand(id)} className="text-sky-600 font-semibold ml-2">
                        {isExpanded ? t('readLess') : t('readMore')}
                     </button>
                )}
            </p>
        );
    };

    return (
        <div className="bg-white rounded-xl shadow-lg p-6 flex flex-col h-full">
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2"><BookOpenIcon /> {t('myJournal')}</h2>
            <form onSubmit={handleSaveEntry} className="mt-4">
                <textarea
                    value={newEntry}
                    onChange={(e) => setNewEntry(e.target.value)}
                    rows={4}
                    placeholder={t('journalPlaceholder')}
                    className="w-full p-2 border border-slate-300 rounded-md text-sm focus:ring-sky-500 focus:border-sky-500"
                />
                <button type="submit" className="mt-2 w-full bg-sky-600 text-white font-semibold py-2 rounded-lg text-sm hover:bg-sky-700 transition-colors">{t('saveEntry')}</button>
            </form>
            <div className="mt-6 flex-grow overflow-y-auto space-y-4">
                {entries.map(entry => (
                    <div key={entry.id} className="bg-slate-50 p-4 rounded-lg">
                        <div className="flex justify-between items-center mb-2">
                            <p className="text-xs font-semibold text-slate-500">{new Date(entry.date).toLocaleString()}</p>
                            <div>
                                <button onClick={() => setEditingEntry(entry)} className="text-slate-500 hover:text-sky-600 mr-2"><PencilIcon /></button>
                                <button onClick={() => handleDelete(entry.id)} className="text-slate-500 hover:text-red-600"><TrashIcon /></button>
                            </div>
                        </div>
                        <EntryContent content={entry.content} id={entry.id} />
                    </div>
                ))}
            </div>
            {editingEntry && (
                <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg">
                        <div className="p-6">
                            <div className="flex justify-between items-center mb-4">
                               <h3 className="text-lg font-bold">{t('editEntry')}</h3>
                               <button onClick={() => setEditingEntry(null)}><XIcon /></button>
                            </div>
                            <textarea
                                defaultValue={editingEntry.content}
                                rows={8}
                                onBlur={(e) => handleEditSave(e.target.value)}
                                className="w-full p-2 border border-slate-300 rounded-md text-sm"
                                autoFocus
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};


const MentalHealth: React.FC = () => {
    const { t } = useTranslations();
    const [moodHistory, setMoodHistory] = useState<MoodEntry[]>([]);
    const [triggerMeditation, setTriggerMeditation] = useState(false);

    useEffect(() => {
        try {
            const stored = localStorage.getItem(MOOD_STORAGE_KEY);
            if (stored) setMoodHistory(JSON.parse(stored));
        } catch (e) { console.error("Failed to parse mood history", e); }
    }, []);

    const handleMoodSelect = (mood: string) => {
        const today = new Date().toISOString().split('T')[0];
        const newEntry: MoodEntry = { mood, date: today };
        const updatedHistory = moodHistory.filter(h => h.date !== today);
        const newHistory = [...updatedHistory, newEntry];
        setMoodHistory(newHistory);
        localStorage.setItem(MOOD_STORAGE_KEY, JSON.stringify(newHistory));
    };

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold text-slate-900">{t('mentalHealthTitle')}</h1>
                <p className="mt-1 text-slate-500">{t('mentalHealthSubtitle')}</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="space-y-8">
                    <MoodTracker onMoodSelect={handleMoodSelect} />
                    <MoodHistoryChart moodHistory={moodHistory} />
                    <Journal />
                </div>
                <div className="space-y-8">
                     <MeditationGuide playTrigger={triggerMeditation} onPlayComplete={() => setTriggerMeditation(false)} />
                     <AICompanion onSuggestMeditation={() => setTriggerMeditation(true)} />
                </div>
            </div>
        </div>
    );
};

export default MentalHealth;
