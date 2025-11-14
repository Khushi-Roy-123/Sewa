import React, { useState, useEffect, useRef, useMemo } from 'react';
import { appointments, records } from '../lib/data';
import { PillIcon, CalendarIcon, FileTextIcon } from './Icons';

interface Medication {
    id: string;
    name: string;
    dosage: string;
}

interface SearchResult {
    type: 'Medication' | 'Appointment' | 'Record';
    title: string;
    description: string;
    href: string;
}

const typeIcons: { [key in SearchResult['type']]: React.ReactNode } = {
    Medication: <PillIcon />,
    Appointment: <CalendarIcon />,
    Record: <FileTextIcon />,
};

const GlobalSearch: React.FC = () => {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<SearchResult[]>([]);
    const [isActive, setIsActive] = useState(false);
    const searchRef = useRef<HTMLDivElement>(null);

    // Debounce search
    useEffect(() => {
        if (query.length < 2) {
            setResults([]);
            return;
        }

        const handler = setTimeout(() => {
            const lowerCaseQuery = query.toLowerCase();
            
            // Search Medications
            const storedMeds = localStorage.getItem('medications');
            const meds: Medication[] = storedMeds ? JSON.parse(storedMeds) : [];
            const medResults: SearchResult[] = meds
                .filter(med => med.name.toLowerCase().includes(lowerCaseQuery) || med.dosage.toLowerCase().includes(lowerCaseQuery))
                .map(med => ({
                    type: 'Medication',
                    title: med.name,
                    description: med.dosage,
                    href: '#/medications'
                }));

            // Search Appointments
            const appointmentResults: SearchResult[] = appointments
                .filter(apt => apt.doctor.toLowerCase().includes(lowerCaseQuery) || apt.specialty.toLowerCase().includes(lowerCaseQuery))
                .map(apt => ({
                    type: 'Appointment',
                    title: apt.doctor,
                    description: `${apt.specialty} on ${apt.date}`,
                    href: '#/appointments'
                }));

            // Search Records
            const recordResults: SearchResult[] = records
                .filter(rec => rec.title.toLowerCase().includes(lowerCaseQuery) || rec.type.toLowerCase().includes(lowerCaseQuery) || rec.doctor.toLowerCase().includes(lowerCaseQuery))
                .map(rec => ({
                    type: 'Record',
                    title: rec.title,
                    description: `${rec.type} with ${rec.doctor}`,
                    href: '#/records'
                }));

            setResults([...medResults, ...appointmentResults, ...recordResults]);
        }, 300);

        return () => {
            clearTimeout(handler);
        };
    }, [query]);

    // Handle clicks outside to close
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
                setIsActive(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const groupedResults = useMemo(() => {
        // FIX: The `if` condition created a union type for `groupedResults`, causing `Object.entries` to infer `unknown` for values.
        // `reduce` correctly handles an empty array by returning the initial value, so the `if` is not needed.
        return results.reduce((acc, result) => {
            (acc[result.type] = acc[result.type] || []).push(result);
            return acc;
        }, {} as Record<SearchResult['type'], SearchResult[]>);
    }, [results]);

    const handleResultClick = (href: string) => {
        window.location.hash = href;
        setQuery('');
        setResults([]);
        setIsActive(false);
    };

    return (
        <div className="relative w-full max-w-sm" ref={searchRef}>
            <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                     <svg className="h-5 w-5 text-slate-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                    </svg>
                </div>
                <input
                    type="text"
                    placeholder="Search anything..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onFocus={() => setIsActive(true)}
                    className="block w-full pl-10 pr-3 py-2 border border-slate-300 rounded-full leading-5 bg-white placeholder-slate-500 focus:outline-none focus:placeholder-slate-400 focus:ring-1 focus:ring-sky-500 focus:border-sky-500 sm:text-sm shadow-sm"
                />
            </div>
            {isActive && query.length >= 2 && (
                <div className="absolute z-20 mt-2 w-full max-w-xs sm:max-w-md rounded-lg shadow-2xl bg-white border border-slate-200 overflow-hidden right-0">
                    {results.length > 0 ? (
                        <div className="max-h-96 overflow-y-auto">
                            {Object.entries(groupedResults).map(([type, items]) => (
                                <div key={type}>
                                    <h3 className="px-4 py-2 bg-slate-50 text-sm font-semibold text-slate-600 border-b border-t border-slate-200">{type}s</h3>
                                    <ul>
                                        {items.map((item, index) => (
                                            <li key={`${type}-${index}`}>
                                                <button onClick={() => handleResultClick(item.href)} className="w-full text-left px-4 py-3 hover:bg-sky-50 flex items-start gap-4">
                                                    <div className="text-slate-400 mt-1 h-6 w-6 shrink-0">{typeIcons[item.type as SearchResult['type']]}</div>
                                                    <div>
                                                        <p className="text-sm font-medium text-slate-800">{item.title}</p>
                                                        <p className="text-xs text-slate-500">{item.description}</p>
                                                    </div>
                                                </button>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="p-4 text-sm text-slate-500">No results found for "{query}"</p>
                    )}
                </div>
            )}
        </div>
    );
};

export default GlobalSearch;