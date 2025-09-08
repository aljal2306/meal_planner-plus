// -----------------------------------------------------------------------------
// 1. INITIALIZATION & SETUP
// -----------------------------------------------------------------------------

const SUPABASE_URL = 'https://gwrrzrxujbpnguyzpjme.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd3cnJ6cnh1amJwbmd1eXpwam1lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYwNjY2MTMsImV4cCI6MjA3MTY0MjYxM30.tkE0LawKsbolBHrqaS3iJno-LAd7skpl9pCQ-0Tuf1w';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Get references to all the HTML elements
const recipeForm = document.getElementById('recipe-form');
const recipeList = document.getElementById('recipe-list');
const mealPlanner = document.getElementById('meal-planner');
const generateListBtn = document.getElementById('generate-list-btn');
const groceryList = document.getElementById('grocery-list');
const printCookbookBtn = document.getElementById('print-cookbook-btn');
const ingredientInputs = document.getElementById('ingredient-inputs');
const addIngredientBtn = document.getElementById('add-ingredient-btn');
const showFormBtn = document.getElementById('show-form-btn');
const addRecipeContainer = document.getElementById('add-recipe-container');
const cancelBtn = document.getElementById('cancel-btn');
const finalizeListBtn = document.getElementById('finalize-list-btn');
const shareListBtn = document.getElementById('share-list-btn');
const categoryFilter = document.getElementById('category-filter');
const authorFilter = document.getElementById('author-filter');
const searchInput = document.getElementById('search-input');
const parseRecipeBtn = document.getElementById('parse-recipe-btn');
const recipeImportText = document.getElementById('recipe-import-text');
const viewRecipeModal = document.getElementById('view-recipe-modal');
const closeViewModalBtn = document.getElementById('close-view-modal-btn');
const addMealModal = document.getElementById('add-meal-modal');
const addMealForm = document.getElementById('add-meal-form');
const closeAddMealModalBtn = document.getElementById('close-add-meal-modal-btn');
const calendarModal = document.getElementById('calendar-modal');
const closeCalendarModalBtn = document.getElementById('close-calendar-modal-btn');

let allRecipes = [];

// -----------------------------------------------------------------------------
// 2. RECIPE FUNCTIONS (CRUD, PARSING, FILTERING)
// -----------------------------------------------------------------------------

async function loadRecipes() {
    const { data, error } = await supabase.from('recipes').select('*').order('name', { ascending: true });
    if (error) { console.error('Error fetching recipes:', error); return; }
    allRecipes = data;
    populateFilters();
    renderRecipes();
}

function populateFilters() {
    const categories = ['all', ...new Set(allRecipes.map(r => r.category).filter(c => c))];
    const authors = ['all', ...new Set(allRecipes.map(r => r.author).filter(a => a))];
    
    populateSelect(categoryFilter, categories, "Select a category...");
    populateSelect(authorFilter, authors, "All Chefs");
}

function populateSelect(selectElement, items, placeholderText) {
    const currentVal = selectElement.value;
    selectElement.innerHTML = '';
    
    const placeholder = document.createElement('option');
    placeholder.value = (selectElement.id === 'category-filter') ? "" : "all";
    placeholder.textContent = placeholderText;
    // This line is now corrected from 'category-filler' to 'category-filter'
    if (selectElement.id === 'category-filter') { placeholder.selected = true; }
    selectElement.appendChild(placeholder);

    items.forEach(item => {
        if (item === 'all' && selectElement.id !== 'category-filter') return;
        const option = document.createElement('option');
        option.value = item;
        option.textContent = item.charAt(0).toUpperCase() + item.slice(1);
        selectElement.appendChild(option);
    });

    selectElement.value = currentVal || ((selectElement.id === 'category-filter') ? "" : "all");
}

function renderRecipes() {
    const category = categoryFilter.value;
    const author = authorFilter.value;
    const searchTerm = searchInput.value.toLowerCase();

    // Hide list if all filters are at their default initial state
    if (!category && author === 'all' && !searchTerm) {
        recipeList.classList.add('hidden');
        return;
    }

    recipeList.innerHTML = '';
    
    // Corrected filter logic
    const filteredRecipes = allRecipes.filter(r => {
        const categoryMatch = (!category || category === 'all' || r.category === category);
        const authorMatch = (author === 'all' || r.author === author);
        const searchMatch = r.name.toLowerCase().includes(searchTerm);
        return categoryMatch && authorMatch && searchMatch;
    });

    if (filteredRecipes.length === 0) {
        recipeList.innerHTML = '<p>No recipes match your filters.</p>';
    } else {
        filteredRecipes.forEach(recipe => {
            const recipeEl = document.createElement('div');
            recipeEl.innerHTML = `
                <div class="recipe-header">
                    <input type="checkbox" class="recipe-checkbox" value="${recipe.id}">
                    <h3 class="recipe-title" onclick="viewRecipe(${recipe.id})">${recipe.name}</h3>
                </div>
                <p><strong>Category:</strong> ${recipe.category || 'N/A'}</p>
                <p><strong>Chef:</strong> ${recipe.author || 'N/A'}</p>
                <div class="recipe-actions">
                    <button onclick="populateFormForEdit(${recipe.id})">Edit</button>
                    <button class="delete-btn" onclick="deleteRecipe(${recipe.id})">Delete</button>
                </div>
            `;
            recipeList.appendChild(recipeEl);
        });
    }
    recipeList.classList.remove('hidden');
}

async function handleFormSubmit(event) {
    event.preventDefault();
    const recipeId = document.getElementById('recipe-id').value;
    const name = document.getElementById('recipe-name').value;
    const category = document.getElementById('recipe-category').value;
    const author = document.getElementById('recipe-author').value;
    const instructionsText = document.getElementById('recipe-instructions').value;

    const ingredients = [];
    document.querySelectorAll('.ingredient-row').forEach(row => {
        const ingName = row.querySelector('.ingredient-name').value;
        const qty = row.querySelector('.ingredient-qty').value;
        const unit = row.querySelector('.ingredient-unit').value;
        if (ingName && qty) { ingredients.push({ name: ingName, qty, unit }); }
    });

    if (!name || ingredients.length === 0 || !instructionsText) { alert('Please fill out name, ingredients, and instructions.'); return; }

    const instructions = instructionsText.split('\n').filter(line => line.trim() !== '');
    const recipeData = { name, category, author, ingredients, instructions };

    const { error } = recipeId ? await supabase.from('recipes').update(recipeData).eq('id', recipeId) : await supabase.from('recipes').insert([recipeData]);
    if (error) { alert(`Failed to save recipe: ${error.message}`); return; }

    recipeForm.reset();
    ingredientInputs.innerHTML = '<label>Ingredients</label>';
    addIngredientInput();
    addRecipeContainer.classList.add('hidden');
    showFormBtn.classList.remove('hidden');
    await loadRecipes();
    await renderMealPlanner();
}

async function populateFormForEdit(id) {
    addRecipeContainer.classList.remove('hidden');
    showFormBtn.classList.add('hidden');
    const { data: recipe, error } = await supabase.from('recipes').select('*').eq('id', id).single();
    if (error) { console.error('Error fetching recipe for edit:', error); return; }

    document.getElementById('recipe-id').value = recipe.id;
    document.getElementById('recipe-name').value = recipe.name;
    document.getElementById('recipe-category').value = recipe.category;
    document.getElementById('recipe-author').value = recipe.author;
    document.getElementById('recipe-instructions').value = recipe.instructions.join('\n');
    
    ingredientInputs.innerHTML = '<label>Ingredients</label>';
    if (recipe.ingredients) { recipe.ingredients.forEach(ing => addIngredientInput(ing)); }
    
    window.scrollTo(0, 0);
}

async function deleteRecipe(id) {
    if (confirm('Are you sure you want to delete this recipe?')) {
        const { error } = await supabase.from('recipes').delete().eq('id', id);
        if (error) console.error('Error deleting recipe:', error);
        else { await loadRecipes(); await renderMealPlanner(); }
    }
}

function addIngredientInput(ingredient = {}) {
    const div = document.createElement('div');
    div.className = 'ingredient-row';
    div.innerHTML = `
        <input type="text" class="ingredient-name" placeholder="Ingredient Name" value="${ingredient.name || ''}" required>
        <input type="text" class="ingredient-qty" placeholder="Qty" value="${ingredient.qty || ''}" required>
        <input type="text" class="ingredient-unit" placeholder="Unit (e.g., cup)" value="${ingredient.unit || ''}">
        <button type="button" class="remove-ingredient-btn" onclick="this.parentElement.remove()">Remove</button>
    `;
    ingredientInputs.appendChild(div);
}

// PARSER & VIEW MODAL FUNCTIONS
function parseRecipeText() {
    const text = recipeImportText.value;
    if (!text.trim()) { alert('Please paste recipe text into the box first.'); return; }
    const lines = text.split('\n').filter(line => line.trim() !== '');
    
    document.getElementById('recipe-name').value = lines.shift() || '';

    const ingredientsIndex = lines.findIndex(line => line.toLowerCase().includes('ingredients'));
    const instructionsIndex = lines.findIndex(line => line.toLowerCase().includes('instructions') || line.toLowerCase().includes('directions'));
    
    if (ingredientsIndex === -1 || instructionsIndex === -1) {
        alert("Could not find 'Ingredients' and 'Instructions' headers. Please add them to your text.");
        document.getElementById('recipe-instructions').value = lines.join('\n');
        return;
    }

    const ingredientLines = lines.slice(ingredientsIndex + 1, instructionsIndex);
    const instructionLines = lines.slice(instructionsIndex + 1);

    ingredientInputs.innerHTML = '<label>Ingredients</label>';
    ingredientLines.forEach(line => {
        const parts = line.trim().match(/^([\d\/\.\s\-–—]+)\s?(\w*)\s(.*)/);
        if (parts && parts.length === 4) {
            addIngredientInput({ qty: parts[1].trim(), unit: parts[2].trim(), name: parts[3].trim() });
        } else {
            addIngredientInput({ name: line.trim() });
        }
    });
    addIngredientInput();

    document.getElementById('recipe-instructions').value = instructionLines.join('\n');
    recipeImportText.value = '';
}

async function viewRecipe(id) {
    const recipe = allRecipes.find(r => r.id === id);
    if (!recipe) return;

    document.getElementById('view-title').textContent = recipe.name;
    document.getElementById('view-category').textContent = `Category: ${recipe.category || 'N/A'}`;
    document.getElementById('view-author').textContent = `Chef: ${recipe.author || 'N/A'}`;
    
    const scalingControls = document.getElementById('scaling-controls');
    scalingControls.innerHTML = `
        <label>Servings:</label>
        <button onclick="updateIngredientQuantities(0.5)">0.5x</button>
        <button class="active" onclick="updateIngredientQuantities(1)">1x</button>
        <button onclick="updateIngredientQuantities(2)">2x</button>
        <button onclick="updateIngredientQuantities(3)">3x</button>
    `;
    
    scalingControls.querySelectorAll('button').forEach(button => {
        button.addEventListener('click', (e) => {
            scalingControls.querySelectorAll('button').forEach(btn => btn.classList.remove('active'));
            e.target.classList.add('active');
        });
    });

    updateIngredientQuantities(1);

    const instructionList = document.getElementById('view-instructions');
    instructionList.innerHTML = '';
    if (recipe.instructions) {
        recipe.instructions.forEach(step => {
            const li = document.createElement('li');
            li.textContent = step;
            instructionList.appendChild(li);
        });
    }
    
    viewRecipeModal.classList.remove('hidden');
}

function updateIngredientQuantities(multiplier) {
    const title = document.getElementById('view-title').textContent;
    const recipe = allRecipes.find(r => r.name === title);
    if (!recipe || !recipe.ingredients) return;
    
    const ingredientList = document.getElementById('view-ingredients');
    ingredientList.innerHTML = '';

    recipe.ingredients.forEach(ing => {
        const originalQty = ing.qty.toString();
        let newQty = originalQty;

        try {
            let numericValue = 0;
            if (originalQty.includes('/')) {
                const parts = originalQty.split(/[\s\/]/).filter(Boolean);
                if (parts.length === 3) numericValue = parseInt(parts[0]) + parseInt(parts[1]) / parseInt(parts[2]);
                else if (parts.length === 2) numericValue = parseInt(parts[0]) / parseInt(parts[1]);
                else numericValue = parseFloat(originalQty);
            } else {
                numericValue = parseFloat(originalQty);
            }
            
            if (!isNaN(numericValue)) {
                let scaledValue = numericValue * multiplier;
                newQty = Number(scaledValue.toFixed(2)).toString();
            }
        } catch (e) { /* Keep original if parsing fails */ }

        const li = document.createElement('li');
        li.textContent = `${newQty} ${ing.unit || ''} ${ing.name}`.trim();
        ingredientList.appendChild(li);
    });
}

// MEAL PLANNER & GROCERY LIST
async function renderMealPlanner() { /* ... function is unchanged ... */ }
async function loadMealPlan() { /* ... function is unchanged ... */ }
function openAddMealModal(dateString) { /* ... function is unchanged ... */ }
async function handleAddMealForm(event) { /* ... function is unchanged ... */ }
async function generateGroceryList() { /* ... function is unchanged ... */ }
function finalizeGroceryList() { /* ... function is unchanged ... */ }
async function shareGroceryList() { /* ... function is unchanged ... */ }

// COOKBOOK & CALENDAR FUNCTIONS
function printCookbook() { /* ... function is unchanged ... */ }
async function openCalendarModal(mealId) { /* ... function is unchanged ... */ }
function generateGoogleCalendarLink(eventName, eventDetails, dateString, mealType) { /* ... function is unchanged ... */ }
function downloadIcsFile(eventName, eventDetails, dateString, mealType) { /* ... function is unchanged ... */ }

// EVENT LISTENERS & INITIALIZATION
// ... (all event listeners are the same)
// ... (DOMContentLoaded is the same)
