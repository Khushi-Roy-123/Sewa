import React, { useState, useEffect } from 'react';
import { useTranslations } from '../lib/i18n';
import { TrashIcon, XIcon } from '../components/Icons';

interface Medication {
    id: string;
    name: string;
    dosage: string;
    status: 'Active' | 'Inactive';
    reminderTimes: string[];
    days: string[];
}

const WEEK_DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const Medications: React.FC = () => {
    const { t } = useTranslations();
    const [meds, setMeds] = useState<Medication[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingMed, setEditingMed] = useState<Medication | null>(null);
    const [notificationPermission, setNotificationPermission] = useState(Notification.permission);

    useEffect(() => {
        try {
            const storedMeds = localStorage.getItem('medications');
            if (storedMeds) {
                setMeds(JSON.parse(storedMeds));
            }
        } catch (error) {
            console.error("Failed to parse medications from localStorage", error);
        }

        const interval = setInterval(() => {
            if (Notification.permission !== notificationPermission) {
                setNotificationPermission(Notification.permission);
            }
        }, 1000);
        return () => clearInterval(interval);
    }, [notificationPermission]);

    // Effect for handling medication reminder notifications
    useEffect(() => {
        if (notificationPermission !== 'granted' || meds.length === 0) {
            return;
        }

        const checkReminders = () => {
            const now = new Date();
            const currentDay = now.toLocaleString('en-US', { weekday: 'long' });
            const currentTime = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });

            meds.forEach((med) => {
                if (med.status === 'Active' && med.days.includes(currentDay) && med.reminderTimes.includes(currentTime)) {
                    const lastNotified = localStorage.getItem(`notified_${med.id}_${currentTime}`);
                    if (!lastNotified || (now.getTime() - parseInt(lastNotified, 10)) > 60000) {
                        if ('serviceWorker' in navigator) {
                            navigator.serviceWorker.ready.then(registration => {
                                registration.showNotification(`Time for your medication: ${med.name}`, {
                                    body: `Take ${med.dosage}. Tap to view your medications.`,
                                    icon: '/pills.png',
                                    tag: `med-${med.id}-${currentTime}`,
                                    data: { url: '#/medications' }
                                });
                                localStorage.setItem(`notified_${med.id}_${currentTime}`, now.getTime().toString());
                            });
                        }
                    }
                }
            });
        };
        
        // Check immediately and then every minute
        checkReminders();
        const intervalId = setInterval(checkReminders, 60000);

        return () => clearInterval(intervalId);

    }, [meds, notificationPermission]);


    const saveMeds = (newMeds: Medication[]) => {
        setMeds(newMeds);
        localStorage.setItem('medications', JSON.stringify(newMeds));
    };

    const openModal = (med: Medication | null = null) => {
        setEditingMed(med);
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setEditingMed(null);
        setIsModalOpen(false);
    };

    const handleSave = (med: Medication) => {
        let updatedMeds;
        if (med.id) {
            updatedMeds = meds.map(m => m.id === med.id ? med : m);
        } else {
            updatedMeds = [...meds, { ...med, id: new Date().toISOString() }];
        }
        saveMeds(updatedMeds);
        closeModal();
    };

    const handleDelete = (medId: string) => {
        if (window.confirm('Are you sure you want to delete this medication?')) {
            const updatedMeds = meds.filter(m => m.id !== medId);
            saveMeds(updatedMeds);
        }
    };

    const requestNotificationPermission = async () => {
        if ('Notification' in window) {
            const permission = await Notification.requestPermission();
            setNotificationPermission(permission);
        }
    };

    const renderPermissionBanner = () => {
        switch (notificationPermission) {
            case 'granted':
                return (
                    <div className="bg-green-100 border-l-4 border-green-500 text-green-700 p-4 rounded-md shadow" role="alert">
                        <p className="font-bold">{t('notificationsEnabled')}</p>
                        <p>{t('notificationsEnabledDesc')}</p>
                    </div>
                );
            case 'denied':
                return (
                     <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-md shadow" role="alert">
                        <p className="font-bold">{t('notificationsBlocked')}</p>
                        <p>{t('notificationsBlockedDesc')}</p>
                    </div>
                );
            case 'default':
                return (
                    <div className="bg-sky-100 border-l-4 border-sky-500 text-sky-700 p-4 rounded-md shadow" role="alert">
                        <p className="font-bold">{t('getMedicationReminders')}</p>
                        <p className="mb-2">{t('getMedicationRemindersDesc')}</p>
                        <button onClick={requestNotificationPermission} className="bg-sky-600 text-white font-semibold py-1 px-3 rounded-lg text-sm hover:bg-sky-700 transition-colors">
                            {t('enableNotifications')}
                        </button>
                    </div>
                );
        }
         return null;
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold text-slate-900">{t('medications')}</h1>
                <button onClick={() => openModal()} className="bg-sky-600 text-white font-semibold py-2 px-4 rounded-lg shadow-md hover:bg-sky-700 transition-colors">
                    + {t('addMedication')}
                </button>
            </div>

            {renderPermissionBanner()}

            {meds.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {meds.map(med => (
                        <div key={med.id} onClick={() => openModal(med)} className={`bg-white rounded-xl shadow-lg p-6 border-l-4 cursor-pointer hover:shadow-xl hover:-translate-y-1 transition-all duration-200 ${med.status === 'Active' ? 'border-green-500' : 'border-slate-300'}`}>
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-lg font-bold text-slate-800">{med.name}</p>
                                    <p className="text-sm text-slate-500">{med.dosage}</p>
                                </div>
                                <span className={`text-xs font-semibold uppercase px-2 py-1 rounded-full ${med.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-600'}`}>
                                    {med.status}
                                </span>
                            </div>
                            <div className="mt-4 pt-4 border-t border-slate-200">
                                <p className="text-sm text-slate-600"><strong>Reminders:</strong> {med.reminderTimes.join(', ') || 'None'}</p>
                                <p className="text-sm text-slate-600"><strong>Days:</strong> {med.days.length === 7 ? 'Every day' : med.days.join(', ')}</p>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="text-center py-10 bg-white rounded-xl shadow-lg">
                    <p className="text-slate-500">No medications added yet.</p>
                    <button onClick={() => openModal()} className="mt-4 text-sky-600 font-semibold hover:underline">
                        Add your first medication
                    </button>
                </div>
            )}
            
            {isModalOpen && <MedicationModal med={editingMed} onSave={handleSave} onClose={closeModal} onDelete={handleDelete} />}
        </div>
    );
};

const MedicationModal: React.FC<{ med: Medication | null; onSave: (med: Medication) => void; onClose: () => void; onDelete: (id: string) => void }> = ({ med, onSave, onClose, onDelete }) => {
    const { t } = useTranslations();
    const [formData, setFormData] = useState<Omit<Medication, 'id'> & { id?: string }>(med || {
        name: '',
        dosage: '',
        status: 'Active',
        reminderTimes: [],
        days: WEEK_DAYS
    });
    const [newTime, setNewTime] = useState('');

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleDayToggle = (day: string) => {
        const days = formData.days.includes(day) ? formData.days.filter(d => d !== day) : [...formData.days, day];
        setFormData({ ...formData, days });
    };
    
    const handleTimeAdd = () => {
        if (newTime && !formData.reminderTimes.includes(newTime)) {
            setFormData({ ...formData, reminderTimes: [...formData.reminderTimes, newTime].sort() });
            setNewTime('');
        }
    };
    
    const handleTimeRemove = (time: string) => {
        setFormData({ ...formData, reminderTimes: formData.reminderTimes.filter(t => t !== time) });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(formData as Medication);
    };

    // FIX: Replaced custom `.input-style` with standard Tailwind classes for consistency and to fix the `style jsx` error.
    const inputClasses = "block px-3 py-2 bg-white border border-slate-300 rounded-md text-sm shadow-sm placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-sky-500 focus:border-sky-500";

    return (
         <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-full overflow-y-auto">
                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    <div className="flex justify-between items-center">
                        <h2 className="text-2xl font-bold text-slate-800">{med ? t('editMedication') : t('addMedication')}</h2>
                        <button type="button" onClick={onClose}><XIcon /></button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700">{t('medicationName')}</label>
                            <input type="text" name="name" value={formData.name} onChange={handleChange} required className={`mt-1 w-full ${inputClasses}`} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700">{t('dosage')}</label>
                            <input type="text" name="dosage" value={formData.dosage} onChange={handleChange} placeholder="e.g., 10mg" className={`mt-1 w-full ${inputClasses}`} />
                        </div>
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium text-slate-700">{t('status')}</label>
                        <select name="status" value={formData.status} onChange={handleChange} className={`mt-1 w-full ${inputClasses}`}>
                            <option value="Active">{t('active')}</option>
                            <option value="Inactive">{t('inactive')}</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700">{t('reminderTimes')}</label>
                         <div className="flex items-center gap-2 mt-1">
                            <input type="time" value={newTime} onChange={e => setNewTime(e.target.value)} className={`${inputClasses} flex-grow`} />
                            <button type="button" onClick={handleTimeAdd} className="bg-sky-100 text-sky-700 font-semibold py-2 px-4 rounded-lg text-sm hover:bg-sky-200 transition-colors">{t('addTime')}</button>
                        </div>
                        <div className="flex flex-wrap gap-2 mt-2">
                           {formData.reminderTimes.map(time => (
                               <span key={time} className="flex items-center gap-2 bg-slate-100 text-slate-700 text-sm font-medium px-2 py-1 rounded-full">
                                   {time}
                                   <button type="button" onClick={() => handleTimeRemove(time)} className="text-slate-500 hover:text-slate-800">&times;</button>
                               </span>
                           ))}
                        </div>
                    </div>
                    
                    <div>
                         <label className="block text-sm font-medium text-slate-700 mb-2">{t('daysOfWeek')}</label>
                         <div className="flex flex-wrap gap-2">
                             {WEEK_DAYS.map(day => (
                                 <button
                                     key={day}
                                     type="button"
                                     onClick={() => handleDayToggle(day)}
                                     className={`px-3 py-1 text-sm rounded-full border transition-colors ${formData.days.includes(day) ? 'bg-sky-600 text-white border-sky-600' : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'}`}
                                 >
                                    {day.substring(0, 3)}
                                 </button>
                             ))}
                         </div>
                    </div>

                    <div className="pt-6 border-t border-slate-200 flex justify-between items-center">
                       <div>
                           {med && (
                               <button type="button" onClick={() => { onDelete(med.id); onClose(); }} className="text-red-600 hover:text-red-800 font-semibold flex items-center gap-2">
                                   <TrashIcon /> {t('delete')}
                               </button>
                           )}
                       </div>
                        <div className="flex gap-2">
                            <button type="button" onClick={onClose} className="bg-slate-100 text-slate-700 font-semibold py-2 px-4 rounded-lg hover:bg-slate-200 transition-colors">{t('cancel')}</button>
                            <button type="submit" className="bg-sky-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-sky-700 transition-colors">{t('save')}</button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default Medications;