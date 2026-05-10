import React, { useEffect, useState } from "react";
import CreatableSelect from "react-select/creatable";
import "../../assets/styles/Kitchen.scss";
import { Modal, TextField } from "@mui/material";

interface Option {
    readonly label: string;
    readonly value: string;
}

interface Recipe {
    name: string;
    tags: string[];
    ingredients: string[];
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
    const [recipes, setRecipes] = useState<Recipe[]>(() => {
        const saved = localStorage.getItem("recipes");
        return saved ? JSON.parse(saved) : [];
    });
    const [selectedIngredients, setSelectedIngredients] = useState<Option[] | null>(null);
    const [recipeName, setRecipeName] = useState<string>("");
    const [isDeleteIngredientModalOpen, setDeleteIngredientModalOpen] = useState(false);
    const [isCreateRecipeModalOpen, setCreateRecipeModalOpen] = useState(false);

    // Save to localStorage whenever ingredients, recipes, or tags change
    useEffect(() => {
        console.log("Saving ingredients to localStorage:", ingredients);
        localStorage.setItem("ingredients", JSON.stringify(ingredients));
    }, [ingredients]);

    useEffect(() => {
        console.log("Saving recipes to localStorage:", recipes);
        localStorage.setItem("recipes", JSON.stringify(recipes));
    }, [recipes]);

    const handleAddIngredient = (inputValue: string) => {
        if (inputValue.trim() !== "") {
            setIngredients([...ingredients, inputValue.trim()].sort((a, b) => a.localeCompare(b)));
            setSelectedIngredients([...(selectedIngredients || []), createOption(inputValue.trim())]);
        }
    };

    const handleAddRecipe = (name: string, tags: string[], ingredients: string[]) => {
        if (name.trim() !== "" && ingredients.length > 0) {
            setRecipes([...recipes, { name: name.trim(), tags, ingredients }]);
        }
    };

    const openDeleteIngredientModal = () => {
        if (selectedIngredients && selectedIngredients.length > 0) {
            setDeleteIngredientModalOpen(true);
        }
    };

    const openCreateRecipeModal = () => {
        if (selectedIngredients && selectedIngredients.length > 0) {
            setCreateRecipeModalOpen(true);
        }
    };

    const handleDeleteIngredients = () => {
        if (selectedIngredients && selectedIngredients.length > 0) {
            const selectedValues = selectedIngredients.map((v) => v.value);
            setIngredients(ingredients.filter((ing) => !selectedValues.includes(ing)));

            // Also remove deleted ingredients from recipes
            setRecipes(
                recipes.map((recipe) => ({
                    ...recipe,
                    ingredients: recipe.ingredients.filter((ing) => !selectedValues.includes(ing)),
                })),
            );

            setDeleteIngredientModalOpen(false);
            setSelectedIngredients(null);
        }
    };

    return (
        <div id="kitchen">
            <Modal open={isDeleteIngredientModalOpen} onClose={() => setDeleteIngredientModalOpen(false)}>
                <div className="modal-content">
                    <p>Are you sure you want to delete the selected ingredients?</p>
                    <p>This will also remove them from any existing recipes.</p>
                    <div className="modal-buttons">
                        <button onClick={() => setDeleteIngredientModalOpen(false)}>Cancel</button>
                        <button className="danger" onClick={handleDeleteIngredients}>
                            Delete
                        </button>
                    </div>
                </div>
            </Modal>

            <Modal open={isCreateRecipeModalOpen} onClose={() => setCreateRecipeModalOpen(false)}>
                <div className="modal-content">
                    <p>Create a recipe with the following ingredients:</p>
                    <CreatableSelect
                        className="ingredient-select"
                        isMulti
                        options={ingredients.map((ing) => ({ value: ing, label: ing }))}
                        onChange={(newValue) => setSelectedIngredients(newValue ? [...newValue] : null)}
                        onCreateOption={handleAddIngredient}
                        value={selectedIngredients}
                    />
                    <TextField
                        required
                        id="outlined-required"
                        label="Recipe Name"
                        placeholder="New Recipe"
                        value={recipeName}
                        onChange={(e) => {
                            setRecipeName(e.target.value);
                        }}
                    />
                    <div className="modal-buttons">
                        <button
                            onClick={() => {
                                setCreateRecipeModalOpen(false);
                                setRecipeName("");
                            }}
                        >
                            Cancel
                        </button>
                        <button
                            className={
                                "success" +
                                (selectedIngredients && selectedIngredients.length > 0 && recipeName.trim() !== ""
                                    ? ""
                                    : " disabled")
                            }
                            onClick={() => {
                                if (selectedIngredients && selectedIngredients.length > 0) {
                                    const selectedValues = selectedIngredients.map((v) => v.value);
                                    handleAddRecipe(recipeName, [], selectedValues);
                                    setRecipeName("");
                                    setCreateRecipeModalOpen(false);
                                }
                            }}
                        >
                            Confirm
                        </button>
                    </div>
                </div>
            </Modal>

            <div className="items-container">
                <h1 id="ingredients">Ingredients</h1>
                <div className="ingredients">
                    <CreatableSelect
                        isMulti
                        options={ingredients.map((ing) => ({ value: ing, label: ing }))}
                        onChange={(newValue) => setSelectedIngredients(newValue ? [...newValue] : null)}
                        onCreateOption={handleAddIngredient}
                        value={selectedIngredients}
                    />
                    <button
                        className={
                            "success" + (selectedIngredients && selectedIngredients.length > 0 ? "" : " disabled")
                        }
                        onClick={openCreateRecipeModal}
                    >
                        Create Recipe
                    </button>
                    <button
                        className={
                            "danger" + (selectedIngredients && selectedIngredients.length > 0 ? "" : " disabled")
                        }
                        onClick={openDeleteIngredientModal}
                    >
                        Delete Selected Ingredients
                    </button>
                </div>
                <h1 id="recipes">Recipes</h1>
            </div>
        </div>
    );
}

export default Kitchen;
