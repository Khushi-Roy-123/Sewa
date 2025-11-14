import React from 'react';
import { appointments } from '../lib/data';

const Appointments: React.FC = () => {
    const getStatusClass = (status: string) => {
        switch (status) {
            case 'Upcoming': return 'bg-sky-100 text-sky-800';
            case 'Completed': return 'bg-slate-100 text-slate-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold text-slate-900">Appointments</h1>
                <button className="bg-sky-600 text-white font-semibold py-2 px-4 rounded-lg shadow-md hover:bg-sky-700 transition-colors">
                    + New Appointment
                </button>
            </div>

            <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                <ul className="divide-y divide-slate-200">
                    {appointments.map(apt => (
                        <li key={apt.id} className="p-4 sm:p-6 hover:bg-slate-50">
                            <div className="flex flex-col sm:flex-row items-start sm:items-center sm:justify-between">
                                <div className="mb-4 sm:mb-0">
                                    <p className="text-lg font-semibold text-slate-800">{apt.doctor}</p>
                                    <p className="text-sm text-slate-500">{apt.specialty}</p>
                                </div>
                                <div className="flex flex-col sm:flex-row items-start sm:items-center sm:space-x-4 w-full sm:w-auto">
                                    <p className="text-slate-600 sm:text-right">{apt.date} at {apt.time}</p>
                                    <span className={`inline-flex items-center px-3 py-0.5 rounded-full text-sm font-medium ${getStatusClass(apt.status)} mt-2 sm:mt-0`}>
                                        {apt.status}
                                    </span>
                                </div>
                            </div>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
};

export default Appointments;
