import React, { useState, useEffect } from "react";
import { Main, Timeline, Expertise, Project, Contact, Navigation, Footer } from "./components";
import { Kitchen } from "./components/kitchen";
import FadeIn from "./components/FadeIn";
import "./index.scss";
import { BrowserRouter, Route, Routes } from "react-router-dom";

function App() {
    const [mode, setMode] = useState<string>("dark");

    const handleModeChange = () => {
        if (mode === "dark") {
            setMode("light");
        } else {
            setMode("dark");
        }
    };

    useEffect(() => {
        window.scrollTo({ top: 0, left: 0, behavior: "smooth" });
    }, []);

    return (
        <BrowserRouter>
            <div className={`main-container ${mode === "dark" ? "dark-mode" : "light-mode"}`}>
                <Routes>
                    <Route
                        path="/"
                        element={
                            <>
                                <Navigation parentToChild={{ mode }} modeChange={handleModeChange} />
                                <FadeIn transitionDuration={700}>
                                    <Main />
                                    <Expertise />
                                    <Timeline />
                                    <Project />
                                    <Contact />
                                </FadeIn>
                                <Footer />
                            </>
                        }
                    />
                    <Route
                        path="/kitchen"
                        element={
                            <>
                                <Navigation parentToChild={{ mode }} modeChange={handleModeChange} />
                                <FadeIn transitionDuration={700}>
                                    <Kitchen parentToChild={{ mode }} />
                                </FadeIn>
                            </>
                        }
                    />
                </Routes>
            </div>
        </BrowserRouter>
    );
}

export default App;
