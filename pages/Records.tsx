import React, { useState, useEffect } from 'react';
import { records } from '../lib/data';
import { PlusIcon } from '../components/Icons';

const Records: React.FC = () => {
    const [searchQuery, setSearchQuery] = useState('');
    const [filteredRecords, setFilteredRecords] = useState(records);

    useEffect(() => {
        const lowercasedQuery = searchQuery.toLowerCase();
        const newFilteredRecords = records.filter(record => 
            record.type.toLowerCase().includes(lowercasedQuery) ||
            record.title.toLowerCase().includes(lowercasedQuery) ||
            record.doctor.toLowerCase().includes(lowercasedQuery)
        );
        setFilteredRecords(newFilteredRecords);
    }, [searchQuery]);

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold text-slate-900">Health Records</h1>
                <button 
                    onClick={() => window.location.hash = '#/upload-record'} 
                    className="flex items-center gap-2 bg-sky-600 text-white font-semibold py-2 px-4 rounded-lg shadow-md hover:bg-sky-700 transition-colors"
                >
                    <PlusIcon />
                    <span>Add New Record</span>
                </button>
            </div>
            
            <div className="mb-4">
                <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <svg className="h-5 w-5 text-slate-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                        </svg>
                    </div>
                    <input
                        type="text"
                        placeholder="Search by type, details, or provider..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="block w-full pl-10 pr-3 py-2 border border-slate-300 rounded-md leading-5 bg-white placeholder-slate-500 focus:outline-none focus:placeholder-slate-400 focus:ring-1 focus:ring-sky-500 focus:border-sky-500 sm:text-sm"
                    />
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="border-b border-slate-200">
                        <tr>
                            <th className="p-4 font-semibold text-sm text-slate-600">Date</th>
                            <th className="p-4 font-semibold text-sm text-slate-600">Record Type</th>
                            <th className="p-4 font-semibold text-sm text-slate-600">Details</th>
                            <th className="p-4 font-semibold text-sm text-slate-600">Provider</th>
                            <th className="p-4 font-semibold text-sm text-slate-600"></th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredRecords.length > 0 ? (
                            filteredRecords.map(record => (
                                <tr key={record.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                                    <td className="p-4 text-slate-600 whitespace-nowrap">{record.date}</td>
                                    <td className="p-4 whitespace-nowrap">
                                        <span className="bg-sky-100 text-sky-800 text-xs font-medium mr-2 px-2.5 py-0.5 rounded-full">{record.type}</span>
                                    </td>
                                    <td className="p-4 font-medium text-slate-800">{record.title}</td>
                                    <td className="p-4 text-slate-600">{record.doctor}</td>
                                    <td className="p-4 text-right">
                                        <a href="#" className="text-sky-600 hover:text-sky-800 font-medium">View</a>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={5} className="text-center p-6 text-slate-500">
                                    No records found.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default Records;