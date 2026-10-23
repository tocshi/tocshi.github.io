import React, { useEffect, useState } from "react";
import CreatableSelect from "react-select/creatable";
import Select from "react-select";
import "../../assets/styles/Kitchen.scss";
import {
    Accordion,
    AccordionActions,
    AccordionDetails,
    AccordionSummary,
    Button,
    Chip,
    IconButton,
    Modal,
    TextField,
} from "@mui/material";
import { Delete, Edit, ExpandMore, QuestionMark, Shuffle } from "@mui/icons-material";

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
    const [tags, setTags] = useState<string[]>(() => {
        const saved = localStorage.getItem("tags");
        return saved ? JSON.parse(saved) : [];
    });

    const [selectedIngredients, setSelectedIngredients] = useState<Option[] | null>(null);
    const [recipeName, setRecipeName] = useState<string>(""); // Used for both creating and editing recipes, also set when editing a recipe
    const [recipeNotes, setRecipeNotes] = useState<string>("");
    const [recipeSearchName, setRecipeSearchName] = useState<string>("");
    const [editRecipeSelectedIngredients, setEditRecipeSelectedIngredients] = useState<Option[] | null>(null);
    const [recipeTags, setRecipeTags] = useState<string[]>([]);
    const [selectedTags, setSelectedTags] = useState<string[]>([]);
    const [newTag, setNewTag] = useState("");

    const [expandedRecipe, setExpandedRecipe] = React.useState<string | false>(false);
    const [isEditingRecipe, setEditingRecipe] = useState(false);

    const [isDeleteIngredientModalOpen, setDeleteIngredientModalOpen] = useState(false);
    const [isCreateRecipeModalOpen, setCreateRecipeModalOpen] = useState(false);
    const [isDeleteRecipeModalOpen, setDeleteRecipeModalOpen] = useState(false);
    const [isHelpModalOpen, setHelpModalOpen] = useState(false);
    const [isEditTagsModalOpen, setEditTagsModalOpen] = useState(false);
    const [randomRecipe, setRandomRecipe] = useState<Recipe | null>(null);

    // Save to localStorage whenever ingredients, recipes, or tags change
    useEffect(() => {
        console.log("Saving ingredients to localStorage:", ingredients);
        localStorage.setItem("ingredients", JSON.stringify(ingredients));
    }, [ingredients]);

    useEffect(() => {
        console.log("Saving recipes to localStorage:", recipes);
        localStorage.setItem("recipes", JSON.stringify(recipes));
    }, [recipes]);

    useEffect(() => {
        console.log("Saving tags to localStorage:", tags);
        localStorage.setItem("tags", JSON.stringify(tags));
    }, [tags]);

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

    const handleAddTag = () => {
        const trimmedTag = newTag.trim();
        if (trimmedTag && !tags.some((tag) => tag.toLowerCase() === trimmedTag.toLowerCase())) {
            setTags([...tags, trimmedTag].sort((a, b) => a.localeCompare(b)));
        }
        setNewTag("");
    };

    const handleDeleteTag = (tagToDelete: string) => {
        setTags(tags.filter((tag) => tag !== tagToDelete));
        setSelectedTags(selectedTags.filter((tag) => tag !== tagToDelete));
        setRecipes(
            recipes.map((recipe) => ({
                ...recipe,
                tags: (recipe.tags || []).filter((tag) => tag !== tagToDelete),
            })),
        );
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
            setRecipeTags([]);
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

    const filteredRecipes = recipes
        .filter((recipe) =>
            selectedIngredients && selectedIngredients.length > 0
                ? recipe.ingredients.every((ing) => selectedIngredients.some((sel) => sel.label === ing))
                : true,
        )
        .filter((recipe) => recipe.name.toLowerCase().includes(recipeSearchName.toLowerCase()))
        .filter((recipe) =>
            selectedTags.length > 0 ? selectedTags.some((tag) => (recipe.tags || []).includes(tag)) : true,
        );

    return (
        <div id="kitchen">
            <Modal open={isHelpModalOpen} onClose={() => setHelpModalOpen(false)}>
                <div className={`modal-content ${mode === "dark" ? "dark-mode" : "light-mode"}`}>
                    <h2>Getting Started</h2>
                    <p>
                        Start typing in the ingredients search box to add a new ingredient, or select an ingredient you
                        previously added. When you have added all the ingredients you want, click the "Create Recipe"
                        button to save your new recipe.
                    </p>
                    <p>
                        Created recipes will appear in the "Recipes" section, where you can click on them to expand and
                        view their details.
                    </p>
                    <p>
                        You can filter recipes by name using the search box in the "Recipes" section, or by selecting
                        ingredients and tags. Only recipes that match your selected filters will be shown. You can
                        create and remove tags with the "Manage Tags" button, then assign them when creating or editing
                        a recipe.
                    </p>
                </div>
            </Modal>

            <Modal open={randomRecipe !== null} onClose={() => setRandomRecipe(null)}>
                <div className={`modal-content ${mode === "dark" ? "dark-mode" : "light-mode"}`}>
                    {randomRecipe && (
                        <>
                            <h2>{randomRecipe.name}</h2>
                            <div className="recipe-details">
                                <div>
                                    Ingredients:
                                    <ul>
                                        {randomRecipe.ingredients.map((ing, index) => (
                                            <li key={index}>{ing}</li>
                                        ))}
                                    </ul>
                                </div>
                                {randomRecipe.notes && (
                                    <div style={{ whiteSpace: "pre-line" }}>
                                        Notes:<br></br>
                                        {randomRecipe.notes}
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>
            </Modal>

            <Modal open={isEditTagsModalOpen} onClose={() => setEditTagsModalOpen(false)}>
                <div className={`modal-content tags-modal-content ${mode === "dark" ? "dark-mode" : "light-mode"}`}>
                    <h2>Manage Tags</h2>
                    <div className="add-tag-controls">
                        <TextField
                            size="small"
                            label="Tag Name"
                            value={newTag}
                            onChange={(event) => setNewTag(event.target.value)}
                            onKeyDown={(event) => {
                                if (event.key === "Enter") {
                                    event.preventDefault();
                                    handleAddTag();
                                }
                            }}
                        />
                        <Button
                            onClick={handleAddTag}
                            disabled={
                                !newTag.trim() || tags.some((tag) => tag.toLowerCase() === newTag.trim().toLowerCase())
                            }
                        >
                            Add
                        </Button>
                    </div>
                    {tags.length > 0 ? (
                        <div className="managed-tags">
                            {tags.map((tag) => (
                                <Chip key={tag} label={tag} variant="outlined" onDelete={() => handleDeleteTag(tag)} />
                            ))}
                        </div>
                    ) : (
                        <p>No tags yet. Add one above.</p>
                    )}
                    <div className="modal-buttons">
                        <Button onClick={() => setEditTagsModalOpen(false)}>Done</Button>
                    </div>
                </div>
            </Modal>

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
                    <Select
                        className="ingredient-select"
                        isMulti
                        options={tags.map((tag) => ({ value: tag, label: tag }))}
                        placeholder="Select tags (optional)..."
                        noOptionsMessage={() => "Create tags with Manage Tags"}
                        onChange={(newValue) => setRecipeTags(newValue ? newValue.map((option) => option.label) : [])}
                        value={recipeTags.map((tag) => ({ value: tag, label: tag }))}
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
                                setRecipeTags([]);
                            }}
                        >
                            Cancel
                        </Button>
                        <Button
                            id="confirm-create-recipe-button"
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
                                    const selectedOptions = isEditingRecipe
                                        ? editRecipeSelectedIngredients!.map((v) => v.label)
                                        : selectedIngredients!.map((v) => v.label);

                                    if (isEditingRecipe) {
                                        console.log("deleting from edit");
                                        // Delete old recipe and add new one in a single state update
                                        setRecipes(
                                            recipes
                                                .filter((recipe) => recipe.name !== expandedRecipe)
                                                .concat([
                                                    {
                                                        name: recipeName,
                                                        tags: recipeTags,
                                                        ingredients: selectedOptions,
                                                        notes: recipeNotes,
                                                    },
                                                ])
                                                .sort((a, b) => a.name.localeCompare(b.name)),
                                        );
                                        setExpandedRecipe(recipeName);
                                        setEditingRecipe(false);
                                    } else {
                                        handleAddRecipe(recipeName, recipeTags, selectedOptions, recipeNotes);
                                    }

                                    setRecipeName("");
                                    setRecipeNotes("");
                                    setRecipeTags([]);
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
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <h1 id="ingredients">Ingredients</h1>
                    <IconButton id="help-button" className="icon-button" onClick={() => setHelpModalOpen(true)}>
                        <QuestionMark />
                    </IconButton>
                </div>
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
                            id="create-recipe-button"
                            className={
                                "success" + (selectedIngredients && selectedIngredients.length > 0 ? "" : " disabled")
                            }
                            onClick={() => openCreateRecipeModal(false)}
                        >
                            Create Recipe
                        </Button>
                        <Button
                            id="delete-ingredient-button"
                            className={
                                "danger" + (selectedIngredients && selectedIngredients.length > 0 ? "" : " disabled")
                            }
                            onClick={openDeleteIngredientModal}
                        >
                            Delete Selected Ingredients
                        </Button>
                    </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <h1 id="recipes">Recipes</h1>
                    <IconButton
                        id="random-recipe-button"
                        className="icon-button"
                        aria-label="Show a random recipe"
                        title="Show a random recipe"
                        disabled={filteredRecipes.length <= 1}
                        onClick={() => {
                            const randomIndex = Math.floor(Math.random() * filteredRecipes.length);
                            setRandomRecipe(filteredRecipes[randomIndex]);
                        }}
                    >
                        <Shuffle />
                    </IconButton>
                </div>
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
                    <div className={`tag-filter-bar ${mode === "dark" ? "dark-mode" : "light-mode"}`}>
                        <div className="tag-filters" role="group" aria-label="Filter recipes by tag">
                            {tags.map((tag) => {
                                const isSelected = selectedTags.includes(tag);
                                return (
                                    <Chip
                                        key={tag}
                                        label={tag}
                                        clickable
                                        color={isSelected ? "primary" : "default"}
                                        variant={isSelected ? "filled" : "outlined"}
                                        aria-pressed={isSelected}
                                        onClick={() =>
                                            setSelectedTags(
                                                isSelected
                                                    ? selectedTags.filter((selectedTag) => selectedTag !== tag)
                                                    : [...selectedTags, tag],
                                            )
                                        }
                                    />
                                );
                            })}
                        </div>
                        <Button
                            className="manage-tags-button"
                            onClick={() => setEditTagsModalOpen(true)}
                            aria-label="Manage tags"
                        >
                            Manage Tags
                        </Button>
                    </div>
                    {recipes.length === 0 ? (
                        <p>No recipes yet. Create one by selecting ingredients above!</p>
                    ) : (
                        filteredRecipes.map((recipe) => (
                            <Accordion
                                expanded={expandedRecipe === recipe.name}
                                onChange={handleExpandRecipe(recipe.name)}
                            >
                                <AccordionSummary expandIcon={<ExpandMore />}>
                                    <div className="recipe-summary">
                                        <h3>{recipe.name}</h3>
                                        {recipe.tags?.length > 0 && (
                                            <div className="recipe-tags" aria-label={`Tags for ${recipe.name}`}>
                                                {recipe.tags.map((tag) => (
                                                    <Chip key={tag} label={tag} size="small" />
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </AccordionSummary>
                                <AccordionDetails>
                                    <div className="recipe-details">
                                        <div>
                                            Ingredients:
                                            <ul>
                                                {recipe.ingredients.map((ing, index) => (
                                                    <li key={index}>{ing}</li>
                                                ))}
                                            </ul>
                                        </div>
                                        {recipe.notes && (
                                            <div style={{ whiteSpace: "pre-line" }}>
                                                Notes:<br></br>
                                                {recipe.notes}
                                            </div>
                                        )}
                                    </div>
                                </AccordionDetails>
                                <AccordionActions>
                                    <Button
                                        id="edit-recipe-button"
                                        variant="text"
                                        onClick={() => {
                                            setEditingRecipe(true);
                                            setRecipeName(expandedRecipe as string);
                                            setRecipeNotes(getExpandedRecipe()?.notes || "");
                                            setRecipeTags(getExpandedRecipe()?.tags || []);
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
                                        id="delete-recipe-button"
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
