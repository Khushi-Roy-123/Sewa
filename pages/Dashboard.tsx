import React, { useState, useEffect } from 'react';
import { CalendarIcon, PillIcon, StethoscopeIcon, UploadIcon, HeartbeatIcon } from '../components/Icons';
import { useTranslations } from '../lib/i18n';

interface InfoCardProps {
    title: string;
    value: string;
    details: string;
    icon: React.ReactNode;
    color: string;
}

const InfoCard: React.FC<InfoCardProps> = ({ title, value, details, icon, color }) => (
    <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 flex items-center sm:items-start space-x-4">
        <div className={`rounded-full p-3 ${color}`}>
            {icon}
        </div>
        <div>
            <p className="text-sm font-medium text-slate-500">{title}</p>
            <p className="text-xl sm:text-2xl font-bold text-slate-800">{value}</p>
            <p className="text-sm text-slate-400">{details}</p>
        </div>
    </div>
);

interface QuickActionCardProps {
    href: string;
    icon: React.ReactNode;
    title: string;
    description: string;
    color: string;
}

const QuickActionCard: React.FC<QuickActionCardProps> = ({ href, icon, title, description, color }) => {
    const navigate = () => {
        window.location.hash = href;
    };

    return (
        <button
            onClick={navigate}
            className="bg-white rounded-xl shadow-lg p-4 sm:p-6 group hover:shadow-xl hover:-translate-y-1 transition-all duration-300 text-left w-full"
        >
            <div className="flex items-start space-x-4">
                <div className={`rounded-full p-3 ${color}`}>
                    {icon}
                </div>
                <div>
                    <h3 className="text-lg font-bold text-slate-800 group-hover:text-sky-600 transition-colors">{title}</h3>
                    <p className="text-sm text-slate-500 mt-1">{description}</p>
                </div>
            </div>
        </button>
    );
};


const Dashboard: React.FC = () => {
    const { t } = useTranslations();
    const [nextMed, setNextMed] = useState<{ name: string; dosage: string; time: string } | null | 'loading'>('loading');

    useEffect(() => {
        try {
            const storedMeds = localStorage.getItem('medications');
            if (!storedMeds) {
                setNextMed(null);
                return;
            }

            const meds = JSON.parse(storedMeds);
            if (!meds || meds.length === 0) {
                setNextMed(null);
                return;
            }
            
            const now = new Date();
            let upcomingDoses: { name: string; dosage: string; time: string; dateTime: Date }[] = [];

            meds.forEach((med: any) => {
                if (med.status === 'Active' && med.reminderTimes) {
                    med.reminderTimes.forEach((time: string) => {
                        const [hours, minutes] = time.split(':').map(Number);
                        const doseTime = new Date(now);
                        doseTime.setHours(hours, minutes, 0, 0);

                        if (doseTime > now) {
                            upcomingDoses.push({
                                name: med.name,
                                dosage: med.dosage,
                                time: doseTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                                dateTime: doseTime,
                            });
                        }
                    });
                }
            });

            if (upcomingDoses.length > 0) {
                upcomingDoses.sort((a, b) => a.dateTime.getTime() - b.dateTime.getTime());
                setNextMed(upcomingDoses[0]);
            } else {
                setNextMed(null); // No more doses for today
            }

        } catch (error) {
            console.error("Failed to parse medications from localStorage", error);
            setNextMed(null);
        }
    }, []);

    const renderNextMedication = () => {
        if (nextMed === 'loading') {
            return { value: t('checkingMedications'), details: '...' };
        }
        if (nextMed) {
            return { value: `${nextMed.name} ${nextMed.dosage}`, details: t('dueAtTime', { time: nextMed.time }) };
        }
        const storedMeds = localStorage.getItem('medications');
        if (!storedMeds || JSON.parse(storedMeds).length === 0) {
            return { value: t('addMedicationPrompt'), details: '' };
        }
        return { value: t('noMedicationsToday'), details: '' };
    };

    const nextMedicationInfo = renderNextMedication();

    const quickActions = [
        { href: '#/symptoms', title: t('symptomCheckerActionTitle'), description: t('symptomCheckerActionDesc'), icon: <StethoscopeIcon />, color: 'bg-sky-100 text-sky-600' },
        { href: '#/upload-record', title: t('uploadRecordActionTitle'), description: t('uploadRecordActionDesc'), icon: <UploadIcon />, color: 'bg-indigo-100 text-indigo-600' },
        { href: '#/vitals', title: t('monitorVitalsActionTitle'), description: t('monitorVitalsActionDesc'), icon: <HeartbeatIcon />, color: 'bg-rose-100 text-rose-600' },
    ];

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">{t('welcomeBack', { name: 'Alex' })}</h1>
                <p className="mt-1 text-slate-500">{t('healthSummaryToday')}</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <InfoCard 
                    title={t('upcomingAppointment')}
                    value="Dr. Emily Carter"
                    details={t('appointmentTomorrow')}
                    icon={<CalendarIcon />}
                    color="bg-sky-100 text-sky-600"
                />
                <InfoCard 
                    title={t('nextMedication')}
                    value={nextMedicationInfo.value}
                    details={nextMedicationInfo.details}
                    icon={<PillIcon />}
                    color="bg-green-100 text-green-600"
                />
            </div>
            
            <div>
                <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mb-4">{t('quickActions')}</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {quickActions.map(action => <QuickActionCard key={action.href} {...action} />)}
                </div>
            </div>
        </div>
    );
};

export default Dashboard;