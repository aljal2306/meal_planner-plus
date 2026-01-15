// 1. INITIALIZATION
const SUPABASE_URL = 'https://gwrrzrxujbpnguyzpjme.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd3cnJ6cnh1amJwbmd1eXpwam1lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYwNjY2MTMsImV4cCI6MjA3MTY0MjYxM30.tkE0LawKsbolBHrqaS3iJno-LAd7skpl9pCQ-0Tuf1w';
const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// 2. LOAD DATA FROM URL
async function initPrint() {
    const params = new URLSearchParams(window.location.search);
    const ids = params.get('ids');
    
    // We look for the container INSIDE the function now
    const cookbookContainer = document.getElementById('cookbook-container');

    if (!ids) {
        if (cookbookContainer) cookbookContainer.innerHTML = '<p>No recipes selected.</p>';
        return;
    }

    const recipeIds = ids.split(',');
    await loadSelectedRecipes(recipeIds);
}

// 3. FETCH RECIPES FROM DATABASE
async function loadSelectedRecipes(ids) {
    const { data, error } = await db
        .from('recipes')
        .select('*')
        .in('id', ids);

    if (error) {
        console.error('Error fetching recipes:', error);
        return;
    }

    renderPrintRecipes(data);
}

// 4. RENDER TO PAGE
function renderPrintRecipes(recipes) {
    const cookbookContainer = document.getElementById('cookbook-container');
    
    // Safety check: make sure the container exists
    if (!cookbookContainer) {
        console.error("Could not find the 'cookbook-container' element on the page.");
        return;
    }

    cookbookContainer.innerHTML = '';

    recipes.forEach(recipe => {
        const recipeDiv = document.createElement('div');
        recipeDiv.className = 'recipe-print';
        
        const ingredientsHtml = recipe.ingredients.map(ing => 
            `<li>${ing.qty} ${ing.unit || ''} ${ing.name}</li>`
        ).join('');

        const instructionsHtml = recipe.instructions.map(step => 
            `<li>${step}</li>`
        ).join('');

        recipeDiv.innerHTML = `
            <div class="print-recipe-card">
                <h2>${recipe.name}</h2>
                <p><strong>Category:</strong> ${recipe.category || 'N/A'} | <strong>Chef:</strong> ${recipe.author || 'N/A'}</p>
                <hr>
                <h3>Ingredients</h3>
                <ul>${ingredientsHtml}</ul>
                <h3>Instructions</h3>
                <ol>${instructionsHtml}</ol>
            </div>
        `;
        cookbookContainer.appendChild(recipeDiv);
    });
}

document.addEventListener('DOMContentLoaded', initPrint);
