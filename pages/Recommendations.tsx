import React, { useState, useEffect } from 'react';
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { useTranslations } from '../lib/i18n';
import { CardiologyIcon, NeurologyIcon, DermatologyIcon, GastroenterologyIcon, DefaultSpecialistIcon, SpeakerIcon, ExclamationIcon } from '../components/Icons';

interface Recommendation {
    specialty: string;
    reason: string;
    sampleDoctors: string[];
}

interface DeepAnalysisData {
    severityAssessment: {
        level: 'Urgent' | 'Routine' | 'Monitor';
        reason: string;
    };
    potentialConditions: {
        name: string;
        description: string;
        likelihood: 'High' | 'Medium' | 'Low';
    }[];
    recommendedNextSteps: string[];
    questionsForDoctor: string[];
}

interface RecommendationsProps {
    symptoms: string;
}

// --- Audio Helper Functions for TTS ---
function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
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


const specialistIcons: { [key: string]: React.ReactNode } = {
    'cardiologist': <CardiologyIcon />,
    'neurologist': <NeurologyIcon />,
    'dermatologist': <DermatologyIcon />,
    'gastroenterologist': <GastroenterologyIcon />,
};

const getSpecialistIcon = (specialty: string): React.ReactNode => {
    const key = specialty.toLowerCase();
    return specialistIcons[key] || <DefaultSpecialistIcon />;
};

const Recommendations: React.FC<RecommendationsProps> = ({ symptoms }) => {
    const { t } = useTranslations();
    const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [deepAnalysis, setDeepAnalysis] = useState<DeepAnalysisData | null>(null);
    const [sources, setSources] = useState<any[]>([]);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState<string | null>(null); // Holds the reason text being spoken

    useEffect(() => {
        if (!symptoms) {
            window.location.hash = '#/symptoms';
            return;
        }

        const fetchRecommendations = async () => {
            setIsLoading(true);
            setError(null);

            try {
                const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
                
                const responseSchema = {
                    type: Type.OBJECT,
                    properties: {
                        recommendations: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    specialty: { type: Type.STRING },
                                    reason: { type: Type.STRING },
                                    sampleDoctors: { type: Type.ARRAY, items: { type: Type.STRING } }
                                }
                            }
                        }
                    }
                };

                const response = await ai.models.generateContent({
                    model: 'gemini-2.5-flash',
                    contents: `Based on the following symptoms, recommend up to 3 relevant medical specialists. For each specialist, provide a brief, user-friendly reason for the recommendation and list 2-3 sample doctor names (e.g., "Dr. John Smith"). Symptoms: "${symptoms}"`,
                    config: {
                        responseMimeType: "application/json",
                        responseSchema: responseSchema,
                    }
                });

                const jsonText = response.text.trim();
                const parsedJson = JSON.parse(jsonText);

                if (parsedJson.recommendations) {
                    setRecommendations(parsedJson.recommendations);
                } else {
                    throw new Error("Invalid response structure from API.");
                }

            } catch (err) {
                console.error("Error fetching recommendations:", err);
                setError(t('errorRecommendations'));
            } finally {
                setIsLoading(false);
            }
        };

        fetchRecommendations();
    }, [symptoms, t]);
    
    const handleDeepAnalysis = async () => {
        setIsAnalyzing(true);
        setDeepAnalysis(null);
        setError(null);
        setSources([]);

        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });

            const schema: any = {
                type: Type.OBJECT,
                properties: {
                    severityAssessment: {
                        type: Type.OBJECT,
                        properties: {
                            level: { type: Type.STRING, enum: ['Urgent', 'Routine', 'Monitor'] },
                            reason: { type: Type.STRING }
                        },
                        required: ['level', 'reason']
                    },
                    potentialConditions: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                name: { type: Type.STRING },
                                description: { type: Type.STRING },
                                likelihood: { type: Type.STRING, enum: ['High', 'Medium', 'Low'] }
                            },
                             required: ['name', 'description', 'likelihood']
                        }
                    },
                    recommendedNextSteps: { type: Type.ARRAY, items: { type: Type.STRING } },
                    questionsForDoctor: { type: Type.ARRAY, items: { type: Type.STRING } }
                },
                required: ['severityAssessment', 'potentialConditions', 'recommendedNextSteps', 'questionsForDoctor']
            };
            
            const prompt = `Based on these symptoms: "${symptoms}", conduct a deep analysis grounded in web search. Provide a JSON object with:
            1. 'severityAssessment': Classify as 'Urgent', 'Routine', or 'Monitor' and give a brief reason.
            2. 'potentialConditions': A list of up to 3 potential conditions with name, description, and likelihood ('High', 'Medium', 'Low').
            3. 'recommendedNextSteps': Actionable next steps for the user.
            4. 'questionsForDoctor': Key questions the user should ask a healthcare professional.`;
            
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
                config: {
                    tools: [{ googleSearch: {} }],
                    responseMimeType: "application/json",
                    responseSchema: schema,
                }
            });

            const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
            setSources(groundingChunks.filter(chunk => chunk.web));
            
            const jsonText = response.text.trim();
            const parsedJson = JSON.parse(jsonText);
            setDeepAnalysis(parsedJson);

        } catch (err) {
            console.error("Error fetching deep analysis:", err);
            setError("Failed to generate a deeper analysis. Please try again.");
        } finally {
            setIsAnalyzing(false);
        }
    };
    
    const handleTextToSpeech = async (text: string) => {
        if (isSpeaking) return;
        setIsSpeaking(text);
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
            const response = await ai.models.generateContent({
                model: "gemini-2.5-flash-preview-tts",
                contents: [{ parts: [{ text: `Read this clearly: ${text}` }] }],
                config: {
                    responseModalities: [Modality.AUDIO],
                    speechConfig: {
                        voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } },
                    },
                },
            });

            const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
            if (base64Audio) {
                const outputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
                const audioBuffer = await decodeAudioData(decode(base64Audio), outputAudioContext, 24000, 1);
                const source = outputAudioContext.createBufferSource();
                source.buffer = audioBuffer;
                source.connect(outputAudioContext.destination);
                source.start();
                source.onended = () => setIsSpeaking(null);
            } else {
                setIsSpeaking(null);
            }
        } catch (error) {
            console.error("TTS Error:", error);
            setIsSpeaking(null);
        }
    };


    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center text-center h-64">
                <svg className="animate-spin h-8 w-8 text-sky-600 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <h2 className="text-xl font-semibold text-slate-700">{t('loadingRecommendations')}</h2>
                <p className="text-slate-500">Please wait while we analyze your symptoms.</p>
            </div>
        );
    }
    
    if (error && !isAnalyzing) {
        return (
            <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-md">
                <div className="flex">
                    <div className="flex-shrink-0">
                         <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                        </svg>
                    </div>
                    <div className="ml-3">
                        <p className="text-sm text-red-700">{error}</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold text-slate-900">{t('recommendationsTitle')}</h1>
                <p className="mt-1 text-slate-500">{t('recommendationsSubtitle')}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {recommendations.map((rec, index) => (
                    <div key={index} className="bg-white rounded-xl shadow-lg p-6 flex flex-col">
                        <div className="flex items-center">
                            <div className="bg-sky-100 text-sky-600 p-3 rounded-full">
                                {getSpecialistIcon(rec.specialty)}
                            </div>
                            <h3 className="ml-4 text-xl font-bold text-slate-800">{rec.specialty}</h3>
                        </div>
                        <div className="mt-4 pt-4 border-t border-slate-200 flex-grow">
                            <div className="flex justify-between items-center">
                                <h4 className="font-semibold text-slate-600">{t('reasonForRecommendation')}</h4>
                                <button onClick={() => handleTextToSpeech(rec.reason)} disabled={!!isSpeaking} className="text-slate-500 hover:text-sky-600 disabled:text-slate-300 disabled:cursor-wait">
                                     {isSpeaking === rec.reason ? <svg className="animate-pulse h-5 w-5 text-sky-500" viewBox="0 0 24 24" fill="currentColor"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"></path></svg> : <SpeakerIcon />}
                                </button>
                            </div>
                            <p className="text-sm text-slate-500 mt-1">{rec.reason}</p>
                            
                            <h4 className="font-semibold text-slate-600 mt-4">{t('sampleDoctors')}</h4>
                             <ul className="list-disc list-inside text-sm text-slate-500 mt-1 space-y-1">
                                {rec.sampleDoctors.map((doctor, i) => <li key={i}>{doctor}</li>)}
                            </ul>
                        </div>
                         <div className="mt-6">
                            <button
                                onClick={() => window.location.hash = '#/appointments'}
                                className="w-full block text-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-sky-600 hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500"
                            >
                                {t('bookAppointment')}
                            </button>
                        </div>
                    </div>
                ))}
            </div>
            
            {recommendations.length > 0 && !deepAnalysis && (
                <div className="text-center pt-4">
                    <button onClick={handleDeepAnalysis} disabled={isAnalyzing} className="bg-slate-700 text-white font-semibold py-3 px-6 rounded-lg shadow-md hover:bg-slate-800 transition-colors disabled:bg-slate-400">
                        {isAnalyzing ? t('analyzing') : t('getDeeperAnalysis')}
                    </button>
                </div>
            )}
            
            {isAnalyzing && (
                 <div className="flex flex-col items-center justify-center text-center h-32">
                    <svg className="animate-spin h-8 w-8 text-slate-600 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <h2 className="text-xl font-semibold text-slate-700">{t('analyzing')}</h2>
                </div>
            )}
            
            {error && isAnalyzing && <p className="text-center text-red-600">{error}</p>}
            
            {deepAnalysis && <DeepAnalysisDisplay analysis={deepAnalysis} sources={sources} />}
        </div>
    );
};


const DeepAnalysisDisplay: React.FC<{ analysis: DeepAnalysisData, sources: any[] }> = ({ analysis, sources }) => {
    const { t } = useTranslations();
    
    const likelihoodColors: { [key: string]: string } = {
        High: 'bg-red-100 text-red-800',
        Medium: 'bg-yellow-100 text-yellow-800',
        Low: 'bg-green-100 text-green-800',
    };

    const severityMap = {
        Urgent: { text: t('severityUrgent'), color: 'bg-red-100 border-red-500 text-red-900' },
        Routine: { text: t('severityRoutine'), color: 'bg-yellow-100 border-yellow-500 text-yellow-900' },
        Monitor: { text: t('severityMonitor'), color: 'bg-sky-100 border-sky-500 text-sky-900' },
    };
    const severityInfo = severityMap[analysis.severityAssessment.level];

    return (
        <div className="bg-white rounded-xl shadow-lg p-6 md:p-8 mt-8 space-y-8">
             <h2 className="text-2xl font-bold text-slate-900 border-b pb-2">{t('deepAnalysisTitle')}</h2>
             
            <div className="bg-slate-50 rounded-lg p-4 border-l-4 border-slate-400">
                <h3 className="font-bold text-slate-800">{t('disclaimerTitle')}</h3>
                <p className="text-sm text-slate-600">{t('disclaimerText')}</p>
            </div>
             
             <div className="space-y-6">
                 <div className={`p-4 rounded-lg border-l-4 flex items-start gap-4 ${severityInfo.color}`}>
                     <div className="flex-shrink-0"><ExclamationIcon /></div>
                     <div>
                        <h3 className="font-bold">{t('severity')}</h3>
                        <p className="font-semibold">{severityInfo.text}</p>
                        <p className="text-sm">{analysis.severityAssessment.reason}</p>
                     </div>
                 </div>

                <div>
                    <h3 className="text-xl font-semibold text-slate-800 mb-3">{t('potentialConditions')}</h3>
                    <ul className="space-y-4">
                        {analysis.potentialConditions.map((cond, i) => (
                            <li key={i} className="bg-slate-50 p-4 rounded-lg">
                                <div className="flex justify-between items-start">
                                    <h4 className="font-bold text-slate-900">{cond.name}</h4>
                                    <span className={`text-xs font-semibold px-2 py-1 rounded-full ${likelihoodColors[cond.likelihood]}`}>{t('likelihood')}: {cond.likelihood}</span>
                                </div>
                                <p className="text-sm text-slate-600 mt-1">{cond.description}</p>
                            </li>
                        ))}
                    </ul>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                         <h3 className="text-xl font-semibold text-slate-800 mb-3">{t('recommendedNextSteps')}</h3>
                         <ul className="list-disc list-inside space-y-2 text-slate-700">
                            {analysis.recommendedNextSteps.map((step, i) => <li key={i}>{step}</li>)}
                         </ul>
                    </div>
                     <div>
                         <h3 className="text-xl font-semibold text-slate-800 mb-3">{t('questionsForDoctor')}</h3>
                         <ul className="list-disc list-inside space-y-2 text-slate-700">
                            {analysis.questionsForDoctor.map((q, i) => <li key={i}>{q}</li>)}
                         </ul>
                    </div>
                </div>
                
                 {sources.length > 0 && (
                     <div className="bg-slate-50 rounded-xl p-4 mt-6">
                        <h3 className="text-sm font-semibold text-slate-600 mb-2">{t('sources')}</h3>
                        <ul className="space-y-1">
                            {sources.map((source, index) => (
                                <li key={index} className="text-xs">
                                    <a href={source.web.uri} target="_blank" rel="noopener noreferrer" className="text-sky-700 hover:underline truncate block">
                                        {source.web.title || source.web.uri}
                                    </a>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
             </div>
        </div>
    );
}

export default Recommendations;