import React, { useEffect, useState } from "react";
import CreatableSelect from "react-select/creatable";
import "../../assets/styles/Kitchen.scss";
import {
    Accordion,
    AccordionActions,
    AccordionDetails,
    AccordionSummary,
    Button,
    Modal,
    TextField,
} from "@mui/material";
import { Delete, Edit, ExpandMore } from "@mui/icons-material";

interface Option {
    readonly label: string;
    readonly value: string;
}

interface Recipe {
    name: string;
    tags: string[];
    ingredients: string[];
    notes: string;
}

const createOption = (label: string) => ({
    label,
    value: label.toLowerCase().replace(/\W/g, ""),
});

function Kitchen({ parentToChild }: any) {
    const { mode } = parentToChild;

    const [ingredients, setIngredients] = useState<string[]>(() => {
        const saved = localStorage.getItem("ingredients");
        return saved ? JSON.parse(saved) : [];
    });
    const [recipes, setRecipes] = useState<Recipe[]>(() => {
        const saved = localStorage.getItem("recipes");
        return saved ? JSON.parse(saved) : [];
    });
    const [selectedIngredients, setSelectedIngredients] = useState<Option[] | null>(null);
    const [recipeName, setRecipeName] = useState<string>(""); // Used for both creating and editing recipes, also set when editing a recipe
    const [recipeNotes, setRecipeNotes] = useState<string>("");
    const [recipeSearchName, setRecipeSearchName] = useState<string>("");
    const [editRecipeSelectedIngredients, setEditRecipeSelectedIngredients] = useState<Option[] | null>(null);

    const [expandedRecipe, setExpandedRecipe] = React.useState<string | false>(false);
    const [isEditingRecipe, setEditingRecipe] = useState(false);

    const [isDeleteIngredientModalOpen, setDeleteIngredientModalOpen] = useState(false);
    const [isCreateRecipeModalOpen, setCreateRecipeModalOpen] = useState(false);
    const [isDeleteRecipeModalOpen, setDeleteRecipeModalOpen] = useState(false);

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
            if (isEditingRecipe) {
                setEditRecipeSelectedIngredients([
                    ...(editRecipeSelectedIngredients || []),
                    createOption(inputValue.trim()),
                ]);
            } else {
                setSelectedIngredients([...(selectedIngredients || []), createOption(inputValue.trim())]);
            }
        }
    };

    const handleAddRecipe = (name: string, tags: string[], ingredients: string[], notes: string) => {
        if (name.trim() !== "" && ingredients.length > 0) {
            setRecipes(
                [...recipes, { name: name.trim(), tags, ingredients, notes }].sort((a, b) =>
                    a.name.localeCompare(b.name),
                ),
            );
        }
    };

    const openDeleteIngredientModal = () => {
        if (selectedIngredients && selectedIngredients.length > 0) {
            setDeleteIngredientModalOpen(true);
        }
    };

    // This needs its own isEditing variable since the isEditingRecipe state isn't set until the edit button in the recipe accordion is clicked
    const openCreateRecipeModal = (isEditing = false) => {
        if (isEditing) {
            setCreateRecipeModalOpen(true);
        } else if (selectedIngredients && selectedIngredients.length > 0) {
            setCreateRecipeModalOpen(true);
            setRecipeName("");
            setRecipeNotes("");
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

    const handleDeleteRecipe = (name: string = expandedRecipe as string) => {
        setRecipes(recipes.filter((recipe) => recipe.name !== name));
        console.log("Deleted recipe:", name);
        console.log(recipes);

        setDeleteRecipeModalOpen(false);
    };

    const handleExpandRecipe = (recipePanel: string) => (event: React.SyntheticEvent, isExpanded: boolean) => {
        setExpandedRecipe(isExpanded ? recipePanel : false);
    };

    const getExpandedRecipe = () => {
        if (expandedRecipe) {
            return recipes.find((recipe) => recipe.name === expandedRecipe);
        }
        return null;
    };

    return (
        <div id="kitchen">
            <Modal open={isDeleteIngredientModalOpen} onClose={() => setDeleteIngredientModalOpen(false)}>
                <div className={`modal-content ${mode === "dark" ? "dark-mode" : "light-mode"}`}>
                    <p>Are you sure you want to delete the selected ingredients?</p>
                    <p>This will also remove them from any existing recipes.</p>
                    <div className="modal-buttons">
                        <Button onClick={() => setDeleteIngredientModalOpen(false)}>Cancel</Button>
                        <Button className="danger" onClick={handleDeleteIngredients}>
                            Delete
                        </Button>
                    </div>
                </div>
            </Modal>

            <Modal open={isDeleteRecipeModalOpen} onClose={() => setDeleteRecipeModalOpen(false)}>
                <div className={`modal-content ${mode === "dark" ? "dark-mode" : "light-mode"}`}>
                    <p>Are you sure you want to delete the recipe: {expandedRecipe}?</p>
                    <p>This cannot be undone!</p>
                    <div className="modal-buttons">
                        <Button onClick={() => setDeleteRecipeModalOpen(false)}>Cancel</Button>
                        <Button className="danger" onClick={() => handleDeleteRecipe(expandedRecipe as string)}>
                            Delete
                        </Button>
                    </div>
                </div>
            </Modal>

            <Modal open={isCreateRecipeModalOpen} onClose={() => setCreateRecipeModalOpen(false)}>
                <div className={`modal-content ${mode === "dark" ? "dark-mode" : "light-mode"}`}>
                    <p>{isEditingRecipe ? "Edit the recipe:" : "Create a recipe with the following ingredients:"}</p>
                    <CreatableSelect
                        className="ingredient-select"
                        isMulti
                        options={ingredients.map((ing) => ({ value: ing, label: ing }))}
                        placeholder="Select ingredients..."
                        noOptionsMessage={() => "Type to add new ingredients"}
                        onChange={(newValue) => {
                            //setExpandedRecipe(false); // TODO: fix this behaviour
                            isEditingRecipe
                                ? setEditRecipeSelectedIngredients(newValue ? [...newValue] : null)
                                : setSelectedIngredients(newValue ? [...newValue] : null);
                        }}
                        onCreateOption={handleAddIngredient}
                        value={isEditingRecipe ? editRecipeSelectedIngredients : selectedIngredients}
                    />
                    <TextField
                        size="small"
                        required
                        id="outlined-required"
                        label="Recipe Name"
                        placeholder="New Recipe"
                        value={recipeName}
                        onChange={(e) => {
                            setRecipeName(e.target.value);
                        }}
                    />
                    <TextField
                        size="small"
                        multiline
                        minRows={3}
                        id="outlined-textarea"
                        label="Notes"
                        placeholder="Additional notes for the recipe (optional)"
                        value={recipeNotes}
                        onChange={(e) => {
                            setRecipeNotes(e.target.value);
                        }}
                    />
                    <div className="modal-buttons">
                        <Button
                            onClick={() => {
                                setCreateRecipeModalOpen(false);
                                setRecipeName("");
                                setRecipeNotes("");
                                if (isEditingRecipe) {
                                    setEditingRecipe(false);
                                    setEditRecipeSelectedIngredients(null);
                                }
                            }}
                        >
                            Cancel
                        </Button>
                        <Button
                            className={
                                (!isEditingRecipe &&
                                    selectedIngredients &&
                                    selectedIngredients.length > 0 &&
                                    recipeName.trim() !== "") ||
                                (isEditingRecipe &&
                                    editRecipeSelectedIngredients &&
                                    editRecipeSelectedIngredients.length > 0 &&
                                    recipeName.trim() !== "")
                                    ? "success"
                                    : "disabled"
                            }
                            onClick={() => {
                                if (
                                    (isEditingRecipe &&
                                        recipeName.trim() !== "" &&
                                        editRecipeSelectedIngredients &&
                                        editRecipeSelectedIngredients.length > 0) ||
                                    (!isEditingRecipe && selectedIngredients && selectedIngredients.length > 0)
                                ) {
                                    const selectedValues = isEditingRecipe
                                        ? editRecipeSelectedIngredients!.map((v) => v.value)
                                        : selectedIngredients!.map((v) => v.value);

                                    if (isEditingRecipe) {
                                        console.log("deleting from edit");
                                        // Delete old recipe and add new one in a single state update
                                        setRecipes(
                                            recipes
                                                .filter((recipe) => recipe.name !== expandedRecipe)
                                                .concat([
                                                    {
                                                        name: recipeName,
                                                        tags: [],
                                                        ingredients: selectedValues,
                                                        notes: recipeNotes,
                                                    },
                                                ])
                                                .sort((a, b) => a.name.localeCompare(b.name)),
                                        );
                                        setExpandedRecipe(recipeName);
                                        setEditingRecipe(false);
                                    } else {
                                        handleAddRecipe(recipeName, [], selectedValues, recipeNotes);
                                    }

                                    setRecipeName("");
                                    setRecipeNotes("");
                                    setEditRecipeSelectedIngredients(null);
                                    setCreateRecipeModalOpen(false);
                                }
                            }}
                        >
                            Confirm
                        </Button>
                    </div>
                </div>
            </Modal>

            <div className="items-container">
                <h1 id="ingredients">Ingredients</h1>
                <div className="ingredients">
                    <CreatableSelect
                        className="ingredient-select"
                        isMulti
                        placeholder="Select or add ingredients..."
                        noOptionsMessage={() => "Type to add new ingredients"}
                        options={ingredients.map((ing) => ({ value: ing, label: ing }))}
                        onChange={(newValue) => setSelectedIngredients(newValue ? [...newValue] : null)}
                        onCreateOption={handleAddIngredient}
                        value={selectedIngredients}
                    />
                    <div className="ingredients-buttons">
                        <Button
                            className={
                                "success" + (selectedIngredients && selectedIngredients.length > 0 ? "" : " disabled")
                            }
                            onClick={() => openCreateRecipeModal(false)}
                        >
                            Create Recipe
                        </Button>
                        <Button
                            className={
                                "danger" + (selectedIngredients && selectedIngredients.length > 0 ? "" : " disabled")
                            }
                            onClick={openDeleteIngredientModal}
                        >
                            Delete Selected Ingredients
                        </Button>
                    </div>
                </div>
                <h1 id="recipes">Recipes</h1>
                <div className="recipes">
                    <TextField
                        disabled={recipes.length === 0}
                        className={recipes.length === 0 ? " disabled" : ""}
                        size="small"
                        id="recipe-search"
                        label="Search Recipes"
                        placeholder="Filter recipes by name..."
                        value={recipeSearchName}
                        onChange={(e) => {
                            setRecipeSearchName(e.target.value);
                        }}
                    />
                    {recipes.length === 0 ? (
                        <p>No recipes yet. Create one by selecting ingredients above!</p>
                    ) : (
                        recipes
                            .filter((recipe) =>
                                selectedIngredients && selectedIngredients.length > 0
                                    ? recipe.ingredients.every((ing) =>
                                          selectedIngredients?.some((sel) => sel.value === ing),
                                      )
                                    : true,
                            )
                            .filter((recipe) => recipe.name.toLowerCase().includes(recipeSearchName.toLowerCase()))
                            .map((recipe) => (
                                <Accordion
                                    expanded={expandedRecipe === recipe.name}
                                    onChange={handleExpandRecipe(recipe.name)}
                                >
                                    <AccordionSummary expandIcon={<ExpandMore />}>
                                        <h3>{recipe.name}</h3>
                                    </AccordionSummary>
                                    <AccordionDetails>
                                        Ingredients:
                                        <ul>
                                            {recipe.ingredients.map((ing, index) => (
                                                <li key={index}>{ing}</li>
                                            ))}
                                        </ul>
                                        {recipe.notes && (
                                            <div style={{ whiteSpace: "pre-line" }}>
                                                Notes:<br></br>
                                                {recipe.notes}
                                            </div>
                                        )}
                                    </AccordionDetails>
                                    <AccordionActions>
                                        <Button
                                            variant="text"
                                            onClick={() => {
                                                setEditingRecipe(true);
                                                setRecipeName(expandedRecipe as string);
                                                setRecipeNotes(getExpandedRecipe()?.notes || "");
                                                setEditRecipeSelectedIngredients(
                                                    ingredients
                                                        .filter((ing) => getExpandedRecipe()?.ingredients.includes(ing))
                                                        .map((ing) => createOption(ing)),
                                                );
                                                openCreateRecipeModal(true);
                                            }}
                                        >
                                            <Edit />
                                        </Button>
                                        <Button
                                            variant="text"
                                            color="error"
                                            onClick={() => {
                                                setDeleteRecipeModalOpen(true);
                                            }}
                                        >
                                            <Delete />
                                        </Button>
                                    </AccordionActions>
                                </Accordion>
                            ))
                    )}
                </div>
            </div>
        </div>
    );
}

export default Kitchen;
