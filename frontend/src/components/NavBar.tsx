//import { useState } from "react";
import "../App.css";

interface NavBarProps {
    brandName: string;
    imageSrcPath: string;
    navItems: string[];
    onSelect: (item: string) => void;
    activeItem: string;
}
function NavBar({ brandName, imageSrcPath, navItems, onSelect, activeItem }: NavBarProps) {
    return (
        <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200 px-8 py-3">
            <div className="max-w-[1600px] mx-auto flex items-center justify-between">

                {/* Brand Section */}
                <div
                    className="flex items-center gap-4 cursor-pointer group"
                    onClick={() => onSelect("Analytics")}
                >
                    <div className="p-1 bg-slate-50 rounded-lg border border-slate-100 group-hover:border-purple-200 transition-colors">
                        <img
                            src={imageSrcPath}
                            className="w-10 h-10 object-contain"
                            alt="Logo"
                        />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-lg font-black tracking-tight text-slate-900 leading-none">
                            {brandName}
                        </span>
                        <span className="text-[10px] font-bold text-purple-600 tracking-widest uppercase mt-1">
                            SOC Engine
                        </span>
                    </div>
                </div>

                {/* Navigation Links */}
                <div className="hidden md:flex items-center gap-12">
                    <ul className="flex items-center gap-1">
                        {navItems.map((item) => {
                            const isActive = activeItem === item;
                            return (
                                <li
                                    key={item}
                                    onClick={() => onSelect(item)}
                                    className={`relative px-4 py-2 text-sm font-bold cursor-pointer transition-all duration-200 rounded-lg
                    ${isActive
                                            ? "text-purple-600 bg-purple-50"
                                            : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
                                        }`}
                                >
                                    {item}
                                    {/* Underline indicator for active page */}
                                    {isActive && (
                                        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1/2 h-0.5 bg-purple-600 rounded-full" />
                                    )}
                                </li>
                            );
                        })}
                    </ul>
                    {/* Search Bar */}
                    <div className="flex items-center gap-3 bg-slate-100/50 px-4 py-2 rounded-2xl border border-slate-200 focus-within:border-purple-300 focus-within:bg-white transition-all">
                        <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        <input
                            type="text"
                            placeholder="Filter incidents..."
                            className="bg-transparent border-none outline-none text-xs w-40 placeholder:text-slate-400 font-medium"
                        />

                    </div>
                </div>

                {/* User Profile / Mobile Menu */}
                <div className="flex items-center gap-4">
                    <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white text-xs font-black shadow-lg shadow-purple-200">
                        MF
                    </div>
                    <div className="md:hidden text-slate-500 cursor-pointer p-2 hover:bg-slate-50 rounded-lg">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
                        </svg>
                    </div>
                </div>
            </div>
        </nav>
    );
}

export default NavBar;