// INITIALIZATION & SETUP
const SUPABASE_URL = 'https://gwrrzrxujbpnguyzpjme.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd3cnJ6cnh1amJwbmd1eXpwam1lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYwNjY2MTMsImV4cCI6MjA3MTY0MjYxM30.tkE0LawKsbolBHrqaS3iJno-LAd7skpl9pCQ-0Tuf1w';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

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

let allRecipes = [];

// RECIPE FUNCTIONS
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
    populateSelect(categoryFilter, categories);
    populateSelect(authorFilter, authors);
}

function populateSelect(selectElement, items) {
    const currentVal = selectElement.value;
    selectElement.innerHTML = '';
    items.forEach(item => {
        const option = document.createElement('option');
        option.value = item;
        option.textContent = (item === 'all') ? 'All' : item.charAt(0).toUpperCase() + item.slice(1);
        selectElement.appendChild(option);
    });
    selectElement.value = currentVal || 'all';
}

function renderRecipes() {
    recipeList.innerHTML = '';
    const category = categoryFilter.value;
    const author = authorFilter.value;
    const searchTerm = searchInput.value.toLowerCase();
    const filteredRecipes = allRecipes.filter(r => 
        (category === 'all' || r.category === category) &&
        (author === 'all' || r.author === author) &&
        r.name.toLowerCase().includes(searchTerm)
    );
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
    if (ingredientsIndex === -1 || instructionsIndex === -1) { alert("Could not find 'Ingredients' and 'Instructions' headers."); document.getElementById('recipe-instructions').value = lines.join('\n'); return; }
    const ingredientLines = lines.slice(ingredientsIndex + 1, instructionsIndex);
    const instructionLines = lines.slice(instructionsIndex + 1);
    ingredientInputs.innerHTML = '<label>Ingredients</label>';
    ingredientLines.forEach(line => {
        const parts = line.trim().match(/^([\d\/\.\s]+)\s?(\w*)\s(.*)/);
        if (parts && parts.length === 4) { addIngredientInput({ qty: parts[1].trim(), unit: parts[2].trim(), name: parts[3].trim() }); } 
        else { addIngredientInput({ name: line.trim() }); }
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
    const ingredientList = document.getElementById('view-ingredients');
    ingredientList.innerHTML = '';
    if (recipe.ingredients) {
        recipe.ingredients.forEach(ing => {
            const li = document.createElement('li');
            li.textContent = `${ing.qty || ''} ${ing.unit || ''} ${ing.name}`.trim();
            ingredientList.appendChild(li);
        });
    }
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

// MEAL PLANNER & GROCERY LIST
async function renderMealPlanner() {
    mealPlanner.innerHTML = '';
    const today = new Date();
    for (let i = 0; i < 7; i++) {
        const date = new Date(today);
        date.setDate(today.getDate() + i);
        const dateString = date.toISOString().split('T')[0];
        const dayEl = document.createElement('div');
        dayEl.className = 'day-card';
        dayEl.id = `day-${dateString}`;
        dayEl.innerHTML = `
            <h4>${date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</h4>
            <div class="meals-list"></div>
            <button onclick="openAddMealModal('${dateString}')" class="utility-btn">Add Meal</button>
        `;
        mealPlanner.appendChild(dayEl);
    }
    await loadMealPlan();
}

async function loadMealPlan() {
    const today = new Date();
    const nextWeek = new Date();
    nextWeek.setDate(today.getDate() + 7);
    const [planRes, recipesRes] = await Promise.all([
        supabase.from('meal_plan').select('*, recipes(name)').gte('plan_date', today.toISOString().split('T')[0]).lte('plan_date', nextWeek.toISOString().split('T')[0]),
        supabase.from('recipes').select('id, name').order('name')
    ]);
    const { data: plan, error: planError } = planRes;
    const { data: recipes, error: recipeError } = recipesRes;
    if (planError || recipeError) { console.error('Error loading data:', planError || recipeError); return; }
    const recipeSelect = document.getElementById('recipe-select');
    recipeSelect.innerHTML = '<option value="">-- Choose a recipe --</option>';
    recipes.forEach(r => {
        const option = document.createElement('option');
        option.value = r.id;
        option.textContent = r.name;
        recipeSelect.appendChild(option);
    });
    document.querySelectorAll('.meals-list').forEach(list => list.innerHTML = '');
    plan.forEach(meal => {
        const dayCard = document.getElementById(`day-${meal.plan_date}`);
        if (dayCard) {
            const mealList = dayCard.querySelector('.meals-list');
            const mealEl = document.createElement('div');
            mealEl.className = 'planned-meal';
            const mealName = meal.ad_hoc_meal || (meal.recipes ? meal.recipes.name : 'Unknown Recipe');
            mealEl.innerHTML = `
                <div><span>${meal.meal_type}:</span> ${mealName}</div>
                <button class="export-btn" onclick="exportToCalendar(${meal.id})">Calendar</button>
            `;
            mealList.appendChild(mealEl);
        }
    });
}

function openAddMealModal(dateString) {
    addMealForm.reset();
    document.getElementById('meal-plan-date').value = dateString;
    addMealModal.classList.remove('hidden');
}

async function handleAddMealForm(event) {
    event.preventDefault();
    const planDate = document.getElementById('meal-plan-date').value;
    const mealType = document.getElementById('meal-type-select').value;
    const recipeId = document.getElementById('recipe-select').value;
    const adHocMeal = document.getElementById('ad-hoc-input').value;
    if (!adHocMeal && !recipeId) { alert('Please select a recipe or enter an ad hoc meal.'); return; }
    if (adHocMeal && recipeId) { alert('Please choose either a recipe OR an ad hoc meal, not both.'); return; }
    const mealData = { plan_date: planDate, meal_type: mealType, recipe_id: recipeId || null, ad_hoc_meal: adHocMeal || null };
    const { error } = await supabase.from('meal_plan').upsert(mealData, { onConflict: 'plan_date, meal_type' });
    if (error) { console.error("Error saving meal:", error); alert('Failed to save meal.'); } 
    else { addMealModal.classList.add('hidden'); await loadMealPlan(); }
}

async function exportToCalendar(mealId) {
    const { data: meal, error } = await supabase.from('meal_plan').select('*, recipes(name, instructions)').eq('id', mealId).single();
    if (error || !meal) { alert('Could not find meal to export.'); return; }
    const eventName = meal.ad_hoc_meal || meal.recipes.name;
    const eventDetails = meal.ad_hoc_meal || meal.recipes.instructions.join('\n');
    const startDate = new Date(meal.plan_date + 'T00:00:00');
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 1);
    const formattedStartDate = startDate.toISOString().split('T')[0].replace(/-/g, '');
    const formattedEndDate = endDate.toISOString().split('T')[0].replace(/-/g, '');
    const eventDates = `${formattedStartDate}/${formattedEndDate}`;
    const baseUrl = 'https://www.google.com/calendar/render?action=TEMPLATE';
    const eventTitle = encodeURIComponent(`${meal.meal_type}: ${eventName}`);
    const encodedDetails = encodeURIComponent(eventDetails);
    const calendarUrl = `${baseUrl}&text=${eventTitle}&details=${encodedDetails}&dates=${eventDates}`;
    window.open(calendarUrl, '_blank');
}

async function generateGroceryList() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const nextWeek = new Date(today);
    nextWeek.setDate(today.getDate() + 7);
    const { data: plan, error: planError } = await supabase.from('meal_plan').select('*, recipes(ingredients)').gte('plan_date', today.toISOString().split('T')[0]).lte('plan_date', nextWeek.toISOString().split('T')[0]);
    if (planError || plan.length === 0) { groceryList.innerHTML = '<li>No meals planned.</li>'; return; }
    const aggregatedList = {};
    plan.forEach(meal => {
        if (meal.recipes && meal.recipes.ingredients) {
            meal.recipes.ingredients.forEach(ing => {
                const key = ing.name.toLowerCase().trim();
                const value = `${ing.qty} ${ing.unit || ''}`.trim();
                aggregatedList[key] = aggregatedList[key] ? `${aggregatedList[key]}, ${value}` : value;
            });
        }
    });
    groceryList.innerHTML = '';
    Object.keys(aggregatedList).sort().forEach(item => {
        const li = document.createElement('li');
        li.innerHTML = `<input type="checkbox"> <strong>${item}</strong> (${aggregatedList[item]})`;
        groceryList.appendChild(li);
    });
}

function finalizeGroceryList() { /* ... implementation as before ... */ }
async function shareGroceryList() { /* ... implementation as before ... */ }
function printCookbook() { /* ... implementation as before ... */ }

// EVENT LISTENERS & INITIALIZATION
addMealForm.addEventListener('submit', handleAddMealForm);
closeAddMealModalBtn.addEventListener('click', () => addMealModal.classList.add('hidden'));
recipeForm.addEventListener('submit', handleFormSubmit);
addIngredientBtn.addEventListener('click', () => addIngredientInput());
generateListBtn.addEventListener('click', generateGroceryList);
printCookbookBtn.addEventListener('click', printCookbook);
finalizeListBtn.addEventListener('click', finalizeGroceryList);
shareListBtn.addEventListener('click', shareGroceryList);
categoryFilter.addEventListener('change', renderRecipes);
authorFilter.addEventListener('change', renderRecipes);
searchInput.addEventListener('input', renderRecipes);
parseRecipeBtn.addEventListener('click', parseRecipeText);
closeViewModalBtn.addEventListener('click', () => viewRecipeModal.classList.add('hidden'));
showFormBtn.addEventListener('click', () => { addRecipeContainer.classList.remove('hidden'); showFormBtn.classList.add('hidden'); });
cancelBtn.addEventListener('click', () => { addRecipeContainer.classList.add('hidden'); showFormBtn.classList.remove('hidden'); recipeForm.reset(); recipeImportText.value = ''; ingredientInputs.innerHTML = '<label>Ingredients</label>'; addIngredientInput(); });
document.addEventListener('DOMContentLoaded', async () => { addRecipeContainer.classList.add('hidden'); addIngredientInput(); await loadRecipes(); await renderMealPlanner(); });
