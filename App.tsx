
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Language } from './types';
import type { LanguagePair } from './types';
import { translateText } from './services/geminiService';
import { useSpeechRecognition, useSpeechSynthesis } from './hooks/useSpeech';
import { Icon, MIC_ICON_PATH, SPEAKER_ICON_PATH, SWAP_ICON_PATH, COPY_ICON_PATH } from './components/Icons';

const languageNames: { [key in Language]: string } = {
  [Language.ES]: 'Español',
  [Language.PT]: 'Portugués',
};

const LanguageSelector: React.FC<{ languages: LanguagePair; onSwap: () => void; }> = ({ languages, onSwap }) => (
    <div className="flex items-center justify-center gap-2 md:gap-4 my-6">
      <span className="text-lg font-semibold text-slate-700 w-28 text-center">{languageNames[languages.source]}</span>
      <button
        onClick={onSwap}
        className="p-3 rounded-full bg-slate-200 hover:bg-sky-500 text-slate-600 hover:text-white transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-sky-500"
        aria-label="Swap languages"
      >
        <Icon path={SWAP_ICON_PATH} className="w-5 h-5" />
      </button>
      <span className="text-lg font-semibold text-slate-700 w-28 text-center">{languageNames[languages.target]}</span>
    </div>
);

interface TranslationCardProps {
    language: Language;
    text: string;
    onTextChange?: (text: string) => void;
    placeholder: string;
    isLoading?: boolean;
    onSpeak?: () => void;
    isSpeaking?: boolean;
    isSourceCard?: boolean;
}

const TranslationCard: React.FC<TranslationCardProps> = ({
    language,
    text,
    onTextChange,
    placeholder,
    isLoading = false,
    onSpeak,
    isSpeaking,
    isSourceCard = false,
}) => {
    const [copied, setCopied] = useState(false);
    
    const handleCopy = () => {
        if (!text) return;
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="flex-1 w-full bg-white rounded-2xl p-6 relative flex flex-col min-h-[250px] md:min-h-[300px] shadow-sm">
            <div className="flex justify-between items-center mb-4">
                <span className="font-bold text-sky-600">{languageNames[language]}</span>
                {onSpeak && text && !isLoading && (
                    <button
                        onClick={onSpeak}
                        disabled={isSpeaking}
                        className="p-2 rounded-full hover:bg-slate-100 disabled:opacity-50 transition-colors"
                        aria-label="Speak translation"
                    >
                        <Icon path={SPEAKER_ICON_PATH} className={`w-6 h-6 ${isSpeaking ? 'text-sky-500 animate-pulse' : 'text-slate-500'}`} />
                    </button>
                )}
            </div>
            
            {isSourceCard ? (
                <textarea
                    value={text}
                    onChange={(e) => onTextChange?.(e.target.value)}
                    placeholder={placeholder}
                    className="flex-grow w-full bg-transparent text-slate-800 text-xl resize-none focus:outline-none placeholder-slate-400"
                />
            ) : (
                <div className="flex-grow w-full text-slate-800 text-xl overflow-y-auto">
                    {isLoading ? <div className="animate-pulse text-slate-500">Traduciendo...</div> : text}
                </div>
            )}
            
            <div className="flex justify-end mt-4">
                <button
                    onClick={handleCopy}
                    disabled={!text || isLoading}
                    className="p-2 rounded-full hover:bg-slate-100 disabled:opacity-50 transition-colors"
                    aria-label="Copy text"
                >
                    {copied ? (
                        <Icon path={COPY_ICON_PATH} className="w-6 h-6 text-green-500" />
                    ) : (
                        <Icon path={"M15.75 2.25H8.25a3 3 0 00-3 3v9a3 3 0 003 3h7.5a3 3 0 003-3v-9a3 3 0 00-3-3zM8.25 4.5a1.5 1.5 0 011.5-1.5h5.25a.75.75 0 010 1.5H9.75a1.5 1.5 0 01-1.5-1.5z"} className="w-6 h-6 text-slate-500" />
                    )}
                </button>
            </div>
        </div>
    );
};

const App: React.FC = () => {
    const [languages, setLanguages] = useState<LanguagePair>({ source: Language.ES, target: Language.PT });
    const [sourceText, setSourceText] = useState<string>('');
    const [translatedText, setTranslatedText] = useState<string>('');
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const debounceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const { isListening, transcript, startListening, stopListening, isSpeechRecognitionSupported, setTranscript } = useSpeechRecognition(languages.source);
    const { speak, isSpeaking } = useSpeechSynthesis();

    useEffect(() => {
        if (transcript) {
            setSourceText(transcript);
        }
    }, [transcript]);

    const handleTranslate = useCallback(async (text: string) => {
        if (!text.trim()) {
            setTranslatedText('');
            return;
        }
        setIsLoading(true);
        setError(null);
        try {
            const result = await translateText(text, languages);
            setTranslatedText(result);
        } catch (e) {
            setError('An error occurred during translation.');
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    }, [languages]);

    useEffect(() => {
        if (debounceTimeoutRef.current) {
            clearTimeout(debounceTimeoutRef.current);
        }
        debounceTimeoutRef.current = setTimeout(() => {
            handleTranslate(sourceText);
        }, 500);

        return () => {
            if (debounceTimeoutRef.current) {
                clearTimeout(debounceTimeoutRef.current);
            }
        };
    }, [sourceText, handleTranslate]);

    const handleSwapLanguages = () => {
        setLanguages(prev => ({ source: prev.target, target: prev.source }));
        setSourceText(translatedText);
        setTranslatedText(sourceText);
        setTranscript('');
    };
    
    const handleMicClick = () => {
        if (isListening) {
            stopListening();
        } else {
            setSourceText('');
            setTranslatedText('');
            startListening();
        }
    };
    
    return (
        <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8 font-sans">
            <header className="text-center mb-8">
                <h1 className="text-4xl md:text-5xl font-bold text-sky-600">Traductor Bilingüe</h1>
                <p className="text-slate-500 mt-2 text-lg">Traducción de voz y texto entre Español y Portugués con Gemini</p>
                <p className="text-slate-400 mt-2 text-md">Prof. Luis González</p>
            </header>
            
            <main className="w-full max-w-5xl mx-auto flex flex-col items-center">
                <div className="w-full bg-white/60 p-4 rounded-2xl shadow-lg border border-slate-200">
                    <LanguageSelector languages={languages} onSwap={handleSwapLanguages} />

                    <div className="flex flex-col md:flex-row gap-4">
                        <TranslationCard
                            language={languages.source}
                            text={sourceText}
                            onTextChange={setSourceText}
                            placeholder={`Habla o escribe en ${languageNames[languages.source]}...`}
                            isSourceCard={true}
                        />
                        <TranslationCard
                            language={languages.target}
                            text={translatedText}
                            placeholder="Traducción"
                            isLoading={isLoading}
                            onSpeak={() => speak(translatedText, languages.target)}
                            isSpeaking={isSpeaking}
                        />
                    </div>
                </div>

                <div className="mt-8">
                    {isSpeechRecognitionSupported ? (
                        <button
                            onClick={handleMicClick}
                            className={`relative flex items-center justify-center w-20 h-20 rounded-full transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-opacity-50 ${
                                isListening
                                ? 'bg-red-600 hover:bg-red-700 focus:ring-red-400'
                                : 'bg-sky-600 hover:bg-sky-700 focus:ring-sky-400'
                            }`}
                        >
                            <Icon path={MIC_ICON_PATH} className="w-10 h-10 text-white" />
                            {isListening && (
                                <span className="absolute inset-0 rounded-full bg-red-500 animate-ping opacity-75"></span>
                            )}
                        </button>
                    ) : (
                        <p className="text-center text-red-600 bg-red-100 border border-red-200 px-4 py-2 rounded-lg">
                            El reconocimiento de voz no es compatible con este navegador.
                        </p>
                    )}
                </div>
                {error && <p className="text-red-600 mt-4">{error}</p>}
            </main>
        </div>
    );
};

export default App;
