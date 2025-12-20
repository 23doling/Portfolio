import React from "react";
import "./Container.css";

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

      <div className="hero-buttons">
        <button className="primary-btn">View My Work</button>
        <button className="secondary-btn">Get in Touch</button>
      </div>

      <div className="hero-icons">
        <i className="icon"></i>
        <i className="icon"></i>
        <i className="icon"></i>
      </div>

      <div className="scroll-indicator">⌄</div>
    </section>
  );
};

export default Container;
