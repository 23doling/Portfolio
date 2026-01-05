import React, { useRef, useEffect, useState, useCallback } from "react";
import "./SputnikGame.css";

// --- Configuration ---
const WIDTH = 600;
const HEIGHT = 500;
const CENTER = { x: WIDTH / 2, y: HEIGHT / 2 };
const GRAVITY_RADIUS = 180; // The visual red zone
const GRAVITY_STRENGTH = 0.35;
const DAMPING = 0.99; // Air resistance to stop them floating forever
const WALL_BOUNCE = -0.7;


// --- Planet Definitions (Tiers) ---
// Styles: 'solid', 'striped', 'ringed', 'spotted', 'sun'
interface PlanetType {
  radius: number;
  mass: number;
  color: string;
  style: string;
  score: number;
}


const PLANETS: PlanetType[] = [
  { radius: 12, mass: 10, color: "#9b59b6", style: "spotted", score: 2 },    // 0: Grape
  { radius: 18, mass: 20, color: "#3498db", style: "solid", score: 4 },      // 1: Blue
  { radius: 24, mass: 35, color: "#e74c3c", style: "striped", score: 8 },    // 2: Red
  { radius: 32, mass: 50, color: "#f1c40f", style: "spotted", score: 16 },   // 3: Yellow
  { radius: 40, mass: 80, color: "#2ecc71", style: "striped", score: 32 },   // 4: Green
  { radius: 50, mass: 120, color: "#1abc9c", style: "ringed", score: 64 },   // 5: Cyan Ring
  { radius: 60, mass: 180, color: "#d35400", style: "striped", score: 128 }, // 6: Orange
  { radius: 72, mass: 250, color: "#34495e", style: "ringed", score: 256 },  // 7: Dark Ring
  { radius: 85, mass: 350, color: "#e67e22", style: "sun", score: 512 },     // 8: Sun Small
  { radius: 100, mass: 500, color: "#f39c12", style: "sun", score: 1024 },   // 9: Sun Large
];

interface Body {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  level: number; // Index in PLANETS array
  radius: number; // Cache for performance
  mass: number;   // Cache for performance
}




const SputnikGame: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  
  // Game State
  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);

  // Mutable Physics State (Refs for performance)
  const bodies = useRef<Body[]>([]);
  const nextPlanetLevel = useRef<number>(0);
  const dragStart = useRef<{ x: number; y: number } | null>(null);
  const mousePos = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const dragging = useRef(false);
  const bodyIdCounter = useRef(0);

  // --- Helpers ---
  const createBody = (x: number, y: number, level: number): Body => {
    const p = PLANETS[level];
    return {
      id: bodyIdCounter.current++,
      x, y, vx: 0, vy: 0,
      level,
      radius: p.radius,
      mass: p.mass
    };
  };

  const getNextLevel = () => {
    // Only give small planets as next (0 to 3)
    return Math.floor(Math.random() * 4);
  };

  // Initialize
  useEffect(() => {
    const savedBest = localStorage.getItem("sputnik_best");
    if (savedBest) setBestScore(parseInt(savedBest));
    nextPlanetLevel.current = getNextLevel();
  }, []);

  // --- Reset Game ---
  const resetGame = () => {
    bodies.current = [];
    setScore(0);
    setGameOver(false);
    nextPlanetLevel.current = getNextLevel();
  };

  // --- Drawing Functions ---
  const drawPlanet = (ctx: CanvasRenderingContext2D, b: Body | {x: number, y: number, level: number, radius: number, vx?:number}) => {
    const type = PLANETS[b.level];
    
    ctx.save();
    ctx.translate(b.x, b.y);

    // Glow for suns
    if (type.style === 'sun') {
      ctx.shadowBlur = 20;
      ctx.shadowColor = type.color;
    }

    // Base Circle
    ctx.beginPath();
    ctx.arc(0, 0, b.radius, 0, Math.PI * 2);
    ctx.fillStyle = type.color;
    ctx.fill();
    
    ctx.shadowBlur = 0; // Reset glow

    // Style Details
    if (type.style === "ringed") {
      ctx.beginPath();
      ctx.ellipse(0, 0, b.radius * 1.6, b.radius * 0.4, -0.2, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(255,255,255,0.6)";
      ctx.lineWidth = 3;
      ctx.stroke();
    } else if (type.style === "striped") {
      ctx.globalCompositeOperation = "source-atop"; // Clip to circle
      ctx.fillStyle = "rgba(0,0,0,0.2)";
      ctx.fillRect(-b.radius, -b.radius/2, b.radius * 2, b.radius/3);
      ctx.fillRect(-b.radius, b.radius/4, b.radius * 2, b.radius/4);
      ctx.globalCompositeOperation = "source-over";
    } else if (type.style === "spotted") {
        ctx.fillStyle = "rgba(255,255,255,0.3)";
        ctx.beginPath(); ctx.arc(-b.radius/3, -b.radius/3, b.radius/5, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(b.radius/4, b.radius/2, b.radius/6, 0, Math.PI*2); ctx.fill();
    } else if (type.style === "sun") {
        // Sun flares
        ctx.strokeStyle = "#e74c3c";
        ctx.lineWidth = 2;
        ctx.beginPath();
        for(let i=0; i<8; i++) {
            const angle = (Date.now() / 1000) + (i * (Math.PI/4));
            ctx.moveTo(Math.cos(angle)*b.radius, Math.sin(angle)*b.radius);
            ctx.lineTo(Math.cos(angle)*(b.radius+5), Math.sin(angle)*(b.radius+5));
        }
        ctx.stroke();
    }
    
    // Highlight (Shininess)
    ctx.beginPath();
    ctx.arc(-b.radius * 0.4, -b.radius * 0.4, b.radius * 0.2, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255,255,255,0.2)";
    ctx.fill();

    ctx.restore();
  };

  // --- Main Game Loop ---
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationId: number;

    const loop = () => {
      ctx.clearRect(0, 0, WIDTH, HEIGHT);

      // 1. Draw UI Background Elements
      
      // Gravity Field (Red Zone)
      const grad = ctx.createRadialGradient(CENTER.x, CENTER.y, GRAVITY_RADIUS * 0.5, CENTER.x, CENTER.y, GRAVITY_RADIUS * 1.2);
      grad.addColorStop(0, "rgba(50, 20, 20, 0.0)");
      grad.addColorStop(1, "rgba(180, 50, 50, 0.15)");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(CENTER.x, CENTER.y, GRAVITY_RADIUS * 1.2, 0, Math.PI * 2);
      ctx.fill();

      // UI Text: Next, Score
      ctx.font = "14px 'Press Start 2P', monospace";
      ctx.fillStyle = "#fff";
      ctx.fillText("NEXT", 20, 30);
      
      // Draw Next Planet Preview
      const nextP = PLANETS[nextPlanetLevel.current];
      drawPlanet(ctx, { x: 40, y: 60, level: nextPlanetLevel.current, radius: nextP.radius });

      ctx.textAlign = "left";
      ctx.fillText("SCORE", 20, HEIGHT - 60);
      ctx.font = "20px 'Press Start 2P', monospace";
      ctx.fillText(score.toString(), 20, HEIGHT - 30);

      ctx.font = "10px 'Press Start 2P', monospace";
      ctx.fillStyle = "#aaa";

      if (gameOver) {
         ctx.fillStyle = "rgba(0,0,0,0.7)";
         ctx.fillRect(0,0,WIDTH,HEIGHT);
         ctx.fillStyle = "red";
         ctx.font = "30px 'Press Start 2P', monospace";
         ctx.textAlign = "center";
         ctx.fillText("GAME OVER", WIDTH/2, HEIGHT/2);
         ctx.fillStyle = "white";
         ctx.font = "12px 'Press Start 2P', monospace";
         ctx.fillText("Click Restart", WIDTH/2, HEIGHT/2 + 40);
         return; // Stop updating physics
      }

      // 2. Physics Update
      const bodiesArr = bodies.current;
      
      for (let i = 0; i < bodiesArr.length; i++) {
        const b = bodiesArr[i];

        // Gravity pull towards center
        const dx = CENTER.x - b.x;
        const dy = CENTER.y - b.y;
        const distCenter = Math.sqrt(dx*dx + dy*dy);
        
        // Apply Gravity
        if (distCenter > 5) {
            const force = (GRAVITY_STRENGTH * b.mass) / 100; // Simplified gravity
            b.vx += (dx / distCenter) * force;
            b.vy += (dy / distCenter) * force;
        }

        // Apply Velocity
        b.x += b.vx;
        b.y += b.vy;

        // Friction/Damping
        b.vx *= DAMPING;
        b.vy *= DAMPING;

        // Wall collisions
        if (b.x - b.radius < 0) { b.x = b.radius; b.vx *= WALL_BOUNCE; }
        if (b.x + b.radius > WIDTH) { b.x = WIDTH - b.radius; b.vx *= WALL_BOUNCE; }
        if (b.y - b.radius < 0) { b.y = b.radius; b.vy *= WALL_BOUNCE; }
        if (b.y + b.radius > HEIGHT) { b.y = HEIGHT - b.radius; b.vy *= WALL_BOUNCE; }
      }

      // 3. Collision & Merging Logic (Suika Style)
      // We iterate backwards to safely remove items
      for (let i = bodiesArr.length - 1; i >= 0; i--) {
        for (let j = i - 1; j >= 0; j--) {
            const b1 = bodiesArr[i];
            const b2 = bodiesArr[j];
            
            // Check Collision
            const dx = b1.x - b2.x;
            const dy = b1.y - b2.y;
            const dist = Math.sqrt(dx*dx + dy*dy);

            if (dist < b1.radius + b2.radius) {
                // PHYSICS: Resolve Overlap (Push apart) so they don't stick
                const angle = Math.atan2(dy, dx);
                const overlap = (b1.radius + b2.radius - dist) / 2;
                // Move them apart slightly proportional to mass is usually better, 
                // but equal push is stable enough here
                b1.x += Math.cos(angle) * overlap * 0.1; 
                b1.y += Math.sin(angle) * overlap * 0.1;
                b2.x -= Math.cos(angle) * overlap * 0.1;
                b2.y -= Math.sin(angle) * overlap * 0.1;

                // BOUNCE interaction
                // (Very simplified elastic collision)
                const combinedMass = b1.mass + b2.mass;
                const collisionVx = (b1.vx * (b1.mass - b2.mass) + (2 * b2.mass * b2.vx)) / combinedMass;
                const collisionVy = (b1.vy * (b1.mass - b2.mass) + (2 * b2.mass * b2.vy)) / combinedMass;
                b1.vx = collisionVx; 
                b1.vy = collisionVy;

                // MERGE: Same Level?
                if (b1.level === b2.level && b1.level < PLANETS.length - 1) {
                    // Create new higher level planet at midpoint
                    const newLevel = b1.level + 1;
                    const midX = (b1.x + b2.x) / 2;
                    const midY = (b1.y + b2.y) / 2;
                    
                    const newBody = createBody(midX, midY, newLevel);
                    // Inherit some momentum
                    newBody.vx = (b1.vx + b2.vx) / 2;
                    newBody.vy = (b1.vy + b2.vy) / 2;

                    // Remove old bodies
                    bodiesArr.splice(i, 1);
                    bodiesArr.splice(j, 1);
                    
                    // Add new body
                    bodiesArr.push(newBody);
                    
                    // Update Score
                    setScore(prev => prev + PLANETS[newLevel].score);
                    
                    // Break inner loop since b1 is gone
                    break; 
                }
            }
        }
      }

      // 4. Draw Bodies
      bodiesArr.forEach(b => drawPlanet(ctx, b));

      // 5. Draw Slingshot UI
      if (dragging.current && dragStart.current) {
         // The planet being dragged (Preview)
         const p = PLANETS[nextPlanetLevel.current];
         
         // Calculate trajectory vector
         // Dragging back pulls the string, launching forward (Angry Birds style)
         const diffX = dragStart.current.x - mousePos.current.x;
         const diffY = dragStart.current.y - mousePos.current.y;
         
         // Draw the "Ghost" planet at drag start
         ctx.globalAlpha = 0.6;
         drawPlanet(ctx, { 
             x: dragStart.current.x, 
             y: dragStart.current.y, 
             level: nextPlanetLevel.current, 
             radius: p.radius 
        });
         ctx.globalAlpha = 1.0;

         // Draw Trajectory Line (Dotted)
         ctx.beginPath();
         ctx.moveTo(dragStart.current.x, dragStart.current.y);
         ctx.lineTo(dragStart.current.x + diffX * 2, dragStart.current.y + diffY * 2);
         ctx.setLineDash([5, 5]); // Dotted line
         ctx.strokeStyle = "rgba(255, 255, 255, 0.5)";
         ctx.lineWidth = 2;
         ctx.stroke();
         ctx.setLineDash([]); // Reset dash

         // Draw Aiming Cursor
         ctx.beginPath();
         ctx.arc(dragStart.current.x + diffX * 2, dragStart.current.y + diffY * 2, 5, 0, Math.PI*2);
         ctx.fillStyle = "white";
         ctx.fill();
      }

      animationId = requestAnimationFrame(loop);
    };
    
    animationId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animationId);
  }, [score, gameOver, bestScore]); // Depend on react state for UI text rendering

  // --- Interaction Handlers ---
  const handleMouseDown = (e: React.MouseEvent) => {
      if (gameOver) return;
      const rect = canvasRef.current!.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      dragStart.current = { x, y };
      mousePos.current = { x, y };
      dragging.current = true;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
      if (!dragging.current) return;
      const rect = canvasRef.current!.getBoundingClientRect();
      mousePos.current = {
          x: e.clientX - rect.left,
          y: e.clientY - rect.top
      };
  };

  const handleMouseUp = () => {
      if (!dragging.current || !dragStart.current) return;
      
      const start = dragStart.current;
      const end = mousePos.current;
      
      // Vector calculation (Pull back logic)
      const forceX = (start.x - end.x) * 0.15; // Power multiplier
      const forceY = (start.y - end.y) * 0.15;
      
      // Create the new planet
      const body = createBody(start.x, start.y, nextPlanetLevel.current);
      body.vx = forceX;
      body.vy = forceY;
      
      bodies.current.push(body);
      
      // Prepare next turn
      nextPlanetLevel.current = getNextLevel();
      dragging.current = false;
      dragStart.current = null;
  };
  const [leaderboard, setLeaderboard] = useState<{nickname: string, score: number}[]>([]);
const [showSubmit, setShowSubmit] = useState(false);
const [nickname, setNickname] = useState("");

  const fetchLeaderboard = async () => {
  try {
    const res = await fetch(`http://localhost:8000/leaderboard`);
    const data = await res.json();
    setLeaderboard(data);
  } catch (e) { console.error("Leaderboard unreachable", e); }
};

useEffect(() => { fetchLeaderboard(); }, []);
const [showLeaderboard, setShowLeaderboard] = useState(false);


// Handle Restart Logic
const handleRestartClick = () => {
  if (showSubmit) return; // Prevent multiple restart clicks while modal is open

  if (!gameOver && score > 0) {
    // End the game first
    setGameOver(true);        
    setShowSubmit(true);      
    setShowLeaderboard(true); 
  } else {
    // Either gameOver=true or score=0, just reset quietly
    setShowLeaderboard(false);
    resetGame();
  }
};



const submitScore = async () => {
  if (!nickname) return;
  try {
    await fetch(`http://localhost:8000/leaderboard`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nickname, score }),
    });
    setShowSubmit(false);
    setNickname("");
    fetchLeaderboard();
  } catch (e) {
    console.error("Failed to submit score", e);
  }
};

  return (
    <div className="sputnik-wrapper">
        <canvas
            ref={canvasRef}
            width={WIDTH}
            height={HEIGHT}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={() => dragging.current = false}
        />

        {/* Leaderboard UI inside the game */}
{showLeaderboard && (
  <div className="leaderboard-overlay">
    <div className="leaderboard-header">
      <span className="leaderboard-title">TOP PILOTS</span>
      <span className="leaderboard-sub">GALACTIC RANKINGS</span>
    </div>

    <div className="leaderboard-list">
      {leaderboard.slice(0, 10).map((entry, i) => (
        <div key={i} className={`leader-row rank-${i + 1}`}>
          <span className="rank">
            {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i + 1}`}
          </span>
          <span className="nickname">{entry.nickname}</span>
          <span className="score">{entry.score}</span>
        </div>
      ))}
    </div>
  </div>
)}


        {/* Name Input Modal */}
        {showSubmit && (
  <div className="game-overlay">
    <div className="submit-panel">
      <h2>Game Restarted</h2>
      <p className="final-score">{score} POINTS</p>

      <input
        type="text"
        placeholder="Pilot Callsign (optional)"
        value={nickname}
        onChange={(e) => setNickname(e.target.value)}
        maxLength={10}
      />

      <div className="submit-buttons">
        <button
          onClick={() => {
            if (nickname) submitScore();
            setShowSubmit(false);
            setShowLeaderboard(false);
            resetGame();
          }}
        >
          Submit
        </button>

        <button
          className="secondary"
          onClick={() => {
            setShowSubmit(false);
            setShowLeaderboard(false);
            resetGame();
          }}
        >
          Skip
        </button>
      </div>
    </div>
  </div>
)}

        <div className="game-ui-layer">
            <button
  className="icon-btn"
  onClick={handleRestartClick}
  title="Restart"
>
  ⟳
</button>
        </div>
    </div>
  );
};

export default SputnikGame;