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

let allRecipes = [];

// -----------------------------------------------------------------------------
// 2. RECIPE FUNCTIONS (CRUD)
// -----------------------------------------------------------------------------

async function loadRecipes() {
    const { data, error } = await supabase.from('recipes').select('*').order('name', { ascending: true });
    if (error) {
        console.error('Error fetching recipes:', error);
        return;
    }
    allRecipes = data;
    populateCategoryFilter();
    renderRecipes(categoryFilter.value);
}

function populateCategoryFilter() {
    const categories = ['all', ...new Set(allRecipes.map(recipe => recipe.category).filter(c => c))];
    
    const currentFilter = categoryFilter.value;
    categoryFilter.innerHTML = '';

    const defaultOption = document.createElement('option');
    defaultOption.value = "";
    defaultOption.textContent = "Select a category...";
    defaultOption.selected = true;
    categoryFilter.appendChild(defaultOption);

    categories.forEach(category => {
        const option = document.createElement('option');
        option.value = category;
        option.textContent = category.charAt(0).toUpperCase() + category.slice(1);
        categoryFilter.appendChild(option);
    });

    if (currentFilter) {
        categoryFilter.value = currentFilter;
    }
}

function renderRecipes(filter) {
    if (!filter) {
        recipeList.classList.add('hidden');
        return;
    }

    recipeList.innerHTML = '';

    const filteredRecipes = (filter === 'all')
        ? allRecipes
        : allRecipes.filter(recipe => recipe.category === filter);

    if (filteredRecipes.length === 0) {
        recipeList.innerHTML = '<p>No recipes found in this category.</p>';
    } else {
        filteredRecipes.forEach(recipe => {
            const recipeEl = document.createElement('div');
            recipeEl.innerHTML = `
                <div class="recipe-header">
                    <input type="checkbox" class="recipe-checkbox" value="${recipe.id}">
                    <h3>${recipe.name}</h3>
                </div>
                <p>Category: ${recipe.category}</p>
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
    const instructionsText = document.getElementById('recipe-instructions').value;

    const ingredients = [];
    document.querySelectorAll('.ingredient-row').forEach(row => {
        const ingredientName = row.querySelector('.ingredient-name').value;
        const quantity = row.querySelector('.ingredient-qty').value;
        const unit = row.querySelector('.ingredient-unit').value;
        if (ingredientName && quantity) {
            ingredients.push({ name: ingredientName, qty: quantity, unit: unit });
        }
    });

    if (!name || ingredients.length === 0 || !instructionsText) {
        alert('Please fill out the recipe name, at least one ingredient, and instructions.');
        return;
    }

    const instructions = instructionsText.split('\n').filter(line => line.trim() !== '');
    const recipeData = { name, category, ingredients, instructions };

    const { error } = recipeId
        ? await supabase.from('recipes').update(recipeData).eq('id', recipeId)
        : await supabase.from('recipes').insert([recipeData]);

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
    document.getElementById('recipe-instructions').value = recipe.instructions.join('\n');
    
    ingredientInputs.innerHTML = '<label>Ingredients</label>';
    recipe.ingredients.forEach(ing => addIngredientInput(ing));
    
    window.scrollTo(0, 0);
}

async function deleteRecipe(id) {
    if (confirm('Are you sure you want to delete this recipe?')) {
        const { error } = await supabase.from('recipes').delete().eq('id', id);
        if (error) console.error('Error deleting recipe:', error);
        else { await loadRecipes(); await renderMealPlanner(); }
    }
}

// -----------------------------------------------------------------------------
// 3. DYNAMIC INGREDIENT INPUTS
// -----------------------------------------------------------------------------

function addIngredientInput(ingredient = {}) {
    const div = document.createElement('div');
    div.className = 'ingredient-row';
    div.innerHTML = `
        <input type="text" class="ingredient-name" placeholder="Ingredient Name" value="${ingredient.name || ''}" required>
        <input type="number" step="0.01" class="ingredient-qty" placeholder="Qty" value="${ingredient.qty || ''}" required>
        <input type="text" class="ingredient-unit" placeholder="Unit (e.g., cup)" value="${ingredient.unit || ''}">
        <button type="button" class="remove-ingredient-btn" onclick="this.parentElement.remove()">Remove</button>
    `;
    ingredientInputs.appendChild(div);
}

// -----------------------------------------------------------------------------
// 4. MEAL PLANNER & GROCERY LIST
// -----------------------------------------------------------------------------

async function renderMealPlanner() {
    const { data: recipes, error } = await supabase.from('recipes').select('id, name');
    if (error) { console.error('Error fetching recipes for planner:', error); return; }
    
    mealPlanner.innerHTML = '';
    const today = new Date();
    
    for (let i = 0; i < 7; i++) {
        const date = new Date(today);
        date.setDate(today.getDate() + i);
        const dateString = date.toISOString().split('T')[0];
        
        const dayEl = document.createElement('div');
        dayEl.className = 'meal-day';
        dayEl.innerHTML = `
            <h4>${date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</h4>
            <select id="meal-select-${dateString}" onchange="addRecipeToMealPlan('${dateString}', this.value)">
                <option value="">Select a recipe...</option>
                ${recipes.map(r => `<option value="${r.id}">${r.name}</option>`).join('')}
            </select>
            <button class="export-btn" onclick="exportToCalendar('${dateString}')">Add to Calendar</button>
        `;
        mealPlanner.appendChild(dayEl);
    }
    await loadMealPlan();
}

async function loadMealPlan() {
    const today = new Date();
    const nextWeek = new Date();
    nextWeek.setDate(today.getDate() + 7);

    const { data: plan, error } = await supabase.from('meal_plan').select('*')
        .gte('plan_date', today.toISOString().split('T')[0])
        .lte('plan_date', nextWeek.toISOString().split('T')[0]);
    if (error) { console.error('Error loading meal plan:', error); return; }
    
    plan.forEach(meal => {
        const selectEl = document.getElementById(`meal-select-${meal.plan_date}`);
        if (selectEl) selectEl.value = meal.recipe_id;
    });
}

async function addRecipeToMealPlan(date, recipeId) {
    if (!recipeId) {
        const { error } = await supabase.from('meal_plan').delete().eq('plan_date', date);
        if (error) console.error('Error removing meal from plan:', error);
        return;
    }
    const { error } = await supabase
        .from('meal_plan')
        .upsert({ plan_date: date, recipe_id: parseInt(recipeId) }, { onConflict: 'plan_date' });
    
    if (error) {
        console.error('Error saving to meal plan:', error);
        alert('Failed to save meal plan. See console for details.');
    }
}

async function generateGroceryList() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const nextWeek = new Date(today);
    nextWeek.setDate(today.getDate() + 7);

    const { data: plan, error: planError } = await supabase.from('meal_plan').select('recipe_id')
        .gte('plan_date', today.toISOString().split('T')[0])
        .lte('plan_date', nextWeek.toISOString().split('T')[0]);

    if (planError) { console.error('Error fetching plan for grocery list:', planError); return; }
    if (plan.length === 0) { groceryList.innerHTML = '<li>No meals planned in the next 7 days.</li>'; return; }

    const recipeIds = plan.map(item => item.recipe_id);
    const { data: recipes, error: recipeError } = await supabase.from('recipes').select('ingredients').in('id', recipeIds);
    if (recipeError) { console.error('Error fetching ingredients:', recipeError); return; }

    const aggregatedList = {};
    recipes.forEach(recipe => {
        recipe.ingredients.forEach(ing => {
            const key = ing.name.toLowerCase().trim();
            const value = `${ing.qty} ${ing.unit || ''}`.trim();
            aggregatedList[key] = aggregatedList[key] ? `${aggregatedList[key]}, ${value}` : value;
        });
    });

    groceryList.innerHTML = '';
    Object.keys(aggregatedList).sort().forEach(item => {
        const li = document.createElement('li');
        li.innerHTML = `<input type="checkbox"> <strong>${item}</strong> (${aggregatedList[item]})`;
        groceryList.appendChild(li);
    });
}

function finalizeGroceryList() {
    const finalList = document.getElementById('final-grocery-list');
    finalList.innerHTML = '';

    const checkedItems = document.querySelectorAll('#grocery-list input[type="checkbox"]:checked');
    
    if (checkedItems.length === 0) {
        finalList.innerHTML = '<p>No items selected.</p>';
        return;
    }

    const ul = document.createElement('ul');
    checkedItems.forEach(item => {
        const li = document.createElement('li');
        li.textContent = item.parentElement.textContent.trim();
        ul.appendChild(li);
    });
    finalList.appendChild(ul);
}

async function shareGroceryList() {
    const finalListContainer = document.getElementById('final-grocery-list');
    const listItems = finalListContainer.querySelectorAll('li');

    if (listItems.length === 0) {
        alert('Please create a final list before sharing.');
        return;
    }

    let shareText = 'My Grocery List:\n';
    listItems.forEach(item => {
        shareText += `- ${item.textContent}\n`;
    });

    if (navigator.share) {
        try {
            await navigator.share({ title: 'Grocery List', text: shareText });
        } catch (error) {
            console.error('Error sharing:', error);
        }
    } else {
        try {
            await navigator.clipboard.writeText(shareText);
            alert('Grocery list copied to clipboard!');
        } catch (error) {
            console.error('Error copying to clipboard:', error);
            alert('Could not copy list to clipboard.');
        }
    }
}


// -----------------------------------------------------------------------------
// 5. COOKBOOK & CALENDAR FUNCTIONS
// -----------------------------------------------------------------------------

function printCookbook() {
    const checkedBoxes = document.querySelectorAll('.recipe-checkbox:checked');
    const selectedIds = Array.from(checkedBoxes).map(box => box.value);

    if (selectedIds.length === 0) {
        alert('Please select at least one recipe to generate a cookbook.');
        return;
    }
    
    window.location.href = `print.html?ids=${selectedIds.join(',')}`;
}

async function exportToCalendar(dateString) {
    const { data: meal, error } = await supabase
        .from('meal_plan')
        .select('recipes(name, instructions)')
        .eq('plan_date', dateString)
        .single();
    
    if (error || !meal) {
        alert('No meal planned for this day to export.');
        return;
    }
    
    const recipeName = meal.recipes.name;
    const instructions = meal.recipes.instructions.join('\n');
    
    const startDate = new Date(dateString + 'T00:00:00');
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 1);

    const formattedStartDate = startDate.toISOString().split('T')[0].replace(/-/g, '');
    const formattedEndDate = endDate.toISOString().split('T')[0].replace(/-/g, '');
    const eventDates = `${formattedStartDate}/${formattedEndDate}`;

    const baseUrl = 'https://www.google.com/calendar/render?action=TEMPLATE';
    const eventTitle = encodeURIComponent(`Meal Plan: ${recipeName}`);
    const eventDetails = encodeURIComponent(instructions);
    
    const calendarUrl = `${baseUrl}&text=${eventTitle}&details=${eventDetails}&dates=${eventDates}`;

    window.open(calendarUrl, '_blank');
}

// -----------------------------------------------------------------------------
// 6. EVENT LISTENERS & INITIALIZATION
// -----------------------------------------------------------------------------

recipeForm.addEventListener('submit', handleFormSubmit);
addIngredientBtn.addEventListener('click', () => addIngredientInput());
generateListBtn.addEventListener('click', generateGroceryList);
printCookbookBtn.addEventListener('click', printCookbook);
finalizeListBtn.addEventListener('click', finalizeGroceryList);
shareListBtn.addEventListener('click', shareGroceryList);
categoryFilter.addEventListener('change', () => renderRecipes(categoryFilter.value));


showFormBtn.addEventListener('click', () => {
    addRecipeContainer.classList.remove('hidden');
    showFormBtn.classList.add('hidden');
});

cancelBtn.addEventListener('click', () => {
    addRecipeContainer.classList.add('hidden');
    showFormBtn.classList.remove('hidden');
    recipeForm.reset();
    ingredientInputs.innerHTML = '<label>Ingredients</label>';
    addIngredientInput();
});

document.addEventListener('DOMContentLoaded', async () => {
    addRecipeContainer.classList.add('hidden');
    addIngredientInput();
    await loadRecipes();
    await renderMealPlanner();
});
