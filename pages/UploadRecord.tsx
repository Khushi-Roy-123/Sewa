import React, { useState, useRef, useCallback } from 'react';
import { GoogleGenAI } from "@google/genai";
import { useTranslations } from '../lib/i18n';
import { UploadIcon, CameraIcon } from '../components/Icons';

interface UploadRecordProps {
    onTextExtracted: (text: string) => void;
}

const UploadRecord: React.FC<UploadRecordProps> = ({ onTextExtracted }) => {
    const { t } = useTranslations();
    const [imageSrc, setImageSrc] = useState<string | null>(null);
    const [extractedText, setExtractedText] = useState<string>('');
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [showCamera, setShowCamera] = useState<boolean>(false);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                setImageSrc(e.target?.result as string);
                setExtractedText('');
                setError(null);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleCameraOpen = async () => {
        setShowCamera(true);
        setExtractedText('');
        setError(null);
        setImageSrc(null);
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
            }
        } catch (err) {
            console.error("Error accessing camera:", err);
            setError("Could not access the camera. Please check permissions.");
            setShowCamera(false);
        }
    };

    const handleCapture = () => {
        if (videoRef.current && canvasRef.current) {
            const context = canvasRef.current.getContext('2d');
            if (context) {
                canvasRef.current.width = videoRef.current.videoWidth;
                canvasRef.current.height = videoRef.current.videoHeight;
                context.drawImage(videoRef.current, 0, 0, videoRef.current.videoWidth, videoRef.current.videoHeight);
                const dataUrl = canvasRef.current.toDataURL('image/jpeg');
                setImageSrc(dataUrl);
                handleCameraClose();
            }
        }
    };
    
    const handleCameraClose = useCallback(() => {
        if (videoRef.current && videoRef.current.srcObject) {
            const stream = videoRef.current.srcObject as MediaStream;
            stream.getTracks().forEach(track => track.stop());
            videoRef.current.srcObject = null;
        }
        setShowCamera(false);
    }, []);

    const handleExtractText = async () => {
        if (!imageSrc) return;
        setIsLoading(true);
        setError(null);
        setExtractedText('');

        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
            
            const base64Data = imageSrc.split(',')[1];
            const mimeType = imageSrc.split(';')[0].split(':')[1];

            const imagePart = {
                inlineData: {
                    data: base64Data,
                    mimeType: mimeType,
                },
            };
            const textPart = { text: "Extract all text from this medical report. Ensure the output is clean and readable." };

            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: { parts: [imagePart, textPart] },
            });
            
            setExtractedText(response.text);

        } catch (err) {
            console.error("Error extracting text:", err);
            setError(t('extractionError'));
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="space-y-8 max-w-4xl mx-auto">
            <div>
                <h1 className="text-3xl font-bold text-slate-900">{t('uploadRecordTitle')}</h1>
                <p className="mt-1 text-slate-500">{t('uploadRecordSubtitle')}</p>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-6 md:p-8 space-y-6">
                
                {!showCamera && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className="flex items-center justify-center gap-2 w-full px-4 py-3 border border-slate-300 rounded-md shadow-sm text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 transition-colors"
                        >
                            <UploadIcon />
                            {t('uploadFromFile')}
                        </button>
                        <input type="file" accept="image/*" ref={fileInputRef} onChange={handleFileChange} className="hidden" />

                        <button
                            onClick={handleCameraOpen}
                            className="flex items-center justify-center gap-2 w-full px-4 py-3 border border-slate-300 rounded-md shadow-sm text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 transition-colors"
                        >
                            <CameraIcon />
                            {t('useCamera')}
                        </button>
                    </div>
                )}
                
                {showCamera && (
                    <div className="space-y-4">
                        <video ref={videoRef} autoPlay playsInline className="w-full rounded-lg bg-slate-900"></video>
                        <canvas ref={canvasRef} className="hidden"></canvas>
                        <div className="flex gap-4">
                            <button onClick={handleCapture} className="flex-1 bg-sky-600 text-white font-semibold py-2 px-4 rounded-lg shadow-md hover:bg-sky-700 transition-colors">{t('capture')}</button>
                            <button onClick={handleCameraClose} className="flex-1 bg-slate-200 text-slate-800 font-semibold py-2 px-4 rounded-lg hover:bg-slate-300 transition-colors">{t('closeCamera')}</button>
                        </div>
                    </div>
                )}
                
                {imageSrc && !extractedText && (
                    <div className="space-y-6 pt-6 border-t border-slate-200">
                        <div>
                            <h3 className="text-lg font-medium text-slate-800 mb-2">{t('imagePreview')}</h3>
                            <img src={imageSrc} alt="Medical report preview" className="rounded-lg max-h-96 w-auto mx-auto shadow-md" />
                        </div>
                        <button
                            onClick={handleExtractText}
                            disabled={isLoading}
                            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-sky-600 hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 disabled:bg-sky-300 disabled:cursor-not-allowed"
                        >
                            {isLoading ? t('extractingText') : t('extractText')}
                        </button>
                    </div>
                )}
                
                {isLoading && (
                    <div className="flex justify-center items-center gap-3 text-slate-600">
                        <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span>{t('extractingText')}</span>
                    </div>
                )}

                {error && <p className="text-sm text-red-600 text-center">{error}</p>}
                
                {extractedText && (
                    <div className="space-y-6 pt-6 border-t border-slate-200">
                        <div>
                            <h3 className="text-lg font-medium text-slate-800 mb-2">{t('extractedText')}</h3>
                            <textarea
                                readOnly
                                value={extractedText}
                                rows={15}
                                className="w-full p-3 border border-slate-300 rounded-md bg-slate-50 text-sm text-slate-800"
                            />
                        </div>
                        <button
                            onClick={() => onTextExtracted(extractedText)}
                            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                        >
                            {t('analyzeAndTranslate')}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default UploadRecord;