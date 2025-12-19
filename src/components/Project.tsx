import lifeofsaca from '../assets/images/lifeofsaca.png';
import castle0 from '../assets/images/Castle0.png';
import castle1 from '../assets/images/Castle1.png';
import castle2 from '../assets/images/Castle2.png';
import castle3 from '../assets/images/Castle3.png';
import '../assets/styles/Project.scss';

function Project() {
    return(
    <div className="projects-container" id="projects">
        <h1>Projects</h1>
        <div className="projects-grid">
            <div className="project">
                <a href="https://tocshi.itch.io/life-of-saca" target="_blank" rel="noreferrer"><img src={lifeofsaca} className="zoom" alt="thumbnail" width="100%"/></a>
                <a href="https://tocshi.itch.io/life-of-saca" target="_blank" rel="noreferrer"><h2>Life of Saca</h2></a>
                <p>A week-long game development project I made while learning Unity. After completing a few tutorials to learn some Unity and C# basics, I decided to challenge myself to complete a game project in a week. Inspired by <a href="https://twitter.com/epinesis/status/1666662584127467521" target="_blank" rel="noreferrer">this sensational tweet</a>, I set out to develop a small browser-playable game that's easy to pick up and offers just a few minutes of play time. <a href="https://tocshi.itch.io/life-of-saca" target="_blank" rel="noreferrer">Click here to try it out in your browser!</a></p>
            </div>
            <div className="project">
                <iframe width="100%" className="zoom" style={{ aspectRatio: "16/9" }} src="https://www.youtube.com/embed/_nQ6M01RTg8" title="Adrift in Somnium - Trailer" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"/>
                <a href="https://tocshi.itch.io/adrift-in-somnium" target="_blank" rel="noreferrer"><h2>Adrift in Somnium</h2></a>
                <p>A project made for UBC's CPSC427 course. I led a team of 6 to create and finish a game project using C++ from scratch under tight deadlines and restrictions. I was in charge of implementing many features, such as combat, game progression, enemy behaviour, etc. along with organizing team planning and helping others with their feature implementations. I myself have also spent a substantial amount of time play-testing and improving the game based on feedback I've received from various testers. <a href="https://tocshi.itch.io/adrift-in-somnium" target="_blank" rel="noreferrer">Click here to download the game for yourself!</a></p>
            </div>
            <div className="project">
                <iframe width="100%" className="zoom" style={{ aspectRatio: "16/9" }} src="https://www.youtube.com/embed/4yDRdI9i6IA" title="Chimerarms - Demo" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"/>
                <a href="https://tocshi.itch.io/chimerarms" target="_blank" rel="noreferrer"><h2>Chimerarms</h2></a>
                <p>My submission for the game jam <a href="https://itch.io/jam/miz-jam-1" target="_blank" rel="noreferrer">Miz Jam 1</a>, where entrants have 48 hours to create a game using the <a href="https://kenney.nl/assets/bit-pack" target="_blank" rel="noreferrer">Kenney 1-Bit Pack</a> art pack for the game's graphics. I saw the art pack's various sprites for fantasy-style weapons and came up with an idea of mashing them together to create combinations of weapons that share some attributes from the weapons used to make them. It was a little challenging to scale the difficulty of the game with the random natures of the enemy spawns, but I was content with what I had submitted at the time of the deadline. <a href="https://tocshi.itch.io/chimerarms" target="_blank" rel="noreferrer">Click here to download the game for yourself!</a></p>
            </div>
            <div className="project">
                <div className="slideshow zoom">
                    <img src={castle0} alt="Unreal Engine Castle Scene Slideshow" />
                    <img src={castle1} alt="Unreal Engine Castle Scene Slideshow" />
                    <img src={castle2} alt="Unreal Engine Castle Scene Slideshow" />
                    <img src={castle3} alt="Unreal Engine Castle Scene Slideshow" />
                </div>
                <h2 style={{ paddingTop: "10px" }}>Unreal Engine Castle Scene</h2>
                <p>A project I made to learn Unreal Engine 5. I followed various tutorials to learn UE5's interface and workflow, and familiarized myself with Nanite and Lumen, UE5's new mesh-rendering and lighting technologies. I also learned basic blueprinting to modify various aspects of the project. After learning the basics of using Unreal Engine 5 and its wide array of tools, I used various assets from Megascans and Quixel Bridge to construct a beautiful landscape and build some castles.</p>
            </div>
            <div className="project">
                <iframe width="100%" className="zoom" style={{ aspectRatio: "16/9" }} src="https://www.youtube.com/embed/JDJRBdMOogY" title="Project Lila - Demo" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"/>
                <a href="https://youtu.be/JDJRBdMOogY" target="_blank" rel="noreferrer"><h2>Project Lila Concept</h2></a>
                <p>Based on an Fantasy Action RPG idea I've had for several years, I worked with <a href="https://github.com/c0linw" target="_blank" rel="noreferrer">c0linw</a> and <a href="https://github.com/MichaelXian" target="_blank" rel="noreferrer">MichaelXian</a> to develop a game based on this idea. We used this project to learn about the GameMaker engine and experiment with implementing a proof-of-concept ARPG combat system, using GameMaker Studio 2. However, due to engine limitations, the project has been put on hold, and will resume development in a different form in the future. If you are interested in seeing the entire development update playlist, you can find it <a href="https://www.youtube.com/playlist?list=PLwmx6LhN4gN7uc7KSynXkGjq_d9XXSTIA" target="_blank" rel="noreferrer">here</a>.</p>
            </div>
            <div className="project">
                <iframe width="100%" className="zoom" style={{ aspectRatio: "16/9" }} src="https://www.youtube.com/embed/t1HCjLRCn9I" title="Skirmish with the Miko Fox - Demo" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"/>
                <a href="https://youtu.be/t1HCjLRCn9I" target="_blank" rel="noreferrer"><h2>Skirmish with the Miko Fox</h2></a>
                <p>A <a href="https://en.wikipedia.org/wiki/Touhou_Project" target="_blank" rel="noreferrer">Touhou Project</a>-styled game written using the C-like language <a href="https://dmf.shrinemaiden.org/wiki/Main_Page" target="_blank" rel="noreferrer">Danmakufu ph3</a>. I intended for the game to consist of a single "boss fight" encounter that focused on displaying colourful projectile patterns rather than conventional gameplay. I started making individual scripts using Danmakufu in August of 2018, and started working on a more unified game in January of 2019.</p>
            </div>
        </div>
    </div>
    );
}

export default Project;