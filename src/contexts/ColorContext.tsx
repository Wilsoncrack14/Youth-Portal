import React, { createContext, useContext, useEffect, useState } from 'react';

type ColorContextType = {
    primaryColor: string;
    setPrimaryColor: (color: string) => void;
};

const ColorContext = createContext<ColorContextType>({
    primaryColor: '#4b4ee7',
    setPrimaryColor: () => { },
});

export const useColor = () => useContext(ColorContext);

// Predefined brand colors
export const BRAND_COLORS = [
    { name: 'Indigo', value: '#4b4ee7' },
    { name: 'Purple', value: '#9333ea' },
    { name: 'Pink', value: '#db2777' },
    { name: 'Red', value: '#dc2626' },
    { name: 'Orange', value: '#ea580c' },
    { name: 'Green', value: '#16a34a' },
    { name: 'Teal', value: '#0d9488' },
    { name: 'Cyan', value: '#0891b2' },
    { name: 'Blue', value: '#2563eb' },
];

export const ColorProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [primaryColor, setPrimaryColor] = useState('#4b4ee7');

    useEffect(() => {
        const savedColor = localStorage.getItem('primaryColor');
        if (savedColor) {
            setPrimaryColor(savedColor);
        }
    }, []);

    useEffect(() => {
        document.documentElement.style.setProperty('--color-primary', primaryColor);
        localStorage.setItem('primaryColor', primaryColor);
    }, [primaryColor]);

    return (
        <ColorContext.Provider value={{ primaryColor, setPrimaryColor }}>
            {children}
        </ColorContext.Provider>
    );
};
