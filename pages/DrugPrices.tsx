import React, { useState } from 'react';
import { GoogleGenAI, Type } from "@google/genai";
import { useTranslations } from '../lib/i18n';

interface GenericDrug {
    name: string;
    manufacturer: string;
    price: number;
}

interface DrugPriceData {
    brandName: string;
    brandPrice: number;
    generics: GenericDrug[];
}

const DrugPrices: React.FC = () => {
    const { t } = useTranslations();
    const [searchQuery, setSearchQuery] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [priceData, setPriceData] = useState<DrugPriceData | null>(null);
    const [sources, setSources] = useState<any[]>([]);

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!searchQuery.trim()) return;

        setIsLoading(true);
        setError(null);
        setPriceData(null);
        setSources([]);

        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });

            const prompt = `For the drug "${searchQuery}", provide a typical price in USD for the brand name version and list 2-3 generic alternatives with their names, manufacturers, and typical prices. Use today's search results to get the most current pricing information. Provide the output as a valid JSON object ONLY, with the structure { "brandName": string, "brandPrice": number, "generics": [{ "name": string, "manufacturer": string, "price": number }] }. If the drug is already a generic (like 'Ibuprofen'), treat it as the brand name and find other generic manufacturers. Ensure prices are realistic numbers.`;

            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
                config: {
                    tools: [{ googleSearch: {} }],
                },
            });
            
            const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
            setSources(groundingChunks.filter(chunk => chunk.web));

            const jsonText = response.text.trim();
            // Clean the response to ensure it's valid JSON
            const cleanedJsonText = jsonText.replace(/^```json\s*|```\s*$/g, '');
            
            const parsedJson = JSON.parse(cleanedJsonText) as DrugPriceData;

            if (parsedJson.brandPrice && parsedJson.generics) {
                setPriceData(parsedJson);
            } else {
                throw new Error("Invalid response structure from API.");
            }

        } catch (err) {
            console.error("Error fetching drug prices:", err);
            setError(t('errorDrugPrices'));
        } finally {
            setIsLoading(false);
        }
    };
    
    const PriceChart = ({ data }: { data: DrugPriceData }) => {
        const allItems = [{ name: data.brandName, price: data.brandPrice }, ...data.generics];
        const maxPrice = Math.max(...allItems.map(item => item.price));
    
        return (
            <div className="space-y-4">
                {allItems.map((item, index) => (
                    <div key={index} className="flex items-center gap-4">
                        <div className="w-32 text-sm font-medium text-slate-600 truncate">{item.name}</div>
                        <div className="flex-1 bg-slate-100 rounded-full h-6">
                            <div
                                className={`rounded-full h-6 ${index === 0 ? 'bg-red-400' : 'bg-sky-500'}`}
                                style={{ width: `${(item.price / maxPrice) * 100}%` }}
                            ></div>
                        </div>
                        <div className="w-16 text-sm font-semibold text-slate-800 text-right">${item.price.toFixed(2)}</div>
                    </div>
                ))}
            </div>
        );
    };
    
    const SourcesDisplay = ({ sources }: { sources: any[] }) => (
         <div className="bg-slate-50 rounded-xl p-4 mt-6">
            <h3 className="text-sm font-semibold text-slate-600 mb-2">Sources</h3>
            <ul className="space-y-1">
                {sources.map((source, index) => (
                    <li key={index} className="text-xs">
                        <a href={source.web.uri} target="_blank" rel="noopener noreferrer" className="text-sky-700 hover:underline truncate">
                            {source.web.title || source.web.uri}
                        </a>
                    </li>
                ))}
            </ul>
        </div>
    );

    return (
        <div className="space-y-8 max-w-4xl mx-auto">
            <div>
                <h1 className="text-3xl font-bold text-slate-900">{t('drugPricesTitle')}</h1>
                <p className="mt-1 text-slate-500">{t('drugPricesSubtitle')}</p>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-6 md:p-8">
                <form onSubmit={handleSearch} className="flex gap-2">
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder={t('searchDrugPlaceholder')}
                        className="flex-grow mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm shadow-sm placeholder-slate-400
                        focus:outline-none focus:ring-1 focus:ring-sky-500 focus:border-sky-500"
                    />
                    <button
                        type="submit"
                        disabled={isLoading || !searchQuery.trim()}
                        className="px-6 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-sky-600 hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 disabled:bg-sky-300 disabled:cursor-not-allowed"
                    >
                        {isLoading ? t('searching') : t('search')}
                    </button>
                </form>
            </div>
            
            {isLoading && (
                 <div className="flex justify-center items-center gap-3 text-slate-600 py-10">
                    <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>{t('searching')}</span>
                </div>
            )}
            
            {error && <p className="text-sm text-red-600 text-center p-4 bg-red-50 rounded-md">{error}</p>}

            {priceData && (
                 <div className="space-y-8">
                    <div className="bg-white rounded-xl shadow-lg p-6 md:p-8">
                        <h2 className="text-xl font-bold text-slate-800 mb-4">{t('brandNamePrice')}: {priceData.brandName}</h2>
                        <PriceChart data={priceData} />
                    </div>
                     <div className="bg-white rounded-xl shadow-lg p-6 md:p-8">
                        <h2 className="text-xl font-bold text-slate-800 mb-4">{t('genericAlternatives')}</h2>
                        <ul className="divide-y divide-slate-200">
                           {priceData.generics.map((generic, index) => (
                               <li key={index} className="py-4">
                                   <div className="flex flex-col sm:flex-row justify-between sm:items-center">
                                        <div>
                                            <p className="font-semibold text-slate-900">{generic.name}</p>
                                            <p className="text-sm text-slate-500">{t('manufacturer')}: {generic.manufacturer}</p>
                                        </div>
                                        <div className="flex items-baseline gap-4 mt-2 sm:mt-0">
                                            <p className="text-lg font-bold text-sky-600">${generic.price.toFixed(2)}</p>
                                            <p className="text-sm font-medium text-green-600 bg-green-100 px-2 py-1 rounded-md">
                                                {t('potentialSavings')}: ${(priceData.brandPrice - generic.price).toFixed(2)}
                                            </p>
                                        </div>
                                   </div>
                               </li>
                           ))}
                        </ul>
                         {sources.length > 0 && <SourcesDisplay sources={sources} />}
                    </div>
                 </div>
            )}
        </div>
    );
};

export default DrugPrices;
