import React, { useEffect, useState } from "react";
import CreatableSelect from "react-select/creatable";
import "../../assets/styles/Kitchen.scss";

interface Option {
    readonly label: string;
    readonly value: string;
}

const createOption = (label: string) => ({
    label,
    value: label.toLowerCase().replace(/\W/g, ""),
});

function Kitchen() {
    const [ingredients, setIngredients] = useState<string[]>(() => {
        const saved = localStorage.getItem("ingredients");
        return saved ? JSON.parse(saved) : [];
    });
    const [value, setValue] = useState<Option[] | null>(null);

    // Save to localStorage whenever ingredients change
    useEffect(() => {
        console.log("Saving ingredients to localStorage:", ingredients);
        localStorage.setItem("ingredients", JSON.stringify(ingredients));
    }, [ingredients]);

    const handleAddIngredient = (inputValue: string) => {
        if (inputValue.trim() !== "") {
            setIngredients([...ingredients, inputValue.trim()]);
            setValue([...(value || []), createOption(inputValue.trim())]);
        }
    };

    const handleDeleteIngredients = () => {
        if (value && value.length > 0) {
            const selectedValues = value.map((v) => v.value);
            setIngredients(ingredients.filter((ing) => !selectedValues.includes(ing)));
            setValue(null);
        }
    };

    return (
        <div id="kitchen">
            <div className="items-container">
                <h1 id="ingredients">Ingredients</h1>
                <div className="ingredients">
                    <CreatableSelect
                        isMulti
                        options={ingredients.map((ing) => ({ value: ing, label: ing }))}
                        onChange={(newValue) => setValue(newValue ? [...newValue] : null)}
                        onCreateOption={handleAddIngredient}
                        value={value}
                    />
                </div>
                <button onClick={handleDeleteIngredients}>Delete Selected Ingredients</button>
                <h1 id="recipes">Recipes</h1>
            </div>
        </div>
    );
}

export default Kitchen;
