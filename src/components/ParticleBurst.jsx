import { useEffect, useRef, useState } from 'react';

/**
 * Celebratory particle burst effect for solved letter tiles
 * Creates a quick burst of celebratory particles that disappear when done
 */
export default function ParticleBurst({ trigger, color = 'green', lightMode = false }) {
  const canvasRef = useRef(null);
  const animationIdRef = useRef(null);

  useEffect(() => {
    if (!trigger || trigger === 0) {
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const size = 150;
    
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.scale(dpr, dpr);
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;

    const particles = [];
    const particleCount = 20; // Confetti-like particles
    const colors = color === 'green' 
      ? ['#10b981', '#34d399', '#6ee7b7', '#86efac', '#22c55e', '#16a34a'] // Vibrant greens
      : ['#fbbf24', '#fcd34d', '#fde047', '#fef08a', '#eab308', '#ca8a04']; // Vibrant yellows

    // Create confetti-like burst particles
    for (let i = 0; i < particleCount; i++) {
      const angle = (Math.PI * 2 * i) / particleCount + (Math.random() - 0.5) * 1.2;
      const speed = 3 + Math.random() * 4; // Energetic burst
      particles.push({
        x: size / 2,
        y: size / 2,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: 3 + Math.random() * 4, // Small confetti pieces
        life: 1.0,
        decay: 0.05 + Math.random() * 0.04,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.3,
        shape: Math.random() > 0.5 ? 'circle' : 'square', // Mix of shapes for confetti
      });
    }

    let lastFrameTime = performance.now();

    const animate = (currentTime) => {
      if (!lastFrameTime) lastFrameTime = currentTime;
      const deltaTime = Math.min(currentTime - lastFrameTime, 16.67);
      lastFrameTime = currentTime;
      const frameMultiplier = deltaTime / 16.67;

      ctx.clearRect(0, 0, size, size);

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        
        // Update position
        p.x += p.vx * frameMultiplier;
        p.y += p.vy * frameMultiplier;
        p.rotation += p.rotationSpeed * frameMultiplier;
        
        // Add slight gravity for confetti effect
        p.vy += 0.15 * frameMultiplier;
        
        // Decelerate
        p.vx *= 0.94;
        p.vy *= 0.94;
        
        // Fade out
        p.life -= p.decay * frameMultiplier;

        // Draw confetti particle (optimized - batch operations)
        const particleSize = p.size * Math.max(0, p.life);
        const alpha = Math.max(0, Math.min(1, p.life));
        
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = p.color;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        
        // Use compositing instead of expensive shadow blur
        if (p.shape === 'square') {
          ctx.fillRect(-particleSize / 2, -particleSize / 2, particleSize, particleSize);
        } else {
          ctx.beginPath();
          ctx.arc(0, 0, particleSize / 2, 0, Math.PI * 2);
          ctx.fill();
        }
        
        ctx.restore();

        // Remove dead particles
        if (p.life <= 0 || p.x < -20 || p.x > size + 20 || p.y > size + 20) {
          particles.splice(i, 1);
        }
      }

      // Continue animation if particles exist
      if (particles.length > 0) {
        animationIdRef.current = requestAnimationFrame(animate);
      } else {
        // Animation complete
        ctx.clearRect(0, 0, size, size);
        animationIdRef.current = null;
      }
    };

    // Start animation
    animationIdRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
        animationIdRef.current = null;
      }
    };
  }, [trigger, color, lightMode]);

  // Always render canvas so it's ready when trigger fires
  return (
    <canvas
      ref={canvasRef}
      className="absolute pointer-events-none z-10"
      style={{ 
        position: 'absolute', 
        top: '50%', 
        left: '50%', 
        transform: 'translate(-50%, -50%)',
        width: '150px', 
        height: '150px' 
      }}
    />
  );
}
