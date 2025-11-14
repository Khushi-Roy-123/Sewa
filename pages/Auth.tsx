import React, { useState, useEffect } from 'react';
import { useTranslations } from '../lib/i18n';
import { GlobeIcon } from '../components/Icons';

// --- Mock Firebase Authentication ---
// These functions simulate Firebase Auth API calls with a 1-second delay.

const mockSignInWithEmailAndPassword = (email, password) => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (email && password.length >= 6) {
        console.log('Mock sign-in successful for:', email);
        resolve({ user: { uid: 'mock-uid-' + Math.random(), email } });
      } else {
        console.error('Mock sign-in failed.');
        reject(new Error('Invalid credentials'));
      }
    }, 1000);
  });
};

const mockCreateUserWithEmailAndPassword = (email, password) => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (email && password.length >= 6) {
        console.log('Mock user creation successful for:', email);
        resolve({ user: { uid: 'mock-uid-' + Math.random(), email } });
      } else {
        console.error('Mock user creation failed.');
        reject(new Error('Invalid data for user creation'));
      }
    }, 1000);
  });
};

const mockSendPasswordResetEmail = (email) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      console.log('Mock password reset email sent to:', email);
      resolve(true);
    }, 1000);
  });
};


// --- Component ---

interface AuthProps {
    onLoginSuccess: () => void;
}

const InputField = ({ name, type, placeholder, label, value, onChange, error, disabled }) => (
    <div>
        <label htmlFor={name} className="block text-sm font-medium text-slate-700">{label}</label>
        <input
            id={name}
            name={name}
            type={type}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            className={`mt-1 block w-full px-3 py-2 bg-white border ${error ? 'border-red-500' : 'border-slate-300'} rounded-md text-sm shadow-sm placeholder-slate-400 text-slate-900
                focus:outline-none focus:ring-1 ${error ? 'focus:ring-red-500 focus:border-red-500' : 'focus:ring-sky-500 focus:border-sky-500'}`}
            disabled={disabled}
        />
        {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
);

const Auth: React.FC<AuthProps> = ({ onLoginSuccess }) => {
    const [isLoginView, setIsLoginView] = useState(true);
    const [formData, setFormData] = useState({ fullName: '', email: '', password: '', confirmPassword: '' });
    const [errors, setErrors] = useState<Record<string, string | null>>({});
    const [isLoading, setIsLoading] = useState(false);
    const [authMessage, setAuthMessage] = useState<{ type: 'success' | 'error' | 'info', text: string } | null>(null);
    const { t, setLanguage, language } = useTranslations();

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: null }));
        }
    };

    const validate = () => {
        const newErrors: Record<string, string | null> = {};
        if (!formData.email) {
            newErrors.email = t('validation_emailRequired');
        } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
            newErrors.email = t('validation_emailInvalid');
        }
        if (!formData.password) {
            newErrors.password = t('validation_passwordRequired');
        } else if (formData.password.length < 6) {
            newErrors.password = t('validation_passwordLength');
        }
        if (!isLoginView) {
            if (!formData.fullName.trim()) {
                newErrors.fullName = t('validation_nameRequired');
            }
            if (!formData.confirmPassword) {
                newErrors.confirmPassword = t('validation_confirmPasswordRequired');
            } else if (formData.password !== formData.confirmPassword) {
                newErrors.confirmPassword = t('validation_passwordsNoMatch');
            }
        }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setAuthMessage(null);
        if (!validate()) return;
        setIsLoading(true);

        try {
            if (isLoginView) {
                await mockSignInWithEmailAndPassword(formData.email, formData.password);
                setAuthMessage({ type: 'success', text: t('auth_loginSuccess') });
                setTimeout(() => {
                    onLoginSuccess();
                }, 1000);
            } else {
                await mockCreateUserWithEmailAndPassword(formData.email, formData.password);
                setAuthMessage({ type: 'success', text: t('auth_signupSuccess') });
                setIsLoginView(true);
                setFormData({ ...formData, password: '', confirmPassword: '' });
            }
        } catch (error) {
            const message = isLoginView ? t('auth_loginError') : t('auth_signupError');
            setAuthMessage({ type: 'error', text: message });
        } finally {
            setIsLoading(false);
        }
    };

    const toggleView = () => {
        setIsLoginView(!isLoginView);
        setErrors({});
        setAuthMessage(null);
        setFormData({ fullName: '', email: '', password: '', confirmPassword: '' });
    };

    return (
        <div className="min-h-screen bg-slate-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
            <div className="sm:mx-auto sm:w-full sm:max-w-md">
                <div className="flex justify-center items-center">
                    <svg className="h-12 w-auto text-sky-500" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2L2 7v13h20V7L12 2zm0 3.31L17.39 8H6.61L12 5.31zM4 9h16v10H4V9zm4 2v6h2v-6H8zm4 0v6h2v-6h-2z" />
                    </svg>
                    <h2 className="ml-3 text-center text-3xl font-extrabold text-slate-900">
                        Sewa
                    </h2>
                </div>

                <h2 className="mt-6 text-center text-2xl font-bold text-slate-800">
                    {isLoginView ? t('loginToYourAccount') : t('createAnAccount')}
                </h2>
            </div>

            <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
                <div className="bg-white py-8 px-4 shadow-xl rounded-2xl sm:px-10">
                    <form className="space-y-6" onSubmit={handleSubmit}>
                        {!isLoginView && (
                            <InputField
                                label={t('fullName')} name="fullName" type="text"
                                placeholder={t('fullName')}
                                value={formData.fullName} onChange={handleChange}
                                error={errors.fullName} disabled={isLoading}
                            />
                        )}
                        <InputField
                            label={t('emailAddress')} name="email" type="email"
                            placeholder={t('emailAddress')}
                            value={formData.email} onChange={handleChange}
                            error={errors.email} disabled={isLoading}
                        />
                        <InputField
                            label={t('password')} name="password" type="password"
                            placeholder="••••••••"
                            value={formData.password} onChange={handleChange}
                            error={errors.password} disabled={isLoading}
                        />
                        {!isLoginView && (
                            <InputField
                                label={t('confirmPassword')} name="confirmPassword" type="password"
                                placeholder="••••••••"
                                value={formData.confirmPassword} onChange={handleChange}
                                error={errors.confirmPassword} disabled={isLoading}
                            />
                        )}

                        {isLoginView && (
                            <div className="flex items-center justify-between">
                                <div className="flex items-center">
                                    <input id="remember-me" name="remember-me" type="checkbox" className="h-4 w-4 text-sky-600 focus:ring-sky-500 border-slate-300 rounded" />
                                    <label htmlFor="remember-me" className="ml-2 block text-sm text-slate-900">{t('rememberMe')}</label>
                                </div>
                                <div className="text-sm">
                                    <a href="#" className="font-medium text-sky-600 hover:text-sky-500">{t('forgotPassword')}</a>
                                </div>
                            </div>
                        )}

                        <div>
                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-sky-600 hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 disabled:bg-sky-400 disabled:cursor-not-allowed"
                            >
                                {isLoading ? '...' : (isLoginView ? t('login') : t('signup'))}
                            </button>
                        </div>
                    </form>
                    
                    {authMessage && (
                        <div className={`mt-4 p-3 rounded-md text-sm ${authMessage.type === 'success' ? 'bg-green-50 text-green-700' : ''} ${authMessage.type === 'error' ? 'bg-red-50 text-red-700' : ''}`}>
                            {authMessage.text}
                        </div>
                    )}

                    <div className="mt-6">
                        <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-slate-300"></div>
                            </div>
                            <div className="relative flex justify-center text-sm">
                                <span className="px-2 bg-white text-slate-500">
                                    {isLoginView ? t('dontHaveAccount') : t('alreadyHaveAccount')}
                                </span>
                            </div>
                        </div>

                        <div className="mt-6">
                            <button
                                onClick={toggleView}
                                className="w-full flex justify-center py-3 px-4 border border-slate-300 rounded-md shadow-sm bg-white text-sm font-medium text-slate-700 hover:bg-slate-50"
                            >
                                {isLoginView ? t('signup') : t('login')}
                            </button>
                        </div>
                    </div>
                     <div className="mt-6 flex justify-center">
                        <div className="flex items-center space-x-2 text-sm text-slate-600">
                           <GlobeIcon />
                           <span>{t('language')}:</span>
                           <button onClick={() => setLanguage('en')} className={`font-medium ${language === 'en' ? 'text-sky-600' : 'hover:text-sky-500'}`}>EN</button>
                           <span>/</span>
                           <button onClick={() => setLanguage('es')} className={`font-medium ${language === 'es' ? 'text-sky-600' : 'hover:text-sky-500'}`}>ES</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Auth;