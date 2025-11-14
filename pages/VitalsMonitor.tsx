import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GoogleGenAI } from "@google/genai";
import { useTranslations } from '../lib/i18n';
import { HeartbeatIcon } from '../components/Icons';

// Since Recharts is loaded from a CDN, it will be on the window object.
// We need to tell TypeScript about this global variable.
declare global {
  interface Window {
    Recharts: any;
  }
}

const { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceArea } = window.Recharts || {};


type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

interface Vitals {
    hr: number;
    bp: { systolic: number; diastolic: number };
    spo2: number;
}

interface VitalsWithTimestamp extends Vitals {
    timestamp: string;
}

const MAX_HISTORY_LENGTH = 30; // Keep the last 30 data points

interface ChartInteractionProps {
    zoomDomain: [any, any];
    onMouseDown: (e: any) => void;
    onMouseMove: (e: any) => void;
    onMouseUp: () => void;
    refAreaLeft: string;
    refAreaRight: string;
    showReferenceArea?: boolean;
}


// Chart Component for single-line data
const VitalChart: React.FC<any & ChartInteractionProps> = ({ data, dataKey, name, stroke, domain, zoomDomain, onMouseDown, onMouseMove, onMouseUp, refAreaLeft, refAreaRight, showReferenceArea }) => {
    const tickColor = '#6b7280';
    const gridColor = '#e5e7eb';
    const tooltipBg = 'white';
    const tooltipBorder = '#e5e7eb';

    return (
        <div className="h-64 cursor-crosshair">
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data} margin={{ top: 5, right: 20, left: -10, bottom: 5 }} onMouseDown={onMouseDown} onMouseMove={onMouseMove} onMouseUp={onMouseUp}>
                    <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                    <XAxis dataKey="timestamp" fontSize={12} tick={{ fill: tickColor }} domain={zoomDomain} allowDataOverflow />
                    <YAxis domain={domain} fontSize={12} tick={{ fill: tickColor }} />
                    <Tooltip contentStyle={{ backgroundColor: tooltipBg, border: `1px solid ${tooltipBorder}`, borderRadius: '0.5rem' }} />
                    <Legend />
                    <Area type="monotone" dataKey={dataKey} name={name} stroke={stroke} fill={stroke} fillOpacity={0.2} strokeWidth={2} />
                     {showReferenceArea && refAreaLeft && refAreaRight ? (
                        <ReferenceArea x1={refAreaLeft} x2={refAreaRight} strokeOpacity={0.3} fill="gray" fillOpacity={0.2} />
                    ) : null}
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
};

// Chart Component specifically for Blood Pressure (two lines)
const BloodPressureChart: React.FC<any & ChartInteractionProps> = ({ data, zoomDomain, onMouseDown, onMouseMove, onMouseUp, refAreaLeft, refAreaRight }) => {
    const tickColor = '#6b7280';
    const gridColor = '#e5e7eb';
    const tooltipBg = 'white';
    const tooltipBorder = '#e5e7eb';

    return (
        <div className="h-64 cursor-crosshair">
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data} margin={{ top: 5, right: 20, left: -10, bottom: 5 }} onMouseDown={onMouseDown} onMouseMove={onMouseMove} onMouseUp={onMouseUp}>
                    <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                    <XAxis dataKey="timestamp" fontSize={12} tick={{ fill: tickColor }} domain={zoomDomain} allowDataOverflow />
                    <YAxis domain={[40, 200]} fontSize={12} tick={{ fill: tickColor }} />
                    <Tooltip contentStyle={{ backgroundColor: tooltipBg, border: `1px solid ${tooltipBorder}`, borderRadius: '0.5rem' }} />
                    <Legend />
                    <Area type="monotone" dataKey="bp.systolic" name="Systolic" stroke="#ef4444" fill="#ef4444" fillOpacity={0.2} strokeWidth={2} />
                    <Area type="monotone" dataKey="bp.diastolic" name="Diastolic" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.2} strokeWidth={2} />
                     {refAreaLeft && refAreaRight ? (
                        <ReferenceArea x1={refAreaLeft} x2={refAreaRight} strokeOpacity={0.3} fill="gray" fillOpacity={0.2} />
                    ) : null}
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
};


const VitalsMonitor: React.FC = () => {
    const { t } = useTranslations();
    const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
    const [vitals, setVitals] = useState<Vitals>({ hr: 0, bp: { systolic: 0, diastolic: 0 }, spo2: 0 });
    const [vitalsHistory, setVitalsHistory] = useState<VitalsWithTimestamp[]>([]);
    const [isSendingAlert, setIsSendingAlert] = useState(false);
    const [alertMessage, setAlertMessage] = useState<string | null>(null);

    // State for chart zooming
    const [zoomDomain, setZoomDomain] = useState<[any, any]>(['dataMin', 'dataMax']);
    const [refAreaLeft, setRefAreaLeft] = useState<string>('');
    const [refAreaRight, setRefAreaRight] = useState<string>('');

    const monitorIntervalRef = useRef<number | null>(null);
    const autoAlertSentRef = useRef(false);

    const handleZoom = useCallback(() => {
        if (refAreaLeft && refAreaRight) {
            const leftIndex = vitalsHistory.findIndex(d => d.timestamp === refAreaLeft);
            const rightIndex = vitalsHistory.findIndex(d => d.timestamp === refAreaRight);
            
            if (leftIndex !== -1 && rightIndex !== -1) {
                const [from, to] = [Math.min(leftIndex, rightIndex), Math.max(leftIndex, rightIndex)];
                if (from !== to) {
                    const newDomain: [string, string] = [vitalsHistory[from].timestamp, vitalsHistory[to].timestamp];
                    setZoomDomain(newDomain);
                }
            }
        }
        setRefAreaLeft('');
        setRefAreaRight('');
    }, [refAreaLeft, refAreaRight, vitalsHistory]);

    const resetZoom = useCallback(() => {
        setZoomDomain(['dataMin', 'dataMax']);
    }, []);


    const isCritical = (v: Vitals) => {
        if (v.hr === 0 && v.spo2 === 0) return false;
        return v.hr < 50 || v.hr > 130 || v.bp.systolic > 180 || v.bp.diastolic > 120 || v.spo2 < 90;
    };

    const getVitalCardClass = (value: number, min: number, max: number) => {
        if (value === 0) return 'border-slate-300';
        if (value < min || value > max) return 'border-red-500 bg-red-50 animate-pulse';
        return 'border-green-500';
    };
    
    const generateAndSendAlert = useCallback(async (currentVitals: Vitals, isManual: boolean) => {
        if (isSendingAlert) return;
        setIsSendingAlert(true);
        if (isManual) { 
             setAlertMessage(null);
        }

        // --- Show a system notification ---
        const notificationTitle = 'Critical Vitals Alert';
        let notificationBody = 'One or more vitals are critical. Tap to view.';
        if (currentVitals.hr < 50 || currentVitals.hr > 130) {
            notificationBody = `Critical Heart Rate: ${currentVitals.hr} BPM.`;
        } else if (currentVitals.spo2 < 90) {
            notificationBody = `Low Oxygen Saturation: ${currentVitals.spo2}%.`;
        } else if (currentVitals.bp.systolic > 180 || currentVitals.bp.diastolic > 120) {
            notificationBody = `High Blood Pressure: ${currentVitals.bp.systolic}/${currentVitals.bp.diastolic} mmHg.`;
        }
        
        if ('serviceWorker' in navigator && 'Notification' in window && Notification.permission === 'granted') {
            navigator.serviceWorker.ready.then(registration => {
                registration.showNotification(notificationTitle, {
                    body: notificationBody,
                    icon: '/heart-alert.png',
                    tag: 'vitals-alert',
                    // The `renotify` property is valid but may not exist in older TS DOM typings.
                    // @ts-ignore
                    renotify: true, // Vibrate/play sound on subsequent notifications with the same tag
                    data: { url: '#/vitals' }
                });
            });
        }
        // --- End notification logic ---

        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
            const vitalsString = `Heart Rate: ${currentVitals.hr} BPM, Blood Pressure: ${currentVitals.bp.systolic}/${currentVitals.bp.diastolic} mmHg, SpO2: ${currentVitals.spo2}%`;
            const manualTriggerText = isManual ? "I am manually triggering an emergency alert." : "My vital signs have reached a critical level:";
            const prompt = `Act as an emergency alert system. My name is Alex. ${manualTriggerText} ${vitalsString}. Please compose a brief, urgent SMS message to my emergency contact, Jane Doe, informing her of the situation and that she needs to check on me immediately. Include the critical readings.`;
            
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
            });

            setAlertMessage(response.text);
            if (!isManual) {
                autoAlertSentRef.current = true;
            }
        } catch (error) {
            console.error("Error generating alert:", error);
            setAlertMessage(t('alertGenerationError'));
        } finally {
            setIsSendingAlert(false);
        }
    }, [t, isSendingAlert]);


    useEffect(() => {
        if (connectionStatus === 'connected') {
            monitorIntervalRef.current = window.setInterval(() => {
                const newVitals = {
                    hr: Math.floor(Math.random() * (140 - 45 + 1)) + 45,
                    bp: { systolic: Math.floor(Math.random() * (190 - 85 + 1)) + 85, diastolic: Math.floor(Math.random() * (130 - 55 + 1)) + 55 },
                    spo2: Math.floor(Math.random() * (100 - 88 + 1)) + 88,
                };
                setVitals(newVitals);

                 const newHistoryEntry: VitalsWithTimestamp = {
                    ...newVitals,
                    timestamp: new Date().toLocaleTimeString([], { minute: '2-digit', second: '2-digit' }),
                };

                setVitalsHistory(prevHistory => {
                    const updatedHistory = [...prevHistory, newHistoryEntry];
                    return updatedHistory.length > MAX_HISTORY_LENGTH
                        ? updatedHistory.slice(updatedHistory.length - MAX_HISTORY_LENGTH)
                        : updatedHistory;
                });

            }, 2000);
        } else if (monitorIntervalRef.current) {
            clearInterval(monitorIntervalRef.current);
            monitorIntervalRef.current = null;
        }
        
        return () => {
            if (monitorIntervalRef.current) {
                clearInterval(monitorIntervalRef.current);
            }
        };
    }, [connectionStatus]);

    useEffect(() => {
        if (connectionStatus === 'connected' && isCritical(vitals) && !autoAlertSentRef.current && !isSendingAlert) {
            generateAndSendAlert(vitals, false);
        }
    }, [vitals, connectionStatus, isSendingAlert, generateAndSendAlert]);


    const handleConnect = () => {
        setConnectionStatus('connecting');
        setAlertMessage(null);
        autoAlertSentRef.current = false;
        setVitals({ hr: 0, bp: { systolic: 0, diastolic: 0 }, spo2: 0 });
        setVitalsHistory([]);
        resetZoom();
        setTimeout(() => {
            setConnectionStatus('connected');
        }, 2500);
    };
    
    const handleDisconnect = () => {
        setConnectionStatus('disconnected');
    };
    
    const statusMap = {
        disconnected: { text: t('statusDisconnected'), color: 'bg-slate-500' },
        connecting: { text: t('statusConnecting'), color: 'bg-yellow-500' },
        connected: { text: t('statusConnected'), color: 'bg-green-500' },
        error: { text: t('statusError'), color: 'bg-red-500' },
    };

    const chartInteractionProps = {
        zoomDomain,
        refAreaLeft,
        refAreaRight,
        onMouseDown: (e: any) => e && setRefAreaLeft(e.activeLabel),
        onMouseMove: (e: any) => e && refAreaLeft && setRefAreaRight(e.activeLabel),
        onMouseUp: handleZoom,
    };

    return (
        <div className="space-y-8 max-w-4xl mx-auto">
            <div>
                <h1 className="text-3xl font-bold text-slate-900">{t('vitalsTitle')}</h1>
                <p className="mt-1 text-slate-500">{t('vitalsSubtitle')}</p>
            </div>
            
            <div className="bg-white rounded-xl shadow-lg p-6 md:p-8">
                <div className="flex justify-between items-center mb-6 pb-6 border-b border-slate-200">
                    <div className="flex items-center gap-3">
                        <span className="font-semibold text-slate-700">{t('status')}:</span>
                         <span className={`flex items-center gap-2 text-sm font-medium text-white px-3 py-1 rounded-full ${statusMap[connectionStatus].color}`}>
                            {connectionStatus === 'connecting' && <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>}
                            {statusMap[connectionStatus].text}
                        </span>
                    </div>
                     {connectionStatus === 'disconnected' ? (
                        <button onClick={handleConnect} className="bg-sky-600 text-white font-semibold py-2 px-4 rounded-lg shadow-md hover:bg-sky-700 transition-colors">{t('connectDevice')}</button>
                    ) : (
                        <button onClick={handleDisconnect} className="bg-slate-600 text-white font-semibold py-2 px-4 rounded-lg shadow-md hover:bg-slate-700 transition-colors">{t('disconnectDevice')}</button>
                    )}
                </div>

                {connectionStatus === 'connected' ? (
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
                            <div className={`p-4 rounded-lg border-2 ${getVitalCardClass(vitals.hr, 50, 130)}`}>
                                <p className="text-sm font-medium text-slate-500">{t('heartRate')}</p>
                                <p className="text-4xl font-bold text-slate-800">{vitals.hr}</p>
                                <p className="text-sm text-slate-400">{t('bpm')}</p>
                            </div>
                            <div className={`p-4 rounded-lg border-2 ${getVitalCardClass(vitals.bp.systolic, 0, 180)}`}>
                                <p className="text-sm font-medium text-slate-500">{t('bloodPressure')}</p>
                                <p className="text-4xl font-bold text-slate-800">{vitals.bp.systolic}/{vitals.bp.diastolic}</p>
                                <p className="text-sm text-slate-400">mmHg</p>
                            </div>
                             <div className={`p-4 rounded-lg border-2 ${getVitalCardClass(vitals.spo2, 90, 101)}`}>
                                <p className="text-sm font-medium text-slate-500">{t('oxygenSaturation')}</p>
                                <p className="text-4xl font-bold text-slate-800">{vitals.spo2}%</p>
                                <p className="text-sm text-slate-400">&nbsp;</p>
                            </div>
                        </div>
                        
                        <div className="pt-6 border-t border-slate-200">
                           {!alertMessage ? (
                                <button
                                    onClick={() => generateAndSendAlert(vitals, true)}
                                    disabled={isSendingAlert}
                                    className="w-full flex justify-center items-center gap-3 py-4 px-4 border border-transparent rounded-md shadow-lg text-lg font-bold text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:bg-red-400 disabled:cursor-not-allowed"
                                >
                                    {isSendingAlert ? t('sendingAlert') : t('sendEmergencyAlert')}
                                </button>
                           ) : (
                               <div className="text-center p-4 rounded-lg bg-green-100 border border-green-300">
                                   <h3 className="text-lg font-bold text-green-800">{t('alertSent')}</h3>
                                   <p className="text-sm font-medium text-slate-700 mt-4 mb-2">{t('emergencyMessagePreview')}</p>
                                   <p className="text-sm text-slate-600 bg-white p-3 rounded-md shadow-sm whitespace-pre-wrap">{alertMessage}</p>
                               </div>
                           )}
                        </div>
                    </div>
                ) : (
                     <div className="text-center py-10 text-slate-500">
                        <HeartbeatIcon />
                        <p className="mt-2">{connectionStatus === 'disconnected' ? 'Please connect to a device.' : 'Initializing connection...'}</p>
                    </div>
                )}
            </div>

            {connectionStatus === 'connected' && vitalsHistory.length > 1 && AreaChart && (
                <div className="space-y-8">
                    <div className="flex justify-between items-center">
                        <h2 className="text-2xl font-bold text-slate-900">Vitals History</h2>
                        {zoomDomain[0] !== 'dataMin' && (
                            <button onClick={resetZoom} className="bg-slate-200 text-slate-800 font-semibold py-1 px-3 rounded-lg text-sm hover:bg-slate-300 transition-colors">
                                {t('resetZoom')}
                            </button>
                        )}
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <div className="bg-white rounded-xl shadow-lg p-4">
                            <h3 className="font-semibold text-slate-700 mb-2">Heart Rate (BPM)</h3>
                            <VitalChart data={vitalsHistory} dataKey="hr" name="Heart Rate" stroke="#f43f5e" domain={[40, 150]} {...chartInteractionProps} showReferenceArea />
                        </div>
                        <div className="bg-white rounded-xl shadow-lg p-4">
                            <h3 className="font-semibold text-slate-700 mb-2">{t('bloodPressure')} (mmHg)</h3>
                            <BloodPressureChart data={vitalsHistory} {...chartInteractionProps} />
                        </div>
                        <div className="bg-white rounded-xl shadow-lg p-4 lg:col-span-2">
                             <h3 className="font-semibold text-slate-700 mb-2">{t('oxygenSaturation')} (SpO2 %)</h3>
                            <VitalChart data={vitalsHistory} dataKey="spo2" name="SpO2 %" stroke="#10b981" domain={[85, 100]} {...chartInteractionProps} />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default VitalsMonitor;