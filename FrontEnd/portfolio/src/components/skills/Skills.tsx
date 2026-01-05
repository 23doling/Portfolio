import "./Skills.css";

const skills = [
  "React",
  "TypeScript",
  "Docker",
  "Linux",
  "CI/CD",
  "Terraform",
  "FastAPI",
  "PostgreSQL",
  "AWS"
];

const Skills = () => {
  return (
    <section id="skills" className="skills">
      <h2>Skills</h2>

      <div className="skills-grid">
        {skills.map(skill => (
          <div key={skill} className="skill-card">
            {skill}
          </div>
        ))}
      </div>
    </section>
  );
};

export default Skills;
