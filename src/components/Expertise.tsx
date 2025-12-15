import React from "react";
import '@fortawesome/free-regular-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faReact } from '@fortawesome/free-brands-svg-icons';
import { faGamepad } from "@fortawesome/free-solid-svg-icons";
import Chip from '@mui/material/Chip';
import '../assets/styles/Expertise.scss';

const labelsFirst = [
    "React",
    "Redux",
    "TypeScript",
    "HTML5",
    "CSS3",
    "LESS",
    "AWS",
    "Jest",
    "Cypress",
    "Python",
    "SQL",
    "Node.js",
];

const labelsSecond = [
    "Godot 4",
    "Unity",
    "Gamemaker Studio 2",
];

function Expertise() {
    return (
    <div className="container" id="expertise">
        <div className="skills-container">
            <h1>Expertise</h1>
            <div className="skills-grid">
                <div className="skill">
                    <FontAwesomeIcon icon={faReact} size="3x"/>
                    <h3>Full Stack Web Development</h3>
                    <p>I have contributed to maintaining web applications that handle large amounts of user data used by many businesses, using modern technologies such as React/Redux and AWS. I have a strong proficiency in UI/UX development with React and HTML5/CSS3.</p>
                    <div className="flex-chips">
                        <span className="chip-title">Tech stack:</span>
                        {labelsFirst.map((label, index) => (
                            <Chip key={index} className='chip' label={label} />
                        ))}
                    </div>
                </div>

                <div className="skill">
                    <FontAwesomeIcon icon={faGamepad} size="3x"/>
                    <h3>Game Development & Design</h3>
                    <p>I have experience developing games using various engines and tools. I have a strong understanding of game design principles, especially in Role-Playing Games and Roguelikes, and can create engaging gameplay experiences.</p>
                    <div className="flex-chips">
                        <span className="chip-title">Tech stack:</span>
                        {labelsSecond.map((label, index) => (
                            <Chip key={index} className='chip' label={label} />
                        ))}
                    </div>
                </div>
            </div>
        </div>
    </div>
    );
}

export default Expertise;