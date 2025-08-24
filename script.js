// -----------------------------------------------------------------------------
// 1. INITIALIZATION & SETUP
// -----------------------------------------------------------------------------

// Replace with your own Supabase URL and Anon Key
const SUPABASE_URL = 'https://gwrrzrxujbpnguyzpjme.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd3cnJ6cnh1amJwbmd1eXpwam1lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYwNjY2MTMsImV4cCI6MjA3MTY0MjYxM30.tkE0LawKsbolBHrqaS3iJno-LAd7skpl9pCQ-0Tuf1w';

const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Get references to all the HTML elements we'll be working with
const recipeForm = document.getElementById('recipe-form');
const recipeList = document.getElementById('recipe-list');
const mealPlanner = document.getElementById('meal-planner');
const generateListBtn = document.getElementById('generate-list-btn');
const groceryList = document.getElementById('grocery-list');
const printCookbookBtn = document.getElementById('print-cookbook-btn');


// -----------------------------------------------------------------------------
// 2. RECIPE FUNCTIONS (CRUD - Create, Read, Update, Delete)
// -----------------------------------------------------------------------------

/**
 * Fetches all recipes from the database and displays them on the page.
 */
async function loadRecipes() {
    const { data: recipes, error } = await supabase
        .from('recipes')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching recipes:', error);
        return;
    }

    recipeList.innerHTML = ''; // Clear the list before adding new items
    for (const recipe of recipes) {
        const recipeEl = document.createElement('div');
        recipeEl.innerHTML = `
            <h3>${recipe.name}</h3>
            <p>Category: ${recipe.category}</p>
            <button onclick="populateFormForEdit(${recipe.id})">Edit</button>
            <button onclick="deleteRecipe(${recipe.id})">Delete</button>
        `;
        recipeList.appendChild(recipeEl);
    }
}

/**
 * Handles the form submission for both creating a new recipe and updating an existing one.
 */
async function handleFormSubmit(event) {
    event.preventDefault();

    const recipeId = document.getElementById('recipe-id').value;
    const name = document.getElementById('recipe-name').value;
    const category = document.getElementById('recipe-category').value;
    const ingredientsText = document.getElementById('recipe-ingredients').value;
    const instructionsText = document.getElementById('recipe-instructions').value;

    // Basic validation
    if (!name || !ingredientsText || !instructionsText) {
        alert('Please fill out all required fields.');
        return;
    }

    try {
        const ingredients = JSON.parse(ingredientsText);
        const instructions = instructionsText.split('\n').filter(line => line.trim() !== '');

        const recipeData = { name, category, ingredients, instructions };
        
        let response;
        if (recipeId) {
            // If an ID exists, we are updating an existing recipe
            response = await supabase.from('recipes').update(recipeData).eq('id', recipeId);
        } else {
            // Otherwise, we are inserting a new one
            response = await supabase.from('recipes').insert([recipeData]);
        }

        if (response.error) throw response.error;

        recipeForm.reset(); // Clear the form
        await loadRecipes(); // Refresh the recipe list
        await renderMealPlanner(); // Refresh the meal planner dropdowns

    } catch (e) {
        if (e instanceof SyntaxError) {
            alert('Invalid JSON format for ingredients. Please check the structure.');
        } else {
            console.error('Error saving recipe:', e.message);
            alert(`Failed to save recipe: ${e.message}`);
        }
    }
}

/**
 * Fetches a single recipe's data and fills the form to allow editing.
 * @param {number} id The ID of the recipe to edit.
 */
async function populateFormForEdit(id) {
    const { data: recipe, error } = await supabase
        .from('recipes')
        .select('*')
        .eq('id', id)
        .single();

    if (error) {
        console.error('Error fetching recipe for edit:', error);
        return;
    }

    document.getElementById('recipe-id').value = recipe.id;
    document.getElementById('recipe-name').value = recipe.name;
    document.getElementById('recipe-category').value = recipe.category;
    document.getElementById('recipe-ingredients').value = JSON.stringify(recipe.ingredients, null, 2);
    document.getElementById('recipe-instructions').value = recipe.instructions.join('\n');
    
    window.scrollTo(0, 0); // Scroll to the top of the page to see the form
}

/**
 * Deletes a recipe from the database after user confirmation.
 * @param {number} id The ID of the recipe to delete.
 */
async function deleteRecipe(id) {
    if (confirm('Are you sure you want to delete this recipe?')) {
        const { error } = await supabase.from('recipes').delete().eq('id', id);
        if (error) {
            console.error('Error deleting recipe:', error);
        } else {
            await loadRecipes();
            await renderMealPlanner();
        }
    }
}


// -----------------------------------------------------------------------------
// 3. MEAL PLANNER FUNCTIONS
// -----------------------------------------------------------------------------

/**
 * Renders the 7-day meal planner view with recipe dropdowns for each day.
 */
async function renderMealPlanner() {
    const { data: recipes, error: recipeError } = await supabase.from('recipes').select('id, name');
    if (recipeError) {
        console.error('Error fetching recipes for planner:', recipeError);
        return;
    }
    
    mealPlanner.innerHTML = '';
    const today = new Date();
    
    for (let i = 0; i < 7; i++) {
        const date = new Date(today);
        date.setDate(today.getDate() + i);
        const dateString = date.toISOString().split('T')[0]; // Format as YYYY-MM-DD
        
        const dayEl = document.createElement('div');
        dayEl.className = 'meal-day';
        dayEl.innerHTML = `
            <h4>${date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</h4>
            <select id="meal-select-${dateString}" onchange="addRecipeToMealPlan('${dateString}', this.value)">
                <option value="">Select a recipe...</option>
                ${recipes.map(r => `<option value="${r.id}">${r.name}</option>`).join('')}
            </select>
        `;
        mealPlanner.appendChild(dayEl);
    }
    await loadMealPlan(); // Load saved plan after rendering the structure
}

/**
 * Loads the saved meal plan for the upcoming week and updates the dropdowns.
 */
async function loadMealPlan() {
    const today = new Date();
    const nextWeek = new Date(today);
    nextWeek.setDate(today.getDate() + 7);

    const { data: plan, error } = await supabase
        .from('meal_plan')
        .select('*')
        .gte('plan_date', today.toISOString().split('T')[0])
        .lte('plan_date', nextWeek.toISOString().split('T')[0]);

    if (error) {
        console.error('Error loading meal plan:', error);
        return;
    }
    
    plan.forEach(meal => {
        const selectEl = document.getElementById(`meal-select-${meal.plan_date}`);
        if (selectEl) {
            selectEl.value = meal.recipe_id;
        }
    });
}

/**
 * Saves or updates a recipe selection for a specific day in the meal plan.
 * @param {string} date - The date string (YYYY-MM-DD).
 * @param {string} recipeId - The ID of the selected recipe.
 */
async function addRecipeToMealPlan(date, recipeId) {
    if (!recipeId) { // If "Select a recipe" is chosen
        const { error } = await supabase.from('meal_plan').delete().eq('plan_date', date);
        if (error) console.error('Error removing meal from plan:', error);
        return;
    }

    const { error } = await supabase
        .from('meal_plan')
        .upsert({ plan_date: date, recipe_id: recipeId }, { onConflict: 'plan_date' });
    
    if (error) console.error('Error saving to meal plan:', error);
}

// -----------------------------------------------------------------------------
// 4. GROCERY LIST & COOKBOOK FUNCTIONS
// -----------------------------------------------------------------------------

/**
 * Generates and displays a grocery list based on the recipes in the meal plan.
 */
async function generateGroceryList() {
    const today = new Date();
    const nextWeek = new Date(today);
    nextWeek.setDate(today.getDate() + 7);

    // Get the recipe IDs from the meal plan for the next 7 days
    const { data: plan, error: planError } = await supabase
        .from('meal_plan')
        .select('recipe_id')
        .gte('plan_date', today.toISOString().split('T')[0])
        .lte('plan_date', nextWeek.toISOString().split('T')[0]);

    if (planError) {
        console.error('Error fetching plan for grocery list:', planError);
        return;
    }
    if (plan.length === 0) {
        groceryList.innerHTML = '<li>No meals planned for the upcoming week.</li>';
        return;
    }

    const recipeIds = plan.map(item => item.recipe_id);

    // Get the ingredients for those recipes
    const { data: recipes, error: recipeError } = await supabase
        .from('recipes')
        .select('ingredients')
        .in('id', recipeIds);

    if (recipeError) {
        console.error('Error fetching recipe ingredients:', recipeError);
        return;
    }

    // Aggregate all ingredients into a single list
    const aggregatedList = {};
    recipes.forEach(recipe => {
        recipe.ingredients.forEach(ing => {
            const key = ing.item.toLowerCase().trim();
            if (aggregatedList[key]) {
                aggregatedList[key] += `, ${ing.qty}`;
            } else {
                aggregatedList[key] = ing.qty;
            }
        });
    });

    // Display the list with checkboxes
    groceryList.innerHTML = '';
    for (const item in aggregatedList) {
        const li = document.createElement('li');
        li.innerHTML = `<input type="checkbox"> ${item} (${aggregatedList[item]})`;
        groceryList.appendChild(li);
    }
}

/**
 * Generates a clean HTML page with all recipes and opens the print dialog.
 */
async function printCookbook() {
    const { data: recipes, error } = await supabase.from('recipes').select('*').order('name');
    if (error) {
        console.error('Error fetching recipes for cookbook:', error);
        return;
    }

    let printHtml = `
        <html>
        <head>
            <title>My Cookbook</title>
            <style>
                body { font-family: sans-serif; }
                .recipe-print { page-break-after: always; padding: 20px; }
                h2 { text-align: center; }
                ul, ol { padding-left: 20px; }
            </style>
        </head>
        <body>
            <h1>My Cookbook</h1>
    `;
    recipes.forEach(r => {
        printHtml += `
            <div class="recipe-print">
                <h2>${r.name}</h2>
                <p><strong>Category:</strong> ${r.category || 'N/A'}</p>
                <h3>Ingredients</h3>
                <ul>${r.ingredients.map(i => `<li>${i.qty} ${i.item}</li>`).join('')}</ul>
                <h3>Instructions</h3>
                <ol>${r.instructions.map(s => `<li>${s}</li>`).join('')}</ol>
            </div>
        `;
    });
    printHtml += '</body></html>';

    const printWindow = window.open('', '_blank');
    printWindow.document.write(printHtml);
    printWindow.document.close();
    printWindow.print();
}

/**
 * Exports a single day's meal to a .ics calendar file.
 * NOTE: For this to work, you'll need to add an "Export" button next to each meal plan day.
 * This is an example of how you'd structure the function.
 */
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
    const instructions = meal.recipes.instructions.join('\\n'); // Newlines for ICS description
    
    // Format the date for the ICS file (YYYYMMDD)
    const icsDate = dateString.replace(/-/g, '');

    const icsContent = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'BEGIN:VEVENT',
        `DTSTART;VALUE=DATE:${icsDate}`,
        `DTEND;VALUE=DATE:${icsDate}`,
        `SUMMARY:${recipeName}`,
        `DESCRIPTION:${instructions}`,
        'END:VEVENT',
        'END:VCALENDAR'
    ].join('\n');

    const blob = new Blob([icsContent], { type: 'text/calendar' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${recipeName}.ics`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}


// -----------------------------------------------------------------------------
// 5. EVENT LISTENERS & INITIALIZATION
// -----------------------------------------------------------------------------

// Attach the submit handler to the recipe form
recipeForm.addEventListener('submit', handleFormSubmit);

// Attach click handlers to the main buttons
generateListBtn.addEventListener('click', generateGroceryList);
printCookbookBtn.addEventListener('click', printCookbook);

// Load initial data when the page loads
document.addEventListener('DOMContentLoaded', async () => {
    await loadRecipes();
    await renderMealPlanner();
});