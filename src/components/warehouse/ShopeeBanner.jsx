import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const banners = [
    'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80', // Shopping/Sale generic
    'https://images.unsplash.com/photo-1556742049-0cfed4f7a07d?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80', // Payment/Tech
    'https://images.unsplash.com/photo-1531297461136-82lw9b2b0981?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80' // Tech/Gadgets
];

const ShopeeBanner = () => {
    const [currentIndex, setCurrentIndex] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentIndex((prev) => (prev + 1) % banners.length);
        }, 5000);
        return () => clearInterval(interval);
    }, []);

    const prevSlide = () => {
        setCurrentIndex((prev) => (prev === 0 ? banners.length - 1 : prev - 1));
    };

    const nextSlide = () => {
        setCurrentIndex((prev) => (prev + 1) % banners.length);
    };

    return (
        <div className="relative w-full aspect-[21/9] sm:aspect-[3/1] rounded-lg overflow-hidden shadow-sm group">
            {banners.map((url, index) => (
                <div
                    key={index}
                    className={`absolute inset-0 transition-opacity duration-500 ease-in-out ${index === currentIndex ? 'opacity-100' : 'opacity-0'}`}
                >
                    <img src={url} alt={`Banner ${index + 1}`} className="w-full h-full object-cover" />
                </div>
            ))}

            {/* Controls */}
            <button onClick={prevSlide} className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/30 text-white p-2 rounded-full hover:bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity">
                <ChevronLeft size={20} />
            </button>
            <button onClick={nextSlide} className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/30 text-white p-2 rounded-full hover:bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity">
                <ChevronRight size={20} />
            </button>

            {/* Indicators */}
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex space-x-2">
                {banners.map((_, index) => (
                    <div
                        key={index}
                        className={`w-2 h-2 rounded-full ${index === currentIndex ? 'bg-[#EE4D2D]' : 'bg-white/50'}`}
                    />
                ))}
            </div>
        </div>
    );
};

export default ShopeeBanner;
