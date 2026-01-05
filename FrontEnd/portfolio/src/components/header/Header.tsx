import React from "react";
import "./Header.css";

const Header: React.FC = () => {
  return (
    <header className="header">
      <div className="logo-section">
        <div className="logo-icon">&gt;_</div>
        <span className="logo-text">Shane Hunat : )</span>
      </div>

      <div className="right-section">
        <nav className="nav-links">
          <a href="#about">About</a>
          <a href="#skills">Skills</a>
          <a href="#projects">Projects</a>
        </nav>

        <button className="contact-btn">Contact</button>
      </div>
    </header>
  );
};

export default Header;
