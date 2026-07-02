import React, { useState, useEffect, useRef } from 'react';
import firehorseLogo from '../assets/animations/icon_no_bg.png';
import money from '../assets/animations/money.png';
import clock from '../assets/animations/clock.png';
import dollar from '../assets/animations/coin.png';
import payroll from '../assets/animations/compensation.png';
import profitGrowth from '../assets/animations/profit-growth.png';
import { useAuth } from '../context/AuthContext';

// ==========================================
// FIRE-BREATHING CANVAS LOGO COMPONENT
// ==========================================
const FirehorseLogo = ({ className = "w-16 h-16" }) => {
    const canvasRef = useRef(null);
    const [isHovering, setIsHovering] = useState(false);
    const animationFrameId = useRef(null);
    const particles = useRef([]);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');

        const resizeCanvas = () => {
            if (canvas) {
                canvas.width = canvas.offsetWidth * 1.5;
                canvas.height = canvas.offsetHeight * 1.5;
            }
        };
        resizeCanvas();

        class Particle {
            constructor() {
                const w = canvas.width;
                const h = canvas.height;
                
                this.x = w * 0.54; 
                this.y = h * 0.56;

                this.vx = -(Math.random() * (w * 0.014) + (w * 0.008));
                this.vy = (Math.random() * (h * 0.01) - (h * 0.002));
                
                this.life = 1.0;
                this.colorRate = 1 / 60; 
                this.size = Math.random() * (w * 0.025) + (w * 0.01);
            }

            update() {
                this.x += this.vx;
                this.y += this.vy;
                this.life -= this.colorRate;
                this.size *= 0.98; 
            }

            draw(ctx) {
                const r = 255;
                const g = Math.floor(this.life * 220);
                const b = Math.floor(this.life * 50);
                
                ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${this.life})`;
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        const animate = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            if (isHovering) {
                for (let i = 0; i < 20; i++) {
                    particles.current.push(new Particle());
                }
            }

            particles.current = particles.current.filter(p => p.life > 0);
            particles.current.forEach(p => {
                p.update();
                p.draw(ctx);
            });

            animationFrameId.current = requestAnimationFrame(animate);
        };

        animate();

        window.addEventListener('resize', resizeCanvas);
        return () => {
            cancelAnimationFrame(animationFrameId.current);
            window.removeEventListener('resize', resizeCanvas);
        };
    }, [isHovering]);

    return (
        <div 
            className={`relative overflow-visible inline-block transition-transform duration-300 ${className}`}
            onMouseEnter={() => setIsHovering(true)}
            onMouseLeave={() => setIsHovering(false)}
        >
            <img
                src={firehorseLogo}
                alt="Firehorse Logo"
                className="w-full h-full relative z-10 select-none pointer-events-none"
            />
            <canvas
                ref={canvasRef}
                className="absolute pointer-events-none z-20"
                style={{
                    width: '300%',
                    height: '300%',
                    left: '-150%', 
                    top: '-100%',
                }}
            />
        </div>
    );
};

// ==========================================
// BACKGROUND FLOATING ICON GENERATOR
// ==========================================
const BackgroundIcon = ({ type, className = "w-10 h-10" }) => {
    switch (type) {
        case 'horse':
            return <img src={firehorseLogo} alt="Horse" className={className} />;
        case 'money':
            return <img src={money} alt="Money" className={className} />;
        case 'clock':
            return <img src={clock} alt="Clock" className={className} />;
        case 'dollar':
            return <img src={dollar} alt="Dollar" className={className} />;
        case 'payroll':
            return <img src={payroll} alt="Payroll" className={className} />;
        case 'profitGrowth':
            return <img src={profitGrowth} alt="ProfitGrowth" className={className} />;
        default:
            return null;
    }
};

// ==========================================
// CORE APPLICATION LOGIN VIEW
// ==========================================
export default function FirehorseLogin() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoggingIn, setIsLoggingIn] = useState(false);
    const [loginProgress, setLoginProgress] = useState(0);
    const [systemAlert, setSystemAlert] = useState(null);

    const { login, redirectAfterLogin, error } = useAuth();

    const [icons, setIcons] = useState([]);
    const dragInfoRef = useRef({ activeId: null, startX: 0, startY: 0, iconStartX: 0, iconStartY: 0 });
    const containerRef = useRef(null);
    const animationFrameId = useRef(null);
    const timeRef = useRef(0);
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

    useEffect(() => {
        const iconTypes = [
            'horse', 'money', 'clock', 'dollar', 'payroll', 'profitGrowth', 
            'horse', 'money', 'clock', 'dollar', 'payroll', 'profitGrowth',
            'horse', 'money', 'clock', 'dollar', 'payroll', 'profitGrowth',
            'horse', 'horse', 'horse'
        ];

        const generatedIcons = iconTypes.map((type, index) => {
            let baseX, baseY;
            if (index % 4 === 0) {
                baseX = 5 + Math.random() * 25;
                baseY = 5 + Math.random() * 90;
            } else if (index % 4 === 1) {
                baseX = 70 + Math.random() * 25;
                baseY = 5 + Math.random() * 90;
            } else if (index % 4 === 2) {
                baseX = 5 + Math.random() * 90;
                baseY = 5 + Math.random() * 15;
            } else {
                baseX = 5 + Math.random() * 90;
                baseY = 80 + Math.random() * 15;
            }

            return {
                id: `icon-${index}`,
                type,
                baseX,
                baseY,
                currentX: baseX,
                currentY: baseY,
                orbitRadiusX: 4 + Math.random() * 6,
                orbitRadiusY: 3 + Math.random() * 5,
                speed: 0.001 + Math.random() * 0.0015,
                phase: Math.random() * Math.PI * 2,
                size: type === 'horse' ? 48 : 34,
                rotation: Math.random() * 360,
                rotationSpeed: (Math.random() - 0.5) * 0.2,
                isDragging: false,
                pulseSpeed: 1 + Math.random() * 2
            };
        });

        setIcons(generatedIcons);

        const handleMouseMoveGlobal = (e) => {
            const { innerWidth, innerHeight } = window;
            const x = (e.clientX - innerWidth / 2) / (innerWidth / 2);
            const y = (e.clientY - innerHeight / 2) / (innerHeight / 2);
            setMousePos({ x, y });
        };

        window.addEventListener('mousemove', handleMouseMoveGlobal);
        return () => {
            window.removeEventListener('mousemove', handleMouseMoveGlobal);
        };
    }, []);

    useEffect(() => {
        const updatePhysics = () => {
            timeRef.current += 1;
            const t = timeRef.current;

            setIcons((prevIcons) =>
                prevIcons.map((icon) => {
                    if (icon.isDragging) return icon;

                    const targetX = icon.baseX + Math.cos(t * icon.speed + icon.phase) * icon.orbitRadiusX;
                    const targetY = icon.baseY + Math.sin(t * icon.speed * 1.2 + icon.phase) * icon.orbitRadiusY;

                    const springK = 0.06;
                    const currentX = icon.currentX + (targetX - icon.currentX) * springK;
                    const currentY = icon.currentY + (targetY - icon.currentY) * springK;
                    const rotation = icon.rotation + icon.rotationSpeed;

                    return { ...icon, currentX, currentY, rotation };
                })
            );

            animationFrameId.current = requestAnimationFrame(updatePhysics);
        };

        animationFrameId.current = requestAnimationFrame(updatePhysics);
        return () => {
            if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
        };
    }, []);

    const handleDragStart = (id, clientX, clientY) => {
        const targetIcon = icons.find(icon => icon.id === id);
        if (!targetIcon) return;

        const container = containerRef.current;
        if (!container) return;
        const rect = container.getBoundingClientRect();

        dragInfoRef.current = {
            activeId: id,
            startX: clientX,
            startY: clientY,
            iconStartX: (targetIcon.currentX / 100) * rect.width,
            iconStartY: (targetIcon.currentY / 100) * rect.height
        };

        setIcons(prev => prev.map(icon => icon.id === id ? { ...icon, isDragging: true } : icon));
    };

    const handleDragMove = (clientX, clientY) => {
        const { activeId, startX, startY, iconStartX, iconStartY } = dragInfoRef.current;
        if (!activeId) return;

        const container = containerRef.current;
        if (!container) return;
        const rect = container.getBoundingClientRect();

        const deltaX = clientX - startX;
        const deltaY = clientY - startY;

        let newXPercent = ((iconStartX + deltaX) / rect.width) * 100;
        let newYPercent = ((iconStartY + deltaY) / rect.height) * 100;

        newXPercent = Math.max(2, Math.min(94, newXPercent));
        newYPercent = Math.max(2, Math.min(94, newYPercent));

        setIcons(prev => prev.map(icon => {
            if (icon.id === activeId) {
                return { ...icon, currentX: newXPercent, currentY: newYPercent };
            }
            return icon;
        }));
    };

    const handleDragEnd = () => {
        const { activeId } = dragInfoRef.current;
        if (!activeId) return;

        setIcons(prev => prev.map(icon => icon.id === activeId ? { ...icon, isDragging: false } : icon));
        dragInfoRef.current = { activeId: null, startX: 0, startY: 0, iconStartX: 0, iconStartY: 0 };
    };

    useEffect(() => {
        const handleGlobalMove = (e) => {
            if (dragInfoRef.current.activeId) handleDragMove(e.clientX, e.clientY);
        };
        const handleGlobalTouchMove = (e) => {
            if (dragInfoRef.current.activeId && e.touches[0]) {
                handleDragMove(e.touches[0].clientX, e.touches[0].clientY);
            }
        };
        const handleGlobalEnd = () => handleDragEnd();

        window.addEventListener('mousemove', handleGlobalMove);
        window.addEventListener('mouseup', handleGlobalEnd);
        window.addEventListener('touchmove', handleGlobalTouchMove, { passive: false });
        window.addEventListener('touchend', handleGlobalEnd);

        return () => {
            window.removeEventListener('mousemove', handleGlobalMove);
            window.removeEventListener('mouseup', handleGlobalEnd);
            window.removeEventListener('touchmove', handleGlobalTouchMove);
            window.removeEventListener('touchend', handleGlobalEnd);
        };
    }, [icons]);

    const handleLogin = async (e) => {
        e.preventDefault();
        if (!email || !password) {
            setSystemAlert('Please supply both username and secure password.');
            return;
        }

        setIsLoggingIn(true);
        setLoginProgress(10);

        const intervals = [30, 65, 85, 100];
        intervals.forEach((val, i) => {
            setTimeout(() => {
                setLoginProgress(val);
                if (val === 100) {
                    setTimeout(async () => {
                        const success = await login(email, password);
                        setIsLoggingIn(false);
                        if (success) {
                            redirectAfterLogin();
                        } else {
                            setSystemAlert(error || 'Access Denied. Invalid credentials.');
                            setLoginProgress(0);
                        }
                    }, 400);
                }
            }, (i + 1) * 450);
        });
    };

    const triggerSystemAlert = (msg) => {
        setSystemAlert(msg);
        setTimeout(() => setSystemAlert(null), 4500);
    };

    return (
        <div
            ref={containerRef}
            className="relative w-full h-screen overflow-hidden font-sans select-none"
            style={{ background: 'radial-gradient(circle at center, #1b3e94 0%, #0a173d 100%)' }}
        >
            <div className="absolute inset-0 opacity-45 pointer-events-none bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:24px_24px]" />
            <div className="absolute inset-0 opacity-20 pointer-events-none bg-[radial-gradient(#ffffff_2px,transparent_2px)] [background-size:48px_48px] animate-pulse" />

            {/* Interactive Floating Background Icons */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                {icons.map((icon) => {
                    const parallaxX = mousePos.x * (icon.size * 0.15);
                    const parallaxY = mousePos.y * (icon.size * 0.15);

                    return (
                        <div
                            key={icon.id}
                            className={`absolute cursor-grab active:cursor-grabbing transition-transform pointer-events-auto select-none rounded-full flex items-center justify-center p-2
                                ${icon.isDragging ? 'shadow-2xl scale-110 z-50 bg-white/10 ring-2 ring-orange-400/40' : 'hover:bg-white/5 hover:scale-105 z-10'}`}
                            style={{
                                left: `${icon.currentX}%`,
                                top: `${icon.currentY}%`,
                                width: `${icon.size + 16}px`,
                                height: `${icon.size + 16}px`,
                                transform: `translate(-50%, -50%) translate3d(${parallaxX}px, ${parallaxY}px, 0) rotate(${icon.rotation}deg)`,
                                color: icon.type === 'horse' ? 'transparent' : 'rgba(255, 255, 255, 0.45)',
                                backdropFilter: icon.isDragging ? 'blur(2px)' : 'none',
                            }}
                            onMouseDown={(e) => {
                                e.preventDefault();
                                handleDragStart(icon.id, e.clientX, e.clientY);
                            }}
                            onTouchStart={(e) => {
                                if (e.touches[0]) {
                                    handleDragStart(icon.id, e.touches[0].clientX, e.touches[0].clientY);
                                }
                            }}
                        >
                            <BackgroundIcon type={icon.type} className="w-full h-full" />
                        </div>
                    );
                })}
            </div>

            {/* Floating alert banner */}
            {systemAlert && (
                <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-50 animate-bounce">
                    <div className="bg-gradient-to-r from-orange-500 to-amber-600 text-white font-semibold py-2 px-6 rounded-full shadow-2xl flex items-center gap-3 text-sm tracking-wide">
                        <svg className="w-5 h-5 animate-spin text-white" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span>{systemAlert}</span>
                    </div>
                </div>
            )}

            {/* MAIN PORTAL AREA */}
            <div className="relative w-full h-full flex items-center justify-center p-4 z-40 pointer-events-none">
                {/* LOGIN CARD VIEW */}
                <div className="w-full max-w-[420px] bg-white rounded-2xl shadow-3xl overflow-hidden pointer-events-auto transform transition-all">

                    {/* Top Branded Blue Banner */}
                    <div className="bg-[#1a4cd2] px-6 py-8 text-center flex flex-col items-center relative overflow-hidden">
                        <div className="absolute -right-12 -top-12 w-36 h-36 bg-blue-500/20 rounded-full blur-xl" />
                        <div className="absolute -left-12 -bottom-12 w-36 h-36 bg-orange-400/10 rounded-full blur-xl" />

                        <FirehorseLogo className="w-20 h-20 mb-3 hover:scale-110 transition-transform" />

                        <h1 className="text-2xl font-bold text-[#f8981d] tracking-wide filter drop-shadow">
                            Firehorse Payroll
                        </h1>

                        <p className="text-white text-[11px] font-medium tracking-wide mt-1.5 uppercase opacity-90">
                            Powered by Clydesdale - Personnel Management
                        </p>
                    </div>

                    {/* Firewall Loading Scanner Interface */}
                    {isLoggingIn && (
                        <div className="absolute inset-0 bg-[#0c1c49]/80 backdrop-blur-sm z-30 flex flex-col items-center justify-center p-6 text-white text-center">
                            <div className="relative w-24 h-24 mb-4 flex items-center justify-center">
                                <div className="absolute inset-0 border-4 border-blue-500/30 rounded-full" />
                                <div className="absolute inset-0 border-4 border-t-orange-500 border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin" />
                                <FirehorseLogo className="w-12 h-12 animate-pulse" />
                            </div>
                            <h3 className="font-bold text-lg text-orange-400 tracking-wide mb-1">Authenticating User</h3>
                            <p className="text-xs text-slate-300">Establishing encrypted security handshake...</p>
                            <div className="w-48 bg-slate-700/60 h-2 rounded-full mt-4 overflow-hidden">
                                <div
                                    className="bg-gradient-to-r from-orange-500 to-amber-500 h-full transition-all duration-300 rounded-full"
                                    style={{ width: `${loginProgress}%` }}
                                />
                            </div>
                            <span className="text-[10px] text-orange-300 font-mono mt-1.5">{loginProgress}% SECURE PORT</span>
                        </div>
                    )}

                    <form onSubmit={handleLogin} className="p-7 space-y-5">
                        <div>
                            <label className="block text-slate-600 text-xs font-semibold mb-1.5 tracking-wider">
                                Email Address
                            </label>
                            <div className="relative">
                                <input
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="admin@payroll.com"
                                    className="w-full bg-[#f0f4ff] border border-transparent focus:border-blue-400 focus:bg-white text-slate-800 rounded-lg py-3 px-4 outline-none text-sm font-medium transition-all"
                                    disabled={isLoggingIn}
                                />
                                <div className="absolute right-3 top-3.5 text-blue-500 opacity-60">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4">
                                        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                                        <polyline points="22,6 12,13 2,6" />
                                    </svg>
                                </div>
                            </div>
                        </div>

                        <div>
                            <label className="block text-slate-600 text-xs font-semibold mb-1.5 tracking-wider">
                                Password
                            </label>
                            <div className="relative">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    className="w-full bg-[#f0f4ff] border border-transparent focus:border-blue-400 focus:bg-white text-slate-800 rounded-lg py-3 px-4 outline-none text-sm font-medium transition-all"
                                    disabled={isLoggingIn}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-3.5 text-blue-500 opacity-60 hover:opacity-100 transition-opacity focus:outline-none"
                                >
                                    {showPassword ? (
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4">
                                            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                                            <line x1="1" y1="1" x2="23" y2="23" />
                                        </svg>
                                    ) : (
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4">
                                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                            <circle cx="12" cy="12" r="3" />
                                        </svg>
                                    )}
                                </button>
                            </div>
                        </div>

                        <div>
                            <label className="flex items-center gap-2 cursor-pointer group">
                                <div className="relative">
                                    <input
                                        type="checkbox"
                                        className="peer sr-only"
                                    />
                                    <div className="w-4 h-4 border-2 border-blue-400 rounded peer-checked:bg-[#f18e1c] peer-checked:border-[#f18e1c] transition-all flex items-center justify-center">
                                        <svg className="w-3 h-3 text-white opacity-0 peer-checked:opacity-100 transition-opacity" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                            <polyline points="20 6 9 17 4 12" />
                                        </svg>
                                    </div>
                                </div>
                                <span className="text-xs text-slate-500 font-medium group-hover:text-slate-700 transition-colors">
                                    Remember me
                                </span>
                            </label>
                            <p className="text-[10px] text-slate-400 font-medium mt-1 ml-6">
                                Your login details will be saved on this device.
                            </p>
                        </div>

                        <button
                            type="submit"
                            className="w-full mt-2 bg-[#f18e1c] hover:bg-[#d87c12] text-white py-3.5 px-4 rounded-lg font-bold text-sm tracking-wider flex items-center justify-center gap-2 shadow-md hover:shadow-lg hover:shadow-orange-500/20 transition-all transform active:scale-[0.99] focus:outline-none"
                        >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4">
                                <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                                <polyline points="10 17 15 12 10 7" />
                                <line x1="15" y1="12" x2="3" y2="12" />
                            </svg>
                            Secure Login
                        </button>

                        <p className="text-center text-[10.5px] text-slate-400 font-semibold tracking-wide pt-2">
                            Only authorized personnel can access this system.
                        </p>
                    </form>
                </div>
            </div>
        </div>
    );
}