import { useEffect, useRef, useState } from "react";
import StrokeText from "./StrokeText";
import "../intro.css";
import logo from "../logo.png";
import introSoundSrc from "../introsound.mp3";

export default function Intro({ onComplete }) {
  const audioRef = useRef(null);
  const [fadingOut, setFadingOut] = useState(false);
  const [bootStarted, setBootStarted] = useState(false);

  useEffect(() => {
    if (!bootStarted) return;

    // Rigid 2-second timeout requested by user
    const timer = setTimeout(() => {
      setFadingOut(true);
      setTimeout(() => {
        if (onComplete) onComplete();
      }, 700); 
    }, 2000);

    return () => clearTimeout(timer);
  }, [bootStarted, onComplete]);

  const startBoot = () => {
    setBootStarted(true);
    if (audioRef.current) {
      audioRef.current.volume = 0.4;
      audioRef.current.play().catch(() => console.error("Audio blocked"));
    }
  };

  if (!bootStarted) {
    return (
      <div 
        className="dark-circuit-wrapper flex items-center justify-center cursor-pointer" 
        onClick={startBoot}
      >
        <div className="dark-circuit-background"></div>
        <div className="z-10 p-10 hover:scale-105 transition-transform duration-300">
           <div className="text-[#FF6A00] animate-pulse font-mono tracking-[0.5em] text-sm font-bold border border-[#FF6A00]/50 px-8 py-4 rounded bg-black/80 shadow-[0_0_20px_rgba(255,106,0,0.2)]">
             [ CLICK TO INITIALIZE SECURE LINK ]
           </div>
        </div>
        {/* Mount audio early to allow play on click */}
        <audio ref={audioRef} src={introSoundSrc} />
      </div>
    );
  }

  return (
    <div 
      className="dark-circuit-wrapper" 
      style={{ 
        opacity: fadingOut ? 0 : 1, 
        transform: fadingOut ? "scale(0.95)" : "scale(1)", 
        transition: "all 0.8s cubic-bezier(0.4, 0, 0.2, 1)" 
      }}
    >
      <div className="dark-circuit-background"></div>

      <div className="center-container">
        <img src={logo} alt="SatarkAI Logo" className="logo-intro" />
        <StrokeText />
      </div>

      {/* Maintain audio instance */}
      <audio ref={audioRef} src={introSoundSrc} autoPlay />
    </div>
  );
}
