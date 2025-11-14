import React, { useState, useEffect } from 'react';
import { GoogleGenAI, Type } from "@google/genai";
import { useTranslations } from '../lib/i18n';

interface AnalyzedData {
    translatedText: string;
    criticalPhrases: string[];
}

interface TranslatedRecordProps {
    extractedText: string;
}

const targetLanguages = [
    { code: 'English', name: 'English' },
    { code: 'Spanish', name: 'Español' },
    { code: 'French', name: 'Français' },
    { code: 'German', name: 'Deutsch' },
    { code: 'Hindi', name: 'हिन्दी' },
    { code: 'Mandarin Chinese', name: '中文' },
];

const TranslatedRecord: React.FC<TranslatedRecordProps> = ({ extractedText }) => {
    const { t } = useTranslations();
    const [analysis, setAnalysis] = useState<AnalyzedData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [targetLanguage, setTargetLanguage] = useState('English');

    useEffect(() => {
        if (!extractedText) {
            window.location.hash = '#/records';
            return;
        }

        const fetchAnalysis = async () => {
            setIsLoading(true);
            setError(null);

            try {
                const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
                
                const responseSchema = {
                    type: Type.OBJECT,
                    properties: {
                        translatedText: { type: Type.STRING, description: `The full medical text translated into ${targetLanguage}.` },
                        criticalPhrases: {
                            type: Type.ARRAY,
                            description: `An array of critical phrases (diagnoses, medications, key lab values) extracted FROM THE TRANSLATED TEXT.`,
                            items: { type: Type.STRING }
                        }
                    }
                };
                
                const prompt = `Analyze the following medical text. First, translate it to ${targetLanguage}. Then, from your translation, identify and extract an array of critical pieces of information (like diagnoses, medication names and dosages, and abnormal lab results). Provide the full translation and the array of critical phrases in a JSON object. Text: "${extractedText}"`;

                const response = await ai.models.generateContent({
                    model: 'gemini-2.5-flash',
                    contents: prompt,
                    config: {
                        responseMimeType: "application/json",
                        responseSchema: responseSchema,
                    }
                });

                const jsonText = response.text.trim();
                const parsedJson = JSON.parse(jsonText);

                if (parsedJson.translatedText && Array.isArray(parsedJson.criticalPhrases)) {
                    setAnalysis(parsedJson);
                } else {
                    throw new Error("Invalid response structure from API.");
                }

            } catch (err) {
                console.error("Error fetching analysis:", err);
                setError(t('translationError'));
            } finally {
                setIsLoading(false);
            }
        };

        fetchAnalysis();
    }, [extractedText, targetLanguage, t]);

    const renderHighlightedText = () => {
        if (!analysis) return null;

        const { translatedText, criticalPhrases } = analysis;
        if (criticalPhrases.length === 0) return translatedText;

        const regex = new RegExp(`(${criticalPhrases.map(p => p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'gi');
        const parts = translatedText.split(regex);
        
        return parts.map((part, index) => {
            const isHighlight = criticalPhrases.some(phrase => phrase.toLowerCase() === part.toLowerCase());
            return isHighlight ? (
                <mark key={index} className="bg-yellow-200 px-1 rounded">{part}</mark>
            ) : (
                <span key={index}>{part}</span>
            );
        });
    };

    return (
        <div className="space-y-8 max-w-4xl mx-auto">
            <div>
                <h1 className="text-3xl font-bold text-slate-900">{t('analyzedRecordTitle')}</h1>
                <p className="mt-1 text-slate-500">{t('analyzedRecordSubtitle')}</p>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-6 md:p-8 space-y-6">
                <div>
                    <label htmlFor="language-select" className="block text-sm font-medium text-slate-700">{t('selectTranslationLanguage')}</label>
                    <select
                        id="language-select"
                        value={targetLanguage}
                        onChange={(e) => setTargetLanguage(e.target.value)}
                        disabled={isLoading}
                        className="mt-1 block w-full sm:w-1/2 pl-3 pr-10 py-2 text-base border-slate-300 focus:outline-none focus:ring-sky-500 focus:border-sky-500 sm:text-sm rounded-md"
                    >
                        {targetLanguages.map(lang => <option key={lang.code} value={lang.code}>{lang.name}</option>)}
                    </select>
                </div>
                
                {isLoading && (
                    <div className="flex flex-col items-center justify-center text-center h-48">
                         <svg className="animate-spin h-8 w-8 text-sky-600 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <h2 className="text-lg font-semibold text-slate-700">{t('translationLoading')}</h2>
                    </div>
                )}
                
                {error && <p className="text-sm text-red-600 text-center p-4 bg-red-50 rounded-md">{error}</p>}
                
                {!isLoading && analysis && (
                    <div className="space-y-6 pt-4 border-t border-slate-200">
                        <div>
                            <h3 className="text-lg font-medium text-slate-800 mb-2">{t('translatedText')}</h3>
                            <div className="w-full p-3 border border-slate-300 rounded-md bg-slate-50 text-sm text-slate-800 whitespace-pre-wrap">
                                {renderHighlightedText()}
                            </div>
                        </div>
                        <div>
                            <h3 className="text-lg font-medium text-slate-800 mb-2">{t('originalText')}</h3>
                            <textarea
                                readOnly
                                value={extractedText}
                                rows={10}
                                className="w-full p-3 border border-slate-300 rounded-md bg-slate-100 text-sm text-slate-600"
                            />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default TranslatedRecord;