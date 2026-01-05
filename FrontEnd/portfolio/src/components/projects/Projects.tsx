import "./Projects.css";

const Projects = () => {
  return (
    <section id="projects" className="projects">
      <h2>Projects</h2>

      <div className="project-grid">
        <div className="project-card">
          <h3>Inventory System</h3>
          <p>Full-stack app with Docker, PostgreSQL, CI/CD pipeline.</p>
        </div>

        <div className="project-card">
          <h3>DevOps Pipeline</h3>
          <p>GitHub Actions + Docker + server deployment.</p>
        </div>

        <div className="project-card">
          <h3>Cloud Portfolio</h3>
          <p>Hosted React app with infrastructure as code.</p>
        </div>
      </div>
    </section>
  );
};

export default Projects;
