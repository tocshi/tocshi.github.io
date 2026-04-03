import React, { useEffect, useState } from "react";
import CreatableSelect from "react-select/creatable";
import "../../assets/styles/Kitchen.scss";

function Kitchen() {
    const [ingredients, setIngredients] = useState<string[]>(() => {
        const saved = localStorage.getItem("ingredients");
        return saved ? JSON.parse(saved) : [];
    });
    const [addIngredientsInput, setAddIngredientsInput] = useState("");

    // Save to localStorage whenever ingredients change
    useEffect(() => {
        console.log("Saving ingredients to localStorage:", ingredients);
        localStorage.setItem("ingredients", JSON.stringify(ingredients));
    }, [ingredients]);

    const handleAddIngredient = () => {
        if (addIngredientsInput.trim() !== "") {
            setIngredients([...ingredients, addIngredientsInput.trim()]);
            setAddIngredientsInput("");
        }
    };

    return (
        <div id="kitchen">
            <div className="items-container">
                <h1>Kitchen</h1>
                <div className="ingredients">
                    <input
                        type="text"
                        value={addIngredientsInput}
                        onChange={(e) => setAddIngredientsInput(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleAddIngredient()}
                        placeholder="Enter ingredient..."
                    />
                    <button onClick={handleAddIngredient}>Add Ingredient</button>

                    <ul>
                        {ingredients.map((ing, i) => (
                            <li key={i}>{ing}</li>
                        ))}
                    </ul>
                    <CreatableSelect isMulti options={ingredients.map((ing) => ({ value: ing, label: ing }))} />
                </div>
            </div>
        </div>
    );
}

export default Kitchen;
