import React from "react";
import "./Container.css";
import About from "../about/About";
import Skills from "../skills/Skills";
import Projects from "../projects/Projects";
import Contact from "../contact/Contact";
import Game from "../game/SputnikGame";


const Container: React.FC = () => {
  return (
    <section className="hero">
      <div className="status-badge">
        <span className="dot"></span>
        Available for new opportunities
      </div>

      <h1 className="hero-title">Shane Hunat</h1>


      <h4 className="hero-subtitle">
        Your Diamond in the rough Talent!
      </h4>

      <p className="hero-description">
         Developing expertise across data, Devops, full-stack engineering, and cloud technologies as I refine into a fully polished professional.
      </p>

      <h1 className="hero-title">VibeCode Game</h1>

<div className="hero-game">
  <Game />
</div>

      <div className="hero-icons">
        <i className="icon"></i>
        <i className="icon"></i>
        <i className="icon"></i>
      </div>

      <div className="scroll-indicator">⌄</div>

    <div>
      <About />
      <Skills />
      <Projects />
      <Contact />
    </div>


    </section>
  );
  
};

export default Container;
